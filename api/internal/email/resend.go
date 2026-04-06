package email

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

func SendResend(apiKey, from string, to []string, subject, html string) error {
	if apiKey == "" {
		return fmt.Errorf("RESEND_API_KEY not configured")
	}
	body, _ := json.Marshal(map[string]any{
		"from":    from,
		"to":      to,
		"subject": subject,
		"html":    html,
	})
	req, err := http.NewRequest(http.MethodPost, "https://api.resend.com/emails", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		var buf bytes.Buffer
		_, _ = buf.ReadFrom(resp.Body)
		return fmt.Errorf("resend: %s", buf.String())
	}
	return nil
}
