package auth

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"`
}

type Claims struct {
	Email     string `json:"email"`
	ProfileID int64  `json:"pid,omitempty"`
	Type      string `json:"typ"`
	jwt.RegisteredClaims
}

func SignAccess(secret, issuer, audience string, userID uuid.UUID, email string, profileID int64, ttl time.Duration) (string, error) {
	now := time.Now()
	claims := Claims{
		Email:     email,
		ProfileID: profileID,
		Type:      "access",
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    issuer,
			Audience:  jwt.ClaimStrings{audience},
			Subject:   userID.String(),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now.Add(-30 * time.Second)),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
			ID:        uuid.NewString(),
		},
	}
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return t.SignedString([]byte(secret))
}

func SignRefresh(secret, issuer, audience string, userID uuid.UUID, ttl time.Duration) (string, string, error) {
	now := time.Now()
	jti := uuid.NewString()
	claims := Claims{
		Type: "refresh",
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    issuer,
			Audience:  jwt.ClaimStrings{audience},
			Subject:   userID.String(),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now.Add(-30 * time.Second)),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
			ID:        jti,
		},
	}
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := t.SignedString([]byte(secret))
	if err != nil {
		return "", "", err
	}
	return signed, jti, nil
}

func Parse(secret, tokenString, issuer, audience string) (*Claims, error) {
	parser := jwt.NewParser(
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuer(issuer),
		jwt.WithAudience(audience),
		jwt.WithLeeway(60*time.Second),
	)
	tok, err := parser.ParseWithClaims(tokenString, &Claims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := tok.Claims.(*Claims)
	if !ok || !tok.Valid {
		return nil, fmt.Errorf("invalid token")
	}
	return claims, nil
}
