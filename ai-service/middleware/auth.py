"""
Authentication Middleware

Handles JWT authentication and authorization for protected routes.
Matches backend/middleware/authMiddleware.go behavior.
"""

import jwt
import os
import time
from typing import Optional, List, Callable
from datetime import datetime, timedelta
from fastapi import Request, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response, JSONResponse

from config.settings import settings


# Token expiration durations (matching backend)
ACCESS_TOKEN_EXPIRE_HOURS = 24  # 24 hours
REFRESH_TOKEN_EXPIRE_DAYS = 30  # 30 days


class SignedDetails:
    """JWT claims structure matching backend SignedDetails"""
    def __init__(self, user_id: int, sid: str, exp: int):
        self.ID = user_id
        self.SID = sid
        self.exp = exp

    @classmethod
    def from_dict(cls, data: dict):
        return cls(
            user_id=data.get("ID", 0),
            sid=data.get("SID", ""),
            exp=data.get("exp", 0)
        )


class AuthMiddleware(BaseHTTPMiddleware):
    """
    Middleware for JWT authentication.

    Matches backend authentication behavior:
    - Extracts token from Authorization header or query parameter
    - Validates JWT signature and expiration
    - Sets user context for authenticated requests
    """

    # Routes that don't require authentication
    PUBLIC_ROUTES = [
        "/health",
        "/",
        "/docs",
        "/redoc",
        "/openapi.json",
        "/api/v1/auth",
        "/api/v2/auth",
    ]

    async def dispatch(self, request: Request, call_next: Callable):
        """
        Process the request and validate authentication.

        Args:
            request: The incoming request
            call_next: The next middleware/route handler

        Returns:
            Response: The response from the next handler

        Raises:
            HTTPException: If authentication fails
        """
        # Skip authentication for public routes
        if any(request.url.path.startswith(route) for route in self.PUBLIC_ROUTES):
            return await call_next(request)

        # Extract token from Authorization header or query parameter
        auth_header = request.headers.get("Authorization", "")
        token_string = None

        if not auth_header:
            # Try to get token from query parameter (for WebSocket/SSE connections)
            token_string = request.query_params.get("token")
            if not token_string:
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={"error": "Authorization token missing"}
                )
        elif not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"error": "Invalid Authorization header format"}
            )
        else:
            token_string = auth_header.replace("Bearer ", "")

        # Validate token
        try:
            claims = validate_token(token_string)

            # Extract user ID from claims
            user_id = claims.ID
            if user_id == 0:
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={"error": "Invalid token claims: user ID missing"}
                )

            # Set user context in request state
            request.state.user_id = user_id
            request.state.sid = claims.SID
            request.state.is_authenticated = True

            # Proceed to next handler
            response = await call_next(request)
            return response

        except jwt.ExpiredSignatureError:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"error": "Invalid or expired token"}
            )
        except jwt.InvalidTokenError as e:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"error": f"Invalid or expired token: {str(e)}"}
            )
        except Exception as e:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"error": f"Authentication failed: {str(e)}"}
            )


def get_secret_key() -> str:
    """
    Get JWT secret key from environment.
    Matches backend logic: checks SECRET_KEY first, falls back to JWT_SECRET.

    Returns:
        str: JWT secret key

    Raises:
        ValueError: If no secret key is found
    """
    secret_key = os.getenv("SECRET_KEY") or os.getenv("JWT_SECRET") or settings.JWT_SECRET
    if not secret_key:
        raise ValueError("Missing JWT secret key in environment")
    return secret_key


def validate_token(token_string: str) -> SignedDetails:
    """
    Validate JWT token and return claims.
    Matches backend ValidateToken function.

    Args:
        token_string: JWT token to validate

    Returns:
        SignedDetails: Token claims

    Raises:
        jwt.InvalidTokenError: If token is invalid
        jwt.ExpiredSignatureError: If token is expired
    """
    secret_key = get_secret_key()

    try:
        # Decode and validate token
        payload = jwt.decode(
            token_string,
            secret_key,
            algorithms=["HS256"]
        )

        # Check expiration manually (additional validation)
        if payload.get("exp", 0) < time.time():
            raise jwt.ExpiredSignatureError("Token is expired")

        # Create SignedDetails from payload
        claims = SignedDetails.from_dict(payload)
        return claims

    except jwt.ExpiredSignatureError:
        raise
    except jwt.InvalidTokenError as e:
        raise jwt.InvalidTokenError(f"Invalid token: {str(e)}")


