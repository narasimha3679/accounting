package companyhttp

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	appctx "github.com/accounting/api/internal/ctx"
	"github.com/accounting/api/internal/config"
	"github.com/accounting/api/internal/email"
	"github.com/accounting/api/internal/httpx"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func isOwner(u *appctx.User, companyID int64) bool {
	for _, m := range u.Memberships {
		if m.CompanyID == companyID && m.Role == "owner" {
			return true
		}
	}
	if u.ProfileCompanyID != nil && *u.ProfileCompanyID == companyID && u.Role == "owner" {
		return true
	}
	return false
}

func Register(r chi.Router, pool *pgxpool.Pool, cfg *config.Config) {
	r.Get("/invitation-preview", func(w http.ResponseWriter, r *http.Request) {
		u, ok := appctx.UserFrom(r.Context())
		if !ok || u.ProfileID == 0 {
			httpx.ProblemJSON(w, http.StatusUnauthorized, "Unauthorized", "profile required", "auth")
			return
		}
		token := r.URL.Query().Get("token")
		if token == "" {
			httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", "token required", "validation")
			return
		}

		var companyName, role string
		err := pool.QueryRow(r.Context(), `
			SELECT c.name, uc.role
			FROM user_companies uc
			JOIN companies c ON c.id = uc.company_id
			WHERE uc.invite_token = $1
			  AND uc.user_id = $2
			  AND uc.invite_status = 'pending'
			LIMIT 1
		`, token, u.ProfileID).Scan(&companyName, &role)
		if err == nil {
			httpx.WriteJSON(w, http.StatusOK, map[string]any{
				"company_name": companyName,
				"role":         role,
				"email":        u.Email,
			})
			return
		}

		err = pool.QueryRow(r.Context(), `
			SELECT c.name, p.role
			FROM pending_shareholder_invites p
			JOIN companies c ON c.id = p.company_id
			WHERE p.invite_token = $1
			  AND p.claimed_at IS NULL
			  AND p.expires_at > now()
			  AND lower(p.email) = lower($2)
			LIMIT 1
		`, token, u.Email).Scan(&companyName, &role)
		if err != nil {
			httpx.ProblemJSON(w, http.StatusNotFound, "Not Found", "Invitation not found or has expired", "invite")
			return
		}

		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"company_name": companyName,
			"role":         role,
			"email":        u.Email,
		})
	})

	r.Post("/invite", func(w http.ResponseWriter, r *http.Request) {
		u, ok := appctx.UserFrom(r.Context())
		if !ok {
			httpx.ProblemJSON(w, http.StatusUnauthorized, "Unauthorized", "", "auth")
			return
		}
		var body struct {
			Email       string `json:"email"`
			Name        string `json:"name"`
			Role        string `json:"role"`
			CompanyID   int64  `json:"company_id"`
			Permissions any    `json:"permissions"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Email == "" || body.CompanyID == 0 {
			httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", "email and company_id required", "validation")
			return
		}
		if !isOwner(u, body.CompanyID) {
			httpx.ProblemJSON(w, http.StatusForbidden, "Forbidden", "owner only", "forbidden")
			return
		}
		tokenBytes := make([]byte, 16)
		_, _ = rand.Read(tokenBytes)
		token := hex.EncodeToString(tokenBytes)
		exp := time.Now().AddDate(0, 0, 7)
		var inviteID int64
		err := pool.QueryRow(r.Context(), `
			INSERT INTO pending_shareholder_invites
			(company_id, email, name, role, permissions, invite_token, invited_by, expires_at)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
			RETURNING id`,
			body.CompanyID, body.Email, nz(body.Name, body.Email), nz(body.Role, "viewer"), body.Permissions, token, u.AppUserID.String(), exp,
		).Scan(&inviteID)
		if err != nil {
			httpx.ProblemJSON(w, http.StatusInternalServerError, "Server Error", err.Error(), "db")
			return
		}
		var cname string
		_ = pool.QueryRow(r.Context(), `SELECT name FROM companies WHERE id = $1`, body.CompanyID).Scan(&cname)
		link := fmt.Sprintf("%s/accept-invitation?token=%s", cfg.FrontendURL, token)
		html := fmt.Sprintf(`<p>You have been invited to join %s.</p><p><a href="%s">Accept invitation</a></p>`, cname, link)
		if err := email.SendResend(cfg.ResendAPIKey, cfg.ResendFrom, []string{body.Email}, "Company invitation", html); err != nil {
			httpx.WriteJSON(w, http.StatusOK, map[string]any{
				"success": true, "warning": true, "message": "Invite created but email failed",
				"invite":  map[string]any{"id": inviteID, "invite_token": token},
			})
			return
		}
		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"success": true, "message": "Invitation sent successfully",
			"invite":  map[string]any{"id": inviteID, "invite_token": token},
		})
	})

	r.Post("/send-invitation", func(w http.ResponseWriter, r *http.Request) {
		u, ok := appctx.UserFrom(r.Context())
		if !ok {
			httpx.ProblemJSON(w, http.StatusUnauthorized, "Unauthorized", "", "auth")
			return
		}
		var body struct {
			Email       string `json:"email"`
			Name        string `json:"name"`
			Role        string `json:"role"`
			CompanyID   int64  `json:"company_id"`
			InviteToken string `json:"invite_token"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Email == "" {
			httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", "invalid body", "validation")
			return
		}
		if !isOwner(u, body.CompanyID) {
			httpx.ProblemJSON(w, http.StatusForbidden, "Forbidden", "", "forbidden")
			return
		}
		var cname string
		_ = pool.QueryRow(r.Context(), `SELECT name FROM companies WHERE id = $1`, body.CompanyID).Scan(&cname)
		link := fmt.Sprintf("%s/accept-invitation?token=%s", cfg.FrontendURL, body.InviteToken)
		html := fmt.Sprintf(`<p>Reminder: join %s.</p><p><a href="%s">Accept invitation</a></p>`, cname, link)
		if err := email.SendResend(cfg.ResendAPIKey, cfg.ResendFrom, []string{body.Email}, "Company invitation reminder", html); err != nil {
			httpx.ProblemJSON(w, http.StatusInternalServerError, "Server Error", err.Error(), "email")
			return
		}
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": true})
	})

	r.Post("/accept", func(w http.ResponseWriter, r *http.Request) {
		u, ok := appctx.UserFrom(r.Context())
		if !ok || u.ProfileID == 0 {
			httpx.ProblemJSON(w, http.StatusUnauthorized, "Unauthorized", "profile required", "auth")
			return
		}
		var body struct {
			InviteToken string `json:"invite_token"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.InviteToken == "" {
			httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", "invite_token required", "validation")
			return
		}
		var inv struct {
			ID        int64
			CompanyID int64
			Role      string
			Perm      any
		}
		err := pool.QueryRow(r.Context(), `
			SELECT id, company_id, role, permissions FROM pending_shareholder_invites
			WHERE invite_token = $1 AND claimed_at IS NULL AND expires_at > now()`, body.InviteToken,
		).Scan(&inv.ID, &inv.CompanyID, &inv.Role, &inv.Perm)
		if err != nil {
			httpx.ProblemJSON(w, http.StatusNotFound, "Not Found", "Invalid or expired invitation", "invite")
			return
		}
		_, err = pool.Exec(r.Context(), `
			INSERT INTO user_companies (user_id, company_id, role, permissions, is_primary, invite_status, invite_token)
			VALUES ($1,$2,$3,$4,false,'accepted',$5)`,
			u.ProfileID, inv.CompanyID, inv.Role, inv.Perm, body.InviteToken)
		if err != nil {
			httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", err.Error(), "db")
			return
		}
		_, _ = pool.Exec(r.Context(), `UPDATE pending_shareholder_invites SET claimed_at = now() WHERE id = $1`, inv.ID)
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": true, "company_id": inv.CompanyID})
	})

	r.Put("/{memberId}", func(w http.ResponseWriter, r *http.Request) {
		u, ok := appctx.UserFrom(r.Context())
		if !ok {
			httpx.ProblemJSON(w, http.StatusUnauthorized, "Unauthorized", "", "auth")
			return
		}
		mid, _ := strconv.ParseInt(chi.URLParam(r, "memberId"), 10, 64)
		var companyID int64
		if err := pool.QueryRow(r.Context(), `SELECT company_id FROM user_companies WHERE id = $1`, mid).Scan(&companyID); err != nil {
			httpx.ProblemJSON(w, http.StatusNotFound, "Not Found", "", "nf")
			return
		}
		if !isOwner(u, companyID) {
			httpx.ProblemJSON(w, http.StatusForbidden, "Forbidden", "", "forbidden")
			return
		}
		var patch struct {
			Role        *string `json:"role"`
			Permissions any     `json:"permissions"`
		}
		_ = json.NewDecoder(r.Body).Decode(&patch)
		if patch.Role != nil {
			_, _ = pool.Exec(r.Context(), `UPDATE user_companies SET role = $1 WHERE id = $2`, *patch.Role, mid)
		}
		if patch.Permissions != nil {
			_, _ = pool.Exec(r.Context(), `UPDATE user_companies SET permissions = $1 WHERE id = $2`, patch.Permissions, mid)
		}
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": true})
	})

	r.Delete("/{memberId}", func(w http.ResponseWriter, r *http.Request) {
		u, ok := appctx.UserFrom(r.Context())
		if !ok {
			httpx.ProblemJSON(w, http.StatusUnauthorized, "Unauthorized", "", "auth")
			return
		}
		mid, _ := strconv.ParseInt(chi.URLParam(r, "memberId"), 10, 64)
		var companyID int64
		if err := pool.QueryRow(r.Context(), `SELECT company_id FROM user_companies WHERE id = $1`, mid).Scan(&companyID); err != nil {
			httpx.ProblemJSON(w, http.StatusNotFound, "Not Found", "", "nf")
			return
		}
		if !isOwner(u, companyID) {
			httpx.ProblemJSON(w, http.StatusForbidden, "Forbidden", "", "forbidden")
			return
		}
		_, err := pool.Exec(r.Context(), `DELETE FROM user_companies WHERE id = $1`, mid)
		if err != nil {
			httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", err.Error(), "db")
			return
		}
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": true})
	})
}

func nz(a, b string) string {
	if a != "" {
		return a
	}
	return b
}
