package middleware

import (
	"projectup/services"

	"github.com/gin-gonic/gin"
)

const CacheServiceKey = "cacheService"

// InjectCache injects the cache service into the Gin context
func InjectCache(cacheService *services.CacheService) gin.HandlerFunc {
	return func(c *gin.Context) {
		if cacheService != nil {
			c.Set(CacheServiceKey, cacheService)
		}
		c.Next()
	}
}

// GetCacheService retrieves the cache service from the Gin context
func GetCacheService(c *gin.Context) *services.CacheService {
	if cache, exists := c.Get(CacheServiceKey); exists {
		if cacheService, ok := cache.(*services.CacheService); ok {
			return cacheService
		}
	}
	return nil
}