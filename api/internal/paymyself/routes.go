
package paymyself

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"os/exec"

	"github.com/accounting/api/internal/httpx"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func RegisterOptimize(r chi.Router, pool *pgxpool.Pool, legacyScript string) {
	r.Post("/optimize", func(w http.ResponseWriter, r *http.Request) {
		if err := optimizerRuntimeError(legacyScript); err != nil {
			httpx.ProblemJSON(w, http.StatusServiceUnavailable, "Unavailable", err.Error(), "optimizer_unavailable")
			return
		}
		var body map[string]any
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			httpx.ProblemJSON(w, http.StatusBadRequest, "Bad Request", "invalid json", "bad_request")
			return
		}
		taxYear := intFromAny(body["taxYear"], 2025)
		province, _ := body["province"].(string)
		if province == "" {
			province = "ON"
		}
		bundle, err := LoadTaxBundle(r.Context(), pool, taxYear, province)
		if err != nil {
			httpx.ProblemJSON(w, http.StatusInternalServerError, "Server Error", err.Error(), "tax_load")
			return
		}
		raw, err := json.Marshal(bundle)
		if err != nil {
			httpx.ProblemJSON(w, http.StatusInternalServerError, "Server Error", err.Error(), "marshal")
			return
		}
		f, err := os.CreateTemp("", "tax-*.json")
		if err != nil {
			httpx.ProblemJSON(w, http.StatusInternalServerError, "Server Error", err.Error(), "temp")
			return
		}
		path := f.Name()
		defer os.Remove(path)
		if _, err := f.Write(raw); err != nil {
			f.Close()
			httpx.ProblemJSON(w, http.StatusInternalServerError, "Server Error", err.Error(), "write")
			return
		}
		f.Close()
		params, _ := json.Marshal(body)
		cmd := exec.Command("node", legacyScript, string(params))
		cmd.Env = append(os.Environ(), "TAX_DATA_PATH="+path)
		out, err := cmd.CombinedOutput()
		if err != nil {
			httpx.ProblemJSON(w, http.StatusInternalServerError, "Optimizer Error", string(out), "node")
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, string(out))
	})
}

func optimizerRuntimeError(legacyScript string) error {
	if _, err := exec.LookPath("node"); err != nil {
		return errors.New("optimizer runtime unavailable: node is not installed")
	}
	if _, err := os.Stat(legacyScript); err != nil {
		return errors.New("optimizer runtime unavailable: script file is missing")
	}
	return nil
}

func intFromAny(v any, def int) int {
	switch x := v.(type) {
	case float64:
		return int(x)
	case int:
		return x
	default:
		return def
	}
}
