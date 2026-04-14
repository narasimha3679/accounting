package data

import (
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"strings"

	appctx "github.com/accounting/api/internal/ctx"
	"github.com/accounting/api/internal/httpx"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Handler struct {
	pool *pgxpool.Pool
	reg  map[string]Table
}

func NewHandler(pool *pgxpool.Pool) *Handler {
	return &Handler{pool: pool, reg: Registry()}
}

func (h *Handler) guard(u *appctx.User, tbl Table) error {
	if u.IsEmployee {
		if tbl.Name == "profiles" || tbl.Name == "user_companies" {
			return fmt.Errorf("forbidden")
		}
	}
	if tbl.Mode == ModeUserCompanies && u.ProfileID == 0 {
		return fmt.Errorf("forbidden")
	}
	return nil
}

func scanPoolRows(rows pgx.Rows) ([]map[string]any, error) {
	defer rows.Close()
	var out []map[string]any
	for rows.Next() {
		vals, err := rows.Values()
		if err != nil {
			return nil, err
		}
		m := map[string]any{}
		for i, f := range rows.FieldDescriptions() {
			m[f.Name] = vals[i]
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func (h *Handler) Select(w http.ResponseWriter, r *http.Request) {
	u, ok := appctx.UserFrom(r.Context())
	if !ok {
		httpx.ProblemJSON(w, http.StatusUnauthorized, "Unauthorized", "", "auth")
		return
	}
	var body SelectBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", "invalid json", "bad_request")
		return
	}
	tbl, ok := h.reg[body.Table]
	if !ok {
		httpx.ProblemJSON(w, http.StatusNotFound, "Not Found", "unknown table", "unknown_table")
		return
	}
	if err := h.guard(u, tbl); err != nil {
		httpx.ProblemJSON(w, http.StatusForbidden, "Forbidden", err.Error(), "forbidden")
		return
	}
	cols := body.Columns
	if cols == "" {
		cols = "t.*"
	}
	sc, sargs, n := scopeClause(tbl, u, 1)
	fs, fargs, _, err := filterSQL(body.Filters, n)
	if err != nil {
		httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", err.Error(), "bad_filter")
		return
	}
	allArgs := append(append([]any{}, sargs...), fargs...)
	where := "(" + sc + ")" + fs
	ord := orderSQL(body.Order)
	lim := ""
	if body.Limit > 0 {
		lim = fmt.Sprintf(" LIMIT %d OFFSET %d", body.Limit, body.Offset)
	}
	q := fmt.Sprintf(`SELECT %s FROM %s WHERE %s%s%s`, cols, tbl.FromSQL, where, ord, lim)
	rows, err := h.pool.Query(r.Context(), q, allArgs...)
	if err != nil {
		httpx.ProblemJSON(w, http.StatusInternalServerError, "Server Error", err.Error(), "query")
		return
	}
	data, err := scanPoolRows(rows)
	if err != nil {
		httpx.ProblemJSON(w, http.StatusInternalServerError, "Server Error", err.Error(), "scan")
		return
	}
	resp := map[string]any{"data": data}
	if body.Count {
		cq := fmt.Sprintf(`SELECT count(*) FROM %s WHERE %s`, tbl.FromSQL, where)
		var cnt int64
		if err := h.pool.QueryRow(r.Context(), cq, allArgs...).Scan(&cnt); err != nil {
			httpx.ProblemJSON(w, http.StatusInternalServerError, "Server Error", err.Error(), "count")
			return
		}
		resp["count"] = cnt
	}
	httpx.WriteJSON(w, http.StatusOK, resp)
}

func asInt64(v any) (int64, bool) {
	switch x := v.(type) {
	case int64:
		return x, true
	case int:
		return int64(x), true
	case float64:
		if math.Abs(x-math.Trunc(x)) > 1e-9 {
			return 0, false
		}
		return int64(x), true
	case json.Number:
		i, err := x.Int64()
		return i, err == nil
	default:
		return 0, false
	}
}

func (h *Handler) assertCompanyWrite(u *appctx.User, tbl Table, row map[string]any) error {
	if tbl.Mode != ModeCompanyID && tbl.Mode != ModeEmployeeScoped {
		return nil
	}
	cid, ok := asInt64(row["company_id"])
	if !ok {
		return nil
	}
	if !containsI64(u.CompanyIDs, cid) {
		return fmt.Errorf("company not allowed")
	}
	return nil
}

func containsI64(ids []int64, v int64) bool {
	for _, x := range ids {
		if x == v {
			return true
		}
	}
	return false
}

func (h *Handler) Insert(w http.ResponseWriter, r *http.Request) {
	u, ok := appctx.UserFrom(r.Context())
	if !ok {
		httpx.ProblemJSON(w, http.StatusUnauthorized, "Unauthorized", "", "auth")
		return
	}
	var body InsertBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", "invalid json", "bad_request")
		return
	}
	tbl, ok := h.reg[body.Table]
	if !ok {
		httpx.ProblemJSON(w, http.StatusNotFound, "Not Found", "unknown table", "unknown_table")
		return
	}
	if tbl.ReadOnly {
		httpx.ProblemJSON(w, http.StatusMethodNotAllowed, "Method Not Allowed", "read-only", "readonly")
		return
	}
	if err := h.guard(u, tbl); err != nil {
		httpx.ProblemJSON(w, http.StatusForbidden, "Forbidden", err.Error(), "forbidden")
		return
	}
	if strings.Contains(tbl.FromSQL, "JOIN") {
		httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", "invalid table for insert", "invalid")
		return
	}
	if len(body.Rows) != 1 {
		httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", "exactly one row required", "validation")
		return
	}
	row := body.Rows[0]
	if err := h.assertCompanyWrite(u, tbl, row); err != nil {
		httpx.ProblemJSON(w, http.StatusForbidden, "Forbidden", err.Error(), "scope")
		return
	}
	cols := make([]string, 0, len(row))
	for k := range row {
		if err := validateIdent(k); err != nil {
			httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", err.Error(), "bad_column")
			return
		}
		cols = append(cols, k)
	}
	ph := make([]string, len(cols))
	vals := make([]any, len(cols))
	for i, c := range cols {
		ph[i] = fmt.Sprintf("$%d", i+1)
		vals[i] = row[c]
	}
	q := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s) RETURNING *",
		tbl.Name, strings.Join(cols, ","), strings.Join(ph, ","))
	rows, err := h.pool.Query(r.Context(), q, vals...)
	if err != nil {
		httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", err.Error(), "insert")
		return
	}
	out, err := scanPoolRows(rows)
	if err != nil || len(out) == 0 {
		httpx.ProblemJSON(w, http.StatusInternalServerError, "Server Error", "no row returned", "insert")
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, out[0])
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	u, ok := appctx.UserFrom(r.Context())
	if !ok {
		httpx.ProblemJSON(w, http.StatusUnauthorized, "Unauthorized", "", "auth")
		return
	}
	var body UpdateBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", "invalid json", "bad_request")
		return
	}
	tbl, ok := h.reg[body.Table]
	if !ok || tbl.ReadOnly {
		httpx.ProblemJSON(w, http.StatusNotFound, "Not Found", "unknown or read-only table", "unknown_table")
		return
	}
	if err := h.guard(u, tbl); err != nil {
		httpx.ProblemJSON(w, http.StatusForbidden, "Forbidden", err.Error(), "forbidden")
		return
	}
	if strings.Contains(tbl.FromSQL, "JOIN") {
		httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", "invalid table for update", "invalid")
		return
	}
	if err := h.assertCompanyWrite(u, tbl, body.Patch); err != nil {
		httpx.ProblemJSON(w, http.StatusForbidden, "Forbidden", err.Error(), "scope")
		return
	}
	sc, sargs, n := scopeClause(tbl, u, 1)
	fs, fargs, _, err := filterSQL(body.Filters, n)
	if err != nil {
		httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", err.Error(), "bad_filter")
		return
	}
	all := append(append([]any{}, sargs...), fargs...)
	setParts := make([]string, 0, len(body.Patch))
	i := len(all) + 1
	for k, v := range body.Patch {
		if err := validateIdent(k); err != nil {
			continue
		}
		setParts = append(setParts, fmt.Sprintf("%s = $%d", k, i))
		all = append(all, v)
		i++
	}
	if len(setParts) == 0 {
		httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", "empty patch", "validation")
		return
	}
	q := fmt.Sprintf("UPDATE %s SET %s WHERE (%s)%s RETURNING *",
		tbl.Name, strings.Join(setParts, ","), sc, fs)
	rows, err := h.pool.Query(r.Context(), q, all...)
	if err != nil {
		httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", err.Error(), "update")
		return
	}
	out, err := scanPoolRows(rows)
	if err != nil {
		httpx.ProblemJSON(w, http.StatusInternalServerError, "Server Error", err.Error(), "scan")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"data": out})
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	u, ok := appctx.UserFrom(r.Context())
	if !ok {
		httpx.ProblemJSON(w, http.StatusUnauthorized, "Unauthorized", "", "auth")
		return
	}
	var body DeleteBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", "invalid json", "bad_request")
		return
	}
	tbl, ok := h.reg[body.Table]
	if !ok || tbl.ReadOnly {
		httpx.ProblemJSON(w, http.StatusNotFound, "Not Found", "unknown or read-only table", "unknown_table")
		return
	}
	if err := h.guard(u, tbl); err != nil {
		httpx.ProblemJSON(w, http.StatusForbidden, "Forbidden", err.Error(), "forbidden")
		return
	}
	if strings.Contains(tbl.FromSQL, "JOIN") {
		httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", "invalid table for delete", "invalid")
		return
	}
	sc, sargs, n := scopeClause(tbl, u, 1)
	fs, fargs, _, err := filterSQL(body.Filters, n)
	if err != nil {
		httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", err.Error(), "bad_filter")
		return
	}
	all := append(append([]any{}, sargs...), fargs...)
	q := fmt.Sprintf("DELETE FROM %s WHERE (%s)%s", tbl.Name, sc, fs)
	tag, err := h.pool.Exec(r.Context(), q, all...)
	if err != nil {
		httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", err.Error(), "delete")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"deleted": tag.RowsAffected()})
}

