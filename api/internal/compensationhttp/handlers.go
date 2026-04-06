package compensationhttp

import (
	"encoding/json"
	"math"
	"net/http"
	"net/http/httptest"
	"strconv"
	"time"

	appctx "github.com/accounting/api/internal/ctx"
	"github.com/accounting/api/internal/httpx"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func Register(r chi.Router, pool *pgxpool.Pool) {
	r.Get("/active", active(pool))
	r.Get("/progress", progress(pool))
	r.Post("/", upsert(pool))
	r.Get("/recommend-withdrawal", recommendWithdrawal(pool))
	r.Post("/generate-options", placeholder)
	r.Post("/optimize-custom", placeholder)
}

func placeholder(w http.ResponseWriter, r *http.Request) {
	httpx.WriteJSON(w, 200, map[string]any{"message": "Handled on frontend", "note": "server placeholder"})
}

func canCompany(u *appctx.User, cid int64) bool {
	for _, x := range u.CompanyIDs {
		if x == cid {
			return true
		}
	}
	return false
}

func active(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u, ok := appctx.UserFrom(r.Context())
		if !ok || u.ProfileID == 0 {
			httpx.ProblemJSON(w, 401, "Unauthorized", "", "")
			return
		}
		cid, _ := strconv.ParseInt(r.URL.Query().Get("company_id"), 10, 64)
		if cid == 0 && u.ProfileCompanyID != nil {
			cid = *u.ProfileCompanyID
		}
		fy, _ := strconv.Atoi(r.URL.Query().Get("fiscal_year"))
		if fy == 0 {
			fy = time.Now().Year()
		}
		if !canCompany(u, cid) {
			httpx.ProblemJSON(w, 403, "Forbidden", "", "")
			return
		}
		var raw []byte
		err := pool.QueryRow(r.Context(), `
			SELECT row_to_json(s)::text FROM compensation_strategies s
			WHERE company_id = $1 AND owner_id = $2 AND fiscal_year = $3 AND status = 'active' LIMIT 1`,
			cid, u.ProfileID, fy).Scan(&raw)
		if err == pgx.ErrNoRow || len(raw) == 0 {
			httpx.WriteJSON(w, 200, map[string]any{"hasStrategy": false})
			return
		}
		if err != nil {
			httpx.ProblemJSON(w, 500, "Server Error", err.Error(), "")
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(raw)
	}
}

func progress(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u, ok := appctx.UserFrom(r.Context())
		if !ok || u.ProfileID == 0 {
			httpx.ProblemJSON(w, 401, "Unauthorized", "", "")
			return
		}
		cid, _ := strconv.ParseInt(r.URL.Query().Get("company_id"), 10, 64)
		if cid == 0 && u.ProfileCompanyID != nil {
			cid = *u.ProfileCompanyID
		}
		fy, _ := strconv.Atoi(r.URL.Query().Get("fiscal_year"))
		if fy == 0 {
			fy = time.Now().Year()
		}
		if !canCompany(u, cid) {
			httpx.ProblemJSON(w, 403, "Forbidden", "", "")
			return
		}
		var stratRaw []byte
		err := pool.QueryRow(r.Context(), `
			SELECT row_to_json(s)::text FROM compensation_strategies s
			WHERE company_id = $1 AND owner_id = $2 AND fiscal_year = $3 AND status = 'active' LIMIT 1`,
			cid, u.ProfileID, fy).Scan(&stratRaw)
		if err == pgx.ErrNoRow || len(stratRaw) == 0 {
			httpx.WriteJSON(w, 200, map[string]any{"hasStrategy": false})
			return
		}
		if err != nil {
			httpx.ProblemJSON(w, 500, "Server Error", err.Error(), "")
			return
		}
		var strat map[string]any
		_ = json.Unmarshal(stratRaw, &strat)

		var defDiv string
		_ = pool.QueryRow(r.Context(), `SELECT COALESCE(default_dividend_type::text,'non_eligible') FROM companies WHERE id = $1`, cid).Scan(&defDiv)
		var ownerEmail, authUUID string
		_ = pool.QueryRow(r.Context(), `SELECT email, auth_user_id::text FROM profiles WHERE id = $1`, u.ProfileID).Scan(&ownerEmail, &authUUID)

		start := strconv.Itoa(fy) + "-01-01"
		end := strconv.Itoa(fy) + "-12-31"
		var ytdSalary float64
		rows, _ := pool.Query(r.Context(), `
			SELECT id FROM employees WHERE company_id = $1 AND (email = $2 OR auth_user_id::text = $3)`, cid, ownerEmail, authUUID)
		var eids []int64
		for rows.Next() {
			var eid int64
			_ = rows.Scan(&eid)
			eids = append(eids, eid)
		}
		rows.Close()
		if len(eids) > 0 {
			_ = pool.QueryRow(r.Context(), `
				SELECT COALESCE(SUM(amount),0) FROM salaries
				WHERE company_id = $1 AND employee_id = ANY($2::bigint[])
				AND payment_date >= $3 AND payment_date <= $4`,
				cid, eids, start, end).Scan(&ytdSalary)
		}
		var ytdElig, ytdNon float64
		divs, _ := pool.Query(r.Context(), `
			SELECT amount, dividend_type::text FROM dividends
			WHERE company_id = $1 AND fiscal_year = $2 AND status IN ('declared','paid')`, cid, fy)
		for divs.Next() {
			var amt float64
			var dt string
			_ = divs.Scan(&amt, &dt)
			if dt == "eligible" {
				ytdElig += amt
			} else {
				ytdNon += amt
			}
		}
		divs.Close()

		plannedSal, _ := strat["planned_salary"].(float64)
		plannedE, _ := strat["planned_eligible_dividends"].(float64)
		plannedN, _ := strat["planned_non_eligible_dividends"].(float64)

		salP := pct(ytdSalary, plannedSal)
		elP := pct(ytdElig, plannedE)
		neP := pct(ytdNon, plannedN)
		totalPlanned := plannedSal + plannedE + plannedN
		totalYtd := ytdSalary + ytdElig + ytdNon
		ov := pct(totalYtd, totalPlanned)
		rec := nextRec(plannedSal-ytdSalary, plannedE-ytdElig, plannedN-ytdNon, defDiv)

		httpx.WriteJSON(w, 200, map[string]any{
			"hasStrategy":    true,
			"strategy":       strat,
			"ytd": map[string]any{
				"salary": ytdSalary, "eligibleDividends": ytdElig, "nonEligibleDividends": ytdNon, "total": totalYtd,
			},
			"progress": map[string]any{
				"salary": round2(salP), "eligibleDividends": round2(elP), "nonEligibleDividends": round2(neP), "overall": round2(ov),
			},
			"recommendation": rec,
		})
	}
}

