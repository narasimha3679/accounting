package pushhttp

import (
	"net/http"

	appctx "github.com/accounting/api/internal/ctx"
	"github.com/accounting/api/internal/httpx"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func Register(r chi.Router, pool *pgxpool.Pool, vapidPrivate, vapidPublic string) {
	if vapidPrivate == "" || vapidPublic == "" {
		r.Post("/test", func(w http.ResponseWriter, r *http.Request) {
			httpx.ProblemJSON(w, http.StatusServiceUnavailable, "Unavailable", "VAPID keys not configured", "vapid")
		})
		return
	}
	r.Post("/test", func(w http.ResponseWriter, r *http.Request) {
		u, ok := appctx.UserFrom(r.Context())
		if !ok {
			httpx.ProblemJSON(w, 401, "Unauthorized", "", "")
			return
		}
		_ = pool
		_ = u
		httpx.WriteJSON(w, 200, map[string]any{"success": false, "message": "Push delivery not yet wired in Go; configure VAPID and subscription lookup."})
	})
}
