package repositories

import (
	"projectup/database"
	"projectup/models"

	"gorm.io/gorm"
)

type PostShareRepository struct {
	db *gorm.DB
}

func NewPostShareRepository() *PostShareRepository {
	return &PostShareRepository{
		db: database.DB,
	}
}

func (r *PostShareRepository) CreateShare(share *models.ProjectPostShare) error {
	return r.db.Create(share).Error
}

func (r *PostShareRepository) GetShareByToken(token string) (*models.ProjectPostShare, error) {
	var share models.ProjectPostShare
	err := r.db.Where("share_token = ? AND (expires_at IS NULL OR expires_at > NOW())", token).First(&share).Error
	if err != nil {
		return nil, err
	}
	return &share, nil
}

func (r *PostShareRepository) DeleteShare(shareID, userID uint) error {
	return r.db.Where("share_id = ? AND shared_by = ?", shareID, userID).Delete(&models.ProjectPostShare{}).Error
}

func (r *PostShareRepository) GetSharesByPostID(postID uint) ([]models.ProjectPostShare, error) {
	var shares []models.ProjectPostShare
	err := r.db.Where("post_id = ?", postID).Find(&shares).Error
	return shares, err
}

func (r *PostShareRepository) GetShareByID(shareID uint) (*models.ProjectPostShare, error) {
	var share models.ProjectPostShare
	err := r.db.First(&share, shareID).Error
	if err != nil {
		return nil, err
	}
	return &share, nil
}
