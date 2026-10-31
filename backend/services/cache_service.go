package services

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

type CacheService struct {
	client *redis.Client
	ctx    context.Context
}

func NewCacheService(redisURL string) (*CacheService, error) {
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse redis URL: %w", err)
	}

	client := redis.NewClient(opt)
	ctx := context.Background()

	// Test connection
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to redis: %w", err)
	}

	return &CacheService{
		client: client,
		ctx:    ctx,
	}, nil
}

// Set stores a value with expiration
func (c *CacheService) Set(key string, value interface{}, expiration time.Duration) error {
	data, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("failed to marshal value: %w", err)
	}

	return c.client.Set(c.ctx, key, data, expiration).Err()
}

// Get retrieves a value from cache
func (c *CacheService) Get(key string, dest interface{}) error {
	data, err := c.client.Get(c.ctx, key).Bytes()
	if err != nil {
		if err == redis.Nil {
			return fmt.Errorf("key not found: %s", key)
		}
		return fmt.Errorf("failed to get value: %w", err)
	}

	if err := json.Unmarshal(data, dest); err != nil {
		return fmt.Errorf("failed to unmarshal value: %w", err)
	}

	return nil
}

// Delete removes a key from cache
func (c *CacheService) Delete(key string) error {
	return c.client.Del(c.ctx, key).Err()
}

// DeletePattern removes all keys matching a pattern
func (c *CacheService) DeletePattern(pattern string) error {
	iter := c.client.Scan(c.ctx, 0, pattern, 0).Iterator()
	var keys []string
	
	for iter.Next(c.ctx) {
		keys = append(keys, iter.Val())
	}
	
	if err := iter.Err(); err != nil {
		return fmt.Errorf("failed to scan keys: %w", err)
	}
	
	if len(keys) > 0 {
		return c.client.Del(c.ctx, keys...).Err()
	}
	
	return nil
}

// Exists checks if a key exists
func (c *CacheService) Exists(key string) (bool, error) {
	result, err := c.client.Exists(c.ctx, key).Result()
	if err != nil {
		return false, fmt.Errorf("failed to check existence: %w", err)
	}
	return result > 0, nil
}

// SetNX sets a value only if the key doesn't exist
func (c *CacheService) SetNX(key string, value interface{}, expiration time.Duration) (bool, error) {
	data, err := json.Marshal(value)
	if err != nil {
		return false, fmt.Errorf("failed to marshal value: %w", err)
	}

	return c.client.SetNX(c.ctx, key, data, expiration).Result()
}

// Increment increments a counter
func (c *CacheService) Increment(key string) (int64, error) {
	return c.client.Incr(c.ctx, key).Result()
}

// Decrement decrements a counter
func (c *CacheService) Decrement(key string) (int64, error) {
	return c.client.Decr(c.ctx, key).Result()
}

// Close closes the Redis connection
func (c *CacheService) Close() error {
	return c.client.Close()
}

// Cache key generators
func UserCacheKey(userID uint) string {
	return fmt.Sprintf("user:%d", userID)
}

func ProjectCacheKey(projectID uint) string {
	return fmt.Sprintf("project:%d", projectID)
}

func ProjectListCacheKey(userID uint, page int) string {
	return fmt.Sprintf("projects:user:%d:page:%d", userID, page)
}

func TeamCacheKey(teamID uint) string {
	return fmt.Sprintf("team:%d", teamID)
}

func SessionCacheKey(token string) string {
	return fmt.Sprintf("session:%s", token)
}