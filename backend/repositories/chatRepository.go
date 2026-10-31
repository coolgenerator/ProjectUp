package repositories

import (
	"log"
	"math/rand"
	"projectup/database"
	"projectup/models"

	"gorm.io/gorm"
)

// Save a message to the database
func SaveMessage(msg models.PrivateMessage) {
	message := models.PrivateMessage{
		ChatID:    msg.ChatID,
		SenderID:  msg.SenderID,
		Content:   msg.Content,
		IsRead:    msg.IsRead,
		Timestamp: msg.Timestamp,
	}

	result := database.DB.Create(&message)
	if result.Error != nil {
		log.Printf("Failed to store message: %v", result.Error)
	}
}

// Save a group message to the database
func SaveGroupMessage(msg models.GroupMessage) {
	message := models.GroupMessage{
		ChatID:    msg.ChatID,
		SenderID:  msg.SenderID,
		Content:   msg.Content,
		Timestamp: msg.Timestamp,
	}

	result := database.DB.Create(&message)
	if result.Error != nil {
		log.Printf("Failed to store group message: %v", result.Error)
	}
}

// Get messages by chat ID (for both private and group chats)
// Supports pagination with limit and offset parameters
// Set limit to 0 to fetch all messages (backward compatibility)
func GetMessagesByChatID(chatID uint, limit int, offset int) ([]models.PrivateMessage, error) {
	var messages []models.PrivateMessage
	query := database.DB.Where("chat_id = ?", chatID).
		Order("timestamp DESC") // Most recent first for pagination

	// Apply pagination if limit is specified
	if limit > 0 {
		query = query.Limit(limit).Offset(offset)
	}

	result := query.Find(&messages)
	return messages, result.Error
}

// Get messages by group chat ID
// Supports pagination with limit and offset parameters
// Set limit to 0 to fetch all messages (backward compatibility)
func GetGroupMessagesByChatID(chatID uint, limit int, offset int) ([]models.GroupMessage, error) {
	var messages []models.GroupMessage
	query := database.DB.Where("chat_id = ?", chatID).
		Order("timestamp DESC") // Most recent first for pagination

	// Apply pagination if limit is specified
	if limit > 0 {
		query = query.Limit(limit).Offset(offset)
	}

	result := query.Find(&messages)
	if result.Error != nil {
		log.Printf("Failed to fetch group messages for chat %d: %v", chatID, result.Error)
	}
	return messages, result.Error
}

// Create a new private chat between two users
func CreatePrivateChat(user1ID, user2ID uint) (*models.PrivateChat, error) {
	// Generate a unique ShortID
	shortID := generateShortID()

	// Ensure uniqueness
	for {
		var existingChat models.PrivateChat
		err := database.DB.Where("short_id = ?", shortID).First(&existingChat).Error
		if err != nil {
			// ShortID is unique, break
			break
		}
		// Generate a new one if collision
		shortID = generateShortID()
	}

	chat := models.PrivateChat{
		ShortID: shortID,
		Name:    "Private Chat",
		User1ID: user1ID,
		User2ID: user2ID,
		Status:  0, // Active
	}

	result := database.DB.Create(&chat)
	if result.Error != nil {
		return nil, result.Error
	}

	// Don't create an initial system message - let the first real message initialize the chat
	// This prevents empty conversations from appearing in the conversation list

	return &chat, nil
}

// Create a new group chat
func CreateGroupChat(name string, userIDs []uint) (*models.GroupChat, error) {
	chat := models.GroupChat{
		Name:   name,
		Status: 0, // Active
	}

	result := database.DB.Create(&chat)
	if result.Error != nil {
		return nil, result.Error
	}

	// Add group members to the chat
	var members []models.GroupMember
	for _, userID := range userIDs {
		members = append(members, models.GroupMember{
			GroupID: chat.ID,
			UserID:  userID,
		})
	}

	database.DB.Create(&members)

	// Don't create an initial system message - let the first real message initialize the chat
	// This prevents empty conversations from appearing in the conversation list

	return &chat, nil
}

