package middleware

import (
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// CORSMiddleware configures CORS settings
func CORSMiddleware() gin.HandlerFunc {
	config := cors.DefaultConfig()

	// Get allowed origins from environment variable
	allowedOrigins := os.Getenv("CORS_ORIGIN")
	if allowedOrigins == "" {
		allowedOrigins = "http://localhost:5173"
	}

	config.AllowOrigins = []string{allowedOrigins}
	config.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization"}
	config.AllowCredentials = true

	return cors.New(config)
}
