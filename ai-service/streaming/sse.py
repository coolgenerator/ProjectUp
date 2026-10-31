"""
Server-Sent Events (SSE) Streaming

Implementation of SSE for streaming AI responses.
"""

import json
from typing import AsyncIterator
from fastapi.responses import StreamingResponse
from .base import StreamingProtocol, StreamChunk, StreamingMessage


class SSEStreamer(StreamingProtocol):
    """Server-Sent Events streaming implementation"""

    def __init__(self, chunk_size: int = 512):
        super().__init__(chunk_size)

    async def send_chunk(self, chunk: StreamChunk) -> str:
        """
        Format a chunk as SSE event.

        Args:
            chunk: The chunk to send

        Returns:
            str: Formatted SSE event
        """
        data = chunk.model_dump_json()
        return f"data: {data}\n\n"

    async def send_message(self, message: StreamingMessage) -> str:
        """
        Format a complete message as SSE event.

        Args:
            message: The message to send

        Returns:
            str: Formatted SSE event
        """
        data = message.model_dump_json()
        return f"event: message\ndata: {data}\n\n"

    async def stream_response(
        self,
        response_generator: AsyncIterator[str]
    ) -> AsyncIterator[str]:
        """
        Stream a response using SSE format.

        Args:
            response_generator: Async generator yielding response text

        Yields:
            str: SSE-formatted chunks
        """
        sequence = 0

        # Send start event
        start_chunk = StreamChunk(
            type="start",
            content="",
            sequence=sequence
        )
        yield await self.send_chunk(start_chunk)
        sequence += 1

        try:
            # Stream tokens
            async for token in response_generator:
                chunk = StreamChunk(
                    type="token",
                    content=token,
                    sequence=sequence
                )
                yield await self.send_chunk(chunk)
                sequence += 1

            # Send complete event
            complete_chunk = StreamChunk(
                type="complete",
                content="",
                metadata={"total_chunks": sequence},
                sequence=sequence
            )
            yield await self.send_chunk(complete_chunk)

        except Exception as e:
            # Send error event
            error_chunk = StreamChunk(
                type="error",
                content=str(e),
                sequence=sequence
            )
            yield await self.send_chunk(error_chunk)

    async def close(self) -> None:
        """Close SSE connection."""
        # SSE connections are automatically closed by the client
        pass

    def create_response(
        self,
        response_generator: AsyncIterator[str]
    ) -> StreamingResponse:
        """
        Create a FastAPI StreamingResponse for SSE.

        Args:
            response_generator: Async generator yielding response text

        Returns:
            StreamingResponse: FastAPI streaming response
        """
        return StreamingResponse(
            self.stream_response(response_generator),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            }
        )
