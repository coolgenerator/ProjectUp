package models

import "time"

type FileMetadata struct {
	ID        uint   `gorm:"primaryKey"`
	Hash      string `gorm:"unique;not null"`
	S3Key     string `gorm:"not null"`
	CreatedAt time.Time
}
