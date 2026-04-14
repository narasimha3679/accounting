package auth

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	appctx "github.com/accounting/api/internal/ctx"
	"github.com/accounting/api/internal/httpx"
	"github.com/jackc/pgx/v5"
)

type registerBody struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

type loginBody struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type refreshBody struct {
	RefreshToken string `json:"refresh_token"`
}

type forgotPasswordBody struct {
	Email      string `json:"email"`
	RedirectTo string `json:"redirect_to"`
}

type resetPasswordBody struct {
	Token    string `json:"token"`
	Password string `json:"password"`
}

const (
	authWindow = 15 * time.Minute
	authMax    = 8
)

func clientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		if len(parts) > 0 {
			return strings.TrimSpace(parts[0])
		}
		return strings.TrimSpace(xff)
	}
	return r.RemoteAddr
}

func loginAllowed(r *http.Request, s *Service, ip string) (bool, error) {
	now := time.Now()
	var failedCount int
	var windowStart time.Time
	var lockedUntil *time.Time
	err := s.pool.QueryRow(r.Context(), `
		SELECT failed_count, window_start, locked_until
		FROM auth_rate_limits
		WHERE ip_address = $1
	`, ip).Scan(&failedCount, &windowStart, &lockedUntil)
	if err != nil {
		if !errors.Is(err, pgx.ErrNoRows) {
			return false, err
		}
		// Seed row if missing.
		_, execErr := s.pool.Exec(r.Context(), `
			INSERT INTO auth_rate_limits (ip_address, failed_count, window_start, locked_until, updated_at)
			VALUES ($1, 0, $2, NULL, now())
			ON CONFLICT (ip_address) DO NOTHING
		`, ip, now)
		if execErr != nil {
			return false, execErr
		}
		return true, nil
	}

	if lockedUntil != nil && now.Before(*lockedUntil) {
		return false, nil
	}
	if now.Sub(windowStart) > authWindow {
		_, execErr := s.pool.Exec(r.Context(), `
			UPDATE auth_rate_limits
			SET failed_count = 0, window_start = $2, locked_until = NULL, updated_at = now()
			WHERE ip_address = $1
		`, ip, now)
		if execErr != nil {
			return false, execErr
		}
	}
	return true, nil
}

func recordLoginFailure(r *http.Request, s *Service, ip string) {
	now := time.Now()
	tx, err := s.pool.Begin(r.Context())
	if err != nil {
		return
	}
	defer func() { _ = tx.Rollback(r.Context()) }()
	var failedCount int
	var windowStart time.Time
	var lockedUntil *time.Time
	err = tx.QueryRow(r.Context(), `
		SELECT failed_count, window_start, locked_until
		FROM auth_rate_limits
		WHERE ip_address = $1
		FOR UPDATE
	`, ip).Scan(&failedCount, &windowStart, &lockedUntil)
	if err != nil {
		if !errors.Is(err, pgx.ErrNoRows) {
			return
		}
		_, _ = tx.Exec(r.Context(), `
			INSERT INTO auth_rate_limits (ip_address, failed_count, window_start, locked_until, updated_at)
			VALUES ($1, 1, $2, NULL, now())
			ON CONFLICT (ip_address) DO NOTHING
		`, ip, now)
		_ = tx.Commit(r.Context())
		return
	}
	if now.Sub(windowStart) > authWindow {
		failedCount = 0
		windowStart = now
		lockedUntil = nil
	}
	failedCount++
	var nextLocked *time.Time
	if failedCount >= authMax {
		lock := now.Add(authWindow)
		nextLocked = &lock
	}
	_, _ = tx.Exec(r.Context(), `
		UPDATE auth_rate_limits
		SET failed_count = $2, window_start = $3, locked_until = $4, updated_at = now()
		WHERE ip_address = $1
	`, ip, failedCount, windowStart, nextLocked)
	_ = tx.Commit(r.Context())
}

func recordLoginSuccess(r *http.Request, s *Service, ip string) {
	_, _ = s.pool.Exec(r.Context(), `
		UPDATE auth_rate_limits
		SET failed_count = 0, window_start = $2, locked_until = NULL, updated_at = now()
		WHERE ip_address = $1
	`, ip, time.Now())
}

func (s *Service) RegisterHTTP(w http.ResponseWriter, r *http.Request) {
	ip := clientIP(r)
	ok, err := loginAllowed(r, s, ip)
	if err != nil {
		httpx.ProblemJSON(w, http.StatusInternalServerError, "Server Error", fmt.Sprintf("rate-limit: %v", err), "internal")
		return
	}
	if !ok {
		httpx.ProblemJSON(w, http.StatusTooManyRequests, "Too Many Requests", "try again later", "rate_limited")
		return
	}
	var b registerBody
	if err := json.NewDecoder(r.Body).Decode(&b); err != nil {
		httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", "invalid json", "bad_request")
		return
	}
	if b.Email == "" || b.Password == "" || len(b.Password) < 8 {
		httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", "email and password (8+ chars) required", "validation")
		return
	}
	ctx := withRequestMeta(r.Context(), ip, r.UserAgent())
	tokens, err := s.Register(ctx, b.Email, b.Password, b.Name)
	if err != nil {
		httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", err.Error(), "register_failed")
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, tokens)
}

