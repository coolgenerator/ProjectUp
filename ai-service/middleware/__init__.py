"""
Middleware Package

Custom middleware for authentication, logging, rate limiting, and streaming.
"""

from .auth import (
    AuthMiddleware,
    SignedDetails,
    get_current_user,
    get_current_user_id,
    get_optional_user,
    get_user_from_request,
    validate_token,
    generate_tokens,
)
from .permissions import (
    UserRole,
    Permission,
    require_role,
    require_any_role,
    require_permission,
    require_any_permission,
    require_all_permissions,
    require_admin,
    require_moderator,
    has_permission,
    has_any_permission,
    has_all_permissions,
)
from .logging import LoggingMiddleware
from .rate_limit import RateLimitMiddleware
from .streaming import StreamingMiddleware

__all__ = [
    # Middleware classes
    "AuthMiddleware",
    "LoggingMiddleware",
    "RateLimitMiddleware",
    "StreamingMiddleware",
    # Auth
    "SignedDetails",
    "get_current_user",
    "get_current_user_id",
    "get_optional_user",
    "get_user_from_request",
    "validate_token",
    "generate_tokens",
    # Permissions
    "UserRole",
    "Permission",
    "require_role",
    "require_any_role",
    "require_permission",
    "require_any_permission",
    "require_all_permissions",
    "require_admin",
    "require_moderator",
    "has_permission",
    "has_any_permission",
    "has_all_permissions",
]
