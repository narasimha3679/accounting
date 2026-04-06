package auth

import (
	"encoding/json"
	"net/http"

	appctx "github.com/accounting/api/internal/ctx"
	"github.com/accounting/api/internal/httpx"
)

// MeHTTP returns the current user as profile+memberships or employee+company (JSON for the React app).
func (s *Service) MeHTTP(w http.ResponseWriter, r *http.Request) {
	u, ok := appctx.UserFrom(r.Context())
	if !ok {
		httpx.ProblemJSON(w, http.StatusUnauthorized, "Unauthorized", "", "auth")
		return
	}

	if u.IsEmployee && u.EmployeeID != nil {
		var raw []byte
		err := s.pool.QueryRow(r.Context(), `
			SELECT json_build_object(
				'kind', 'employee',
				'employee', row_to_json(e.*),
				'company', row_to_json(c.*)
			)
			FROM employees e
			JOIN companies c ON c.id = e.company_id
			WHERE e.id = $1
		`, *u.EmployeeID).Scan(&raw)
		if err != nil {
			httpx.ProblemJSON(w, http.StatusInternalServerError, "Server Error", err.Error(), "me")
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(raw)
		return
	}

	var profileRaw []byte
	err := s.pool.QueryRow(r.Context(), `
		SELECT row_to_json(p.*)
		FROM profiles p
		WHERE p.id = $1
	`, u.ProfileID).Scan(&profileRaw)
	if err != nil {
		httpx.ProblemJSON(w, http.StatusForbidden, "Forbidden", "profile not found", "me")
		return
	}

	rows, err := s.pool.Query(r.Context(), `
		SELECT json_build_object(
			'id', uc.id,
			'user_id', uc.user_id,
			'company_id', uc.company_id,
			'role', uc.role,
			'permissions', uc.permissions,
			'is_primary', uc.is_primary,
			'invite_status', uc.invite_status,
			'created_at', uc.created_at,
			'updated_at', uc.updated_at,
			'company', row_to_json(c.*)
		)
		FROM user_companies uc
		JOIN companies c ON c.id = uc.company_id
		WHERE uc.user_id = $1 AND uc.invite_status = 'accepted'
		ORDER BY uc.is_primary DESC
	`, u.ProfileID)
	if err != nil {
		httpx.ProblemJSON(w, http.StatusInternalServerError, "Server Error", err.Error(), "me")
		return
	}
	defer rows.Close()

	var memberships []json.RawMessage
	for rows.Next() {
		var m json.RawMessage
		if err := rows.Scan(&m); err != nil {
			httpx.ProblemJSON(w, http.StatusInternalServerError, "Server Error", err.Error(), "me")
			return
		}
		memberships = append(memberships, m)
	}

	out := map[string]any{
		"kind":        "profile",
		"profile":     json.RawMessage(profileRaw),
		"memberships": memberships,
	}
	httpx.WriteJSON(w, http.StatusOK, out)
}
