package auth

import (
	"encoding/json"
	"errors"
	"net/http"
	"sync"
	"time"

	appctx "github.com/accounting/api/internal/ctx"
	"github.com/accounting/api/internal/httpx"
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

type loginAttempt struct {
	Count       int
	WindowStart time.Time
	LockedUntil time.Time
}

var (
	loginAttemptsMu sync.Mutex
	loginAttempts   = map[string]loginAttempt{}
)

func clientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		return xff
	}
	return r.RemoteAddr
}

func loginAllowed(ip string) bool {
	loginAttemptsMu.Lock()
	defer loginAttemptsMu.Unlock()
	a := loginAttempts[ip]
	now := time.Now()
	if now.Before(a.LockedUntil) {
		return false
	}
	if a.WindowStart.IsZero() || now.Sub(a.WindowStart) > 15*time.Minute {
		a = loginAttempt{WindowStart: now}
	}
	loginAttempts[ip] = a
	return true
}

func recordLoginFailure(ip string) {
	loginAttemptsMu.Lock()
	defer loginAttemptsMu.Unlock()
	a := loginAttempts[ip]
	now := time.Now()
	if a.WindowStart.IsZero() || now.Sub(a.WindowStart) > 15*time.Minute {
		a = loginAttempt{WindowStart: now}
	}
	a.Count++
	if a.Count >= 8 {
		a.LockedUntil = now.Add(15 * time.Minute)
	}
	loginAttempts[ip] = a
}

func recordLoginSuccess(ip string) {
	loginAttemptsMu.Lock()
	defer loginAttemptsMu.Unlock()
	delete(loginAttempts, ip)
}

func (s *Service) RegisterHTTP(w http.ResponseWriter, r *http.Request) {
	if !loginAllowed(clientIP(r)) {
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
	tokens, err := s.Register(r.Context(), b.Email, b.Password, b.Name)
	if err != nil {
		httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", err.Error(), "register_failed")
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, tokens)
}

func (s *Service) LoginHTTP(w http.ResponseWriter, r *http.Request) {
	ip := clientIP(r)
	if !loginAllowed(ip) {
		httpx.ProblemJSON(w, http.StatusTooManyRequests, "Too Many Requests", "try again later", "rate_limited")
		return
	}
	var b loginBody
	if err := json.NewDecoder(r.Body).Decode(&b); err != nil {
		httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", "invalid json", "bad_request")
		return
	}
	tokens, err := s.Login(r.Context(), b.Email, b.Password)
	if err != nil {
		if errors.Is(err, ErrInvalidCredentials) {
			recordLoginFailure(ip)
			httpx.ProblemJSON(w, http.StatusUnauthorized, "Unauthorized", "invalid credentials", "auth_failed")
			return
		}
		httpx.ProblemJSON(w, http.StatusInternalServerError, "Server Error", err.Error(), "internal")
		return
	}
	recordLoginSuccess(ip)
	httpx.WriteJSON(w, http.StatusOK, tokens)
}

func (s *Service) RefreshHTTP(w http.ResponseWriter, r *http.Request) {
	if !loginAllowed(clientIP(r)) {
		httpx.ProblemJSON(w, http.StatusTooManyRequests, "Too Many Requests", "try again later", "rate_limited")
		return
	}
	var b refreshBody
	if err := json.NewDecoder(r.Body).Decode(&b); err != nil {
		httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", "invalid json", "bad_request")
		return
	}
	tokens, err := s.Refresh(r.Context(), b.RefreshToken)
	if err != nil {
		httpx.ProblemJSON(w, http.StatusUnauthorized, "Unauthorized", "invalid refresh token", "auth_failed")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, tokens)
}

func (s *Service) LogoutHTTP(w http.ResponseWriter, r *http.Request) {
	u, ok := appctx.UserFrom(r.Context())
	if !ok {
		httpx.ProblemJSON(w, http.StatusUnauthorized, "Unauthorized", "", "auth")
		return
	}
	s.RevokeAllSessions(r.Context(), u.AppUserID, "logout")
	s.audit(r.Context(), &u.AppUserID, "logout", map[string]any{})
	httpx.WriteJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
