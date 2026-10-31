package services

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"projectup/models"
	"projectup/repositories"
	"strconv"
	"time"
)

type PostShareService struct {
	repo *repositories.PostShareRepository
}

func NewPostShareService(repo *repositories.PostShareRepository) *PostShareService {
	return &PostShareService{
		repo: repo,
	}
}

func (s *PostShareService) CreateShare(postID, userID uint, expiresAt *time.Time, accessLevel uint) (*models.ProjectPostShare, error) {
	token, err := generateShareToken()
	if err != nil {
		return nil, err
	}

	var expiry time.Time
	if expiresAt != nil {
		expiry = *expiresAt
	}

	// Map uint to ShareAccessLevel
	var shareAccess models.ShareAccessLevel
	if accessLevel == 1 {
		shareAccess = models.ShareAccessEdit
	} else {
		shareAccess = models.ShareAccessView
	}

	share := &models.ProjectPostShare{
		PostID:         postID,
		SharedByUserID: userID,
		ShareToken:     token,
		ExpiresAt:      expiry,
		AccessLevel:    shareAccess,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	if err := s.repo.CreateShare(share); err != nil {
		return nil, err
	}

	return share, nil
}

func (s *PostShareService) GetSharedPost(token string) (*models.ProjectPost, error) {
	share, err := s.repo.GetShareByToken(token)
	if err != nil {
		return nil, err
	}

	// TODO: Implement fetching the post using PostRepository
	// For now, return a placeholder error with share info
	return nil, errors.New("post not found for share ID: " + strconv.FormatUint(uint64(share.ShareID), 10))
}

func (s *PostShareService) DeleteShare(shareID, userID uint) error {
	share, err := s.repo.GetShareByID(shareID)
	if err != nil {
		return err
	}

	if share.SharedByUserID != userID {
		return errors.New("unauthorized to delete this share")
	}

	return s.repo.DeleteShare(shareID, userID)
}

// generateShareToken creates a secure random token for share links
func generateShareToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(bytes), nil
}
