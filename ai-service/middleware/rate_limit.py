"""
Rate Limiting Middleware

Implements rate limiting to prevent abuse and ensure fair usage.
"""

import time
from typing import Dict, Tuple
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware

from config.settings import settings


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware for rate limiting requests"""

    def __init__(self, app, requests_per_period: int = None, period_seconds: int = None):
        """
        Initialize rate limiter.

        Args:
            app: The FastAPI application
            requests_per_period: Max requests per period (from settings if not provided)
            period_seconds: Period duration in seconds (from settings if not provided)
        """
        super().__init__(app)

        self.enabled = settings.RATE_LIMIT_ENABLED
        self.requests_per_period = requests_per_period or settings.RATE_LIMIT_REQUESTS
        self.period_seconds = period_seconds or settings.RATE_LIMIT_PERIOD

        # In-memory storage: {client_id: (request_count, window_start_time)}
        self.clients: Dict[str, Tuple[int, float]] = {}

    def get_client_id(self, request: Request) -> str:
        """
        Get unique identifier for the client.

        Args:
            request: The incoming request

        Returns:
            str: Client identifier (IP address or user ID)
        """
        # Use user ID if authenticated, otherwise use IP
        if hasattr(request.state, "user_id"):
            return f"user_{request.state.user_id}"

        return f"ip_{request.client.host}" if request.client else "unknown"

    def is_rate_limited(self, client_id: str) -> Tuple[bool, Dict[str, any]]:
        """
        Check if client is rate limited.

        Args:
            client_id: Client identifier

        Returns:
            Tuple[bool, Dict]: (is_limited, rate_limit_info)
        """
        current_time = time.time()

        # Get or initialize client record
        if client_id not in self.clients:
            self.clients[client_id] = (1, current_time)
            return False, self._get_rate_limit_info(1, current_time)

        request_count, window_start = self.clients[client_id]

        # Check if we're in a new window
        if current_time - window_start >= self.period_seconds:
            # Reset counter for new window
            self.clients[client_id] = (1, current_time)
            return False, self._get_rate_limit_info(1, current_time)

        # Check if limit exceeded
        if request_count >= self.requests_per_period:
            return True, self._get_rate_limit_info(request_count, window_start)

        # Increment counter
        self.clients[client_id] = (request_count + 1, window_start)
        return False, self._get_rate_limit_info(request_count + 1, window_start)

    def _get_rate_limit_info(self, request_count: int, window_start: float) -> Dict[str, any]:
        """
        Get rate limit information for headers.

        Args:
            request_count: Current request count
            window_start: Window start time

        Returns:
            Dict: Rate limit information
        """
        current_time = time.time()
        reset_time = window_start + self.period_seconds
        remaining = max(0, self.requests_per_period - request_count)

        return {
            "limit": self.requests_per_period,
            "remaining": remaining,
            "reset": int(reset_time),
            "window": self.period_seconds
        }

    async def dispatch(self, request: Request, call_next):
        """
        Process the request and apply rate limiting.

        Args:
            request: The incoming request
            call_next: The next middleware/route handler

        Returns:
            Response: The response from the next handler

        Raises:
            HTTPException: If rate limit is exceeded
        """
        # Skip if rate limiting is disabled
        if not self.enabled:
            return await call_next(request)

        # Skip for health checks
        if request.url.path == "/health":
            return await call_next(request)

        # Get client ID and check rate limit
        client_id = self.get_client_id(request)
        is_limited, rate_info = self.is_rate_limited(client_id)

        if is_limited:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Try again in {rate_info['reset'] - int(time.time())} seconds.",
                headers={
                    "X-RateLimit-Limit": str(rate_info["limit"]),
                    "X-RateLimit-Remaining": str(rate_info["remaining"]),
                    "X-RateLimit-Reset": str(rate_info["reset"]),
                    "Retry-After": str(rate_info["reset"] - int(time.time()))
                }
            )

        # Process request
        response = await call_next(request)

        # Add rate limit headers to response
        response.headers["X-RateLimit-Limit"] = str(rate_info["limit"])
        response.headers["X-RateLimit-Remaining"] = str(rate_info["remaining"])
        response.headers["X-RateLimit-Reset"] = str(rate_info["reset"])

        return response

    def cleanup_old_entries(self) -> None:
        """Remove old entries from the clients dictionary to prevent memory leaks."""
        current_time = time.time()
        expired_clients = [
            client_id
            for client_id, (_, window_start) in self.clients.items()
            if current_time - window_start >= self.period_seconds * 2
        ]

        for client_id in expired_clients:
            del self.clients[client_id]