// Get all chats for a user (both private and group chats)
func GetUserPrivateChats(userID uint) ([]models.PrivateChatResponse, error) {
	var privateChats []models.PrivateChat

	// Query private chats where the user is either User1 or User2
	err := database.DB.Where("user1_id = ? OR user2_id = ?", userID, userID).
		Where("status = ?", 0). // Only active chats
		Find(&privateChats).Error
	if err != nil {
		return nil, err
	}

	var chatResponses []models.PrivateChatResponse

	// Modify chat names to show the other user's name
	for _, chat := range privateChats {
		var otherUser models.User
		otherUserID := chat.User1ID
		if chat.User1ID == userID {
			otherUserID = chat.User2ID
		}

		// Fetch the other user's details
		if err := database.DB.First(&otherUser, otherUserID).Error; err != nil {
			defaultName := "Unknown User"
			defaultAvatar := ""
			chatResponses = append(chatResponses, models.PrivateChatResponse{
				ID:        chat.ID,
				ShortID:   chat.ShortID,
				Name:      &defaultName,
				AvatarURL: &defaultAvatar,
				User1ID:   chat.User1ID,
				User2ID:   chat.User2ID,
				Status:    chat.Status,
				UpdatedAt: chat.UpdatedAt,
			})
		} else {
			// Get profile information
			var profile models.Profile
			var avatarURL *string
			if err := database.DB.Where("user_id = ?", otherUser.ID).First(&profile).Error; err == nil {
				avatarURL = profile.AvatarURL
			}

			userDisplayName := formatUserDisplay(otherUser, profile)
			chatResponses = append(chatResponses, models.PrivateChatResponse{
				ID:        chat.ID,
				ShortID:   chat.ShortID,
				Name:      &userDisplayName,
				AvatarURL: avatarURL,
				User1ID:   chat.User1ID,
				User2ID:   chat.User2ID,
				Status:    chat.Status,
				UpdatedAt: chat.UpdatedAt,
			})
		}
	}

	return chatResponses, nil
}

// formatUserDisplay formats the user's display name
// Uses PreferredName if set, otherwise falls back to FirstName, then username
func formatUserDisplay(user models.User, profile models.Profile) string {
	displayName := ""
	lastName := ""

	// Use PreferredName if available, otherwise fall back to FirstName
	if profile.PreferredName != nil && *profile.PreferredName != "" {
		displayName = *profile.PreferredName
	} else if profile.FirstName != nil && *profile.FirstName != "" {
		displayName = *profile.FirstName
	} else if user.Username != nil {
		// If no name is available, use username
		return *user.Username
	} else {
		return "Unknown User"
	}

	// Add last name if available
	if profile.LastName != nil && *profile.LastName != "" {
		lastName = " " + *profile.LastName
	}

	return displayName + lastName
}

// Count unread messages for a private chat
func CountUnreadPrivateMessages(chatID, userID uint) int64 {
	var count int64
	database.DB.Model(&models.PrivateMessage{}).
		Where("chat_id = ? AND is_read = false AND sender_id != ? AND sender_id != 0", chatID, userID).
		Count(&count)
	return count
}

// Count unread messages for a group chat
func CountUnreadGroupMessages(chatID, userID uint) int64 {
	var count int64
	database.DB.Model(&models.GroupMessage{}).
		Where("chat_id = ? AND is_read = false AND sender_id != ? AND sender_id != 0", chatID, userID).
		Count(&count)
	return count
}

// Get chat members by group chat ID
func GetGroupChatMembers(groupID uint) ([]models.GroupMember, error) {
	var members []models.GroupMember
	result := database.DB.Where("group_id = ?", groupID).Find(&members)
	return members, result.Error
}

// Mark all messages in a private chat as read for a user
func MarkPrivateMessagesAsRead(chatID, userID uint) error {
	return database.DB.Model(&models.PrivateMessage{}).
		Where("chat_id = ? AND sender_id != ?", chatID, userID).
		Update("is_read", true).Error
}

// Mark all messages in a group chat as read for a user
func MarkGroupMessagesAsRead(chatID, userID uint) error {
	return database.DB.Model(&models.GroupMessage{}).
		Where("chat_id = ? AND sender_id != ?", chatID, userID).
		Update("is_read", true).Error
}

// GetExistingPrivateChat checks if a private chat exists between two users
func GetExistingPrivateChat(user1ID, user2ID uint) (*models.PrivateChat, error) {
	var chat models.PrivateChat

	// Check if there's an existing private chat between these users
	err := database.DB.Where("user1_id = ? AND user2_id = ? OR user1_id = ? AND user2_id = ?",
		user1ID, user2ID, user2ID, user1ID).
		Where("status = ?", 0). // Active only
		First(&chat).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil // No existing private chat found
		}
		return nil, err // Other errors
	}

	return &chat, nil
}

// Fetch private chat members
func GetPrivateChatByID(chatID uint) (*models.PrivateChat, error) {
	var chat models.PrivateChat
	result := database.DB.Where("id = ?", chatID).First(&chat)
	return &chat, result.Error
}

// Find chat by ShortID
func FindChatByShortID(shortID string) (*models.PrivateChat, error) {
	var chat models.PrivateChat
	err := database.DB.Where("short_id = ?", shortID).First(&chat).Error
	if err != nil {
		return nil, err
	}
	return &chat, nil
}

// Generate a random 8-character ShortID for chats
func generateShortID() string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	const length = 8
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[rand.Intn(len(charset))]
	}
	return string(b)
}
