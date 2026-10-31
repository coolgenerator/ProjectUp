// project_repository.go
package repositories

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"gorm.io/datatypes"
	"gorm.io/gorm"

	"projectup/database"
	"projectup/helper"
	"projectup/models"
)

func CreateProject(project *models.Project) error {
	if err := database.DB.Create(project).Error; err != nil {
		return fmt.Errorf("failed to save project: %w", err)
	}
	return nil
}

func GenerateProjectShortID(project *models.Project) error {
	for {
		shortID := helper.GenerateShortID(8)
		var conflictProject models.Project
		if err := database.DB.Where("sid = ?", shortID).First(&conflictProject).Error; errors.Is(err, gorm.ErrRecordNotFound) {
			project.ShortID = shortID
			break
		}
	}
	return nil
}

func GenerateSlug(project *models.Project, title string) error {
	slugBase := helper.Slugify(title)

	// Truncate slugBase to ensure final slug doesn't exceed 100 characters
	// ShortID is 8 characters, so max slugBase should be 91 chars (100 - 8 - 1 for safety)
	maxSlugBaseLength := 91
	if len(slugBase) > maxSlugBaseLength {
		slugBase = slugBase[:maxSlugBaseLength]
		// Trim trailing hyphens after truncation
		slugBase = strings.TrimRight(slugBase, "-")
	}

	slug := slugBase + project.ShortID
	suffix := 1
	for {
		var slugConflict models.Project
		if err := database.DB.Unscoped().Where("slug = ?", slug).First(&slugConflict).Error; errors.Is(err, gorm.ErrRecordNotFound) {
			project.Slug = slug
			break
		}
		// When adding suffix, ensure we still don't exceed 100 chars
		slug = fmt.Sprintf("%s-%d", slugBase, suffix)
		if len(slug) > 100 {
			// Further truncate slugBase to accommodate suffix
			slugBase = slugBase[:maxSlugBaseLength-5] // Leave room for suffix like "-999"
			slugBase = strings.TrimRight(slugBase, "-")
			slug = fmt.Sprintf("%s-%d", slugBase, suffix)
		}
		suffix++
	}
	return nil
}

func SaveProjectPost(projectPost *models.ProjectPost) error {
	return database.DB.Create(projectPost).Error
}

func SaveApplicationQuestions(questions []models.ApplicationQuestion) error {
	return database.DB.Create(&questions).Error
}

func GetInteraction(userID, postID uint, interactionType string) (*models.ProjectInteraction, error) {
	var interaction models.ProjectInteraction
	err := database.DB.Where("user_id = ? AND post_id = ? AND interaction_type = ?", userID, postID, interactionType).First(&interaction).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &interaction, nil
}

func CreateInteraction(interaction *models.ProjectInteraction) error {
	return database.DB.Create(&interaction).Error
}

func DeleteInteraction(interaction *models.ProjectInteraction) error {
	return database.DB.Delete(&interaction).Error
}

func GetProjectPosts(offset, limit int) ([]models.ProjectPostResponse, error) {
	var projectPostList []models.ProjectPostResponse
	err := database.DB.
		Table("project_posts").
		Select(`
			project_posts.sid AS short_id,
			project_posts.*,
			projects.project_type AS style,
			projects.school,
			projects.class,
			projects.topic AS topics
		`).
		Joins("JOIN projects ON project_posts.project_id = projects.project_id").
		Offset(offset).
		Limit(limit).
		Scan(&projectPostList).Error

	return projectPostList, err
}

func GetProjectPostByShortID(shortID string) (*models.ProjectPostResponse, error) {
	var projectPost models.ProjectPostResponse
	err := database.DB.
		Table("project_posts").
		Select(`
			project_posts.sid AS short_id,
			project_posts.*,
			projects.project_type AS style,
			projects.school,
			projects.class,
			projects.topic AS topics
		`).
		Joins("JOIN projects ON project_posts.project_id = projects.project_id").
		Where("project_posts.sid = ?", shortID).
		First(&projectPost).Error

	if err != nil {
		return nil, err
	}

	return &projectPost, nil
}

func CountProjectPosts() (int64, error) {
	var totalPosts int64
	err := database.DB.Model(&models.ProjectPost{}).Count(&totalPosts).Error
	return totalPosts, err
}

