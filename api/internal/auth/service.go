package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/accounting/api/internal/config"
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

func NewService(pool *pgxpool.Pool, cfg *config.Config) *Service {
	return &Service{pool: pool, cfg: cfg}
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
	if _, err := tx.Exec(ctx, `
		INSERT INTO auth_sessions (user_id, family_id, refresh_jti, parent_jti, expires_at)
		VALUES ($1,$2,$3,$4,$5)
	`, id, familyID, refreshJTIUUID, parent, time.Now().Add(s.cfg.RefreshTTL)); err != nil {
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
	d, _ := json.Marshal(details)
	_, _ = s.pool.Exec(ctx, `
		INSERT INTO auth_audit_events (user_id, event_type, details)
		VALUES ($1, $2, $3::jsonb)
	`, userID, event, string(d))
}
