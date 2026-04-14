package data

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strconv"
	"strings"

	appctx "github.com/accounting/api/internal/ctx"
	"github.com/lib/pq"
)

var safeIdent = regexp.MustCompile(`^[a-z_][a-z0-9_]*$`)

type Filter struct {
	Column string `json:"column"`
	Op     string `json:"op"`
	Value  any    `json:"value"`
	Values []any  `json:"values"`
}

type Order struct {
	Column string `json:"column"`
	Asc    bool   `json:"asc"`
}

type SelectBody struct {
	Table   string   `json:"table"`
	Columns string   `json:"columns"`
	Filters []Filter `json:"filters"`
	Order   []Order  `json:"order"`
	Limit   int      `json:"limit"`
	Offset  int      `json:"offset"`
	Count   bool     `json:"count"`
}

type InsertBody struct {
	Table string           `json:"table"`
	Rows  []map[string]any `json:"rows"`
}

type UpdateBody struct {
	Table   string         `json:"table"`
	Patch   map[string]any `json:"patch"`
	Filters []Filter       `json:"filters"`
}

type DeleteBody struct {
	Table   string   `json:"table"`
	Filters []Filter `json:"filters"`
}

type UpsertBody struct {
	Table      string         `json:"table"`
	Row        map[string]any `json:"row"`
	OnConflict string         `json:"onConflict"`
}

func validateIdent(s string) error {
	if !safeIdent.MatchString(s) {
		return fmt.Errorf("invalid identifier %q", s)
	}
	return nil
}

func scopeClause(tbl Table, u *appctx.User, argStart int) (sql string, args []any, next int) {
	n := argStart
	switch tbl.Mode {
	case ModeCompanyID, ModeEmployeeScoped:
		sql = tbl.CompanyExpr + " = ANY($" + itoa(n) + "::bigint[])"
		args = append(args, pq.Array(u.CompanyIDs))
		n++
	case ModeMembershipCompanies:
		sql = "t.id = ANY($" + itoa(n) + "::bigint[])"
		args = append(args, pq.Array(u.CompanyIDs))
		n++
	case ModeProfileSelf:
		sql = "t.auth_user_id = $" + itoa(n) + "::uuid"
		args = append(args, u.AppUserID)
		n++
	case ModeUserCompanies:
		sql = "(t.user_id = $" + itoa(n) + " OR t.company_id = ANY($" + itoa(n+1) + "::bigint[]))"
		args = append(args, u.ProfileID, pq.Array(u.CompanyIDs))
		n += 2
	case ModePushUser:
		// Support UUID (legacy auth id) or bigint profile id in user_id column
		sql = "(t.user_id::text = $" + itoa(n) + " OR t.user_id = $" + itoa(n+1) + ")"
		args = append(args, u.AppUserID.String(), u.ProfileID)
		n += 2
	case ModeReference:
		sql = "true"
	default:
		sql = "false"
	}
	return sql, args, n
}

func itoa(i int) string { return strconv.Itoa(i) }

func filterSQL(filters []Filter, start int) (string, []any, int, error) {
	var b strings.Builder
	var args []any
	n := start
	for _, f := range filters {
		if err := validateIdent(f.Column); err != nil {
			return "", nil, start, err
		}
		col := "t." + f.Column
		switch f.Op {
		case "eq":
			b.WriteString(fmt.Sprintf(" AND %s = $%d", col, n))
			args = append(args, f.Value)
			n++
		case "neq":
			b.WriteString(fmt.Sprintf(" AND %s <> $%d", col, n))
			args = append(args, f.Value)
			n++
		case "gt", "gte", "lt", "lte":
			op := map[string]string{"gt": ">", "gte": ">=", "lt": "<", "lte": "<="}[f.Op]
			b.WriteString(fmt.Sprintf(" AND %s %s $%d", col, op, n))
			args = append(args, f.Value)
			n++
		case "in":
			b.WriteString(fmt.Sprintf(" AND %s = ANY($%d)", col, n))
			args = append(args, pq.Array(f.Values))
			n++
		case "is":
			if f.Value == nil {
				b.WriteString(" AND " + col + " IS NULL")
			}
		case "like", "ilike":
			op := strings.ToUpper(f.Op)
			b.WriteString(fmt.Sprintf(" AND %s %s $%d", col, op, n))
			args = append(args, f.Value)
			n++
		default:
			return "", nil, start, fmt.Errorf("invalid filter operator %q", f.Op)
		}
	}
	return b.String(), args, n, nil
}

func orderSQL(orders []Order) string {
	var b strings.Builder
	for _, o := range orders {
		if validateIdent(o.Column) != nil {
			continue
		}
		dir := "DESC"
		if o.Asc {
			dir = "ASC"
		}
		if b.Len() > 0 {
			b.WriteString(", ")
		}
		b.WriteString("t." + o.Column + " " + dir)
	}
	if b.Len() == 0 {
		return ""
	}
	return " ORDER BY " + b.String()
}

func mustJSON(v any) []byte {
	b, _ := json.Marshal(v)
	return b
}