func GetProjectInteractionCount(postID uint, interactionType string) (int, error) {
	var count int64
	err := database.DB.Model(&models.ProjectInteraction{}).
		Where("post_id = ? AND interaction_type = ?", postID, interactionType).
		Count(&count).Error
	return int(count), err
}

func CheckUserInteraction(userID, postID uint, interactionType string) (bool, error) {
	var interaction models.ProjectInteraction
	err := database.DB.Where("user_id = ? AND post_id = ? AND interaction_type = ?", userID, postID, interactionType).First(&interaction).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return false, nil
	}
	return err == nil, err
}

// CheckPostVisibilityAccess checks if a user has access to view a specific post based on visibility settings
func CheckPostVisibilityAccess(userID uint, postID uint) (bool, error) {
	var post models.ProjectPost
	var project models.Project
	var userProfile models.Profile
	var ownerProfile models.Profile

	// Get the post
	if err := database.DB.Where("post_id = ?", postID).First(&post).Error; err != nil {
		return false, err
	}

	// Get the associated project
	if err := database.DB.Where("project_id = ?", post.ProjectID).First(&project).Error; err != nil {
		return false, err
	}

	// Owner always has access
	if post.UserID == userID {
		return true, nil
	}

	// Public posts are visible to everyone
	if post.Visibility == 2 {
		return true, nil
	}

	// Get the current user's profile
	if err := database.DB.Where("user_id = ?", userID).First(&userProfile).Error; err != nil {
		return false, err
	}

	// For organization posts, check if user is in same organization
	if post.Visibility == 4 {
		// Get the post owner's profile to check their school email
		if err := database.DB.Where("user_id = ?", post.UserID).First(&ownerProfile).Error; err != nil {
			return false, err
		}

		// Get user's email verification status
		var userEmailVerified bool
		if err := database.DB.Table("profiles").
			Select("school_email_verified").
			Where("user_id = ?", userID).
			Scan(&userEmailVerified).Error; err != nil {
			return false, err
		}

		// Check if both users have verified school emails with matching domains
		if userProfile.SchoolEmail != nil && ownerProfile.SchoolEmail != nil &&
			*userProfile.SchoolEmail != "" && *ownerProfile.SchoolEmail != "" &&
			userEmailVerified {
			// Extract domains from email addresses
			userEmailParts := strings.Split(*userProfile.SchoolEmail, "@")
			ownerEmailParts := strings.Split(*ownerProfile.SchoolEmail, "@")

			// Compare domains if email format is valid
			if len(userEmailParts) == 2 && len(ownerEmailParts) == 2 {
				userDomain := userEmailParts[1]
				ownerDomain := ownerEmailParts[1]

				// Function to extract root domain (e.g., extract "ucla.edu" from "g.ucla.edu")
				extractRootDomain := func(domain string) string {
					parts := strings.Split(domain, ".")
					if len(parts) <= 2 {
						return domain // Already a root domain like "ucla.edu"
					}
					// Return last two parts (e.g., "ucla.edu" from "g.ucla.edu")
					return parts[len(parts)-2] + "." + parts[len(parts)-1]
				}

				userRootDomain := extractRootDomain(userDomain)
				ownerRootDomain := extractRootDomain(ownerDomain)

				// Compare root domains
				if userRootDomain == ownerRootDomain {
					return true, nil
				}
			}
		}
	}

	// For local posts, check if user is in same location
	if post.Visibility == 3 {
		// Check if user has location info and it matches project location
		if userProfile.City != nil && project.Location != nil {
			userLocation := *userProfile.City
			if userProfile.State != nil && *userProfile.State != "" {
				userLocation += ", " + *userProfile.State
			}
			if userProfile.Country != nil && *userProfile.Country != "" {
				userLocation += ", " + *userProfile.Country
			}

			// Simple string matching for location (could be improved)
			if userLocation != "" && *project.Location != "" &&
				(strings.Contains(*project.Location, userLocation) ||
					strings.Contains(userLocation, *project.Location)) {
				return true, nil
			}
		}
	}

	return false, nil
}

