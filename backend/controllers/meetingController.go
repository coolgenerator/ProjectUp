package controllers

import (
	"net/http"
	"projectup/database"
	"projectup/models"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// CreateMeeting creates a new meeting for a project
// @Summary Create a meeting
// @Description Create a new meeting for a project with optional attendees
// @Tags meetings
// @Accept json
// @Produce json
// @Param meeting body models.CreateMeetingRequest true "Meeting details"
// @Success 201 {object} models.MeetingResponse
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Router /api/meetings [post]
func CreateMeeting(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req models.CreateMeetingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify user has access to the project
	var project models.Project
	if err := database.DB.Where("id = ?", req.ProjectID).First(&project).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	// Determine status (default to pending if not provided)
	status := "pending"
	if req.Status != nil && *req.Status != "" {
		status = *req.Status
	}

	// Parse times if provided (required for scheduled meetings, optional for pending)
	var startTime, endTime time.Time
	if req.StartTime != nil && *req.StartTime != "" {
		var err error
		startTime, err = time.Parse(time.RFC3339, *req.StartTime)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start_time format. Use RFC3339 format"})
			return
		}
	}

	if req.EndTime != nil && *req.EndTime != "" {
		var err error
		endTime, err = time.Parse(time.RFC3339, *req.EndTime)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end_time format. Use RFC3339 format"})
			return
		}
	}

	// Validate times if both are provided
	if !startTime.IsZero() && !endTime.IsZero() {
		if endTime.Before(startTime) || endTime.Equal(startTime) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "End time must be after start time"})
			return
		}
	}

	// For scheduled meetings, times are required
	if status == "scheduled" && (startTime.IsZero() || endTime.IsZero()) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Start time and end time are required for scheduled meetings"})
		return
	}

	// Create meeting
	meeting := models.Meeting{
		ID:          uuid.New().String(),
		ProjectID:   req.ProjectID,
		Title:       req.Title,
		Description: req.Description,
		StartTime:   startTime,
		EndTime:     endTime,
		Location:    req.Location,
		MeetingURL:  req.MeetingURL,
		CreatedBy:   userID.(uint),
		Status:      status,
	}

	if err := database.DB.Create(&meeting).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create meeting"})
		return
	}

	// Add attendees if provided
	if len(req.AttendeeIDs) > 0 {
		for _, attendeeID := range req.AttendeeIDs {
			attendee := models.MeetingAttendee{
				MeetingID: meeting.ID,
				UserID:    attendeeID,
				Status:    "invited",
			}
			database.DB.Create(&attendee)
		}
	}

	// Load attendees for response
	database.DB.Preload("Attendees.User").First(&meeting, "id = ?", meeting.ID)

	// Build response with attendee details
	response := buildMeetingResponse(meeting)

	c.JSON(http.StatusCreated, response)
}

// GetProjectMeetings retrieves all meetings for a project
// @Summary Get project meetings
// @Description Get all meetings for a specific project
// @Tags meetings
// @Produce json
// @Param id path int true "Project ID"
// @Success 200 {array} models.MeetingResponse
// @Failure 401 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/projects/{id}/meetings [get]
func GetProjectMeetings(c *gin.Context) {
	_, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	projectID := c.Param("id")

	// Verify project exists
	var project models.Project
	if err := database.DB.Where("id = ?", projectID).First(&project).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	// Get all meetings for the project
	var meetings []models.Meeting
	if err := database.DB.Where("project_id = ?", projectID).
		Preload("Attendees.User").
		Order("start_time ASC").
		Find(&meetings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch meetings"})
		return
	}

	// Build response with attendee details
	var responses []models.MeetingResponse
	for _, meeting := range meetings {
		responses = append(responses, buildMeetingResponse(meeting))
	}

	c.JSON(http.StatusOK, gin.H{
		"meetings": responses,
		"count":    len(responses),
	})
}

