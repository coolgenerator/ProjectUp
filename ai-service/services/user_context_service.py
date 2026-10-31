"""
User Context Service - Backend Integration for Subscription and API Keys

This service handles communication with the backend to:
1. Check user's subscription tier (free vs paid)
2. Retrieve user's active API keys for AI providers
3. Cache results to minimize backend calls
"""

import logging
import aiohttp
from typing import Optional, Dict, Any, Tuple
from datetime import datetime, timedelta

from config.settings import settings

logger = logging.getLogger(__name__)


class UserAPIKeyError(Exception):
    """Base exception for user API key errors"""
    pass


class NoAPIKeyError(UserAPIKeyError):
    """Raised when user has not configured an API key for the provider"""
    pass


class InvalidAPIKeyError(UserAPIKeyError):
    """Raised when user's API key is invalid"""
    pass


class APIKeyRetrievalError(UserAPIKeyError):
    """Raised when API key retrieval fails"""
    pass


class UserContextService:
    """
    Service for retrieving user subscription tier and API keys from backend

    Implements caching to minimize backend calls:
    - Tier info cached for 5 minutes
    - API key info cached for session (until service restart)
    """

    def __init__(self):
        self.backend_url = settings.backend_url
        self.tier_cache: Dict[str, Dict[str, Any]] = {}  # user_id -> {tier, is_free, expires_at}
        self.api_key_cache: Dict[str, Dict[str, Any]] = {}  # f"{user_id}:{provider}" -> {api_key, base_url, model}
        self.tier_cache_duration = timedelta(minutes=5)

    async def check_user_tier(self, token: str) -> Dict[str, Any]:
        """
        Check if user is on free tier

        Args:
            token: User's JWT authentication token

        Returns:
            dict: {"tier": str, "is_free": bool}

        Raises:
            Exception: If backend request fails
        """
        # Check cache first (using token as key - in production, decode JWT to get user_id)
        cache_key = token[:20]  # Use token prefix as cache key
        if cache_key in self.tier_cache:
            cached = self.tier_cache[cache_key]
            if cached['expires_at'] > datetime.now():
                logger.debug(f"Tier cache hit for user")
                return {"tier": cached['tier'], "is_free": cached['is_free']}

        # Call backend
        headers = {"Authorization": f"Bearer {token}"}
        url = f"{self.backend_url}/api/v1/subscription/tier"

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=5)) as response:
                    if response.status == 200:
                        data = await response.json()

                        # Cache the result
                        self.tier_cache[cache_key] = {
                            'tier': data.get('tier'),
                            'is_free': data.get('is_free'),
                            'expires_at': datetime.now() + self.tier_cache_duration
                        }

                        logger.info(f"User tier retrieved: {data.get('tier')} (is_free: {data.get('is_free')})")
                        return data
                    elif response.status == 401:
                        logger.warning("Unauthorized request to backend - invalid token")
                        # Default to free tier if auth fails
                        return {"tier": "free", "is_free": True}
                    else:
                        logger.error(f"Backend tier check failed: {response.status}")
                        # Default to free tier if endpoint fails
                        return {"tier": "free", "is_free": True}

        except aiohttp.ClientError as e:
            logger.error(f"Network error checking user tier: {e}")
            # Default to free tier if network fails
            return {"tier": "free", "is_free": True}
        except Exception as e:
            logger.error(f"Unexpected error checking user tier: {e}")
            # Default to free tier on any error
            return {"tier": "free", "is_free": True}

    async def get_user_api_key(self, provider: str, token: str) -> Tuple[str, Optional[str], Optional[str]]:
        """
        Get user's active API key for the provider

        Args:
            provider: AI provider name (openai, anthropic, google, etc.)
            token: User's JWT authentication token

        Returns:
            tuple: (api_key, base_url, model)

        Raises:
            NoAPIKeyError: If user hasn't configured API key
            APIKeyRetrievalError: If retrieval fails
        """
        # Check cache first
        cache_key = f"{token[:20]}:{provider}"
        if cache_key in self.api_key_cache:
            cached = self.api_key_cache[cache_key]
            logger.debug(f"API key cache hit for provider: {provider}")
            return (cached['api_key'], cached.get('base_url'), cached.get('model'))

        # Call backend
        headers = {"Authorization": f"Bearer {token}"}
        url = f"{self.backend_url}/api/ai-api-keys/active/{provider}"

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=5)) as response:
                    if response.status == 200:
                        data = await response.json()

                        api_key = data.get('api_key')
                        base_url = data.get('base_url')
                        model = data.get('model')

                        # Cache the result
                        self.api_key_cache[cache_key] = {
                            'api_key': api_key,
                            'base_url': base_url,
                            'model': model
                        }

                        logger.info(f"User API key retrieved for provider: {provider}")
                        return (api_key, base_url, model)

                    elif response.status == 404:
                        logger.warning(f"No active API key found for provider: {provider}")
                        raise NoAPIKeyError(f"No active API key found for provider: {provider}")

                    elif response.status == 401:
                        logger.warning("Unauthorized request to backend - invalid token")
                        raise APIKeyRetrievalError("Invalid authentication token")

                    else:
                        error_text = await response.text()
                        logger.error(f"Backend API key retrieval failed: {response.status} - {error_text}")
                        raise APIKeyRetrievalError(f"Failed to retrieve API key: {response.status}")

        except NoAPIKeyError:
            raise  # Re-raise NoAPIKeyError
        except aiohttp.ClientError as e:
            logger.error(f"Network error retrieving user API key: {e}")
            raise APIKeyRetrievalError(f"Network error: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error retrieving user API key: {e}")
            raise APIKeyRetrievalError(f"Unexpected error: {str(e)}")

    def clear_cache(self, user_id: Optional[str] = None):
        """Clear cache for a specific user or all users"""
        if user_id:
            # Clear specific user's cache
            keys_to_remove = [k for k in self.tier_cache.keys() if k.startswith(user_id)]
            for key in keys_to_remove:
                del self.tier_cache[key]

            keys_to_remove = [k for k in self.api_key_cache.keys() if k.startswith(user_id)]
            for key in keys_to_remove:
                del self.api_key_cache[key]

            logger.info(f"Cleared cache for user: {user_id}")
        else:
            # Clear all caches
            self.tier_cache.clear()
            self.api_key_cache.clear()
            logger.info("Cleared all user context caches")


# Global service instance
user_context_service = UserContextService()


async def get_user_tier(token: str) -> Dict[str, Any]:
    """
    Convenience function to check user's subscription tier

    Args:
        token: User's JWT authentication token

    Returns:
        dict: {"tier": str, "is_free": bool}
    """
    return await user_context_service.check_user_tier(token)


async def get_user_api_key_for_provider(provider: str, token: str) -> Tuple[str, Optional[str], Optional[str]]:
    """
    Convenience function to get user's active API key for a provider

    Args:
        provider: AI provider name
        token: User's JWT authentication token

    Returns:
        tuple: (api_key, base_url, model)

    Raises:
        NoAPIKeyError: If user hasn't configured API key
        APIKeyRetrievalError: If retrieval fails
    """
    return await user_context_service.get_user_api_key(provider, token)
