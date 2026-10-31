package controllers

import (
	"errors"
	"net/http"
	"strconv"

	"projectup/database"
	"projectup/models"
	"projectup/repositories"
	"projectup/services"

	"github.com/gin-gonic/gin"
)

// GetOrCreateChat checks if a private chat exists or creates a new one
//
//	@Summary		Get or create a private chat
//	@Description	Checks if a private chat exists between two users; creates a new one if not.
//	@Tags			Chat
//	@Accept			json
//	@Produce		json
//	@Param			request	body		map[string]interface{}	true	"User IDs"
//	@Success		200		{object}	map[string]interface{}	"Chat found or created"
//	@Failure		400		{object}	map[string]interface{}	"Invalid request"
//	@Failure		500		{object}	map[string]interface{}	"Server error"
//	@Router			/get-or-create [post]
func GetOrCreateChat(c *gin.Context) {
	var request struct {
		User1ID uint `json:"user1_id" binding:"required"`
		User2ID uint `json:"user2_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// One side must be the caller; the other is who they want to talk to
	me := c.GetUint("userID")
	otherID := request.User2ID
	if request.User2ID == me {
		otherID = request.User1ID
	} else if request.User1ID != me {
		c.JSON(http.StatusForbidden, gin.H{"error": "You can only open chats you are part of"})
		return
	}
	respondWithPrivateChat(c, me, otherID)
}

// GetOrCreateChatBySID checks if a private chat exists or creates a new one using SIDs
//
//	@Summary		Get or create a private chat by SID
//	@Description	Checks if a private chat exists between two users using their SIDs; creates a new one if not.
//	@Tags			Chat
//	@Accept			json
//	@Produce		json
//	@Param			request	body		map[string]interface{}	true	"User SIDs"
//	@Success		200		{object}	map[string]interface{}	"Chat found or created"
//	@Failure		400		{object}	map[string]interface{}	"Invalid request"
//	@Failure		500		{object}	map[string]interface{}	"Server error"
//	@Router			/get-or-create-by-sid [post]
func GetOrCreateChatBySID(c *gin.Context) {
	var request struct {
		User1SID string `json:"user1_sid" binding:"required"`
		User2SID string `json:"user2_sid" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// One side must be the caller; the other is who they want to talk to
	me := c.GetUint("userID")
	user1Profile, err := repositories.FindProfileByShortID(request.User1SID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User 1 not found"})
		return
	}
	user2Profile, err := repositories.FindProfileByShortID(request.User2SID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User 2 not found"})
		return
	}
	otherID := user2Profile.UserID
	if user2Profile.UserID == me {
		otherID = user1Profile.UserID
	} else if user1Profile.UserID != me {
		c.JSON(http.StatusForbidden, gin.H{"error": "You can only open chats you are part of"})
		return
	}
	respondWithPrivateChat(c, me, otherID)
}

// respondWithPrivateChat returns the chat between the caller and otherID,
// creating it if needed.
func respondWithPrivateChat(c *gin.Context, me, otherID uint) {
	if otherID == me {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot create a chat with yourself"})
		return
	}
	var count int64
	database.DB.Model(&models.User{}).Where("id = ?", otherID).Count(&count)
	if count == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	existingChat, err := repositories.GetExistingPrivateChat(me, otherID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check for existing chat"})
		return
	}
	if existingChat != nil {
		c.JSON(http.StatusOK, gin.H{"chat_id": existingChat.ID, "short_id": existingChat.ShortID})
		return
	}

	// The caller is user1, which the client uses to show a new empty chat only to its initiator
	chat, err := services.HandleChatCreation("Private Chat", []uint{me, otherID}, 0)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create/get chat"})
		return
	}
	privateChat := chat.(*models.PrivateChat)
	c.JSON(http.StatusOK, gin.H{"chat_id": privateChat.ID, "short_id": privateChat.ShortID})
}