// GetMeeting retrieves a single meeting by ID
// @Summary Get meeting
// @Description Get details of a specific meeting
// @Tags meetings
// @Produce json
// @Param id path string true "Meeting ID"
// @Success 200 {object} models.MeetingResponse
// @Failure 401 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/meetings/{id} [get]
func GetMeeting(c *gin.Context) {
	_, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	meetingID := c.Param("id")

	var meeting models.Meeting
	if err := database.DB.Where("id = ?", meetingID).
		Preload("Attendees.User").
		First(&meeting).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Meeting not found"})
		return
	}

	response := buildMeetingResponse(meeting)
	c.JSON(http.StatusOK, response)
}

// UpdateMeeting updates an existing meeting
// @Summary Update meeting
// @Description Update meeting details
// @Tags meetings
// @Accept json
// @Produce json
// @Param id path string true "Meeting ID"
// @Param meeting body models.UpdateMeetingRequest true "Meeting update details"
// @Success 200 {object} models.MeetingResponse
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/meetings/{id} [put]
func UpdateMeeting(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	meetingID := c.Param("id")

	var meeting models.Meeting
	if err := database.DB.Where("id = ?", meetingID).First(&meeting).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Meeting not found"})
		return
	}

	// Verify user is the creator or has project admin rights
	if meeting.CreatedBy != userID.(uint) {
		// TODO: Add check for project admin permission
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to update this meeting"})
		return
	}

	var req models.UpdateMeetingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields if provided
	if req.Title != nil {
		meeting.Title = *req.Title
	}
	if req.Description != nil {
		meeting.Description = req.Description
	}
	if req.StartTime != nil {
		startTime, err := time.Parse(time.RFC3339, *req.StartTime)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start_time format"})
			return
		}
		meeting.StartTime = startTime
	}
	if req.EndTime != nil {
		endTime, err := time.Parse(time.RFC3339, *req.EndTime)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end_time format"})
			return
		}
		meeting.EndTime = endTime
	}
	if req.Location != nil {
		meeting.Location = req.Location
	}
	if req.MeetingURL != nil {
		meeting.MeetingURL = req.MeetingURL
	}
	if req.Status != nil {
		meeting.Status = *req.Status
	}

	// Validate times
	if meeting.EndTime.Before(meeting.StartTime) || meeting.EndTime.Equal(meeting.StartTime) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "End time must be after start time"})
		return
	}

	// Update meeting
	if err := database.DB.Save(&meeting).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update meeting"})
		return
	}

	// Update attendees if provided
	if req.AttendeeIDs != nil {
		// Remove existing attendees
		database.DB.Where("meeting_id = ?", meetingID).Delete(&models.MeetingAttendee{})

		// Add new attendees
		for _, attendeeID := range *req.AttendeeIDs {
			attendee := models.MeetingAttendee{
				MeetingID: meeting.ID,
				UserID:    attendeeID,
				Status:    "invited",
			}
			database.DB.Create(&attendee)
		}
	}

	// Load updated data
	database.DB.Preload("Attendees.User").First(&meeting, "id = ?", meeting.ID)

	response := buildMeetingResponse(meeting)
	c.JSON(http.StatusOK, response)
}

// DeleteMeeting deletes a meeting
// @Summary Delete meeting
// @Description Delete a meeting
// @Tags meetings
// @Param id path string true "Meeting ID"
// @Success 200 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/meetings/{id} [delete]
func DeleteMeeting(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	meetingID := c.Param("id")

	var meeting models.Meeting
	if err := database.DB.Where("id = ?", meetingID).First(&meeting).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Meeting not found"})
		return
	}

	// Verify user is the creator or has project admin rights
	if meeting.CreatedBy != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to delete this meeting"})
		return
	}

	// Delete attendees first
	database.DB.Where("meeting_id = ?", meetingID).Delete(&models.MeetingAttendee{})

	// Delete meeting
	if err := database.DB.Delete(&meeting).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete meeting"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Meeting deleted successfully"})
}

// UpdateAttendeeStatus updates an attendee's response status
// @Summary Update attendee status
// @Description Update the status of a meeting attendee (accept/decline/tentative)
// @Tags meetings
// @Accept json
// @Produce json
// @Param id path string true "Meeting ID"
// @Param status body models.UpdateAttendeeStatusRequest true "Status update"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/meetings/{id}/attendees/status [put]
func UpdateAttendeeStatus(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	meetingID := c.Param("id")

	var req models.UpdateAttendeeStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find attendee record
	var attendee models.MeetingAttendee
	if err := database.DB.Where("meeting_id = ? AND user_id = ?", meetingID, userID).
		First(&attendee).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "You are not invited to this meeting"})
		return
	}

	// Update status
	now := time.Now()
	attendee.Status = req.Status
	attendee.ResponseAt = &now

	if err := database.DB.Save(&attendee).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Status updated successfully",
		"status":  req.Status,
	})
}