func (s *Service) LoginHTTP(w http.ResponseWriter, r *http.Request) {
	ip := clientIP(r)
	ok, err := loginAllowed(r, s, ip)
	if err != nil {
		httpx.ProblemJSON(w, http.StatusInternalServerError, "Server Error", fmt.Sprintf("rate-limit: %v", err), "internal")
		return
	}
	if !ok {
		httpx.ProblemJSON(w, http.StatusTooManyRequests, "Too Many Requests", "try again later", "rate_limited")
		return
	}
	var b loginBody
	if err := json.NewDecoder(r.Body).Decode(&b); err != nil {
		httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", "invalid json", "bad_request")
		return
	}
	ctx := withRequestMeta(r.Context(), ip, r.UserAgent())
	tokens, err := s.Login(ctx, b.Email, b.Password)
	if err != nil {
		if errors.Is(err, ErrInvalidCredentials) {
			recordLoginFailure(r, s, ip)
			httpx.ProblemJSON(w, http.StatusUnauthorized, "Unauthorized", "invalid credentials", "auth_failed")
			return
		}
		httpx.ProblemJSON(w, http.StatusInternalServerError, "Server Error", err.Error(), "internal")
		return
	}
	recordLoginSuccess(r, s, ip)
	httpx.WriteJSON(w, http.StatusOK, tokens)
}

func (s *Service) RefreshHTTP(w http.ResponseWriter, r *http.Request) {
	ip := clientIP(r)
	ok, err := loginAllowed(r, s, ip)
	if err != nil {
		httpx.ProblemJSON(w, http.StatusInternalServerError, "Server Error", fmt.Sprintf("rate-limit: %v", err), "internal")
		return
	}
	if !ok {
		httpx.ProblemJSON(w, http.StatusTooManyRequests, "Too Many Requests", "try again later", "rate_limited")
		return
	}
	var b refreshBody
	if err := json.NewDecoder(r.Body).Decode(&b); err != nil {
		httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", "invalid json", "bad_request")
		return
	}
	ctx := withRequestMeta(r.Context(), ip, r.UserAgent())
	tokens, err := s.Refresh(ctx, b.RefreshToken)
	if err != nil {
		httpx.ProblemJSON(w, http.StatusUnauthorized, "Unauthorized", "invalid refresh token", "auth_failed")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, tokens)
}

func (s *Service) ForgotPasswordHTTP(w http.ResponseWriter, r *http.Request) {
	ip := clientIP(r)
	ok, err := loginAllowed(r, s, ip)
	if err != nil {
		httpx.ProblemJSON(w, http.StatusInternalServerError, "Server Error", fmt.Sprintf("rate-limit: %v", err), "internal")
		return
	}
	if !ok {
		httpx.ProblemJSON(w, http.StatusTooManyRequests, "Too Many Requests", "try again later", "rate_limited")
		return
	}
	var b forgotPasswordBody
	if err := json.NewDecoder(r.Body).Decode(&b); err != nil {
		httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", "invalid json", "bad_request")
		return
	}
	if b.Email == "" {
		httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", "email required", "validation")
		return
	}
	ctx := withRequestMeta(r.Context(), ip, r.UserAgent())
	if err := s.ForgotPassword(ctx, b.Email, b.RedirectTo, ip, r.UserAgent()); err != nil {
		httpx.ProblemJSON(w, http.StatusInternalServerError, "Server Error", err.Error(), "forgot_password")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (s *Service) ResetPasswordHTTP(w http.ResponseWriter, r *http.Request) {
	ip := clientIP(r)
	ok, err := loginAllowed(r, s, ip)
	if err != nil {
		httpx.ProblemJSON(w, http.StatusInternalServerError, "Server Error", fmt.Sprintf("rate-limit: %v", err), "internal")
		return
	}
	if !ok {
		httpx.ProblemJSON(w, http.StatusTooManyRequests, "Too Many Requests", "try again later", "rate_limited")
		return
	}
	var b resetPasswordBody
	if err := json.NewDecoder(r.Body).Decode(&b); err != nil {
		httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", "invalid json", "bad_request")
		return
	}
	if b.Token == "" || len(b.Password) < 8 {
		httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", "token and password (8+ chars) required", "validation")
		return
	}
	ctx := withRequestMeta(r.Context(), ip, r.UserAgent())
	if err := s.ResetPasswordWithToken(ctx, b.Token, b.Password); err != nil {
		if errors.Is(err, ErrInvalidCredentials) {
			httpx.ProblemJSON(w, http.StatusUnauthorized, "Unauthorized", "invalid or expired reset token", "auth_failed")
			return
		}
		httpx.ProblemJSON(w, http.StatusInternalServerError, "Server Error", err.Error(), "reset_password")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (s *Service) LogoutHTTP(w http.ResponseWriter, r *http.Request) {
	u, ok := appctx.UserFrom(r.Context())
	if !ok {
		httpx.ProblemJSON(w, http.StatusUnauthorized, "Unauthorized", "", "auth")
		return
	}
	ctx := withRequestMeta(r.Context(), clientIP(r), r.UserAgent())
	s.RevokeAllSessions(ctx, u.AppUserID, "logout")
	s.audit(ctx, &u.AppUserID, "logout", map[string]any{})
	httpx.WriteJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
