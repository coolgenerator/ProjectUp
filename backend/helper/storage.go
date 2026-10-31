package helper

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// Object storage defaults to AWS S3. Two optional variables switch it to an
// S3-compatible store such as MinIO:
//
//	S3_ENDPOINT          API endpoint, e.g. http://localhost:9000
//	S3_PUBLIC_BASE_URL   base URL objects are served from, bucket included,
//	                     e.g. http://localhost:9000/projectup

func s3Region() string {
	if region := os.Getenv("AWS_REGION"); region != "" {
		return region
	}
	return "us-east-1"
}

// newS3Client builds an S3 client from the AWS_* credentials, pointed at
// S3_ENDPOINT when set. MinIO needs path-style URLs (endpoint/bucket/key)
// rather than AWS's bucket.host virtual-host style.
func newS3Client(ctx context.Context) (*s3.Client, error) {
	cfg, err := config.LoadDefaultConfig(ctx,
		config.WithRegion(s3Region()),
		config.WithCredentialsProvider(
			aws.NewCredentialsCache(credentials.NewStaticCredentialsProvider(
				os.Getenv("AWS_ACCESS_KEY_ID"), os.Getenv("AWS_SECRET_ACCESS_KEY"), "")),
		),
	)
	if err != nil {
		return nil, err
	}

	endpoint := os.Getenv("S3_ENDPOINT")
	return s3.NewFromConfig(cfg, func(o *s3.Options) {
		if endpoint != "" {
			o.BaseEndpoint = aws.String(endpoint)
			o.UsePathStyle = true
		}
	}), nil
}

// PublicFileURL returns the URL an uploaded object is served from.
func PublicFileURL(bucketName, key string) string {
	if base := os.Getenv("S3_PUBLIC_BASE_URL"); base != "" {
		return strings.TrimSuffix(base, "/") + "/" + key
	}
	return fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", bucketName, s3Region(), key)
}

// ObjectKeyFromURL extracts the object key from a URL built by PublicFileURL.
// Older records may still hold AWS URLs, so those are recognised too.
func ObjectKeyFromURL(fileURL string) (string, bool) {
	if idx := strings.Index(fileURL, "?"); idx != -1 {
		fileURL = fileURL[:idx]
	}
	if base := os.Getenv("S3_PUBLIC_BASE_URL"); base != "" {
		prefix := strings.TrimSuffix(base, "/") + "/"
		if strings.HasPrefix(fileURL, prefix) {
			return strings.TrimPrefix(fileURL, prefix), true
		}
	}
	if parts := strings.SplitN(fileURL, ".amazonaws.com/", 2); len(parts) == 2 && strings.Contains(parts[0], "s3") {
		return parts[1], true
	}
	return "", false
}