func upsert(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u, ok := appctx.UserFrom(r.Context())
		if !ok || u.ProfileID == 0 {
			httpx.ProblemJSON(w, 401, "Unauthorized", "", "")
			return
		}
		var body map[string]any
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			httpx.ProblemJSON(w, 400, "Bad Request", "", "")
			return
		}
		cid := int64(body["company_id"].(float64))
		if !canCompany(u, cid) {
			httpx.ProblemJSON(w, 403, "Forbidden", "", "")
			return
		}
		fy := int(body["fiscal_year"].(float64))
		var raw []byte
		err := pool.QueryRow(r.Context(), `
			INSERT INTO compensation_strategies AS s
			(company_id, owner_id, fiscal_year, goal_type, target_net_cash, planned_salary, planned_eligible_dividends, planned_non_eligible_dividends,
			 projected_net_cash, projected_total_tax, projected_rrsp_room, projected_cpp_contributions, projected_effective_tax_rate,
			 corporate_net_income, rdtoh_balance, other_personal_income, province, status)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
			ON CONFLICT (company_id, owner_id, fiscal_year) DO UPDATE SET
			 goal_type = EXCLUDED.goal_type,
			 target_net_cash = EXCLUDED.target_net_cash,
			 planned_salary = EXCLUDED.planned_salary,
			 planned_eligible_dividends = EXCLUDED.planned_eligible_dividends,
			 planned_non_eligible_dividends = EXCLUDED.planned_non_eligible_dividends,
			 projected_net_cash = EXCLUDED.projected_net_cash,
			 projected_total_tax = EXCLUDED.projected_total_tax,
			 projected_rrsp_room = EXCLUDED.projected_rrsp_room,
			 projected_cpp_contributions = EXCLUDED.projected_cpp_contributions,
			 projected_effective_tax_rate = EXCLUDED.projected_effective_tax_rate,
			 corporate_net_income = EXCLUDED.corporate_net_income,
			 rdtoh_balance = EXCLUDED.rdtoh_balance,
			 other_personal_income = EXCLUDED.other_personal_income,
			 province = EXCLUDED.province,
			 status = EXCLUDED.status
			RETURNING row_to_json(s)::text`,
			cid, u.ProfileID, fy,
			body["goal_type"], body["target_net_cash"], body["planned_salary"], body["planned_eligible_dividends"], body["planned_non_eligible_dividends"],
			body["projected_net_cash"], body["projected_total_tax"], body["projected_rrsp_room"], body["projected_cpp_contributions"], body["projected_effective_tax_rate"],
			body["corporate_net_income"], body["rdtoh_balance"], body["other_personal_income"], nzStr(body["province"], "ON"), "active",
		).Scan(&raw)
		if err != nil {
			httpx.ProblemJSON(w, 400, "Bad Request", err.Error(), "")
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(raw)
	}
}

