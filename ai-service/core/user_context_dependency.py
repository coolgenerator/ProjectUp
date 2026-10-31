"""
User Context Dependency for FastAPI

Provides user subscription tier and API key context to route handlers
"""

import logging
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException

from services.user_context_service import (
    user_context_service,
    NoAPIKeyError,
    APIKeyRetrievalError
)

logger = logging.getLogger(__name__)


class UserContext:
    """
    User context information including subscription tier and API credentials

    Attributes:
        token: User's JWT authentication token
        tier: User's subscription tier (free, basic, pro, enterprise)
        is_free: Whether user is on free tier
        provider: AI provider for free users (or None for paid users)
        api_key: API key for free users (or None for paid users)
        base_url: Custom base URL for free users (or None)
        model: Preferred model for free users (or None)
    """

    def __init__(
        self,
        token: Optional[str] = None,
        tier: str = "free",
        is_free: bool = True,
        provider: Optional[str] = None,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None
    ):
        self.token = token
        self.tier = tier
        self.is_free = is_free
        self.provider = provider
        self.api_key = api_key
        self.base_url = base_url
        self.model = model

    def has_api_key(self, provider: str) -> bool:
        """Check if user has configured API key for provider"""
        return self.api_key is not None and self.provider == provider

    async def get_api_key_for_provider(self, provider: str) -> tuple:
        """
        Get API key for specific provider

        Returns:
            tuple: (api_key, base_url, model)

        Raises:
            NoAPIKeyError: If user hasn't configured API key for provider
        """
        if not self.is_free:
            # Paid users use service credentials (handled elsewhere)
            return (None, None, None)

        if self.provider == provider:
            return (self.api_key, self.base_url, self.model)

        # Need to fetch API key for different provider
        try:
            return await user_context_service.get_user_api_key(provider, self.token)
        except Exception as e:
            logger.error(f"Failed to get API key for provider {provider}: {e}")
            raise


async def get_user_context(
    authorization: Optional[str] = Header(None)
) -> UserContext:
    """
    FastAPI dependency to extract user context from request

    This is a lightweight version that only extracts the token.
    Actual tier checking and API key retrieval happens on-demand.

    Args:
        authorization: Authorization header with JWT token

    Returns:
        UserContext instance
    """
    # Extract token from Authorization header
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]  # Remove "Bearer " prefix

    # Create context with just token
    # Tier and API key will be fetched on-demand when needed
    return UserContext(token=token)


async def get_user_context_with_tier(
    authorization: Optional[str] = Header(None)
) -> UserContext:
    """
    FastAPI dependency to extract user context WITH tier checking

    Use this when you need to know if user is free/paid upfront

    Args:
        authorization: Authorization header with JWT token

    Returns:
        UserContext instance with tier information

    Raises:
        HTTPException: If authentication fails
    """
    # Extract token from Authorization header
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]  # Remove "Bearer " prefix

    if not token:
        # No token provided - default to free tier
        logger.warning("No authorization token provided, defaulting to free tier")
        return UserContext(token=None, tier="free", is_free=True)

    try:
        # Check user's subscription tier
        tier_info = await user_context_service.check_user_tier(token)

        return UserContext(
            token=token,
            tier=tier_info.get("tier", "free"),
            is_free=tier_info.get("is_free", True)
        )

    except Exception as e:
        logger.error(f"Failed to check user tier: {e}")
        # Default to free tier on error
        return UserContext(token=token, tier="free", is_free=True)


async def get_user_context_with_api_key(
    provider: str,
    authorization: Optional[str] = Header(None)
) -> UserContext:
    """
    FastAPI dependency to extract user context WITH API key for specific provider

    Use this when you know which provider you need upfront

    Args:
        provider: AI provider name (openai, anthropic, google, etc.)
        authorization: Authorization header with JWT token

    Returns:
        UserContext instance with API key information

    Raises:
        HTTPException: If API key is required but not configured
    """
    # Extract token from Authorization header
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]  # Remove "Bearer " prefix

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Authentication required"
        )

    try:
        # Check user's subscription tier
        tier_info = await user_context_service.check_user_tier(token)

        context = UserContext(
            token=token,
            tier=tier_info.get("tier", "free"),
            is_free=tier_info.get("is_free", True)
        )

        # If free tier, get API key
        if context.is_free:
            try:
                api_key, base_url, model = await user_context_service.get_user_api_key(provider, token)

                context.provider = provider
                context.api_key = api_key
                context.base_url = base_url
                context.model = model

            except NoAPIKeyError:
                raise HTTPException(
                    status_code=400,
                    detail={
                        "error": "API_KEY_REQUIRED",
                        "message": f"Please configure your {provider} API key in Settings > AI API Keys",
                        "provider": provider,
                        "action_required": "configure_api_key"
                    }
                )
            except APIKeyRetrievalError as e:
                raise HTTPException(
                    status_code=500,
                    detail={
                        "error": "API_KEY_RETRIEVAL_FAILED",
                        "message": f"Failed to retrieve API key: {str(e)}",
                        "provider": provider
                    }
                )

        return context

    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        logger.error(f"Failed to get user context with API key: {e}")
        raise HTTPException(
            status_code=500,
            detail={"error": "INTERNAL_ERROR", "message": str(e)}
        )


def create_provider_dependency(provider: str):
    """
    Create a FastAPI dependency for a specific provider

    Usage:
        @router.post("/chat")
        async def chat(
            request: ChatRequest,
            user_context: UserContext = Depends(create_provider_dependency("openai"))
        ):
            # user_context will have API key for OpenAI if user is on free tier
            ...

    Args:
        provider: AI provider name

    Returns:
        Dependency function
    """
    async def dependency(authorization: Optional[str] = Header(None)) -> UserContext:
        return await get_user_context_with_api_key(provider, authorization)

    return dependency
