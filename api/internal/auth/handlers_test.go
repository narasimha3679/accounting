package auth

import (
	"net/http/httptest"
	"testing"
)

func TestClientIP_UsesFirstForwardedIP(t *testing.T) {
	r := httptest.NewRequest("GET", "/", nil)
	r.Header.Set("X-Forwarded-For", "203.0.113.1, 10.0.0.2")
	got := clientIP(r)
	if got != "203.0.113.1" {
		t.Fatalf("expected first forwarded IP, got %q", got)
	}
}
