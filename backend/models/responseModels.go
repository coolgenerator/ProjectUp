package models

import (
	"time"

	"gorm.io/datatypes"
)

type LoginResponse struct {
	Email        *string `json:"email" example:"user@example.com"`
	Username     *string `json:"username" example:"john_doe"`
	FirstName    *string `json:"first_name" example:"John"`
	LastName     *string `json:"last_name" example:"Doe"`
	SID          string  `json:"sid" example:"123456"`
	Avatar       *string `json:"avatar" example:"https://example.com/avatar.jpg"`
	ID           uint    `json:"id" example:"1"`
	Token        string  `json:"token" example:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`
	RefreshToken string  `json:"refreshToken" example:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`
}

type ProjectPostResponse struct {
	// Fields from project_posts
	PostID      uint           `json:"post_id"`
	UserID      uint           `json:"user_id"`
	ProjectID   uint           `json:"project_id"`
	ShortID     string         `json:"short_id"`
	Title       string         `json:"title"`
	Cover       *string        `json:"cover"`
	Medias      datatypes.JSON `json:"medias"`
	Spots       datatypes.JSON `json:"spots"`
	StartTime   *time.Time     `json:"start_time"`
	Deadline    *time.Time     `json:"deadline"`
	Location    *string        `json:"location"`
	Description *string        `json:"description" gorm:"type:text"`
	ProjectType *string        `json:"project_type"` // Direct mapping from projects.project_type field
	IsLoved     bool           `json:"is_loved"`
	IsSaved     bool           `json:"is_saved"`
	LoveCount   int            `json:"love_count"`
	UpdatedAt   time.Time      `json:"updated_at"`

	// Fields from project (mapped into ProjectPostResponse)
	Style  *string        `json:"style"` // this maps from project.project_type
	School *string        `json:"school"`
	Class  *string        `json:"class"`
	Topics datatypes.JSON `json:"topics"` // Combined topic field (using the preferred name "topics")

	// Recruiting progress, filled in after the query
	RoleFills   map[string]int `json:"role_fills" gorm:"-"`   // Accepted applicants per role title
	MemberCount int            `json:"member_count" gorm:"-"` // Members other than the owner
}

type PaginatedProjectsResponse struct {
	Posts   []ProjectPostResponse `json:"posts"`
	HasMore bool                  `json:"has_more"`
	Total   int64                 `json:"total"`
	Page    int                   `json:"page"`
}

// Construct profile struct
type UserProfile struct {
	FirstName     *string              `json:"first_name"`
	LastName      *string              `json:"last_name"`
	PreferredName *string              `json:"preferred_name"`
	Field         *string              `json:"field"`
	AvatarURL     *string              `json:"avatar_url"`
	Username      *string              `json:"username"`
	SchoolEmail   *string              `json:"school_email"`
	Phone         *string              `json:"phone"`
	School        *string              `json:"school"`
	Biography     *string              `json:"biography"`
	State         *string              `json:"state"`
	City          *string              `json:"city"`
	Country       *string              `json:"country"`
	ZipCode       *string              `json:"zip_code"`
	Language      datatypes.JSON       `json:"language"`
	ResumeURL     *string              `json:"resume_url"`
	Verified      bool                 `json:"verified"`
	Interests     []UserInterest       `json:"interests"`
	Skills        []UserSkill          `json:"skills"`
	Projects      []Project            `json:"projects"`
	LikedPosts    []ProjectPost        `json:"liked_posts"`
	ProjectPosts  []ProjectPost        `json:"project_posts"`
	Comments      []GenericComment     `json:"comments"`
	Applications  []ProjectApplication `json:"applications"`
}

type ProjectDetailsResponse struct {
	PostID           uint   `json:"post_id"`
	Title            string `json:"title"`
	Description      string `json:"description"`
	Cover            string `json:"cover"`
	Style            string `json:"style"`  // Project type (e.g., Research, School Work, etc.)
	Topics           string `json:"topics"` // Topics in a serialized JSON format or array
	StartTime        string `json:"start_time"`
	EndTime          string `json:"end_time"`
	Location         string `json:"location,omitempty"`
	CommunicationApp string `json:"communication_app,omitempty"`
}

type UpdateRoleRequest struct {
	UserID uint   `json:"user_id" binding:"required"`
	Role   string `json:"role" binding:"required"`
}

type UpdatePermissionsRequest struct {
	UserID      uint            `json:"user_id" binding:"required"`
	Permissions map[string]bool `json:"permissions" binding:"required"`
}

type ProjectMemberResponse struct {
	UserID      uint            `json:"user_id"`
	Avatar      string          `json:"avatar"`
	Username    string          `json:"username"`
	Name        string          `json:"name"`
	Role        string          `json:"role"`
	Permissions map[string]bool `json:"permissions"`
	JoinedAt    time.Time       `json:"joined_at"`
}

type PrivateChatResponse struct {
	ID        uint      `json:"id"`
	ShortID   string    `json:"short_id"`
	Name      *string   `json:"name"`
	AvatarURL *string   `json:"avatar_url"`
	User1ID   uint      `json:"user1_id"`
	User2ID   uint      `json:"user2_id"`
	Status    uint      `json:"status"`
	UpdatedAt time.Time `json:"updated_at"`
}