// GetPostByID retrieves a project post by ID with visibility check
func GetPostByID(postID uint, userID uint) (*models.ProjectPostResponse, error) {
	var projectPost models.ProjectPostResponse

	// First check visibility access
	hasAccess, err := CheckPostVisibilityAccess(userID, postID)
	if err != nil {
		return nil, err
	}

	// If user doesn't have access, return unauthorized error
	if !hasAccess {
		return nil, errors.New("unauthorized: user does not have access to this post")
	}

	err = database.DB.
		Table("project_posts").
		Select(`
			project_posts.*,
			projects.project_type AS style,
			projects.school,
			projects.class,
			projects.topic AS topics
		`).
		Joins("JOIN projects ON project_posts.project_id = projects.project_id").
		Where("project_posts.post_id = ?", postID).
		Scan(&projectPost).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to fetch post by ID: %w", err)
	}

	return &projectPost, nil
}

func GetProjectDetails(postID uint) (*models.ProjectDetailsResponse, error) {
	var projectDetails models.ProjectDetailsResponse

	err := database.DB.Table("project_posts").
		Select(`
			project_posts.post_id,
			project_posts.title,
			project_posts.description,
			project_posts.cover,
			projects.project_type AS style,
			projects.topic AS topics,
			projects.start_time,
			projects.end_time,
			projects.location,
			projects.communication_app
		`).
		Joins("JOIN projects ON project_posts.project_id = projects.project_id").
		Where("project_posts.post_id = ?", postID).
		Find(&projectDetails).Error

	if err != nil && err != gorm.ErrRecordNotFound {
		return nil, err
	}

	return &projectDetails, nil
}

func GetApplicationQuestions(postID uint) ([]models.ApplicationQuestion, error) {
	var questions []models.ApplicationQuestion

	err := database.DB.Table("application_questions").
		Select(`
			question_id,
			post_id,
			text,
			type,
			choices
		`).
		Where("post_id = ?", postID).
		Find(&questions).Error

	if err != nil && err != gorm.ErrRecordNotFound {
		return nil, err
	}

	return questions, nil
}

func GenerateProjectPostShortID(projectPost *models.ProjectPost) error {
	for {
		shortID := helper.GenerateShortID(8) // Generate an 8-character short ID
		var conflictPost models.ProjectPost
		if err := database.DB.Where("sid = ?", shortID).First(&conflictPost).Error; errors.Is(err, gorm.ErrRecordNotFound) {
			projectPost.ShortID = shortID
			break
		}
	}
	return nil
}

// SaveProjectApplication stores a project application and returns its ID
func SaveProjectApplication(application *models.ProjectApplication) (uint, error) {
	result := database.DB.Create(application)
	if result.Error != nil {
		return 0, result.Error
	}
	return application.ApplicationID, nil
}

// SaveApplicationAnswer stores a user's response to an application question
func SaveApplicationAnswer(answer *models.ApplicationAnswer) error {
	result := database.DB.Create(answer)
	return result.Error
}

// GetProjectOwner retrieves the owner (creator) of a project post
func GetProjectOwner(postID uint) (uint, error) {
	var userID uint

	err := database.DB.
		Table("project_posts").
		Select("projects.user_id").
		Joins("INNER JOIN projects ON project_posts.project_id = projects.project_id").
		Where("project_posts.post_id = ?", postID).
		Scan(&userID).Error

	if err != nil {
		return 0, errors.New("failed to find project owner")
	}

	return userID, nil
}

func GetUserPreferredLanguages(userID uint) []string {
	var user struct {
		Language datatypes.JSON `gorm:"type:jsonb"` // Ensure this matches your GORM model
	}

	// Fetch user's preferred languages
	err := database.DB.Select("language").Where("id = ?", userID).First(&user).Error
	if err != nil {
		fmt.Println("Error fetching user languages:", err)
		return []string{"en"} // Default to English if error occurs
	}

	// Convert JSONB to Go slice
	var languages []string
	if err := json.Unmarshal([]byte(user.Language.String()), &languages); err != nil || len(languages) == 0 {
		return []string{"en"} // Default to English if conversion fails or no languages are set
	}

	return languages
}