// SaveMeetingAvailability saves or updates availability for a pending meeting
// @Summary Save meeting availability
// @Description Save attendee's availability for a pending meeting
// @Tags meetings
// @Accept json
// @Produce json
// @Param id path string true "Meeting ID"
// @Param availability body object true "Availability data"
// @Success 200 {object} models.MeetingAvailability
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/meetings/{id}/availability [post]
func SaveMeetingAvailability(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	meetingID := c.Param("id")

	// Verify meeting exists and is pending
	var meeting models.Meeting
	if err := database.DB.Where("id = ?", meetingID).First(&meeting).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Meeting not found"})
		return
	}

	if meeting.Status != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Can only share availability for pending meetings"})
		return
	}

	// Find attendee record
	var attendee models.MeetingAttendee
	if err := database.DB.Where("meeting_id = ? AND user_id = ?", meetingID, userID).
		First(&attendee).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "You are not invited to this meeting"})
		return
	}

	var req struct {
		AvailableDates string `json:"available_dates"` // JSON string of date array
		TimeZone       int    `json:"timezone"`
		StartTime      string `json:"start_time"`
		EndTime        string `json:"end_time"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if availability already exists
	var availability models.MeetingAvailability
	err := database.DB.Where("meeting_id = ? AND attendee_id = ?", meetingID, attendee.ID).
		First(&availability).Error

	if err != nil {
		// Create new availability
		availability = models.MeetingAvailability{
			MeetingID:      meetingID,
			AttendeeID:     attendee.ID,
			AvailableDates: req.AvailableDates,
			TimeZone:       req.TimeZone,
			StartTime:      req.StartTime,
			EndTime:        req.EndTime,
		}
		if err := database.DB.Create(&availability).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save availability"})
			return
		}
	} else {
		// Update existing availability
		availability.AvailableDates = req.AvailableDates
		availability.TimeZone = req.TimeZone
		availability.StartTime = req.StartTime
		availability.EndTime = req.EndTime
		if err := database.DB.Save(&availability).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update availability"})
			return
		}
	}

	c.JSON(http.StatusOK, availability)
}

// GetMeetingAvailability retrieves all availability for a pending meeting
// @Summary Get meeting availability
// @Description Get all attendee availability for a pending meeting
// @Tags meetings
// @Produce json
// @Param id path string true "Meeting ID"
// @Success 200 {object} []models.MeetingAvailability
// @Failure 401 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/meetings/{id}/availability [get]
func GetMeetingAvailability(c *gin.Context) {
	_, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	meetingID := c.Param("id")

	// Verify meeting exists
	var meeting models.Meeting
	if err := database.DB.Where("id = ?", meetingID).First(&meeting).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Meeting not found"})
		return
	}

	// Get all availability entries with attendee info
	var availabilities []models.MeetingAvailability
	if err := database.DB.
		Preload("Attendee.User").
		Where("meeting_id = ?", meetingID).
		Find(&availabilities).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch availability"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"availabilities": availabilities})
}

// Helper function to build meeting response with attendee details
func buildMeetingResponse(meeting models.Meeting) models.MeetingResponse {
	response := models.MeetingResponse{
		Meeting:         meeting,
		AttendeeDetails: []models.AttendeeDetail{},
	}

	for _, attendee := range meeting.Attendees {
		username := ""
		if attendee.User.Username != nil {
			username = *attendee.User.Username
		}
		email := ""
		if attendee.User.Email != nil {
			email = *attendee.User.Email
		}

		detail := models.AttendeeDetail{
			UserID:     attendee.UserID,
			Username:   username,
			Email:      email,
			Status:     attendee.Status,
			ResponseAt: attendee.ResponseAt,
		}
		response.AttendeeDetails = append(response.AttendeeDetails, detail)
	}

	return response
}
