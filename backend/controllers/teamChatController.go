package controllers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"projectup/database"
	"projectup/models"
	"projectup/services"

	"github.com/gin-gonic/gin"
)

const (
	// The panel shows the latest messages, then polls for newer ones
	teamChatPageSize        = 100
	maxTeamChatMessageRunes = 2000
)

type teamChatMessage struct {
	ID     uint            `json:"id"`
	Sender personCard      `json:"sender"`
	Text   string          `json:"text,omitempty"`
	Event  json.RawMessage `json:"event,omitempty"` // System events, e.g. {"event":"joined","role":"..."}
	SentAt time.Time       `json:"sent_at"`
}

func toTeamChatMessages(messages []models.GroupMessage) []teamChatMessage {
	senderIDs := make([]uint, 0, len(messages))
	for _, m := range messages {
		senderIDs = append(senderIDs, m.SenderID)
	}
	cards := loadPersonCards(senderIDs)
	result := make([]teamChatMessage, 0, len(messages))
	for _, m := range messages {
		out := teamChatMessage{ID: m.ID, Sender: cards[m.SenderID], SentAt: m.Timestamp}
		if m.System {
			out.Event = json.RawMessage(m.Content)
		} else {
			out.Text = m.Content
		}
		result = append(result, out)
	}
	return result
}

// GetTeamChat returns the project's team chat messages for members: the
// latest page, or only those after ?after=<message id> when polling.
func GetTeamChat() gin.HandlerFunc {
	return func(c *gin.Context) {
		project, _, ok := projectForMember(c)
		if !ok {
			return
		}
		chat, err := services.EnsureTeamChat(project.ProjectID, strOrEmpty(project.Title))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load team chat"})
			return
		}

		var messages []models.GroupMessage
		after, _ := strconv.ParseUint(c.Query("after"), 10, 64)
		if after > 0 {
			database.DB.Where("chat_id = ? AND id > ?", chat.ID, after).Order("id").Limit(teamChatPageSize).Find(&messages)
		} else {
			// Latest page, returned oldest first
			database.DB.Where("chat_id = ?", chat.ID).Order("id DESC").Limit(teamChatPageSize).Find(&messages)
			for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
				messages[i], messages[j] = messages[j], messages[i]
			}
		}

		var memberCount int64
		database.DB.Model(&models.ProjectMember{}).
			Where("project_id = ? AND removed_at IS NULL AND NOT COALESCE(is_placeholder, false)", project.ProjectID).
			Count(&memberCount)

		c.JSON(http.StatusOK, gin.H{"messages": toTeamChatMessages(messages), "member_count": memberCount})
	}
}

// PostTeamChatMessage adds a message from the current member to the team chat.
func PostTeamChatMessage() gin.HandlerFunc {
	return func(c *gin.Context) {
		project, _, ok := projectForMember(c)
		if !ok {
			return
		}
		var request struct {
			Text string `json:"text"`
		}
		if err := c.ShouldBindJSON(&request); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
			return
		}
		text := strings.TrimSpace(request.Text)
		if text == "" || utf8.RuneCountInString(text) > maxTeamChatMessageRunes {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Message must be 1-2000 characters"})
			return
		}

		chat, err := services.EnsureTeamChat(project.ProjectID, strOrEmpty(project.Title))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load team chat"})
			return
		}
		message := models.GroupMessage{ChatID: chat.ID, SenderID: c.GetUint("userID"), Content: text}
		if err := database.DB.Create(&message).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send message"})
			return
		}
		database.DB.Model(chat).Update("updated_at", time.Now())

		c.JSON(http.StatusOK, toTeamChatMessages([]models.GroupMessage{message})[0])
	}
}
