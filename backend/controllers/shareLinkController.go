package controllers

import (
	"fmt"
	"net/http"
	"strconv"

	"projectup/services"

	"github.com/gin-gonic/gin"
)

type ShareLinkController struct {
	Service *services.ShareLinkService
}

func NewShareLinkController() *ShareLinkController {
	return &ShareLinkController{
		Service: services.NewShareLinkService(),
	}
}

// CreateShareLinkRequest defines the request body for creating a share link
type CreateShareLinkRequest struct {
	WorkspaceID *uint  `json:"workspace_id"` // Optional - NULL means full project access
	AccessLevel string `json:"access_level" binding:"required,oneof=view edit"`
	ExpiryDays  int    `json:"expiry_days" binding:"min=0"` // 0 means no expiry
}

// CreateShareLink creates a new share link
// @Summary Create share link
// @Description Creates a new shareable link for project or workspace access
// @Tags ShareLinks
// @Accept json
// @Produce json
// @Param sid path string true "Project SID"
// @Param request body CreateShareLinkRequest true "Share link details"
// @Success 201 {object} models.ShareLink
// @Failure 400 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Router /api/projects/{sid}/share-links [post]
func (c *ShareLinkController) CreateShareLink(ctx *gin.Context) {
	userID := ctx.GetUint("userID")
	projectSid := ctx.Param("sid")
	projectID, err := resolveSIDToProjectID(projectSid)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	var req CreateShareLinkRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	shareLink, err := c.Service.CreateShareLink(
		projectID,
		userID,
		req.WorkspaceID,
		req.AccessLevel,
		req.ExpiryDays,
	)

	if err != nil {
		ctx.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusCreated, shareLink)
}

// GetProjectShareLinks retrieves all share links for a project
// @Summary Get project share links
// @Description Retrieves all share links for the project (filtered by user permissions)
// @Tags ShareLinks
// @Produce json
// @Param sid path string true "Project SID"
// @Success 200 {array} models.ShareLink
// @Failure 403 {object} map[string]interface{}
// @Router /api/projects/{sid}/share-links [get]
func (c *ShareLinkController) GetProjectShareLinks(ctx *gin.Context) {
	userID := ctx.GetUint("userID")
	projectSid := ctx.Param("sid")
	projectID, err := resolveSIDToProjectID(projectSid)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	shareLinks, err := c.Service.GetProjectShareLinks(projectID, userID)
	if err != nil {
		ctx.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"share_links": shareLinks,
		"count":       len(shareLinks),
	})
}

// GetShareLinkByToken retrieves a share link by token (public endpoint)
// @Summary Get share link by token
// @Description Retrieves share link details using the token (for public access)
// @Tags ShareLinks
// @Produce json
// @Param token path string true "Share token"
// @Success 200 {object} models.ShareLink
// @Failure 404 {object} map[string]interface{}
// @Router /api/share/{token} [get]
func (c *ShareLinkController) GetShareLinkByToken(ctx *gin.Context) {
	token := ctx.Param("token")
	ipAddress := ctx.ClientIP()
	userAgent := ctx.GetHeader("User-Agent")

	// Get user ID if authenticated (optional)
	var userID *uint
	if id, exists := ctx.Get("userID"); exists {
		uid := id.(uint)
		userID = &uid
	}

	shareLink, err := c.Service.ValidateAndUseShareLink(token, userID, ipAddress, userAgent)
	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"share_link": shareLink,
		"project":    shareLink.Project,
		"workspace":  shareLink.Workspace,
		"message":    "Share link is valid. You can now access the project/workspace.",
	})
}