func (h *Handler) Upsert(w http.ResponseWriter, r *http.Request) {
	u, ok := appctx.UserFrom(r.Context())
	if !ok {
		httpx.ProblemJSON(w, http.StatusUnauthorized, "Unauthorized", "", "auth")
		return
	}
	var body UpsertBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", "invalid json", "bad_request")
		return
	}
	tbl, ok := h.reg[body.Table]
	if !ok || tbl.ReadOnly {
		httpx.ProblemJSON(w, http.StatusNotFound, "Not Found", "unknown or read-only table", "unknown_table")
		return
	}
	if err := h.guard(u, tbl); err != nil {
		httpx.ProblemJSON(w, http.StatusForbidden, "Forbidden", err.Error(), "forbidden")
		return
	}
	if strings.Contains(tbl.FromSQL, "JOIN") {
		httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", "invalid table for upsert", "invalid")
		return
	}
	if err := h.assertCompanyWrite(u, tbl, body.Row); err != nil {
		httpx.ProblemJSON(w, http.StatusForbidden, "Forbidden", err.Error(), "scope")
		return
	}
	conflictCols := strings.Split(body.OnConflict, ",")
	var conflictNames []string
	for _, c := range conflictCols {
		c = strings.TrimSpace(c)
		if c == "" {
			continue
		}
		if err := validateIdent(c); err != nil {
			httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", err.Error(), "bad_conflict")
			return
		}
		conflictNames = append(conflictNames, c)
	}
	if len(conflictNames) == 0 {
		httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", "onConflict required", "validation")
		return
	}
	cols := make([]string, 0, len(body.Row))
	for k := range body.Row {
		if err := validateIdent(k); err != nil {
			httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", err.Error(), "bad_column")
			return
		}
		cols = append(cols, k)
	}
	ph := make([]string, len(cols))
	vals := make([]any, len(cols))
	for i, c := range cols {
		ph[i] = fmt.Sprintf("$%d", i+1)
		vals[i] = body.Row[c]
	}
	conflictSet := make(map[string]struct{})
	for _, c := range conflictNames {
		conflictSet[c] = struct{}{}
	}
	var setParts []string
	for _, c := range cols {
		if _, isC := conflictSet[c]; isC {
			continue
		}
		setParts = append(setParts, fmt.Sprintf("%s = EXCLUDED.%s", c, c))
	}
	if len(setParts) == 0 {
		setParts = []string{cols[0] + " = EXCLUDED." + cols[0]}
	}
	q := fmt.Sprintf(
		"INSERT INTO %s (%s) VALUES (%s) ON CONFLICT (%s) DO UPDATE SET %s RETURNING *",
		tbl.Name,
		strings.Join(cols, ","),
		strings.Join(ph, ","),
		strings.Join(conflictNames, ","),
		strings.Join(setParts, ","),
	)
	rows, err := h.pool.Query(r.Context(), q, vals...)
	if err != nil {
		httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", err.Error(), "upsert")
		return
	}
	out, err := scanPoolRows(rows)
	if err != nil || len(out) == 0 {
		httpx.ProblemJSON(w, http.StatusInternalServerError, "Server Error", "no row returned", "upsert")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, out[0])
}
