package auth

import (
	"encoding/json"
	"net/http"

	appctx "github.com/accounting/api/internal/ctx"
	"github.com/accounting/api/internal/httpx"
	"golang.org/x/crypto/bcrypt"
)

func (s *Service) UpdatePasswordHTTP(w http.ResponseWriter, r *http.Request) {
	ctx := withRequestMeta(r.Context(), clientIP(r), r.UserAgent())
	u, ok := appctx.UserFrom(r.Context())
	if !ok {
		httpx.ProblemJSON(w, http.StatusUnauthorized, "Unauthorized", "", "auth")
		return
	}
	var b struct {
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&b); err != nil || len(b.Password) < 8 {
		httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", "password (8+ chars) required", "validation")
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(b.Password), bcrypt.DefaultCost)
	if err != nil {
		httpx.ProblemJSON(w, http.StatusInternalServerError, "Server Error", err.Error(), "internal")
		return
	}
	if _, err := s.pool.Exec(ctx, `UPDATE app_users SET password_hash = $1 WHERE id = $2`, string(hash), u.AppUserID); err != nil {
		httpx.ProblemJSON(w, http.StatusInternalServerError, "Server Error", err.Error(), "internal")
		return
	}
	s.RevokeAllSessions(ctx, u.AppUserID, "password_changed")
	s.audit(ctx, &u.AppUserID, "password_changed", map[string]any{})
	httpx.WriteJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
