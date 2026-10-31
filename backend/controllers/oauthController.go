package controllers

import (
	"net/http"
	"projectup/config"
	"projectup/services"

	"github.com/gin-gonic/gin"
)

type OAuthController struct {
	oauthService *services.OAuthService
}

func NewOAuthController(cfg *config.Config) *OAuthController {
	return &OAuthController{
		oauthService: services.NewOAuthService(cfg),
	}
}

// Google OAuth2
func (c *OAuthController) GoogleLogin(ctx *gin.Context) {
	redirectURI := ctx.Query("redirect_uri")
	url := c.oauthService.GetGoogleAuthURL(redirectURI)
	ctx.Redirect(http.StatusTemporaryRedirect, url)
}

func (c *OAuthController) GoogleCallback(ctx *gin.Context) {
	code := ctx.Query("code")
	if code == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Code is required"})
		return
	}

	response, err := c.oauthService.HandleGoogleCallback(code)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, response)
}

// Facebook OAuth2
func (c *OAuthController) FacebookLogin(ctx *gin.Context) {
	url := c.oauthService.GetFacebookAuthURL()
	ctx.Redirect(http.StatusTemporaryRedirect, url)
}

func (c *OAuthController) FacebookCallback(ctx *gin.Context) {
	code := ctx.Query("code")
	if code == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Code is required"})
		return
	}

	response, err := c.oauthService.HandleFacebookCallback(code)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, response)
}

// Discord OAuth2
func (c *OAuthController) DiscordLogin(ctx *gin.Context) {
	url := c.oauthService.GetDiscordAuthURL()
	ctx.Redirect(http.StatusTemporaryRedirect, url)
}

func (c *OAuthController) DiscordCallback(ctx *gin.Context) {
	code := ctx.Query("code")
	if code == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Code is required"})
		return
	}

	response, err := c.oauthService.HandleDiscordCallback(code)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, response)
}
