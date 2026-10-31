package controllers

import (
	"errors"
	"net/http"
	"projectup/repositories"
	"strconv"

	"github.com/gin-gonic/gin"
)

// GetContacts retrieves all contacts for a user
//
//	@Summary		Get user contacts
//	@Description	Retrieves a list of contacts for the authenticated user.
//	@Tags			Contacts
//	@Produce		json
//	@Success		200	{object}	map[string]interface{}	"Successful response with contacts"
//	@Failure		401	{object}	map[string]interface{}	"Unauthorized"
//	@Failure		500	{object}	map[string]interface{}	"Internal server error"
//	@Router			/contact/ [get]
func GetContacts() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		contacts, err := repositories.GetContacts(userID.(uint))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch contacts"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"status": "success", "contacts": contacts})
	}
}

// MakeContactRequest handles sending a contact request
//
//	@Summary		Send contact request
//	@Description	Sends a contact request to another user.
//	@Tags			Contacts
//	@Produce		json
//	@Param			contact_id	query		int	true	"Contact user ID"
//	@Success		200	{object}	map[string]interface{}	"Contact request sent successfully"
//	@Failure		400	{object}	map[string]interface{}	"Invalid request"
//	@Failure		401	{object}	map[string]interface{}	"Unauthorized"
//	@Failure		409	{object}	map[string]interface{}	"Contact request already exists"
//	@Router			/contact/request [post]
func MakeContactRequest() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		contactIDStr := c.Query("contact_id")
		contactID, err := strconv.Atoi(contactIDStr)
		if err != nil || contactID <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid contact ID"})
			return
		}

		// Check if a request already exists
		existingRequest, _ := repositories.GetContactRequest(userID.(uint), uint(contactID))
		if existingRequest != nil {
			c.JSON(http.StatusConflict, gin.H{"error": "Contact request already exists"})
			return
		}

		// Create a contact request
		err = repositories.MakeContactRequest(userID.(uint), uint(contactID))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send request"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Contact request sent successfully"})
	}
}

// AcceptContactRequest handles accepting a contact request
//
//	@Summary		Accept contact request
//	@Description	Accepts a pending contact request.
//	@Tags			Contacts
//	@Produce		json
//	@Param			contact_id	query		int	true	"Contact user ID"
//	@Success		200	{object}	map[string]interface{}	"Contact request accepted successfully"
//	@Failure		400	{object}	map[string]interface{}	"Invalid request"
//	@Failure		401	{object}	map[string]interface{}	"Unauthorized"
//	@Failure		404	{object}	map[string]interface{}	"Contact request not found"
//	@Router			/contact/accept [post]
func AcceptContactRequest() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		contactIDStr := c.Query("contact_id")
		contactID, err := strconv.Atoi(contactIDStr)
		if err != nil || contactID <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid contact ID"})
			return
		}

		// Accept the request
		err = repositories.AcceptContactRequest(userID.(uint), uint(contactID))
		if err != nil {
			if errors.Is(err, errors.New("contact request not found or already processed")) {
				c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to accept request"})
			}
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Contact request accepted successfully"})
	}
}

// DeclineContactRequest removes a contact request
//
//	@Summary		Decline contact request
//	@Description	Declines a pending contact request.
//	@Tags			Contacts
//	@Produce		json
//	@Param			contact_id	query		int	true	"Contact user ID"
//	@Success		200	{object}	map[string]interface{}	"Contact request declined successfully"
//	@Failure		400	{object}	map[string]interface{}	"Invalid request"
//	@Failure		401	{object}	map[string]interface{}	"Unauthorized"
//	@Router			/contact/decline [post]
func DeclineContactRequest() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		contactIDStr := c.Query("contact_id")
		contactID, err := strconv.Atoi(contactIDStr)
		if err != nil || contactID <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid contact ID"})
			return
		}

		// Decline the contact request
		err = repositories.DeclineContactRequest(userID.(uint), uint(contactID))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decline contact request"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Contact request declined successfully"})
	}
}

// DeleteContact removes an existing contact connection
//
//	@Summary		Delete contact
//	@Description	Deletes an existing contact connection between the authenticated user and another user.
//	@Tags			Contacts
//	@Produce		json
//	@Param			contact_id	query		int	true	"Contact user ID"
//	@Success		200	{object}	map[string]interface{}	"Contact deleted successfully"
//	@Failure		400	{object}	map[string]interface{}	"Invalid request"
//	@Failure		401	{object}	map[string]interface{}	"Unauthorized"
//	@Failure		404	{object}	map[string]interface{}	"Contact not found"
//	@Router			/contact/delete [delete]
func DeleteContact() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		contactIDStr := c.Query("contact_id")
		contactID, err := strconv.Atoi(contactIDStr)
		if err != nil || contactID <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid contact ID"})
			return
		}

		// Delete the contact relationship (both directions)
		err = repositories.DeleteContact(userID.(uint), uint(contactID))
		if err != nil {
			if err.Error() == "contact not found" {
				c.JSON(http.StatusNotFound, gin.H{"error": "Contact not found"})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete contact"})
			}
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Contact deleted successfully"})
	}
}

// GetContactRequests retrieves all pending contact requests for the user
//
//	@Summary		Get contact requests
//	@Description	Retrieves a list of pending contact requests for the authenticated user.
//	@Tags			Contacts
//	@Produce		json
//	@Success		200	{object}	map[string]interface{}	"Pending contact requests"
//	@Failure		401	{object}	map[string]interface{}	"Unauthorized"
//	@Failure		500	{object}	map[string]interface{}	"Internal server error"
//	@Router			/contact/get-requests [get]
func GetContactRequests() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		// Fetch pending contact requests with user details
		requests, err := repositories.GetContactRequestsWithUsers(userID.(uint))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch contact requests"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"requests": requests})
	}
}

// GetSentContactRequests retrieves all pending contact requests sent by the user
//
//	@Summary		Get sent contact requests
//	@Description	Retrieves a list of pending contact requests sent by the authenticated user.
//	@Tags			Contacts
//	@Produce		json
//	@Success		200	{object}	map[string]interface{}	"Sent contact requests"
//	@Failure		401	{object}	map[string]interface{}	"Unauthorized"
//	@Failure		500	{object}	map[string]interface{}	"Internal server error"
//	@Router			/contact/sent-requests [get]
func GetSentContactRequests() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		// Fetch sent contact requests with recipient details
		requests, err := repositories.GetSentContactRequestsWithUsers(userID.(uint))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch sent contact requests"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"requests": requests})
	}
}