func recommendWithdrawal(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u, ok := appctx.UserFrom(r.Context())
		if !ok || u.ProfileID == 0 {
			httpx.ProblemJSON(w, 401, "Unauthorized", "", "")
			return
		}
		cid, _ := strconv.ParseInt(r.URL.Query().Get("company_id"), 10, 64)
		if cid == 0 && u.ProfileCompanyID != nil {
			cid = *u.ProfileCompanyID
		}
		fy, _ := strconv.Atoi(r.URL.Query().Get("fiscal_year"))
		if fy == 0 {
			fy = time.Now().Year()
		}
		amt, _ := strconv.ParseFloat(r.URL.Query().Get("amount"), 64)
		if !canCompany(u, cid) || amt <= 0 {
			httpx.ProblemJSON(w, 400, "Bad Request", "company_id and positive amount required", "")
			return
		}
		recw := httptest.NewRecorder()
		progress(pool).ServeHTTP(recw, r)
		var resp map[string]any
		_ = json.Unmarshal(recw.Body.Bytes(), &resp)
		if resp["hasStrategy"] == false {
			httpx.WriteJSON(w, 200, map[string]any{"hasStrategy": false, "message": "No active strategy"})
			return
		}
		rec, _ := resp["recommendation"].(map[string]any)
		typ, _ := rec["type"].(string)
		rem, _ := rec["remaining"].(float64)
		reason, _ := rec["reason"].(string)
		suggested := math.Min(amt, rem)
		httpx.WriteJSON(w, 200, map[string]any{
			"hasStrategy":     true,
			"recommendedType": typ,
			"reason":          reason,
			"suggestedAmount": suggested,
			"message":         "Based on your strategy, process this withdrawal accordingly.",
		})
	}
}

func pct(y, p float64) float64 {
	if p <= 0 {
		return 0
	}
	return (y / p) * 100
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}

func nextRec(salRem, elRem, neRem float64, defDiv string) map[string]any {
	if salRem > 0 {
		return map[string]any{"type": "salary", "remaining": salRem, "reason": "Salary first for CPP/RRSP"}
	}
	if defDiv == "eligible" && elRem > 0 {
		return map[string]any{"type": "eligible_dividend", "remaining": elRem, "reason": "Eligible dividends"}
	}
	if neRem > 0 {
		return map[string]any{"type": "non_eligible_dividend", "remaining": neRem, "reason": "Non-eligible dividends"}
	}
	if elRem > 0 {
		return map[string]any{"type": "eligible_dividend", "remaining": elRem, "reason": "Eligible dividends"}
	}
	return map[string]any{"type": "complete", "remaining": 0.0, "reason": "Targets met"}
}

func nzStr(v any, def string) string {
	if s, ok := v.(string); ok && s != "" {
		return s
	}
	return def
}
