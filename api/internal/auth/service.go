package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"net/url"
	"strings"
	"time"

	"github.com/accounting/api/internal/config"
	"github.com/accounting/api/internal/email"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

var ErrInvalidCredentials = errors.New("invalid credentials")

type Service struct {
	pool *pgxpool.Pool
	cfg  *config.Config
}

type requestMeta struct {
	IP        string
	UserAgent string
}

type requestMetaKeyType string

const requestMetaKey requestMetaKeyType = "auth_request_meta"

func NewService(pool *pgxpool.Pool, cfg *config.Config) *Service {
	return &Service{pool: pool, cfg: cfg}
}

func withRequestMeta(ctx context.Context, ip, userAgent string) context.Context {
	return context.WithValue(ctx, requestMetaKey, requestMeta{IP: ip, UserAgent: userAgent})
}

func requestMetaFromContext(ctx context.Context) requestMeta {
	v := ctx.Value(requestMetaKey)
	m, ok := v.(requestMeta)
	if !ok {
		return requestMeta{}
	}
	return m
}

func (s *Service) Register(ctx context.Context, email, password, fullName string) (*TokenPair, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	id := uuid.New()
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	_, err = tx.Exec(ctx, `INSERT INTO app_users (id, email, password_hash) VALUES ($1,$2,$3)`, id, email, string(hash))
	if err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO profiles (auth_user_id, email, full_name, role, company_id)
		VALUES ($1,$2,$3,'owner',NULL)`, id, email, fullName)
	if err != nil {
		return nil, fmt.Errorf("create profile: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	pair, err := s.issuePair(ctx, id, email, uuid.Nil, uuid.Nil)
	if err == nil {
		s.audit(ctx, &id, "register", map[string]any{"email": email})
	}
	return pair, err
}

func (s *Service) Login(ctx context.Context, email, password string) (*TokenPair, error) {
	var id uuid.UUID
	var hash string
	err := s.pool.QueryRow(ctx, `SELECT id, password_hash FROM app_users WHERE lower(email)=lower($1)`, email).Scan(&id, &hash)
	if err != nil {
		return nil, ErrInvalidCredentials
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) != nil {
		return nil, ErrInvalidCredentials
	}
	pair, err := s.issuePair(ctx, id, email, uuid.Nil, uuid.Nil)
	if err == nil {
		s.audit(ctx, &id, "login_success", map[string]any{"email": email})
	}
	return pair, err
}

func (s *Service) Refresh(ctx context.Context, refresh string) (*TokenPair, error) {
	claims, err := Parse(s.cfg.JWTSecret, refresh, s.cfg.JWTIssuer, s.cfg.JWTAudience)
	if err != nil || claims.Type != "refresh" {
		return nil, ErrInvalidCredentials
	}
	if claims.ID == "" {
		return nil, ErrInvalidCredentials
	}
	uid, err := uuid.Parse(claims.Subject)
	if err != nil {
		return nil, ErrInvalidCredentials
	}
	refreshJTI, err := uuid.Parse(claims.ID)
	if err != nil {
		return nil, ErrInvalidCredentials
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var dbUserID, familyID uuid.UUID
	var revokedAt *time.Time
	var replacedBy *uuid.UUID
	var expiresAt time.Time
	if err := tx.QueryRow(ctx, `
		SELECT user_id, family_id, revoked_at, replaced_by_jti, expires_at
		FROM auth_sessions
		WHERE refresh_jti = $1
		FOR UPDATE
	`, refreshJTI).Scan(&dbUserID, &familyID, &revokedAt, &replacedBy, &expiresAt); err != nil {
		return nil, ErrInvalidCredentials
	}
	if dbUserID != uid {
		return nil, ErrInvalidCredentials
	}
	if replacedBy != nil {
		_, _ = tx.Exec(ctx, `
			UPDATE auth_sessions
			SET revoked_at = now(), revoke_reason = 'refresh_reuse_detected'
			WHERE family_id = $1 AND revoked_at IS NULL
		`, familyID)
		_ = tx.Commit(ctx)
		s.audit(ctx, &uid, "refresh_reuse_detected", map[string]any{"family_id": familyID.String()})
		return nil, ErrInvalidCredentials
	}
	if revokedAt != nil || time.Now().After(expiresAt) {
		return nil, ErrInvalidCredentials
	}

	var email string
	err = tx.QueryRow(ctx, `SELECT email FROM app_users WHERE id=$1`, uid).Scan(&email)
	if err != nil {
		return nil, ErrInvalidCredentials
	}
	pair, newJTI, err := s.issuePairTx(ctx, tx, uid, email, familyID, refreshJTI)
	if err != nil {
		return nil, err
	}
	_, _ = tx.Exec(ctx, `
		UPDATE auth_sessions
		SET revoked_at = now(), replaced_by_jti = $2, revoke_reason = 'rotated'
		WHERE refresh_jti = $1 AND revoked_at IS NULL
	`, refreshJTI, newJTI)
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	s.audit(ctx, &uid, "refresh_success", map[string]any{"family_id": familyID.String()})
	return pair, nil
}

func (s *Service) ForgotPassword(ctx context.Context, emailAddr, redirectTo, ip, userAgent string) error {
	var userID uuid.UUID
	var normalizedEmail string
	err := s.pool.QueryRow(ctx, `SELECT id, email FROM app_users WHERE lower(email)=lower($1)`, emailAddr).Scan(&userID, &normalizedEmail)
	if err != nil {
		// Keep the response opaque for privacy.
		return nil
	}

	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return err
	}
	token := base64.RawURLEncoding.EncodeToString(raw)
	sum := sha256.Sum256([]byte(token))
	tokenHash := base64.RawURLEncoding.EncodeToString(sum[:])
	exp := time.Now().Add(1 * time.Hour)

	if _, err := s.pool.Exec(ctx, `
		INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, requested_ip, requested_user_agent)
		VALUES ($1, $2, $3, $4, $5)
	`, userID, tokenHash, exp, ip, userAgent); err != nil {
		return err
	}

	base := strings.TrimSpace(redirectTo)
	if base == "" {
		base = strings.TrimSpace(s.cfg.FrontendURL)
	}
	if base == "" {
		base = "http://localhost:5173/reset-password"
	}
	if !strings.Contains(base, "://") {
		base = "https://" + base
	}
	resetURL := buildResetURL(base, token)

	subject := "Reset your Cashual password"
	htmlBody := fmt.Sprintf(
		`<p>We received a request to reset your password.</p><p><a href="%s">Reset password</a></p><p>This link expires in 1 hour. If you did not request this change, you can ignore this email.</p>`,
		html.EscapeString(resetURL),
	)
	if err := email.SendResend(s.cfg.ResendAPIKey, s.cfg.ResendFrom, []string{normalizedEmail}, subject, htmlBody); err != nil {
		return err
	}
	s.audit(ctx, &userID, "password_reset_requested", map[string]any{"email": normalizedEmail})
	return nil
}

func buildResetURL(redirectTo, token string) string {
	u, err := url.Parse(redirectTo)
	if err != nil {
		return fmt.Sprintf("http://localhost:5173/reset-password?token=%s", url.QueryEscape(token))
	}
	q := u.Query()
	q.Set("token", token)
	u.RawQuery = q.Encode()
	return u.String()
}

func (s *Service) ResetPasswordWithToken(ctx context.Context, token, password string) error {
	sum := sha256.Sum256([]byte(token))
	tokenHash := base64.RawURLEncoding.EncodeToString(sum[:])

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var userID uuid.UUID
	err = tx.QueryRow(ctx, `
		SELECT user_id
		FROM password_reset_tokens
		WHERE token_hash = $1
		  AND used_at IS NULL
		  AND expires_at > now()
		FOR UPDATE
	`, tokenHash).Scan(&userID)
	if err != nil {
		return ErrInvalidCredentials
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `UPDATE app_users SET password_hash = $1 WHERE id = $2`, string(hash), userID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		UPDATE password_reset_tokens
		SET used_at = now()
		WHERE token_hash = $1
	`, tokenHash); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		UPDATE auth_sessions
		SET revoked_at = now(), revoke_reason = 'password_reset'
		WHERE user_id = $1 AND revoked_at IS NULL
	`, userID); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return err
	}
	s.audit(ctx, &userID, "password_reset_completed", map[string]any{})
	return nil
}

func (s *Service) issuePair(ctx context.Context, id uuid.UUID, email string, familyID uuid.UUID, parentJTI uuid.UUID) (*TokenPair, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	pair, _, err := s.issuePairTx(ctx, tx, id, email, familyID, parentJTI)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return pair, nil
}

func (s *Service) issuePairTx(ctx context.Context, tx pgx.Tx, id uuid.UUID, email string, familyID uuid.UUID, parentJTI uuid.UUID) (*TokenPair, uuid.UUID, error) {
	if familyID == uuid.Nil {
		familyID = uuid.New()
	}
	var pid int64
	_ = tx.QueryRow(ctx, `SELECT id FROM profiles WHERE auth_user_id = $1 LIMIT 1`, id).Scan(&pid)
	access, err := SignAccess(s.cfg.JWTSecret, s.cfg.JWTIssuer, s.cfg.JWTAudience, id, email, pid, s.cfg.AccessTTL)
	if err != nil {
		return nil, uuid.Nil, err
	}
	refresh, refreshJTI, err := SignRefresh(s.cfg.JWTSecret, s.cfg.JWTIssuer, s.cfg.JWTAudience, id, s.cfg.RefreshTTL)
	if err != nil {
		return nil, uuid.Nil, err
	}
	refreshJTIUUID, err := uuid.Parse(refreshJTI)
	if err != nil {
		return nil, uuid.Nil, err
	}
	var parent *uuid.UUID
	if parentJTI != uuid.Nil {
		parent = &parentJTI
	}
	meta := requestMetaFromContext(ctx)
	if _, err := tx.Exec(ctx, `
		INSERT INTO auth_sessions (user_id, family_id, refresh_jti, parent_jti, expires_at, ip_address, user_agent)
		VALUES ($1,$2,$3,$4,$5,$6,$7)
	`, id, familyID, refreshJTIUUID, parent, time.Now().Add(s.cfg.RefreshTTL), meta.IP, meta.UserAgent); err != nil {
		return nil, uuid.Nil, err
	}
	return &TokenPair{
		AccessToken:  access,
		RefreshToken: refresh,
		ExpiresIn:    int64(s.cfg.AccessTTL.Seconds()),
	}, refreshJTIUUID, nil
}

func (s *Service) RevokeAllSessions(ctx context.Context, userID uuid.UUID, reason string) {
	_, _ = s.pool.Exec(ctx, `
		UPDATE auth_sessions
		SET revoked_at = now(), revoke_reason = $2
		WHERE user_id = $1 AND revoked_at IS NULL
	`, userID, reason)
}

func (s *Service) audit(ctx context.Context, userID *uuid.UUID, event string, details map[string]any) {
	meta := requestMetaFromContext(ctx)
	d, _ := json.Marshal(details)
	_, _ = s.pool.Exec(ctx, `
		INSERT INTO auth_audit_events (user_id, event_type, ip_address, user_agent, details)
		VALUES ($1, $2, $3, $4, $5::jsonb)
	`, userID, event, meta.IP, meta.UserAgent, string(d))
}
