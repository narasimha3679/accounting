package utils

import (
	"os"
	"time"

	"accounting-backend/models"

	"github.com/golang-jwt/jwt/v5"
)

// Claims represents the JWT claims
type Claims struct {
	UserID    uint   `json:"user_id"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	CompanyID uint   `json:"company_id"`
	jwt.RegisteredClaims
}

// GenerateToken generates a JWT token for a user
func GenerateToken(user models.User) (string, error) {
	expirationTime := time.Now().Add(getTokenExpiration())

	claims := &Claims{
		UserID:    user.ID,
		Email:     user.Email,
		Role:      user.Role,
		CompanyID: user.CompanyID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(getJWTSecret()))
}

// getJWTSecret gets the JWT secret from environment variables
func getJWTSecret() string {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		// Default secret for development - should be changed in production
		return "your-super-secret-jwt-key-change-this-in-production"
	}
	return secret
}

// getTokenExpiration gets the token expiration time from environment variables
func getTokenExpiration() time.Duration {
	expiration := os.Getenv("JWT_EXPIRES_IN")
	if expiration == "" {
		return 24 * time.Hour // Default to 24 hours
	}

	duration, err := time.ParseDuration(expiration)
	if err != nil {
		return 24 * time.Hour // Default to 24 hours if parsing fails
	}

	return duration
}
