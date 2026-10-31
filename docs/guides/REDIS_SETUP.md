# Redis Cache Integration Guide

## Overview
This guide explains how to set up and use Redis caching in the ProjectUp backend.

## Configuration

### Environment Variables
```bash
# Redis connection settings
REDIS_HOST=localhost      # Redis server host
REDIS_PORT=6379           # Redis server port  
REDIS_PASSWORD=           # Redis password (optional)
REDIS_DB=0               # Redis database number
```

### Cache Expiration Times
Default expiration times are configured in `config/redis.go`:
- Default: 1 hour
- User cache: 24 hours
- Project cache: 12 hours
- Session cache: 24 hours

## Usage

### 1. Getting Cache Service in Controllers
```go
import "projectup/middleware"

func YourHandler() gin.HandlerFunc {
    return func(c *gin.Context) {
        cache := middleware.GetCacheService(c)
        if cache != nil {
            // Cache is available
        }
    }
}
```

### 2. Cache Operations

#### Set Value
```go
cache.Set(key, value, expiration)
```

#### Get Value
```go
var result MyStruct
err := cache.Get(key, &result)
```

#### Delete Key
```go
cache.Delete(key)
```

#### Check Existence
```go
exists, err := cache.Exists(key)
```

### 3. Cache Key Conventions
Use the provided helper functions for consistent key naming:
```go
services.UserCacheKey(userID)        // "user:123"
services.ProjectCacheKey(projectID)  // "project:456"
services.TeamCacheKey(teamID)        // "team:789"
services.SessionCacheKey(token)      // "session:abc..."
```

### 4. Cache Invalidation
Use the cache helper functions to invalidate related caches:
```go
// Get cache service from context
cache := middleware.GetCacheService(c)

// Invalidate all user-related caches
services.InvalidateUserCache(cache, userID)

// Invalidate project and related caches
services.InvalidateProjectCache(cache, projectID, userID)

// Invalidate team caches
services.InvalidateTeamCache(cache, teamID)
```

## Example Implementation

### Get User with Caching
```go
func GetUser() gin.HandlerFunc {
    return func(c *gin.Context) {
        userId := c.Param("user_id")
        cache := middleware.GetCacheService(c)
        var user models.User
        
        // Try cache first
        if cache != nil {
            cacheKey := services.UserCacheKey(userID)
            if err := cache.Get(cacheKey, &user); err == nil {
                c.JSON(http.StatusOK, user)
                return
            }
        }
        
        // Get from database
        err := database.DB.Where("user_id = ?", userId).First(&user).Error
        if err != nil {
            // Handle error
            return
        }
        
        // Store in cache
        if cache != nil {
            redisConfig := config.LoadRedisConfig()
            cache.Set(cacheKey, user, redisConfig.UserCacheExpiration)
        }
        
        c.JSON(http.StatusOK, user)
    }
}
```

### Update User with Cache Invalidation
```go
func UpdateUser() gin.HandlerFunc {
    return func(c *gin.Context) {
        // ... update logic ...
        
        // Invalidate cache after update
        cache := middleware.GetCacheService(c)
        services.InvalidateUserCache(cache, userID)
        
        c.JSON(http.StatusOK, updatedUser)
    }
}
```

## Performance Tips

1. **Cache Hit Rate**: Monitor cache hit rates to ensure effectiveness
2. **Key Design**: Use hierarchical keys for easy pattern deletion
3. **Expiration**: Set appropriate expiration times based on data volatility
4. **Serialization**: JSON is used by default; consider msgpack for large objects
5. **Connection Pooling**: Redis client handles connection pooling automatically

## Monitoring

### Redis CLI Commands
```bash
# Connect to Redis
redis-cli

# Monitor cache usage
INFO stats

# Check memory usage
INFO memory

# List all keys (use with caution in production)
KEYS *

# Get TTL of a key
TTL user:123
```

### Application Metrics
The cache service logs connection status at startup:
- Success: "Redis cache initialized successfully"
- Failure: "Warning: Failed to initialize Redis cache: [error]"

## Troubleshooting

### Cache Not Working
1. Check Redis connection in logs
2. Verify environment variables
3. Test Redis connectivity: `redis-cli ping`

### High Memory Usage
1. Review expiration times
2. Implement memory limits in Redis config
3. Use `maxmemory-policy allkeys-lru` for automatic eviction

### Slow Performance
1. Check network latency to Redis server
2. Review serialization overhead
3. Consider using Redis cluster for high load

## Docker Setup

### docker-compose.yml
```yaml
redis:
  image: redis:7-alpine
  command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
  volumes:
    - redis_data:/data
  ports:
    - "6379:6379"
```

### Production Recommendations
1. Use Redis Cluster or Redis Sentinel for HA
2. Enable persistence (AOF or RDB)
3. Set up monitoring with Redis Exporter + Prometheus
4. Configure appropriate memory limits
5. Use AWS ElastiCache for managed Redis