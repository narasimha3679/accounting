package middleware

import (
	"log"
	"os"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// CORSMiddleware configures CORS settings
func CORSMiddleware() gin.HandlerFunc {
	config := cors.DefaultConfig()

	// Get allowed origins from environment variable
	allowedOrigins := os.Getenv("CORS_ORIGIN")
	if allowedOrigins == "" {
		// Default origins for development and production
		allowedOrigins = "http://localhost:5173,http://localhost,http://localhost:80"
	}

	// Split multiple origins if provided
	origins := []string{}
	if allowedOrigins != "" {
		// Handle comma-separated origins
		for _, origin := range strings.Split(allowedOrigins, ",") {
			origins = append(origins, strings.TrimSpace(origin))
		}
	}

	config.AllowOrigins = origins
	config.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization"}
	config.AllowCredentials = true

	// Log the configured origins for debugging
	log.Printf("CORS configured with origins: %v", origins)

	return cors.New(config)
}
