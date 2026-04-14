package pushhttp

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	appctx "github.com/accounting/api/internal/ctx"
	"github.com/accounting/api/internal/httpx"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/SherClockHolmes/webpush-go"
)

func Register(r chi.Router, pool *pgxpool.Pool, vapidPrivate, vapidPublic, vapidSubject string) {
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

		rows, err := pool.Query(r.Context(), `
			SELECT id, endpoint, p256dh, auth
			FROM push_subscriptions
			WHERE enabled = true AND user_id::text = $1
		`, u.AppUserID.String())
		if err != nil {
			httpx.ProblemJSON(w, http.StatusInternalServerError, "Server Error", err.Error(), "db")
			return
		}
		defer rows.Close()

		type sub struct {
			ID       int64
			Endpoint string
			P256dh   string
			Auth     string
		}
		var subs []sub
		for rows.Next() {
			var s sub
			if err := rows.Scan(&s.ID, &s.Endpoint, &s.P256dh, &s.Auth); err != nil {
				httpx.ProblemJSON(w, http.StatusInternalServerError, "Server Error", err.Error(), "scan")
				return
			}
			subs = append(subs, s)
		}
		if rows.Err() != nil {
			httpx.ProblemJSON(w, http.StatusInternalServerError, "Server Error", rows.Err().Error(), "scan")
			return
		}
		if len(subs) == 0 {
			httpx.ProblemJSON(w, http.StatusNotFound, "Not Found", "No enabled push subscriptions found", "no_subscriptions")
			return
		}

		payload, _ := json.Marshal(map[string]string{
			"title": "Cashual test notification",
			"body":  "Push delivery is configured correctly.",
		})

		success := 0
		failed := 0
		for _, s := range subs {
			resp, err := webpush.SendNotification(payload, &webpush.Subscription{
				Endpoint: s.Endpoint,
				Keys: webpush.Keys{
					P256dh: s.P256dh,
					Auth:   s.Auth,
				},
			}, &webpush.Options{
				Subscriber:      vapidSubject,
				VAPIDPublicKey:  vapidPublic,
				VAPIDPrivateKey: vapidPrivate,
				TTL:             30,
			})
			if err != nil {
				failed++
				continue
			}

			_, _ = io.Copy(io.Discard, resp.Body)
			_ = resp.Body.Close()
			if resp.StatusCode >= 200 && resp.StatusCode < 300 {
				success++
				continue
			}

			failed++
			if resp.StatusCode == http.StatusGone || resp.StatusCode == http.StatusNotFound {
				_, _ = pool.Exec(r.Context(), `DELETE FROM push_subscriptions WHERE id = $1`, s.ID)
			}
		}

		msg := fmt.Sprintf("Delivered %d test notification(s), %d failed", success, failed)
		if success == 0 {
			httpx.ProblemJSON(w, http.StatusBadGateway, "Delivery Failed", msg, "push_delivery")
			return
		}
		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"success":  true,
			"sent":     success,
			"failed":   failed,
			"message":  msg,
			"receiver": u.Email,
		})
	})
}
