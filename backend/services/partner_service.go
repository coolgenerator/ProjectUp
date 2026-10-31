package services

import (
	"projectup/models"
	"projectup/repositories"
	"strings"
)

// PartnerService provides business logic for partner posts
type PartnerService struct {
	partnerRepo *repositories.PartnerRepository
}

// NewPartnerService creates a new partner service
func NewPartnerService(partnerRepo *repositories.PartnerRepository) *PartnerService {
	return &PartnerService{
		partnerRepo: partnerRepo,
	}
}

// CreatePartnerPost creates a new partner post
func (s *PartnerService) CreatePartnerPost(userID uint, req *models.PartnerPostRequest) (*models.PartnerPost, error) {
	// Validate topic
	if strings.ToLower(req.Topic) == "others" && req.Topic == "" {
		req.Topic = "Other"
	}

	// Create the post
	return s.partnerRepo.CreatePartnerPost(userID, req)
}

// GetPartnerPosts retrieves partner posts with pagination and filtering
func (s *PartnerService) GetPartnerPosts(page, limit int, searchQuery, location string, interests []string) (*models.PartnerPostResponse, error) {
	// Prepare filters
	filters := make(map[string]interface{})

	if searchQuery != "" {
		filters["search"] = searchQuery
	}

	if location != "" {
		filters["location"] = location
	}

	if len(interests) > 0 {
		filters["interests"] = interests
	}

	return s.partnerRepo.GetPartnerPosts(page, limit, filters)
}

// GetPartnerPostByID retrieves a specific partner post by ID
func (s *PartnerService) GetPartnerPostByID(postID uint) (*models.PartnerPost, error) {
	return s.partnerRepo.GetPartnerPostByID(postID)
}

// DeletePartnerPost deletes a partner post if the user is the owner
func (s *PartnerService) DeletePartnerPost(postID, userID uint) error {
	return s.partnerRepo.DeletePartnerPost(postID, userID)
}

// UpdatePartnerPost updates a partner post if the user is the owner
func (s *PartnerService) UpdatePartnerPost(postID, userID uint, updates map[string]interface{}) (*models.PartnerPost, error) {
	return s.partnerRepo.UpdatePartnerPost(postID, userID, updates)
}
