"""
WebSocket Streaming

Implementation of WebSocket for bidirectional streaming.
"""

import json
from typing import AsyncIterator, Optional
from fastapi import WebSocket, WebSocketDisconnect
from .base import StreamingProtocol, StreamChunk, StreamingMessage


class WebSocketStreamer(StreamingProtocol):
    """WebSocket streaming implementation"""

    def __init__(self, websocket: WebSocket, chunk_size: int = 512):
        super().__init__(chunk_size)
        self.websocket = websocket
        self.connected = False

    async def connect(self) -> None:
        """Accept the WebSocket connection."""
        await self.websocket.accept()
        self.connected = True

    async def send_chunk(self, chunk: StreamChunk) -> None:
        """
        Send a chunk via WebSocket.

        Args:
            chunk: The chunk to send
        """
        if not self.connected:
            raise RuntimeError("WebSocket not connected")

        await self.websocket.send_json(chunk.model_dump())

    async def send_message(self, message: StreamingMessage) -> None:
        """
        Send a complete message via WebSocket.

        Args:
            message: The message to send
        """
        if not self.connected:
            raise RuntimeError("WebSocket not connected")

        await self.websocket.send_json({
            "type": "message",
            "data": message.model_dump()
        })

    async def stream_response(
        self,
        response_generator: AsyncIterator[str]
    ) -> AsyncIterator[StreamChunk]:
        """
        Stream a response via WebSocket.

        Args:
            response_generator: Async generator yielding response text

        Yields:
            StreamChunk: Chunks sent to the client
        """
        sequence = 0

        # Send start event
        start_chunk = StreamChunk(
            type="start",
            content="",
            sequence=sequence
        )
        await self.send_chunk(start_chunk)
        yield start_chunk
        sequence += 1

        try:
            # Stream tokens
            async for token in response_generator:
                chunk = StreamChunk(
                    type="token",
                    content=token,
                    sequence=sequence
                )
                await self.send_chunk(chunk)
                yield chunk
                sequence += 1

            # Send complete event
            complete_chunk = StreamChunk(
                type="complete",
                content="",
                metadata={"total_chunks": sequence},
                sequence=sequence
            )
            await self.send_chunk(complete_chunk)
            yield complete_chunk

        except WebSocketDisconnect:
            # Client disconnected
            pass
        except Exception as e:
            # Send error event
            error_chunk = StreamChunk(
                type="error",
                content=str(e),
                sequence=sequence
            )
            try:
                await self.send_chunk(error_chunk)
                yield error_chunk
            except:
                pass  # Connection already closed

    async def receive_message(self) -> Optional[dict]:
        """
        Receive a message from the client.

        Returns:
            Optional[dict]: Received message data or None if disconnected
        """
        try:
            data = await self.websocket.receive_json()
            return data
        except WebSocketDisconnect:
            self.connected = False
            return None

    async def close(self) -> None:
        """Close the WebSocket connection."""
        if self.connected:
            try:
                await self.websocket.close()
            except:
                pass
            finally:
                self.connected = False
