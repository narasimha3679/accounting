package auth

import "testing"

func TestBuildResetURL_AppendsToken(t *testing.T) {
	got := buildResetURL("https://cashual.org/reset-password", "abc123")
	want := "https://cashual.org/reset-password?token=abc123"
	if got != want {
		t.Fatalf("expected %q, got %q", want, got)
	}
}

func TestBuildResetURL_PreservesExistingQuery(t *testing.T) {
	got := buildResetURL("https://cashual.org/reset-password?source=email", "abc123")
	want := "https://cashual.org/reset-password?source=email&token=abc123"
	if got != want {
		t.Fatalf("expected %q, got %q", want, got)
	}
}
