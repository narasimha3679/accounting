package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	HTTPAddr         string
	DatabaseURL      string
	JWTSecret        string
	JWTIssuer        string
	JWTAudience      string
	AccessTTL        time.Duration
	RefreshTTL       time.Duration
	FrontendURLs     []string
	ResendAPIKey     string
	ResendFrom       string
	FrontendURL      string
	GeminiAPIKey     string
	VAPIDPublicKey   string
	VAPIDPrivateKey  string
	VAPIDSubject     string
	B2Endpoint       string
	B2Region         string
	B2Bucket         string
	B2KeyID          string
	B2ApplicationKey string
	MigrationsPath   string
}

func Load() (*Config, error) {
	c := &Config{
		HTTPAddr:       get("HTTP_ADDR", ":8080"),
		DatabaseURL:    os.Getenv("DATABASE_URL"),
		JWTSecret:      os.Getenv("JWT_SECRET"),
		JWTIssuer:      get("JWT_ISSUER", "cashual-api"),
		JWTAudience:    get("JWT_AUDIENCE", "cashual-web"),
		AccessTTL:      minutes("JWT_ACCESS_TTL_MINUTES", 15),
		RefreshTTL:     days("JWT_REFRESH_TTL_DAYS", 30),
		ResendFrom:     get("RESEND_FROM_EMAIL", "onboarding@resend.dev"),
		FrontendURL:    get("FRONTEND_URL", "http://localhost:5173"),
		VAPIDSubject:   get("VAPID_SUBJECT", "mailto:support@example.com"),
		B2Region:       get("B2_REGION", "us-west-000"),
		MigrationsPath: get("MIGRATIONS_PATH", "file://migrations"),
	}
	if v := os.Getenv("FRONTEND_URLS"); v != "" {
		for _, u := range strings.Split(v, ",") {
			u = strings.TrimSpace(u)
			if u != "" {
				c.FrontendURLs = append(c.FrontendURLs, u)
			}
		}
	} else {
		c.FrontendURLs = []string{"http://localhost:3000", "http://localhost:5173", "https://cashual.org"}
	}
	c.ResendAPIKey = os.Getenv("RESEND_API_KEY")
	c.GeminiAPIKey = os.Getenv("GEMINI_API_KEY")
	c.VAPIDPublicKey = os.Getenv("VAPID_PUBLIC_KEY")
	c.VAPIDPrivateKey = os.Getenv("VAPID_PRIVATE_KEY")
	c.B2Endpoint = os.Getenv("B2_S3_ENDPOINT")
	c.B2Bucket = os.Getenv("B2_BUCKET")
	c.B2KeyID = os.Getenv("B2_KEY_ID")
	c.B2ApplicationKey = os.Getenv("B2_APPLICATION_KEY")

	if c.DatabaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}
	if c.JWTSecret == "" || len(c.JWTSecret) < 32 {
		return nil, fmt.Errorf("JWT_SECRET must be set and at least 32 characters")
	}
	return c, nil
}

func get(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func minutes(key string, def int) time.Duration {
	v := os.Getenv(key)
	if v == "" {
		return time.Duration(def) * time.Minute
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return time.Duration(def) * time.Minute
	}
	return time.Duration(n) * time.Minute
}

func days(key string, def int) time.Duration {
	v := os.Getenv(key)
	if v == "" {
		return time.Duration(def) * 24 * time.Hour
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return time.Duration(def) * 24 * time.Hour
	}
	return time.Duration(n) * 24 * time.Hour
}
