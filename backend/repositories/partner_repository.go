package repositories

import (
	"fmt"
	"projectup/models"
	"time"

	"gorm.io/gorm"
)

// PartnerRepository handles database operations for partner posts
type PartnerRepository struct {
	DB *gorm.DB
}

// NewPartnerRepository creates a new partner repository
func NewPartnerRepository(db *gorm.DB) *PartnerRepository {
	return &PartnerRepository{DB: db}
}

// CreatePartnerPost creates a new partner post
func (r *PartnerRepository) CreatePartnerPost(userID uint, post *models.PartnerPostRequest) (*models.PartnerPost, error) {
	// Calculate the expiration date
	expireAt := time.Now().AddDate(0, 0, post.ExpirationPeriod)

	// Convert spot availability to string
	var spotAvailability string
	if s, ok := post.SpotAvailability.(string); ok {
		spotAvailability = s
	} else if n, ok := post.SpotAvailability.(float64); ok {
		spotAvailability = fmt.Sprint(int(n))
	} else {
		spotAvailability = "Always"
	}

	// Create the partner post
	partnerPost := &models.PartnerPost{
		UserID:           userID,
		Title:            post.Title,
		Topic:            post.Topic,
		Description:      post.Description,
		Location:         post.Location,
		SpecificDate:     post.SpecificDate,
		PreferredTime:    post.PreferredTime,
		UseSpecificDate:  post.UseSpecificDate,
		SpotAvailability: spotAvailability,
		ExpirationPeriod: post.ExpirationPeriod,
		ExpireAt:         expireAt,
	}

	result := r.DB.Create(partnerPost)
	if result.Error != nil {
		return nil, result.Error
	}

	return partnerPost, nil
}

// GetPartnerPosts retrieves partner posts with pagination and filtering
func (r *PartnerRepository) GetPartnerPosts(page, limit int, filters map[string]interface{}) (*models.PartnerPostResponse, error) {
	var posts []*models.PartnerPost
	offset := (page - 1) * limit

	// Base query
	query := r.DB.Model(&models.PartnerPost{}).
		Preload("User").
		Where("expire_at > ?", time.Now())

	// Apply filters if they exist
	if search, ok := filters["search"].(string); ok && search != "" {
		query = query.Where("title ILIKE ? OR description ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if location, ok := filters["location"].(string); ok && location != "" {
		query = query.Where("location ILIKE ?", "%"+location+"%")
	}

	if interests, ok := filters["interests"].([]string); ok && len(interests) > 0 {
		for _, interest := range interests {
			query = query.Where("topic ILIKE ?", "%"+interest+"%")
		}
	}

	// Get total count for pagination
	var total int64
	query.Count(&total)

	// Get paginated results
	result := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&posts)
	if result.Error != nil {
		return nil, result.Error
	}

	// Determine if there are more posts
	hasMore := int64(offset+len(posts)) < total

	return &models.PartnerPostResponse{
		Partners: posts,
		HasMore:  hasMore,
	}, nil
}

// GetPartnerPostByID retrieves a specific partner post by ID
func (r *PartnerRepository) GetPartnerPostByID(postID uint) (*models.PartnerPost, error) {
	var post models.PartnerPost

	result := r.DB.Preload("User").First(&post, postID)
	if result.Error != nil {
		return nil, result.Error
	}

	return &post, nil
}

// DeletePartnerPost deletes a partner post
func (r *PartnerRepository) DeletePartnerPost(postID, userID uint) error {
	result := r.DB.Where("id = ? AND user_id = ?", postID, userID).Delete(&models.PartnerPost{})
	return result.Error
}

// UpdatePartnerPost updates a partner post
func (r *PartnerRepository) UpdatePartnerPost(postID, userID uint, updates map[string]interface{}) (*models.PartnerPost, error) {
	var post models.PartnerPost

	// Find the post first
	if err := r.DB.Where("id = ? AND user_id = ?", postID, userID).First(&post).Error; err != nil {
		return nil, err
	}

	// Update the post
	if err := r.DB.Model(&post).Updates(updates).Error; err != nil {
		return nil, err
	}

	// Refresh the post data
	r.DB.Preload("User").First(&post, postID)

	return &post, nil
}
