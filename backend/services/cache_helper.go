package services

import (
	"fmt"
)

// InvalidateUserCache invalidates all cache entries related to a user
func InvalidateUserCache(cache *CacheService, userID uint) {
	if cache == nil {
		return
	}

	// Delete user cache
	cache.Delete(UserCacheKey(userID))
	
	// Delete user's project list cache (all pages)
	cache.DeletePattern(fmt.Sprintf("projects:user:%d:*", userID))
}

// InvalidateProjectCache invalidates all cache entries related to a project
func InvalidateProjectCache(cache *CacheService, projectID uint, userID uint) {
	if cache == nil {
		return
	}

	// Delete project cache
	cache.Delete(ProjectCacheKey(projectID))
	
	// Delete user's project list cache (all pages)
	cache.DeletePattern(fmt.Sprintf("projects:user:%d:*", userID))
	
	// Delete trending cache
	cache.DeletePattern("trending:*")
}

// InvalidateTeamCache invalidates all cache entries related to a team
func InvalidateTeamCache(cache *CacheService, teamID uint) {
	if cache == nil {
		return
	}

	// Delete team cache
	cache.Delete(TeamCacheKey(teamID))
	
	// Delete team members cache
	cache.DeletePattern(fmt.Sprintf("team:%d:members:*", teamID))
}