// privateChatForCaller loads a private chat the caller belongs to, or
// responds with 404 and returns false; 404 rather than 403 so chat IDs can't
// be probed.
func privateChatForCaller(c *gin.Context, chatID uint) (*models.PrivateChat, bool) {
	chat, err := services.PrivateChatForMember(chatID, c.GetUint("userID"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chat not found"})
		return nil, false
	}
	return chat, true
}

// GetChatMessages retrieves messages by private chat ID
//
//	@Summary		Get chat messages
//	@Description	Retrieves messages from a private chat by chat ID with optional pagination.
//	@Tags			Chat
//	@Produce		json
//	@Param			chat_id	query		int	true	"Chat ID"
//	@Param			limit	query		int	false	"Number of messages to retrieve (default: 50, 0 for all)"
//	@Param			offset	query		int	false	"Offset for pagination (default: 0)"
//	@Success		200		{object}	map[string]interface{}	"Messages retrieved"
//	@Failure		400		{object}	map[string]interface{}	"Invalid request"
//	@Failure		500		{object}	map[string]interface{}	"Server error"
//	@Router			/messages [get]
func GetChatMessages(c *gin.Context) {
	chatID, err := strconv.Atoi(c.Query("chat_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chat ID"})
		return
	}

	// Parse pagination parameters with defaults
	limit := 50 // Default to 50 messages
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil {
			limit = parsedLimit
		}
	}

	offset := 0 // Default to 0
	if offsetStr := c.Query("offset"); offsetStr != "" {
		if parsedOffset, err := strconv.Atoi(offsetStr); err == nil {
			offset = parsedOffset
		}
	}

	if _, ok := privateChatForCaller(c, uint(chatID)); !ok {
		return
	}

	messages, err := repositories.GetMessagesByChatID(uint(chatID), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch messages"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"messages": messages})
}

// GetGroupMessages retrieves messages by group chat ID
//
//	@Summary		Get group chat messages
//	@Description	Retrieves messages from a group chat by chat ID with optional pagination.
//	@Tags			GroupChat
//	@Produce		json
//	@Param			chat_id	query		int	true	"Chat ID"
//	@Param			limit	query		int	false	"Number of messages to retrieve (default: 50, 0 for all)"
//	@Param			offset	query		int	false	"Offset for pagination (default: 0)"
//	@Success		200		{object}	map[string]interface{}	"Messages retrieved"
//	@Failure		400		{object}	map[string]interface{}	"Invalid request"
//	@Failure		500		{object}	map[string]interface{}	"Server error"
//	@Router			/group-messages [get]
func GetGroupMessages(c *gin.Context) {
	chatID, err := strconv.Atoi(c.Query("chat_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chat ID"})
		return
	}

	// Parse pagination parameters with defaults
	limit := 50 // Default to 50 messages
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil {
			limit = parsedLimit
		}
	}

	offset := 0 // Default to 0
	if offsetStr := c.Query("offset"); offsetStr != "" {
		if parsedOffset, err := strconv.Atoi(offsetStr); err == nil {
			offset = parsedOffset
		}
	}

	if !services.IsGroupChatMember(uint(chatID), c.GetUint("userID")) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chat not found"})
		return
	}

	messages, err := repositories.GetGroupMessagesByChatID(uint(chatID), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch group messages"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"messages": messages})
}

// GetUserChats retrieves both private and group chats of a user
func GetUserChats(c *gin.Context) {
	// Always the caller's own chats; user_id is still accepted from older clients but must match
	me := c.GetUint("userID")
	if requested := c.Query("user_id"); requested != "" && requested != strconv.FormatUint(uint64(me), 10) {
		c.JSON(http.StatusForbidden, gin.H{"error": "You can only list your own chats"})
		return
	}

	privateChats, err := repositories.GetUserPrivateChats(me)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch chats"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"private_chats": privateChats})
}

// GetChatByShortID retrieves a private chat by its ShortID
//
//	@Summary		Get chat by ShortID
//	@Description	Retrieves a private chat using its unique ShortID.
//	@Tags			Chat
//	@Produce		json
//	@Param			short_id	path		string	true	"Chat ShortID"
//	@Success		200			{object}	map[string]interface{}	"Chat details"
//	@Failure		400			{object}	map[string]interface{}	"Invalid request"
//	@Failure		404			{object}	map[string]interface{}	"Chat not found"
//	@Router			/chat/{short_id} [get]
func GetChatByShortID(c *gin.Context) {
	shortID := c.Param("short_id")
	if shortID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ShortID is required"})
		return
	}

	chat, err := repositories.FindChatByShortID(shortID)
	me := c.GetUint("userID")
	if err != nil || (chat.User1ID != me && chat.User2ID != me) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chat not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"chat": chat})
}

// GetUnreadMessageCount retrieves unread messages for a user in a private chat
//
//	@Summary		Get unread message count
//	@Description	Retrieves the count of unread messages in a private chat for a user.
//	@Tags			Chat
//	@Produce		json
//	@Param			chat_id	query		int	true	"Chat ID"
//	@Param			user_id	query		int	true	"User ID"
//	@Success		200		{object}	map[string]interface{}	"Unread message count"
//	@Failure		400		{object}	map[string]interface{}	"Invalid request"
//	@Router			/unread-count [get]
func GetUnreadMessageCount(c *gin.Context) {
	chatID, err := strconv.Atoi(c.Query("chat_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chat ID"})
		return
	}
	if _, ok := privateChatForCaller(c, uint(chatID)); !ok {
		return
	}

	// Counted for the caller; any user_id in the query is ignored
	unreadCount := services.GetUnreadPrivateMessageCount(uint(chatID), c.GetUint("userID"))
	c.JSON(http.StatusOK, gin.H{"unread_count": unreadCount})
}

