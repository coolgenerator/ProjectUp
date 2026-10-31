package database

import (
	"fmt"
	"os"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var CrawlerDB *gorm.DB

// ConnectToCrawlerDB connects to the crawler database which has the knowledge tree data
func ConnectToCrawlerDB() error {
	// Use same connection settings as the main database
	// The crawler database shares the same PostgreSQL instance
	host := os.Getenv("PG_HOST")
	port := os.Getenv("PG_PORT")
	user := os.Getenv("PG_USER")
	password := os.Getenv("PG_PASSWORD")
	dbName := os.Getenv("PG_DATABASE")
	
	var dsn string
	if password != "" {
		dsn = fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable", host, user, password, dbName, port)
	} else {
		dsn = fmt.Sprintf("host=%s user=%s dbname=%s port=%s sslmode=disable", host, user, dbName, port)
	}
	
	var err error
	// Connect without soft delete support since crawler tables don't have deleted_at
	CrawlerDB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
		DisableAutomaticPing: false,
		// Don't use soft deletes for crawler tables
		QueryFields: true,
	})
	
	if err != nil {
		return fmt.Errorf("failed to connect to crawler database: %w", err)
	}

	return nil
}

// GetCrawlerDB returns the crawler database connection
func GetCrawlerDB() *gorm.DB {
	if CrawlerDB == nil {
		ConnectToCrawlerDB()
	}
	return CrawlerDB
}