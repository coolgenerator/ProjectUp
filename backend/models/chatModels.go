package models

import (
	"time"
)

// Private Chat
type PrivateChat struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	ShortID   string    `gorm:"type:varchar(10);uniqueIndex;not null" json:"short_id"`
	Name      string    `gorm:"not null" json:"name"`
	User1ID   uint      `gorm:"not null" json:"user1_id"`
	User2ID   uint      `gorm:"not null" json:"user2_id"`
	Status    uint      `gorm:"not null;default:0" json:"status"` // 0 = Active, 1 = Hidden, 2 = Deleted
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`

	// Use pointers to avoid circular references and add omitempty
	Messages []*PrivateMessage `gorm:"foreignKey:ChatID;-:migration" json:"messages,omitempty"`
	User1    *User             `gorm:"foreignKey:User1ID;-:migration" json:"user1,omitempty"`
	User2    *User             `gorm:"foreignKey:User2ID;-:migration" json:"user2,omitempty"`
}

type PrivateMessage struct {
	ID        uint      `gorm:"primaryKey"`
	ChatID    uint      `gorm:"not null"`
	SenderID  uint      `gorm:"not null"`
	Content   string    `gorm:"type:text;not null"`
	Timestamp time.Time `gorm:"autoCreateTime"`
	IsRead    bool      `gorm:"default:false"`

	// Use pointers to avoid circular references and add omitempty
	Chat   *PrivateChat `gorm:"foreignKey:ChatID;-:migration" json:"chat,omitempty"`
	Sender *User        `gorm:"foreignKey:SenderID;-:migration" json:"sender,omitempty"`
}

// Group Chat
type GroupChat struct {
	ID   uint   `gorm:"primaryKey" json:"id"`
	Name string `gorm:"not null" json:"name"`
	// ProjectID marks a project's team chat; each project has at most one
	ProjectID *uint     `gorm:"uniqueIndex" json:"project_id,omitempty"`
	Status    uint      `gorm:"not null;default:0" json:"status"` // 0 = Active, 1 = Hidden, 2 = Deleted
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`

	// Use pointers to avoid circular references and add omitempty
	Messages []*GroupMessage `gorm:"foreignKey:ChatID;-:migration" json:"messages,omitempty"`
	Members  []*GroupMember  `gorm:"foreignKey:GroupID;-:migration" json:"members,omitempty"`
}

type GroupMessage struct {
	ID        uint      `gorm:"primaryKey"`
	ChatID    uint      `gorm:"not null"`
	SenderID  uint      `gorm:"not null"`
	Content   string    `gorm:"type:text;not null"`
	Timestamp time.Time `gorm:"autoCreateTime"`
	// System marks an event such as a member joining; Content then holds the
	// event as JSON and the client writes the sentence
	System bool `gorm:"default:false"`

	// Use pointers to avoid circular references and add omitempty
	Chat   *GroupChat `gorm:"foreignKey:ChatID;-:migration" json:"chat,omitempty"`
	Sender *User      `gorm:"foreignKey:SenderID;-:migration" json:"sender,omitempty"`
}

type GroupMember struct {
	MemberID  uint      `gorm:"primaryKey;column:id"`
	GroupID   uint      `gorm:"not null"`
	UserID    uint      `gorm:"not null"`
	ProjectID uint      `gorm:"not null"`
	Role      string    `gorm:"type:varchar(50);default:'member'"`
	JoinedAt  time.Time `gorm:"autoCreateTime"`
	UpdatedAt time.Time `gorm:"autoUpdateTime"`

	// Use pointers to avoid circular references and add omitempty
	User    *User      `gorm:"foreignKey:UserID;references:ID;-:migration" json:"user,omitempty"`
	Project *Project   `gorm:"foreignKey:ProjectID;references:ProjectID;-:migration" json:"project,omitempty"`
	Group   *GroupChat `gorm:"foreignKey:GroupID;-:migration" json:"group,omitempty"`
}

func (GroupMember) TableName() string {
	return "group_members"
}

// type Chat struct {
// 	ID        uint       `gorm:"primaryKey" json:"id"`
// 	Name      string     `gorm:"not null" json:"name"`
// 	Type      int        `gorm:"not null" json:"type"` // 0 = Private, 1 = Group
// 	CreatedAt time.Time  `gorm:"autoCreateTime" json:"created_at"`
// 	UpdatedAt time.Time  `gorm:"autoUpdateTime" json:"updated_at"`
// 	Messages  []Messages `gorm:"foreignKey:ChatID"`
// 	Members   []Members  `gorm:"foreignKey:ChatID"`
// }

// type Messages struct {
// 	ID        uint      `gorm:"primaryKey" json:"id"`
// 	ChatID    uint      `gorm:"not null" json:"chat_id"`
// 	SenderID  uint      `gorm:"not null" json:"sender_id"`
// 	Content   string    `gorm:"type:text;not null" json:"content"`
// 	Timestamp time.Time `gorm:"autoCreateTime" json:"timestamp"`
// 	IsRead    bool      `gorm:"default:false" json:"is_read"`
// }

// type Members struct {
// 	ID     uint   `gorm:"primaryKey" json:"id"`
// 	ChatID uint   `gorm:"not null" json:"chat_id"`
// 	UserID uint   `gorm:"not null" json:"user_id"`
// 	Role   string `gorm:"type:varchar(50);default:'member'" json:"role"`
// 	User   User   `gorm:"foreignKey:UserID;references:ID"`
// }
