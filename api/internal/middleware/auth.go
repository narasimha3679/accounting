package middleware

import (
	"context"
	"net/http"
	"strconv"
	"strings"

	"github.com/accounting/api/internal/auth"
	appctx "github.com/accounting/api/internal/ctx"
	"github.com/accounting/api/internal/config"
	"github.com/accounting/api/internal/httpx"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Auth struct {
	pool *pgxpool.Pool
	cfg  *config.Config
}

func NewAuth(pool *pgxpool.Pool, cfg *config.Config) *Auth {
	return &Auth{pool: pool, cfg: cfg}
}

func (a *Auth) Authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := r.Header.Get("Authorization")
		if !strings.HasPrefix(strings.ToLower(h), "bearer ") {
			httpx.ProblemJSON(w, http.StatusUnauthorized, "Unauthorized", "missing bearer token", "auth")
			return
		}
		raw := strings.TrimSpace(h[7:])
		claims, err := auth.Parse(a.cfg.JWTSecret, raw, a.cfg.JWTIssuer, a.cfg.JWTAudience)
		if err != nil || claims.Type != "access" {
			httpx.ProblemJSON(w, http.StatusUnauthorized, "Unauthorized", "invalid token", "auth")
			return
		}
		uid, err := uuid.Parse(claims.Subject)
		if err != nil {
			httpx.ProblemJSON(w, http.StatusUnauthorized, "Unauthorized", "invalid subject", "auth")
			return
		}
		u, err := a.loadUser(r.Context(), uid)
		if err != nil {
			httpx.ProblemJSON(w, http.StatusForbidden, "Forbidden", "user not found", "profile")
			return
		}
		if hc := r.Header.Get("X-Company-Id"); hc != "" {
			if id, err := strconv.ParseInt(hc, 10, 64); err == nil {
				u.CurrentCompanyID = &id
			}
		}
		next.ServeHTTP(w, r.WithContext(appctx.WithUser(r.Context(), u)))
	})
}

func (a *Auth) loadUser(ctx context.Context, uid uuid.UUID) (*appctx.User, error) {
	u := &appctx.User{AppUserID: uid}

	var pid int64
	var email, fullName, role string
	var pCompany *int64
	err := a.pool.QueryRow(ctx, `
		SELECT id, email, COALESCE(full_name,''), role, company_id
		FROM profiles WHERE auth_user_id = $1`, uid).Scan(&pid, &email, &fullName, &role, &pCompany)
	if err == nil {
		u.ProfileID = pid
		u.Email = email
		u.FullName = fullName
		u.Role = role
		u.ProfileCompanyID = pCompany
		rows, err := a.pool.Query(ctx, `
			SELECT id, company_id, role, permissions, is_primary, invite_status
			FROM user_companies WHERE user_id = $1 AND invite_status = 'accepted'`, pid)
		if err != nil {
			return nil, err
		}
		defer rows.Close()
		seen := map[int64]struct{}{}
		for rows.Next() {
			var m appctx.Membership
			if err := rows.Scan(&m.ID, &m.CompanyID, &m.Role, &m.Permissions, &m.IsPrimary, &m.InviteStatus); err != nil {
				return nil, err
			}
			u.Memberships = append(u.Memberships, m)
			if _, ok := seen[m.CompanyID]; !ok {
				u.CompanyIDs = append(u.CompanyIDs, m.CompanyID)
				seen[m.CompanyID] = struct{}{}
			}
		}
		if pCompany != nil {
			if _, ok := seen[*pCompany]; !ok {
				u.CompanyIDs = append(u.CompanyIDs, *pCompany)
			}
		}
		return u, nil
	}

	var eid, ec int64
	err2 := a.pool.QueryRow(ctx, `
		SELECT id, company_id FROM employees WHERE auth_user_id = $1 LIMIT 1`, uid).Scan(&eid, &ec)
	if err2 != nil {
		return nil, err2
	}
	u.IsEmployee = true
	u.EmployeeID = &eid
	u.EmployeeCompany = &ec
	u.CompanyIDs = []int64{ec}
	u.Role = "employee"
	return u, nil
}