// MarkMessagesAsRead marks messages in a private chat as read for the user
//
//	@Summary		Mark messages as read
//	@Description	Marks all unread messages in a private chat as read for the specified user.
//	@Tags			Chat
//	@Accept			json
//	@Produce		json
//	@Param			request	body		map[string]interface{}	true	"Chat ID and User ID"
//	@Success		200		{object}	map[string]interface{}	"Messages marked as read"
//	@Failure		400		{object}	map[string]interface{}	"Invalid request"
//	@Router			/mark-read [post]
func MarkMessagesAsRead(c *gin.Context) {
	// The web client sends ?chat_id=; a JSON {"chatId"} body is accepted too.
	// Any user ID sent along is ignored: messages are marked read for the caller.
	var request struct {
		ChatID uint `json:"chatId"`
	}
	if chatID, err := strconv.ParseUint(c.Query("chat_id"), 10, 64); err == nil {
		request.ChatID = uint(chatID)
	} else if err := c.ShouldBindJSON(&request); err != nil || request.ChatID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	if _, ok := privateChatForCaller(c, request.ChatID); !ok {
		return
	}

	err := services.MarkPrivateMessagesAsRead(request.ChatID, c.GetUint("userID"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark messages as read"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Messages marked as read"})
}

// CreateGroupChat creates a new group chat
//
//	@Summary		Create a group chat
//	@Description	Creates a new group chat with the specified users.
//	@Tags			GroupChat
//	@Accept			json
//	@Produce		json
//	@Param			request	body		map[string]interface{}	true	"Group name and user IDs"
//	@Success		200		{object}	map[string]interface{}	"Group chat created"
//	@Failure		400		{object}	map[string]interface{}	"Invalid request"
//	@Router			/create-group [post]
func CreateGroupChat(c *gin.Context) {
	var request struct {
		Name    string `json:"name" binding:"required"`
		UserIDs []uint `json:"user_ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// The creator is always a member, and nobody is listed twice
	me := c.GetUint("userID")
	seen := map[uint]bool{me: true}
	userIDs := []uint{me}
	for _, id := range request.UserIDs {
		if id != 0 && !seen[id] {
			seen[id] = true
			userIDs = append(userIDs, id)
		}
	}

	chat, err := services.HandleChatCreation(request.Name, userIDs, 1)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create group chat"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"chat_id": chat.(*models.GroupChat).ID})
}

// GetGroupMembers fetches all members of a group chat
//
//	@Summary		Get group members
//	@Description	Retrieves the list of users in a specified group chat.
//	@Tags			GroupChat
//	@Produce		json
//	@Param			chat_id	query		int	true	"Chat ID"
//	@Success		200		{object}	map[string]interface{}	"List of group members"
//	@Failure		400		{object}	map[string]interface{}	"Invalid request"
//	@Router			/group-members [get]
func GetGroupMembers(c *gin.Context) {
	chatID, err := strconv.Atoi(c.Query("chat_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chat ID"})
		return
	}

	if !services.IsGroupChatMember(uint(chatID), c.GetUint("userID")) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chat not found"})
		return
	}

	members, err := repositories.GetGroupChatMembers(uint(chatID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch group members"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"members": members})
}

// SendChatMessage sends a message in a private chat via REST API
//
//	@Summary		Send a chat message
//	@Description	Sends a message in a private chat and broadcasts it to the recipient via SSE/WebSocket
//	@Tags			Chat
//	@Accept			json
//	@Produce		json
//	@Param			request	body		map[string]interface{}	true	"Message data"
//	@Success		200		{object}	map[string]interface{}	"Message sent successfully"
//	@Failure		400		{object}	map[string]interface{}	"Invalid request"
//	@Failure		500		{object}	map[string]interface{}	"Server error"
//	@Router			/send-message [post]
func SendChatMessage(c *gin.Context) {
	var request struct {
		ChatID  uint   `json:"chat_id" binding:"required"`
		Content string `json:"content" binding:"required"`
		// sender_id and timestamp from older clients are ignored: the sender is the caller
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	if err := services.SendPrivateMessage(request.ChatID, c.GetUint("userID"), request.Content); err != nil {
		if errors.Is(err, services.ErrNotChatMember) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Chat not found"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Message sent successfully",
	})
}
