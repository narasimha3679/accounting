package employeehttp

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"strconv"
	"strings"

	appctx "github.com/accounting/api/internal/ctx"
	"github.com/accounting/api/internal/httpx"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

func hasCompanyAccess(u *appctx.User, companyID int64) bool {
	for _, c := range u.CompanyIDs {
		if c == companyID {
			return true
		}
	}
	return false
}

func managerRole(u *appctx.User) bool {
	switch u.Role {
	case "owner", "admin", "accountant":
		return true
	default:
		for _, m := range u.Memberships {
			if m.Role == "owner" || m.Role == "accountant" {
				return true
			}
		}
	}
	return false
}

func Register(r chi.Router, pool *pgxpool.Pool) {
	r.Post("/", createEmployee(pool))
	r.Delete("/{id}", deleteEmployee(pool))
	r.Post("/{id}/reset-password", resetPassword(pool, true))
	r.Put("/{id}/email", updateEmail(pool))
	r.Put("/{id}/password", resetPassword(pool, false))
}

func createEmployee(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u, ok := appctx.UserFrom(r.Context())
		if !ok || !managerRole(u) {
			httpx.ProblemJSON(w, http.StatusForbidden, "Forbidden", "", "forbidden")
			return
		}
		var body map[string]any
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", "", "bad")
			return
		}
		companyID := int64(body["company_id"].(float64))
		if !hasCompanyAccess(u, companyID) {
			httpx.ProblemJSON(w, http.StatusForbidden, "Forbidden", "", "forbidden")
			return
		}
		email, _ := body["email"].(string)
		first, _ := body["first_name"].(string)
		last, _ := body["last_name"].(string)
		pwd, _ := body["initialPassword"].(string)
		if pwd == "" {
			pwd = randomPassword(16)
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(pwd), bcrypt.DefaultCost)
		if err != nil {
			httpx.ProblemJSON(w, 500, "Server Error", err.Error(), "")
			return
		}
		uid := uuid.New()
		tx, err := pool.Begin(r.Context())
		if err != nil {
			httpx.ProblemJSON(w, 500, "Server Error", err.Error(), "")
			return
		}
		defer func() { _ = tx.Rollback(r.Context()) }()
		if _, err := tx.Exec(r.Context(), `INSERT INTO app_users (id, email, password_hash) VALUES ($1,$2,$3)`, uid, email, string(hash)); err != nil {
			httpx.ProblemJSON(w, 400, "Bad Request", err.Error(), "")
			return
		}
		eid := ""
		if v, ok := body["employee_id"].(string); ok && v != "" {
			eid = v
		}
		if eid == "" {
			var cnt int64
			_ = tx.QueryRow(r.Context(), `SELECT COUNT(*) FROM employees WHERE company_id = $1`, companyID).Scan(&cnt)
			eid = fmt.Sprintf("EMP%d", cnt+1)
		}
		var newID int64
		err = tx.QueryRow(r.Context(), `
			INSERT INTO employees (company_id, auth_user_id, employee_id, first_name, last_name, email, phone, position, hire_date, status, address, sin, payrate, payrate_type)
			VALUES ($1,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
			RETURNING id`,
			companyID, uid.String(), eid, first, last, email,
			strPtr(body["phone"]), strPtr(body["position"]), strPtr(body["hire_date"]),
			strPtrDef(body["status"], "active"), strPtr(body["address"]), strPtr(body["sin"]),
			body["payrate"], body["payrate_type"],
		).Scan(&newID)
		if err != nil {
			_, _ = tx.Exec(r.Context(), `DELETE FROM app_users WHERE id = $1`, uid)
			httpx.ProblemJSON(w, 400, "Bad Request", err.Error(), "")
			return
		}
		if err := tx.Commit(r.Context()); err != nil {
			httpx.ProblemJSON(w, 500, "Server Error", err.Error(), "")
			return
		}
		var raw []byte
		if err := pool.QueryRow(r.Context(), `SELECT row_to_json(e)::text FROM employees e WHERE id = $1`, newID).Scan(&raw); err != nil {
			httpx.WriteJSON(w, http.StatusCreated, map[string]any{"id": newID})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		_, _ = io.WriteString(w, string(raw))
	}
}