// Resource repository functions
// func CreateResource(resource *models.Resource) error {
// 	return database.DB.Create(resource).Error
// }

// func GetResourceByID(resourceID uint) (*models.Resource, error) {
// 	var resource models.Resource
// 	err := database.DB.Where("resource_id = ?", resourceID).First(&resource).Error
// 	if err != nil {
// 		return nil, err
// 	}
// 	return &resource, nil
// }

// func UpdateResource(resource *models.Resource) error {
// 	return database.DB.Save(resource).Error
// }

// func DeleteResource(resourceID uint) error {
// 	return database.DB.Delete(&models.Resource{}, resourceID).Error
// }

// func GetResourcesByProjectID(projectID uint) ([]models.Resource, error) {
// 	var resources []models.Resource
// 	err := database.DB.Where("project_id = ?", projectID).Find(&resources).Error
// 	if err != nil {
// 		return nil, err
// 	}
// 	return resources, nil
// }

// Workspace repository functions
// func CreateWorkspace(workspace *models.Workspace) error {
// 	return database.DB.Create(workspace).Error
// }

// func GetWorkspaceByID(workspaceID uint) (*models.Workspace, error) {
// 	var workspace models.Workspace
// 	err := database.DB.Where("workspace_id = ?", workspaceID).First(&workspace).Error
// 	if err != nil {
// 		return nil, err
// 	}
// 	return &workspace, nil
// }

// func UpdateWorkspace(workspace *models.Workspace) error {
// 	return database.DB.Save(workspace).Error
// }

// func DeleteWorkspace(workspaceID uint) error {
// 	return database.DB.Delete(&models.Workspace{}, workspaceID).Error
// }

// func GetWorkspacesByProjectID(projectID uint) ([]models.Workspace, error) {
// 	var workspaces []models.Workspace
// 	err := database.DB.Where("project_id = ?", projectID).Find(&workspaces).Error
// 	if err != nil {
// 		return nil, err
// 	}
// 	return workspaces, nil
// }

// Block repository functions - REMOVED (no longer using block-based design)
// All block-related functionality has been removed from the codebase.
// Using idea tree structure instead for project organization.

// Block permissions function removed - no longer using block-based design

// CreatePostShare creates a new share link for a project post
func CreatePostShare(share *models.ProjectPostShare) error {
	return database.DB.Create(share).Error
}

// GetPostShareByToken retrieves a share by its token
func GetPostShareByToken(token string) (*models.ProjectPostShare, error) {
	var share models.ProjectPostShare
	err := database.DB.Where("share_token = ?", token).First(&share).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("share link not found")
		}
		return nil, err
	}
	return &share, nil
}

// DeletePostShare deletes a share link
func DeletePostShare(shareID uint) error {
	return database.DB.Delete(&models.ProjectPostShare{}, shareID).Error
}

// GetPostSharesByPostID retrieves all shares for a project post
func GetPostSharesByPostID(postID uint) ([]models.ProjectPostShare, error) {
	var shares []models.ProjectPostShare
	err := database.DB.Where("post_id = ?", postID).Find(&shares).Error
	return shares, err
}

// GetProjectOwnerAndTitle retrieves the project owner ID and title for a given post ID
func GetProjectOwnerAndTitle(postID uint) (uint, string, string, error) {
	var result struct {
		UserID  uint   `gorm:"column:user_id"`
		Title   string `gorm:"column:title"`
		ShortID string `gorm:"column:project_sid"`
	}

	err := database.DB.Table("project_posts").
		Select("project_posts.user_id, project_posts.title, projects.sid as project_sid").
		Joins("JOIN projects ON project_posts.project_id = projects.project_id").
		Where("project_posts.post_id = ?", postID).
		First(&result).Error

	if err != nil {
		return 0, "", "", err
	}

	return result.UserID, result.Title, result.ShortID, nil
}

// GetUserEmail retrieves the email address for a given user ID
func GetUserEmail(userID uint) (string, error) {
	var email string
	err := database.DB.Model(&models.User{}).
		Select("email").
		Where("id = ?", userID).
		Scan(&email).Error

	if err != nil {
		return "", err
	}

	return email, nil
}

