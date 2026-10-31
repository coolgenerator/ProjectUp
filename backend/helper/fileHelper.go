package helper

import (
	"context"
	"crypto/hmac"
	"crypto/md5"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"log"
	"mime"
	"os"
	"path/filepath"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	s3types "github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/joho/godotenv"
)

func GenerateEncryptedPath(secretKey, filename string) string {
	h := hmac.New(sha256.New, []byte(secretKey))
	h.Write([]byte(filename))
	encryptedHash := hex.EncodeToString(h.Sum(nil))
	return fmt.Sprintf("media/%s_%s", encryptedHash, filename)
}

type AWSService struct {
	S3Client *s3.Client
}

// UploadFile uploads a file to the specified S3 bucket
func UploadFile(bucketName string, bucketKey string, fileName string, isPublic bool) error {
	// Load environment variables from .env file
	err := godotenv.Load(".env")
	if err != nil {
		log.Println("Error loading .env file:", err)
		return err
	}

	s3Client, err := newS3Client(context.TODO())
	if err != nil {
		log.Println("Error loading AWS config:", err)
		return err
	}
	awsService := AWSService{
		S3Client: s3Client,
	}

	// Open the file
	file, err := os.Open(fileName)
	if err != nil {
		log.Println("Error opening the file:", err)
		return err
	}
	defer file.Close()

	// Determine the Content-Type
	ext := filepath.Ext(fileName)
	mimeType := mime.TypeByExtension(ext)
	if mimeType == "" {
		mimeType = "application/octet-stream" // Default content type
	}

	// Set ACL based on the isPublic parameter
	var acl s3types.ObjectCannedACL
	if isPublic {
		acl = s3types.ObjectCannedACLPublicRead
	} else {
		acl = s3types.ObjectCannedACLPrivate
	}

	// Upload the file to S3
	_, err = awsService.S3Client.PutObject(context.TODO(), &s3.PutObjectInput{
		Bucket:      aws.String(bucketName),
		Key:         aws.String(bucketKey),
		Body:        file,
		ContentType: aws.String(mimeType), // Set the Content-Type dynamically
		ACL:         acl,                  // Set the ACL dynamically
	})
	if err != nil {
		log.Println("Error uploading the file:", err)
		return err
	}

	log.Println("File uploaded successfully")
	return nil
}

// GenerateFileHash generates an MD5 hash of a file's content.
func GenerateFileHash(filePath string) (string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	hash := md5.New()
	if _, err := io.Copy(hash, file); err != nil {
		return "", err
	}

	return hex.EncodeToString(hash.Sum(nil)), nil
}

// fileExistsInBucket checks if a file with the same hash exists in the S3 bucket
func fileExistsInBucket(s3Client *s3.Client, bucketName string, fileHash string) (bool, error) {
	output, err := s3Client.ListObjectsV2(context.TODO(), &s3.ListObjectsV2Input{
		Bucket: aws.String(bucketName),
	})
	if err != nil {
		return false, err
	}

	for _, object := range output.Contents {
		if filepath.Base(*object.Key) == fileHash {
			return true, nil
		}
	}
	return false, nil
}

func UploadFileIfUnique(bucketName string, bucketKey string, fileName string, isPublic bool) error {
	s3Client, err := newS3Client(context.TODO())
	if err != nil {
		return err
	}

	// Calculate the hash of the local file
	file, err := os.Open(fileName)
	if err != nil {
		return err
	}
	defer file.Close()

	hasher := sha256.New()
	if _, err := io.Copy(hasher, file); err != nil {
		return err
	}
	fileHash := hex.EncodeToString(hasher.Sum(nil))

	// Check if the file already exists in S3
	exists, err := fileExistsInBucket(s3Client, bucketName, fileHash)
	if err != nil {
		return err
	}

	if exists {
		log.Println("File already exists in the bucket")
		return nil
	}

	// If the file is unique, upload it
	log.Println("File is unique, uploading...")
	return UploadFile(bucketName, bucketKey, fileName, isPublic)
}

// FileHelper provides helper methods for file operations
type FileHelper struct {
	s3Client   *s3.Client
	bucketName string
}

// NewFileHelper creates a new FileHelper instance
func NewFileHelper() (*FileHelper, error) {
	err := godotenv.Load(".env")
	if err != nil {
		log.Println("Warning: Error loading .env file:", err)
	}

	bucketName := os.Getenv("AWS_BUCKET_NAME")
	if bucketName == "" {
		bucketName = os.Getenv("AWS_S3_BUCKET") // Fallback for backward compatibility
	}

	log.Printf("Initializing FileHelper with region: %s, bucket: %s, endpoint: %q", s3Region(), bucketName, os.Getenv("S3_ENDPOINT"))

	s3Client, err := newS3Client(context.TODO())
	if err != nil {
		return nil, err
	}

	return &FileHelper{
		s3Client:   s3Client,
		bucketName: bucketName,
	}, nil
}

// UploadToS3 uploads a file to S3 and returns the file URL
func (fh *FileHelper) UploadToS3(file io.Reader, key string, contentType string) (string, error) {
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	_, err := fh.s3Client.PutObject(context.TODO(), &s3.PutObjectInput{
		Bucket:      aws.String(fh.bucketName),
		Key:         aws.String(key),
		Body:        file,
		ContentType: aws.String(contentType),
		ACL:         s3types.ObjectCannedACLPrivate,
	})
	if err != nil {
		return "", err
	}

	return PublicFileURL(fh.bucketName, key), nil
}

// DeleteFromS3 deletes a file from S3
func (fh *FileHelper) DeleteFromS3(key string) error {
	_, err := fh.s3Client.DeleteObject(context.TODO(), &s3.DeleteObjectInput{
		Bucket: aws.String(fh.bucketName),
		Key:    aws.String(key),
	})
	return err
}

// GeneratePresignedURL generates a pre-signed URL for S3 object access
func (fh *FileHelper) GeneratePresignedURL(key string, expirySeconds int64) (string, error) {
	presignClient := s3.NewPresignClient(fh.s3Client)
	
	request, err := presignClient.PresignGetObject(context.TODO(), &s3.GetObjectInput{
		Bucket: aws.String(fh.bucketName),
		Key:    aws.String(key),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = time.Duration(expirySeconds) * time.Second
	})
	
	if err != nil {
		return "", err
	}
	
	return request.URL, nil
}

// GetObjectSize retrieves the size of an object from S3
func (fh *FileHelper) GetObjectSize(key string) (int64, error) {
	headOutput, err := fh.s3Client.HeadObject(context.TODO(), &s3.HeadObjectInput{
		Bucket: aws.String(fh.bucketName),
		Key:    aws.String(key),
	})
	
	if err != nil {
		return 0, err
	}
	
	if headOutput.ContentLength == nil {
		return 0, fmt.Errorf("content length not available for object: %s", key)
	}
	
	return *headOutput.ContentLength, nil
}