func deleteEmployee(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u, ok := appctx.UserFrom(r.Context())
		if !ok || !managerRole(u) {
			httpx.ProblemJSON(w, http.StatusForbidden, "Forbidden", "", "forbidden")
			return
		}
		id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
		var companyID int64
		var authID *string
		if err := pool.QueryRow(r.Context(), `SELECT company_id, auth_user_id::text FROM employees WHERE id = $1`, id).Scan(&companyID, &authID); err != nil {
			httpx.ProblemJSON(w, 404, "Not Found", "", "")
			return
		}
		if !hasCompanyAccess(u, companyID) {
			httpx.ProblemJSON(w, 403, "Forbidden", "", "")
			return
		}
		var payload struct {
			DeleteAuthUser *bool `json:"deleteAuthUser"`
		}
		_ = json.NewDecoder(r.Body).Decode(&payload)
		delAuth := payload.DeleteAuthUser == nil || *payload.DeleteAuthUser
		if _, err := pool.Exec(r.Context(), `DELETE FROM employees WHERE id = $1`, id); err != nil {
			httpx.ProblemJSON(w, 400, "Bad Request", err.Error(), "")
			return
		}
		if delAuth && authID != nil && *authID != "" {
			_, _ = pool.Exec(r.Context(), `DELETE FROM app_users WHERE id = $1::uuid`, *authID)
		}
		httpx.WriteJSON(w, 200, map[string]any{"success": true})
	}
}

func resetPassword(pool *pgxpool.Pool, generated bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u, ok := appctx.UserFrom(r.Context())
		if !ok || !managerRole(u) {
			httpx.ProblemJSON(w, 403, "Forbidden", "", "")
			return
		}
		id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
		var companyID int64
		var authID *string
		if err := pool.QueryRow(r.Context(), `SELECT company_id, auth_user_id::text FROM employees WHERE id = $1`, id).Scan(&companyID, &authID); err != nil {
			httpx.ProblemJSON(w, 404, "Not Found", "", "")
			return
		}
		if !hasCompanyAccess(u, companyID) {
			httpx.ProblemJSON(w, 403, "Forbidden", "", "")
			return
		}
		if authID == nil || *authID == "" {
			httpx.ProblemJSON(w, 400, "Bad Request", "no auth user", "")
			return
		}
		pwd := randomPassword(16)
		if !generated {
			var b struct {
				NewPassword string `json:"newPassword"`
			}
			_ = json.NewDecoder(r.Body).Decode(&b)
			if b.NewPassword != "" {
				pwd = b.NewPassword
			}
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(pwd), bcrypt.DefaultCost)
		if err != nil {
			httpx.ProblemJSON(w, 500, "Server Error", err.Error(), "")
			return
		}
		if _, err := pool.Exec(r.Context(), `UPDATE app_users SET password_hash = $1 WHERE id = $2::uuid`, string(hash), *authID); err != nil {
			httpx.ProblemJSON(w, 400, "Bad Request", err.Error(), "")
			return
		}
		if generated {
			httpx.WriteJSON(w, 200, map[string]any{"password": pwd})
		} else {
			httpx.WriteJSON(w, 200, map[string]any{"success": true})
		}
	}
}

func updateEmail(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u, ok := appctx.UserFrom(r.Context())
		if !ok || !managerRole(u) {
			httpx.ProblemJSON(w, 403, "Forbidden", "", "")
			return
		}
		var b struct {
			NewEmail string `json:"newEmail"`
		}
		_ = json.NewDecoder(r.Body).Decode(&b)
		id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
		var companyID int64
		var authID *string
		if err := pool.QueryRow(r.Context(), `SELECT company_id, auth_user_id::text FROM employees WHERE id = $1`, id).Scan(&companyID, &authID); err != nil {
			httpx.ProblemJSON(w, 404, "Not Found", "", "")
			return
		}
		if !hasCompanyAccess(u, companyID) {
			httpx.ProblemJSON(w, 403, "Forbidden", "", "")
			return
		}
		if _, err := pool.Exec(r.Context(), `UPDATE app_users SET email = $1 WHERE id = $2::uuid`, b.NewEmail, *authID); err != nil {
			httpx.ProblemJSON(w, 400, "Bad Request", err.Error(), "")
			return
		}
		if _, err := pool.Exec(r.Context(), `UPDATE employees SET email = $1 WHERE id = $2`, b.NewEmail, id); err != nil {
			httpx.ProblemJSON(w, 400, "Bad Request", err.Error(), "")
			return
		}
		httpx.WriteJSON(w, 200, map[string]any{"success": true})
	}
}

func strPtr(v any) *string {
	if v == nil {
		return nil
	}
	s, ok := v.(string)
	if !ok || s == "" {
		return nil
	}
	return &s
}

func strPtrDef(v any, def string) *string {
	if p := strPtr(v); p != nil {
		return p
	}
	return &def
}

func randomPassword(n int) string {
	const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
	var b strings.Builder
	for i := 0; i < n; i++ {
		x, _ := rand.Int(rand.Reader, big.NewInt(int64(len(chars))))
		b.WriteByte(chars[x.Int64()])
	}
	return b.String()
}