// GetApplicationQuestionsWithAnswers retrieves all questions and their answers for a project post
func GetApplicationQuestionsWithAnswers(postID uint) ([]models.ApplicationQuestion, error) {
	var questions []models.ApplicationQuestion

	err := database.DB.Table("application_questions").
		Select(`
			application_questions.question_id,
			application_questions.post_id,
			application_questions.text,
			application_questions.type,
			application_questions.choices,
			application_questions.created_at
		`).
		Where("application_questions.post_id = ?", postID).
		Find(&questions).Error

	if err != nil && err != gorm.ErrRecordNotFound {
		return nil, err
	}

	// Fetch answers for each question
	for i := range questions {
		var answers []models.ApplicationAnswer
		err := database.DB.Table("application_answers").
			Select(`
				application_answers.answer_id,
				application_answers.application_id,
				application_answers.question_id,
				application_answers.answer_text,
				application_answers.created_at
			`).
			Where("application_answers.question_id = ?", questions[i].QuestionID).
			Find(&answers).Error

		if err != nil && err != gorm.ErrRecordNotFound {
			return nil, err
		}

		questions[i].Answers = answers
	}

	return questions, nil
}

// GetApplicationQuestionsWithAnswersAndApplications retrieves all questions, answers, and applications with user details for a project post
func GetApplicationQuestionsWithAnswersAndApplications(postID uint) ([]models.ApplicationQuestion, []struct {
	models.ProjectApplication
	UserID        uint                       `json:"user_id"`
	PreferredName *string                    `json:"preferred_name"`
	FirstName     *string                    `json:"first_name"`
	LastName      *string                    `json:"last_name"`
	Username      *string                    `json:"username"`
	Avatar        *string                    `json:"avatar"`
	Answers       []models.ApplicationAnswer `json:"answers"`
}, error) {
	// Get questions with answers
	questions, err := GetApplicationQuestionsWithAnswers(postID)
	if err != nil {
		return nil, nil, err
	}

	// Get applications with user details
	var applications []struct {
		models.ProjectApplication
		UserID        uint    `json:"user_id"`
		PreferredName *string `json:"preferred_name"`
		FirstName     *string `json:"first_name"`
		LastName      *string `json:"last_name"`
		Username      *string `json:"username"`
		Avatar        *string `json:"avatar"`
	}

	err = database.DB.Raw(`
		SELECT 
			project_application.*,
			users.id as user_id,
			profiles.preferred_name,
			profiles.first_name,
			profiles.last_name,
			users.username,
			profiles.avatar_url as avatar
		FROM project_application 
		JOIN users ON project_application.user_id = users.id 
		LEFT JOIN profiles ON users.id = profiles.user_id
		WHERE project_application.post_id = ?
	`, postID).Scan(&applications).Error

	if err != nil && err != gorm.ErrRecordNotFound {
		return nil, nil, err
	}

	// Create a new slice to hold applications with answers
	applicationsWithAnswers := make([]struct {
		models.ProjectApplication
		UserID        uint                       `json:"user_id"`
		PreferredName *string                    `json:"preferred_name"`
		FirstName     *string                    `json:"first_name"`
		LastName      *string                    `json:"last_name"`
		Username      *string                    `json:"username"`
		Avatar        *string                    `json:"avatar"`
		Answers       []models.ApplicationAnswer `json:"answers"`
	}, len(applications))

	// Copy the applications data and fetch answers for each
	for i, app := range applications {
		applicationsWithAnswers[i].ProjectApplication = app.ProjectApplication
		applicationsWithAnswers[i].UserID = app.UserID
		applicationsWithAnswers[i].PreferredName = app.PreferredName
		applicationsWithAnswers[i].FirstName = app.FirstName
		applicationsWithAnswers[i].LastName = app.LastName
		applicationsWithAnswers[i].Username = app.Username
		applicationsWithAnswers[i].Avatar = app.Avatar

		// Fetch answers for this application
		var answers []models.ApplicationAnswer
		err = database.DB.Where("application_id = ?", app.ApplicationID).Find(&answers).Error
		if err != nil && err != gorm.ErrRecordNotFound {
			return nil, nil, err
		}
		applicationsWithAnswers[i].Answers = answers
	}

	return questions, applicationsWithAnswers, nil
}
