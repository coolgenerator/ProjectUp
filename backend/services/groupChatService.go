package services

import (
	"fmt"
	"projectup/models"
	"projectup/repositories"
)

// ProcessGroupMessage sends a group message to all members
func ProcessGroupMessage(msg models.GroupMessage) {
	repositories.SaveGroupMessage(msg)

	// Get chat members
	members, err := repositories.GetGroupChatMembers(msg.ChatID)
	if err != nil {
		fmt.Printf("Error retrieving group members for chat %d: %v\n", msg.ChatID, err)
		return
	}

	// Send the message to each member except sender
	for _, member := range members {
		if member.UserID == msg.SenderID {
			continue
		}
		NotifyUser(member.UserID, msg)
	}
}

// MarkGroupMessagesAsRead updates the read status of group chat messages
func MarkGroupMessagesAsRead(chatID, userID uint) error {
	err := repositories.MarkGroupMessagesAsRead(chatID, userID)
	if err != nil {
		fmt.Printf("Error marking group messages as read for user %d in chat %d: %v\n", userID, chatID, err)
		return err
	}
	return nil
}

// GetUnreadGroupMessageCount retrieves the count of unread group messages for a chat
func GetUnreadGroupMessageCount(chatID, userID uint) int64 {
	return repositories.CountUnreadGroupMessages(chatID, userID)
}
