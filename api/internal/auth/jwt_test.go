package auth

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestAccessTokenRoundTrip(t *testing.T) {
	secret := "0123456789abcdef0123456789abcdef"
	issuer := "cashual-api"
	audience := "cashual-web"
	userID := uuid.New()

	token, err := SignAccess(secret, issuer, audience, userID, "user@example.com", 123, 15*time.Minute)
	if err != nil {
		t.Fatalf("SignAccess failed: %v", err)
	}
	claims, err := Parse(secret, token, issuer, audience)
	if err != nil {
		t.Fatalf("Parse failed: %v", err)
	}
	if claims.Type != "access" {
		t.Fatalf("expected access token, got %q", claims.Type)
	}
	if claims.Subject != userID.String() {
		t.Fatalf("unexpected subject: %s", claims.Subject)
	}
}

func TestParseRejectsWrongAudience(t *testing.T) {
	secret := "0123456789abcdef0123456789abcdef"
	userID := uuid.New()
	token, err := SignAccess(secret, "cashual-api", "cashual-web", userID, "user@example.com", 1, 5*time.Minute)
	if err != nil {
		t.Fatalf("SignAccess failed: %v", err)
	}
	if _, err := Parse(secret, token, "cashual-api", "other-audience"); err == nil {
		t.Fatalf("expected parse error for wrong audience")
	}
}
