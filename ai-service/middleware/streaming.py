"""
Streaming Middleware

Handles streaming-specific concerns like connection management and timeouts.
"""

import asyncio
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from config.settings import settings


class StreamingMiddleware(BaseHTTPMiddleware):
    """Middleware for streaming connection management"""

    def __init__(self, app, timeout: int = None):
        """
        Initialize streaming middleware.

        Args:
            app: The FastAPI application
            timeout: Streaming timeout in seconds (from settings if not provided)
        """
        super().__init__(app)
        self.timeout = timeout or settings.STREAMING_TIMEOUT
        self.enabled = settings.STREAMING_ENABLED

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Handle streaming requests with timeout and connection management.

        Args:
            request: The incoming request
            call_next: The next middleware/route handler

        Returns:
            Response: The response from the next handler
        """
        # Check if this is a streaming request
        is_streaming = (
            request.url.path.startswith("/api/v2/streaming") or
            "text/event-stream" in request.headers.get("accept", "") or
            request.url.path.endswith("/stream")
        )

        if not is_streaming or not self.enabled:
            return await call_next(request)

        # Set streaming headers
        request.state.is_streaming = True
        request.state.streaming_timeout = self.timeout

        try:
            # Apply timeout to streaming requests
            response = await asyncio.wait_for(
                call_next(request),
                timeout=self.timeout
            )

            # Add streaming-specific headers
            if hasattr(response, "headers"):
                response.headers["X-Streaming-Enabled"] = "true"
                response.headers["X-Streaming-Timeout"] = str(self.timeout)

            return response

        except asyncio.TimeoutError:
            # Return timeout response
            return Response(
                content="Streaming request timed out",
                status_code=408,
                headers={
                    "X-Streaming-Timeout": str(self.timeout),
                    "Content-Type": "text/plain"
                }
            )