// DeleteShareLink deletes a share link
// @Summary Delete share link
// @Description Permanently deletes a share link
// @Tags ShareLinks
// @Produce json
// @Param sid path string true "Project SID"
// @Param shareId path int true "Share Link ID"
// @Success 200 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Router /api/projects/{sid}/share-links/{shareId} [delete]
func (c *ShareLinkController) DeleteShareLink(ctx *gin.Context) {
	userID := ctx.GetUint("userID")
	shareIDStr := ctx.Param("shareId")

	shareID, err := strconv.ParseUint(shareIDStr, 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid share link ID"})
		return
	}

	if err := c.Service.DeleteShareLink(uint(shareID), userID); err != nil {
		if err.Error() == "record not found" {
			ctx.JSON(http.StatusNotFound, gin.H{"error": "Share link not found"})
		} else {
			ctx.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		}
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Share link deleted successfully"})
}

// DeactivateShareLink deactivates a share link
// @Summary Deactivate share link
// @Description Deactivates a share link without deleting it
// @Tags ShareLinks
// @Produce json
// @Param sid path string true "Project SID"
// @Param shareId path int true "Share Link ID"
// @Success 200 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Router /api/projects/{sid}/share-links/{shareId}/deactivate [post]
func (c *ShareLinkController) DeactivateShareLink(ctx *gin.Context) {
	userID := ctx.GetUint("userID")
	shareIDStr := ctx.Param("shareId")

	shareID, err := strconv.ParseUint(shareIDStr, 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid share link ID"})
		return
	}

	if err := c.Service.DeactivateShareLink(uint(shareID), userID); err != nil {
		if err.Error() == "record not found" {
			ctx.JSON(http.StatusNotFound, gin.H{"error": "Share link not found"})
		} else {
			ctx.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		}
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Share link deactivated successfully"})
}

// GetShareLinkUsage retrieves usage statistics for a share link
// @Summary Get share link usage
// @Description Retrieves usage statistics and access logs for a share link
// @Tags ShareLinks
// @Produce json
// @Param sid path string true "Project SID"
// @Param shareId path int true "Share Link ID"
// @Success 200 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Router /api/projects/{sid}/share-links/{shareId}/usage [get]
func (c *ShareLinkController) GetShareLinkUsage(ctx *gin.Context) {
	userID := ctx.GetUint("userID")
	shareIDStr := ctx.Param("shareId")

	shareID, err := strconv.ParseUint(shareIDStr, 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid share link ID"})
		return
	}

	usage, err := c.Service.GetShareLinkUsage(uint(shareID), userID)
	if err != nil {
		if err.Error() == "record not found" {
			ctx.JSON(http.StatusNotFound, gin.H{"error": "Share link not found"})
		} else {
			ctx.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		}
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"usage": usage,
		"count": len(usage),
	})
}

// AcceptShareLink accepts a share link and adds the user to the project/workspace
// @Summary Accept share link
// @Description Accepts a share link and adds the authenticated user to the project or workspace
// @Tags ShareLinks
// @Accept json
// @Produce json
// @Param token path string true "Share token"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Router /api/share/{token}/accept [post]
func (c *ShareLinkController) AcceptShareLink(ctx *gin.Context) {
	// Get user ID from context (requires authentication)
	userID, exists := ctx.Get("userID")
	if !exists {
		fmt.Println("AcceptShareLink: No userID in context")
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	token := ctx.Param("token")
	ipAddress := ctx.ClientIP()
	userAgent := ctx.GetHeader("User-Agent")

	fmt.Printf("AcceptShareLink: User %d accepting share link %s\n", userID.(uint), token)

	shareLink, err := c.Service.AcceptShareLink(token, userID.(uint), ipAddress, userAgent)
	if err != nil {
		fmt.Printf("AcceptShareLink: Error - %v\n", err)
		if err.Error() == "share link not found" {
			ctx.JSON(http.StatusNotFound, gin.H{"error": "Share link not found"})
		} else if err.Error() == "share link has expired" || err.Error() == "share link is not active" {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		} else {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	fmt.Printf("AcceptShareLink: Successfully added user %d to project %d\n", userID.(uint), shareLink.ProjectID)

	ctx.JSON(http.StatusOK, gin.H{
		"message":    "Successfully joined project/workspace",
		"share_link": shareLink,
		"project":    shareLink.Project,
		"workspace":  shareLink.Workspace,
	})
}
