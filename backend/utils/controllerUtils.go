package utils

import (
	"encoding/json"
	"errors"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
)

// GetUserIDFromContext extracts the user ID from the Gin context, typically set by auth middleware
func GetUserIDFromContext(ctx *gin.Context) (uint, error) {
	userID, exists := ctx.Get("userID")
	if !exists {
		return 0, errors.New("user ID not found in context")
	}

	// Handle different types of userID in context
	switch id := userID.(type) {
	case uint:
		return id, nil
	case int:
		return uint(id), nil
	case float64:
		return uint(id), nil
	case string:
		parseID, err := strconv.ParseUint(id, 10, 32)
		if err != nil {
			return 0, err
		}
		return uint(parseID), nil
	default:
		return 0, errors.New("invalid user ID type")
	}
}

// StringToUint converts a string to uint, returning 0 if an error occurs
func StringToUint(s string) uint {
	id, err := strconv.ParseUint(s, 10, 32)
	if err != nil {
		return 0
	}
	return uint(id)
}

// ToJSON converts any interface to a GORM datatypes.JSON
func ToJSON(v interface{}) datatypes.JSON {
	data, err := json.Marshal(v)
	if err != nil {
		return datatypes.JSON("{}") 
	}
	return datatypes.JSON(data)
}
