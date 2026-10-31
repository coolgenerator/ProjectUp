package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

type RedisConfig struct {
	Host               string
	Port               string
	Password           string
	DB                 int
	DefaultExpiration  time.Duration
	UserCacheExpiration time.Duration
	ProjectCacheExpiration time.Duration
	SessionCacheExpiration time.Duration
}

func LoadRedisConfig() *RedisConfig {
	db, _ := strconv.Atoi(getEnv("REDIS_DB", "0"))
	
	return &RedisConfig{
		Host:     getEnv("REDIS_HOST", "localhost"),
		Port:     getEnv("REDIS_PORT", "6379"),
		Password: getEnv("REDIS_PASSWORD", ""),
		DB:       db,
		DefaultExpiration:      time.Hour * 1,
		UserCacheExpiration:    time.Hour * 24,
		ProjectCacheExpiration: time.Hour * 12,
		SessionCacheExpiration: time.Hour * 24,
	}
}

func (c *RedisConfig) URL() string {
	if c.Password != "" {
		return fmt.Sprintf("redis://:%s@%s:%s/%d", c.Password, c.Host, c.Port, c.DB)
	}
	return fmt.Sprintf("redis://%s:%s/%d", c.Host, c.Port, c.DB)
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}