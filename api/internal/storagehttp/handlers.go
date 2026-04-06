package storagehttp

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	appctx "github.com/accounting/api/internal/ctx"
	"github.com/accounting/api/internal/httpx"
	"github.com/accounting/api/internal/storage"
)

type Handler struct {
	b2 *storage.B2
}

func New(b2 *storage.B2) *Handler {
	return &Handler{b2: b2}
}

func canAccessStorageKey(u *appctx.User, key string) bool {
	parts := strings.SplitN(strings.TrimPrefix(key, "/"), "/", 2)
	if len(parts) < 1 || parts[0] == "" {
		return false
	}
	cid, err := strconv.ParseInt(parts[0], 10, 64)
	if err != nil {
		return false
	}
	if u.IsEmployee {
		return u.EmployeeCompany != nil && *u.EmployeeCompany == cid
	}
	for _, id := range u.CompanyIDs {
		if id == cid {
			return true
		}
	}
	return false
}

func (h *Handler) disabled(w http.ResponseWriter) {
	httpx.ProblemJSON(w, http.StatusServiceUnavailable, "Service Unavailable", "object storage is not configured (B2 env vars)", "storage")
}

type keyBody struct {
	Key         string `json:"key"`
	ContentType string `json:"content_type"`
}

// PresignUpload returns a time-limited URL to PUT an object.
func (h *Handler) PresignUpload(w http.ResponseWriter, r *http.Request) {
	if h.b2 == nil {
		h.disabled(w)
		return
	}
	u, ok := appctx.UserFrom(r.Context())
	if !ok {
		httpx.ProblemJSON(w, http.StatusUnauthorized, "Unauthorized", "", "auth")
		return
	}
	var b keyBody
	if err := json.NewDecoder(r.Body).Decode(&b); err != nil || b.Key == "" {
		httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", "key required", "validation")
		return
	}
	if !canAccessStorageKey(u, b.Key) {
		httpx.ProblemJSON(w, http.StatusForbidden, "Forbidden", "cannot upload to this path", "storage")
		return
	}
	url, err := h.b2.PresignPut(r.Context(), b.Key, b.ContentType, 15*time.Minute)
	if err != nil {
		httpx.ProblemJSON(w, http.StatusInternalServerError, "Server Error", err.Error(), "storage")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]string{"url": url})
}

// PresignDownload returns a time-limited URL to GET an object.
func (h *Handler) PresignDownload(w http.ResponseWriter, r *http.Request) {
	if h.b2 == nil {
		h.disabled(w)
		return
	}
	u, ok := appctx.UserFrom(r.Context())
	if !ok {
		httpx.ProblemJSON(w, http.StatusUnauthorized, "Unauthorized", "", "auth")
		return
	}
	var b keyBody
	if err := json.NewDecoder(r.Body).Decode(&b); err != nil || b.Key == "" {
		httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", "key required", "validation")
		return
	}
	if !canAccessStorageKey(u, b.Key) {
		httpx.ProblemJSON(w, http.StatusForbidden, "Forbidden", "cannot read this path", "storage")
		return
	}
	url, err := h.b2.PresignGet(r.Context(), b.Key, 15*time.Minute)
	if err != nil {
		httpx.ProblemJSON(w, http.StatusInternalServerError, "Server Error", err.Error(), "storage")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]string{"url": url})
}

// Delete removes an object by key.
func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	if h.b2 == nil {
		h.disabled(w)
		return
	}
	u, ok := appctx.UserFrom(r.Context())
	if !ok {
		httpx.ProblemJSON(w, http.StatusUnauthorized, "Unauthorized", "", "auth")
		return
	}
	var b keyBody
	if err := json.NewDecoder(r.Body).Decode(&b); err != nil || b.Key == "" {
		httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", "key required", "validation")
		return
	}
	if !canAccessStorageKey(u, b.Key) {
		httpx.ProblemJSON(w, http.StatusForbidden, "Forbidden", "cannot delete this path", "storage")
		return
	}
	if err := h.b2.Delete(r.Context(), b.Key); err != nil {
		httpx.ProblemJSON(w, http.StatusInternalServerError, "Server Error", err.Error(), "storage")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
