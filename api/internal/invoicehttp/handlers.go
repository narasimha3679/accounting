package invoicehttp

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	appctx "github.com/accounting/api/internal/ctx"
	"github.com/accounting/api/internal/config"
	"github.com/accounting/api/internal/email"
	"github.com/accounting/api/internal/httpx"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func Register(r chi.Router, pool *pgxpool.Pool, cfg *config.Config) {
	r.Post("/invoice", func(w http.ResponseWriter, r *http.Request) {
		u, ok := appctx.UserFrom(r.Context())
		if !ok || u.ProfileID == 0 {
			httpx.ProblemJSON(w, 401, "Unauthorized", "", "")
			return
		}
		var body struct {
			InvoiceID      int    `json:"invoiceId"`
			RecipientEmail string `json:"recipientEmail"`
			PdfBase64      string `json:"pdfBase64"`
			Message        string `json:"message"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			httpx.ProblemJSON(w, 400, "Bad Request", "", "")
			return
		}
		cid := currentCompany(u)
		var raw []byte
		err := pool.QueryRow(r.Context(), `
			SELECT row_to_json(q)::text FROM (
				SELECT i.*, row_to_json(c) AS client, row_to_json(co) AS company,
					(SELECT json_agg(row_to_json(ii)) FROM invoice_items ii WHERE ii.invoice_id = i.id) AS items
				FROM invoices i
				LEFT JOIN clients c ON c.id = i.client_id
				LEFT JOIN companies co ON co.id = i.company_id
				WHERE i.id = $1 AND i.company_id = $2
			) q`, body.InvoiceID, cid).Scan(&raw)
		if err != nil || len(raw) == 0 {
			httpx.ProblemJSON(w, 404, "Not Found", "invoice not found", "")
			return
		}
		var inv map[string]any
		_ = json.Unmarshal(raw, &inv)
		co := inv["company"].(map[string]any)
		cl := inv["client"].(map[string]any)
		cname, _ := co["name"].(string)
		clname, _ := cl["name"].(string)
		num, _ := inv["invoice_number"].(string)
		total, _ := inv["total"].(float64)
		if body.PdfBase64 == "" {
			httpx.ProblemJSON(w, 400, "Bad Request", "pdf required", "")
			return
		}
		pdf, err := base64.StdEncoding.DecodeString(body.PdfBase64)
		if err != nil {
			httpx.ProblemJSON(w, 400, "Bad Request", "invalid pdf", "")
			return
		}
		_ = pdf
		html := fmt.Sprintf(`<p>Invoice %s from %s for %s (total $%.2f).</p><p>%s</p>`,
			num, cname, clname, total, body.Message)
		if err := email.SendResend(cfg.ResendAPIKey, cfg.ResendFrom, []string{body.RecipientEmail}, fmt.Sprintf("Invoice %s", num), html); err != nil {
			httpx.ProblemJSON(w, 500, "Server Error", err.Error(), "")
			return
		}
		_, _ = pool.Exec(r.Context(), `UPDATE invoices SET status = 'sent' WHERE id = $1`, body.InvoiceID)
		httpx.WriteJSON(w, 200, map[string]any{"success": true})
	})
}

func currentCompany(u *appctx.User) int64 {
	if u.CurrentCompanyID != nil {
		return *u.CurrentCompanyID
	}
	if u.ProfileCompanyID != nil {
		return *u.ProfileCompanyID
	}
	if len(u.CompanyIDs) > 0 {
		return u.CompanyIDs[0]
	}
	return 0
}
