package controllers

import (
	"net/http"
	"projectup/database"
	"projectup/models"
	"projectup/services"

	"github.com/gin-gonic/gin"
)

type AIServicePreferenceController struct {
	service *services.AIServicePreferenceService
}

func NewAIServicePreferenceController() *AIServicePreferenceController {
	return &AIServicePreferenceController{
		service: services.NewAIServicePreferenceService(database.DB),
	}
}

// GetAllServicePreferences returns all AI service preferences for the user
// GET /api/ai-service-preferences
func (c *AIServicePreferenceController) GetAllServicePreferences() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		userID := ctx.GetUint("userID")
		if userID == 0 {
			ctx.JSON(http.StatusUnauthorized, gin.H{
				"status":  false,
				"error":   "Unauthorized",
				"message": "Please login first",
			})
			return
		}

		preferences, err := c.service.GetAllPreferences(userID)
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{
				"status":  false,
				"error":   "Failed to get service preferences",
				"message": err.Error(),
			})
			return
		}

		ctx.JSON(http.StatusOK, gin.H{
			"status":  true,
			"message": "Service preferences retrieved successfully",
			"data":    preferences,
		})
	}
}

// GetServicePreference returns preference for a specific service
// GET /api/ai-service-preferences/:service_type
func (c *AIServicePreferenceController) GetServicePreference() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		userID := ctx.GetUint("userID")
		if userID == 0 {
			ctx.JSON(http.StatusUnauthorized, gin.H{
				"status":  false,
				"error":   "Unauthorized",
				"message": "Please login first",
			})
			return
		}

		serviceType := ctx.Param("service_type")
		if serviceType == "" {
			ctx.JSON(http.StatusBadRequest, gin.H{
				"status":  false,
				"error":   "Invalid request",
				"message": "Service type is required",
			})
			return
		}

		preference, err := c.service.GetPreferenceForService(userID, serviceType)
		if err != nil {
			ctx.JSON(http.StatusNotFound, gin.H{
				"status":  false,
				"error":   "Service not found",
				"message": err.Error(),
			})
			return
		}

		ctx.JSON(http.StatusOK, gin.H{
			"status":  true,
			"message": "Service preference retrieved successfully",
			"data":    preference,
		})
	}
}

// UpdateServicePreferences updates multiple service preferences at once
// PUT /api/ai-service-preferences
func (c *AIServicePreferenceController) UpdateServicePreferences() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		userID := ctx.GetUint("userID")
		if userID == 0 {
			ctx.JSON(http.StatusUnauthorized, gin.H{
				"status":  false,
				"error":   "Unauthorized",
				"message": "Please login first",
			})
			return
		}

		var request models.UpdateAIServicePreferencesRequest
		if err := ctx.ShouldBindJSON(&request); err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{
				"status":  false,
				"error":   "Invalid request",
				"message": err.Error(),
			})
			return
		}

		if len(request.Preferences) == 0 {
			ctx.JSON(http.StatusBadRequest, gin.H{
				"status":  false,
				"error":   "Invalid request",
				"message": "Preferences array cannot be empty",
			})
			return
		}

		if err := c.service.UpdatePreferences(userID, request.Preferences); err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{
				"status":  false,
				"error":   "Failed to update preferences",
				"message": err.Error(),
			})
			return
		}

		// Get updated preferences to return
		preferences, err := c.service.GetAllPreferences(userID)
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{
				"status":  false,
				"error":   "Failed to get updated preferences",
				"message": err.Error(),
			})
			return
		}

		ctx.JSON(http.StatusOK, gin.H{
			"status":  true,
			"message": "Service preferences updated successfully",
			"data":    preferences,
		})
	}
}

// UpdateSingleServicePreference updates preference for a single service
// PUT /api/ai-service-preferences/:service_type
func (c *AIServicePreferenceController) UpdateSingleServicePreference() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		userID := ctx.GetUint("userID")
		if userID == 0 {
			ctx.JSON(http.StatusUnauthorized, gin.H{
				"status":  false,
				"error":   "Unauthorized",
				"message": "Please login first",
			})
			return
		}

		serviceType := ctx.Param("service_type")
		if serviceType == "" {
			ctx.JSON(http.StatusBadRequest, gin.H{
				"status":  false,
				"error":   "Invalid request",
				"message": "Service type is required",
			})
			return
		}

		var request struct {
			Provider  string `json:"provider" binding:"required"`
			Model     string `json:"model" binding:"required"`
			IsEnabled bool   `json:"is_enabled"` // Optional, defaults to false if not provided
		}

		if err := ctx.ShouldBindJSON(&request); err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{
				"status":  false,
				"error":   "Invalid request",
				"message": err.Error(),
			})
			return
		}

		if err := c.service.UpdateSinglePreference(userID, serviceType, request.Provider, request.Model, request.IsEnabled); err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{
				"status":  false,
				"error":   "Failed to update preference",
				"message": err.Error(),
			})
			return
		}

		// Get updated preference to return
		preference, err := c.service.GetPreferenceForService(userID, serviceType)
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{
				"status":  false,
				"error":   "Failed to get updated preference",
				"message": err.Error(),
			})
			return
		}

		ctx.JSON(http.StatusOK, gin.H{
			"status":  true,
			"message": "Service preference updated successfully",
			"data":    preference,
		})
	}
}

// DeleteServicePreference deletes a preference (reverts to default)
// DELETE /api/ai-service-preferences/:service_type
func (c *AIServicePreferenceController) DeleteServicePreference() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		userID := ctx.GetUint("userID")
		if userID == 0 {
			ctx.JSON(http.StatusUnauthorized, gin.H{
				"status":  false,
				"error":   "Unauthorized",
				"message": "Please login first",
			})
			return
		}

		serviceType := ctx.Param("service_type")
		if serviceType == "" {
			ctx.JSON(http.StatusBadRequest, gin.H{
				"status":  false,
				"error":   "Invalid request",
				"message": "Service type is required",
			})
			return
		}

		if err := c.service.DeletePreference(userID, serviceType); err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{
				"status":  false,
				"error":   "Failed to delete preference",
				"message": err.Error(),
			})
			return
		}

		ctx.JSON(http.StatusOK, gin.H{
			"status":  true,
			"message": "Service preference deleted successfully (reverted to default)",
		})
	}
}

// GetAvailableServices returns list of all available AI services
// GET /api/ai-services
func (c *AIServicePreferenceController) GetAvailableServices() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		services := c.service.GetAvailableServices()

		ctx.JSON(http.StatusOK, gin.H{
			"status":  true,
			"message": "Available services retrieved successfully",
			"data": gin.H{
				"services": services,
			},
		})
	}
}

// GetAvailableProviders returns list of available providers based on user tier
// GET /api/ai-service-preferences/available-providers
func (c *AIServicePreferenceController) GetAvailableProviders() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		userID := ctx.GetUint("userID")
		if userID == 0 {
			ctx.JSON(http.StatusUnauthorized, gin.H{
				"status":  false,
				"error":   "Unauthorized",
				"message": "Please login first",
			})
			return
		}

		providers, err := c.service.GetAvailableProviders(userID)
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{
				"status":  false,
				"error":   "Failed to get available providers",
				"message": err.Error(),
			})
			return
		}

		ctx.JSON(http.StatusOK, gin.H{
			"status":  true,
			"message": "Available providers retrieved successfully",
			"data": gin.H{
				"providers": providers,
			},
		})
	}
}