def generate_tokens(user_id: int, profile_sid: str) -> tuple[str, str]:
    """
    Generate access and refresh tokens.
    Matches backend GenerateTokens function.

    Args:
        user_id: User ID
        profile_sid: Profile short ID

    Returns:
        tuple[str, str]: (access_token, refresh_token)
    """
    secret_key = get_secret_key()

    # Generate access token (24 hours)
    access_token_payload = {
        "ID": user_id,
        "SID": profile_sid,
        "exp": datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS),
    }
    access_token = jwt.encode(access_token_payload, secret_key, algorithm="HS256")

    # Generate refresh token (30 days)
    refresh_token_payload = {
        "ID": user_id,
        "SID": profile_sid,
        "exp": datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    }
    refresh_token = jwt.encode(refresh_token_payload, secret_key, algorithm="HS256")

    return access_token, refresh_token


# Dependency for requiring authentication in routes
security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> SignedDetails:
    """
    FastAPI dependency to get current authenticated user.
    Use as a dependency in route handlers.

    Args:
        credentials: HTTP Bearer credentials

    Returns:
        SignedDetails: Current user claims

    Raises:
        HTTPException: If authentication fails

    Example:
        @router.get("/protected")
        async def protected_route(user: SignedDetails = Depends(get_current_user)):
            return {"user_id": user.ID}
    """
    try:
        token = credentials.credentials
        claims = validate_token(token)
        return claims
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user_id(user: SignedDetails = Depends(get_current_user)) -> int:
    """
    FastAPI dependency to get current user ID.

    Args:
        user: Current user claims

    Returns:
        int: User ID
    """
    return user.ID


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[SignedDetails]:
    """
    FastAPI dependency to get current user if authenticated, None otherwise.
    Use for routes that work with or without authentication.

    Args:
        credentials: Optional HTTP Bearer credentials

    Returns:
        Optional[SignedDetails]: User claims if authenticated, None otherwise
    """
    if not credentials:
        return None

    try:
        token = credentials.credentials
        claims = validate_token(token)
        return claims
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


def require_admin(user: SignedDetails = Depends(get_current_user)) -> SignedDetails:
    """
    FastAPI dependency to require admin privileges.

    Args:
        user: Current user claims

    Returns:
        SignedDetails: User claims

    Raises:
        HTTPException: If user is not an admin

    Example:
        @router.post("/admin/action")
        async def admin_action(user: SignedDetails = Depends(require_admin)):
            return {"message": "Admin action performed"}
    """
    # TODO: Implement proper role checking when user_type is added to JWT claims
    # For now, we'll need to check this against the database
    # This is a placeholder that should be implemented based on your needs
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Admin role checking not yet implemented"
    )


def require_roles(required_roles: List[str]):
    """
    Create a dependency that requires specific roles.

    Args:
        required_roles: List of required roles

    Returns:
        Callable: Dependency function

    Example:
        @router.post("/moderator/action")
        async def mod_action(user: SignedDetails = Depends(require_roles(["ADMIN", "MODERATOR"]))):
            return {"message": "Moderator action performed"}
    """
    def role_checker(user: SignedDetails = Depends(get_current_user)) -> SignedDetails:
        # TODO: Implement proper role checking when user roles are added to JWT claims
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Role checking not yet implemented"
        )
    return role_checker


# Utility function to get user from request (for use in middleware)
def get_user_from_request(request: Request) -> Optional[SignedDetails]:
    """
    Get authenticated user from request state.
    For use in middleware or route handlers.

    Args:
        request: The current request

    Returns:
        Optional[SignedDetails]: User claims if authenticated, None otherwise
    """
    if not hasattr(request.state, "user_id"):
        return None

    if not hasattr(request.state, "sid"):
        return None

    return SignedDetails(
        user_id=request.state.user_id,
        sid=request.state.sid,
        exp=0  # Not available from request state
    )
