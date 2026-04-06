package paymyself

import (
	"net/http"
	"strconv"

	appctx "github.com/accounting/api/internal/ctx"
	"github.com/accounting/api/internal/httpx"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func RegisterYTD(r chi.Router, pool *pgxpool.Pool) {
	r.Get("/ytd-income/{companyId}/{memberId}", func(w http.ResponseWriter, r *http.Request) {
		u, ok := appctx.UserFrom(r.Context())
		if !ok {
			httpx.ProblemJSON(w, http.StatusUnauthorized, "Unauthorized", "", "auth")
			return
		}
		cid, _ := strconv.ParseInt(chi.URLParam(r, "companyId"), 10, 64)
		memberStr := chi.URLParam(r, "memberId")
		profileID, _ := strconv.ParseInt(memberStr, 10, 64)
		fy := 2025
		if v := r.URL.Query().Get("fiscalYear"); v != "" {
			if n, err := strconv.Atoi(v); err == nil {
				fy = n
			}
		}
		if !hasCompany(u, cid) {
			httpx.ProblemJSON(w, http.StatusForbidden, "Forbidden", "company access", "forbidden")
			return
		}
		start := strconv.Itoa(fy) + "-01-01"
		end := strconv.Itoa(fy) + "-12-31"
		var ytdSalaries float64
		var empID int64
		_ = pool.QueryRow(r.Context(), `
			SELECT id FROM employees WHERE company_id = $1 AND user_id = $2 LIMIT 1`, cid, profileID).Scan(&empID)
		if empID != 0 {
			rows, err := pool.Query(r.Context(), `
				SELECT COALESCE(SUM(amount),0) FROM salaries
				WHERE company_id = $1 AND employee_id = $2
				AND payment_date >= $3 AND payment_date <= $4
				AND status IN ('paid','pending')`, cid, empID, start, end)
			if err == nil {
				if rows.Next() {
					_ = rows.Scan(&ytdSalaries)
				}
				rows.Close()
			}
		}
		var ytdDividends float64
		_ = pool.QueryRow(r.Context(), `
			SELECT COALESCE(SUM(amount),0) FROM dividends
			WHERE company_id = $1 AND fiscal_year = $2 AND status IN ('paid','declared')`, cid, fy).Scan(&ytdDividends)
		total := ytdSalaries + ytdDividends
		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"companyId":    cid,
			"memberId":     memberStr,
			"fiscalYear":   fy,
			"ytdSalaries":  round2(ytdSalaries),
			"ytdDividends": round2(ytdDividends),
			"total":        round2(total),
		})
	})
}

func hasCompany(u *appctx.User, cid int64) bool {
	for _, x := range u.CompanyIDs {
		if x == cid {
			return true
		}
	}
	return false
}

func round2(v float64) float64 {
	return float64(int64(v*100+0.5)) / 100
}
