package middleware

import (
	"errors"
	"net/http"
	"projectup/helper"
	"strings"

	"github.com/dgrijalva/jwt-go"
	"github.com/gin-gonic/gin"
)

func Authenticate() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader(http.CanonicalHeaderKey("Authorization"))
		var tokenString string

		// Extract token from header or query parameter
		if authHeader == "" {
			tokenString = c.Query("token")
			if tokenString == "" {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization token missing"})
				c.Abort()
				return
			}
		} else if !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid Authorization header format"})
			c.Abort()
			return
		} else {
			tokenString = strings.TrimPrefix(authHeader, "Bearer ")
		}

		// Parse token without validation to check for expiration
		_, _ = jwt.ParseWithClaims(tokenString, &helper.SignedDetails{}, func(token *jwt.Token) (interface{}, error) {
			return []byte(""), errors.New("validation not performed here")
		})

		// Skip auto-refresh in middleware - let frontend handle it
		// This avoids conflicts between backend and frontend refresh attempts
		/*
		// Try to handle expired tokens
		if token != nil && token.Claims != nil {
			claims, ok := token.Claims.(*helper.SignedDetails)
			if ok {
				// Check if token is expired
				if claims.ExpiresAt < time.Now().Unix() {
					// Token is expired, but we can try to refresh it using refresh token from DB
					refreshedUserID, newTokens, err := services.RefreshExpiredTokenService(tokenString)
					if err == nil && refreshedUserID > 0 && newTokens != nil {
						// Token refreshed successfully
						c.Set("userID", refreshedUserID)

						// Add token refresh headers to inform client
						c.Writer.Header().Set("X-Token-Refreshed", "true")
						c.Writer.Header().Set("X-New-Access-Token", newTokens.AccessToken)
						c.Writer.Header().Set("X-New-Refresh-Token", newTokens.RefreshToken)

						c.Next()
						return
					}
					// If refresh failed, continue to normal validation which will return 401
				}
			}
		}
		*/

		// Normal token validation for non-expired tokens
		claims, err := helper.ValidateToken(tokenString)
		if err != nil {
			// Debug logging
		if len(tokenString) > 20 {
			c.Writer.Header().Set("X-Debug-Token-Prefix", tokenString[:20]+"...")
		}
		c.Writer.Header().Set("X-Debug-Validation-Error", err.Error())
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		// Extract the user ID from the claims
		userID := claims.ID
		if userID == 0 {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims: user ID missing"})
			c.Abort()
			return
		}

		// Set the user ID in the context
		c.Set("userID", userID)

		// Proceed to the next handler
		c.Next()
	}
}

// OptionalAuthenticate extracts user ID from token if present, but doesn't fail if missing
// This is useful for endpoints that should work for both authenticated and unauthenticated users
func OptionalAuthenticate() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader(http.CanonicalHeaderKey("Authorization"))
		var tokenString string

		// Extract token from header or query parameter
		if authHeader == "" {
			tokenString = c.Query("token")
			if tokenString == "" {
				// No token provided - continue without authentication
				c.Next()
				return
			}
		} else if strings.HasPrefix(authHeader, "Bearer ") {
			tokenString = strings.TrimPrefix(authHeader, "Bearer ")
		} else {
			// Invalid format - continue without authentication
			c.Next()
			return
		}

		// Try to validate token
		claims, err := helper.ValidateToken(tokenString)
		if err != nil {
			// Invalid token - continue without authentication
			c.Next()
			return
		}

		// Extract the user ID from the claims
		userID := claims.ID
		if userID > 0 {
			// Set the user ID in the context
			c.Set("userID", userID)
		}

		// Proceed to the next handler
		c.Next()
	}
}
