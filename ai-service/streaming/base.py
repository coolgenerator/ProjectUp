"""
Base Streaming Classes

Abstract base classes for streaming implementations.
"""

from abc import ABC, abstractmethod
from typing import AsyncIterator, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime
from enum import Enum


class StreamChunkType(str, Enum):
    """Types of stream chunks"""
    START = "start"
    TOKEN = "token"
    COMPLETE = "complete"
    ERROR = "error"
    METADATA = "metadata"
    TOOL_CALL = "tool_call"
    TOOL_RESULT = "tool_result"


class StreamChunk(BaseModel):
    """Represents a chunk of streamed data"""
    type: StreamChunkType
    content: str = ""
    metadata: Optional[Dict[str, Any]] = None
    timestamp: datetime = datetime.now()
    sequence: Optional[int] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class StreamingMessage(BaseModel):
    """Represents a complete streaming message"""
    message_id: str
    content: str
    metadata: Dict[str, Any] = {}
    started_at: datetime
    completed_at: Optional[datetime] = None
    chunks_count: int = 0

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class StreamingProtocol(ABC):
    """Abstract base class for streaming protocols"""

    def __init__(self, chunk_size: int = 512):
        """
        Initialize streaming protocol.

        Args:
            chunk_size: Size of each chunk in tokens/characters
        """
        self.chunk_size = chunk_size
        self.active_streams: Dict[str, bool] = {}

    @abstractmethod
    async def send_chunk(self, chunk: StreamChunk) -> None:
        """
        Send a single chunk to the client.

        Args:
            chunk: The chunk to send
        """
        pass

    @abstractmethod
    async def send_message(self, message: StreamingMessage) -> None:
        """
        Send a complete message to the client.

        Args:
            message: The message to send
        """
        pass

    @abstractmethod
    async def stream_response(
        self,
        response_generator: AsyncIterator[str]
    ) -> AsyncIterator[StreamChunk]:
        """
        Stream a response from an async generator.

        Args:
            response_generator: Async generator yielding response text

        Yields:
            StreamChunk: Chunks of the response
        """
        pass

    @abstractmethod
    async def close(self) -> None:
        """Close the streaming connection."""
        pass

    def is_active(self, stream_id: str) -> bool:
        """
        Check if a stream is active.

        Args:
            stream_id: ID of the stream

        Returns:
            bool: True if stream is active
        """
        return self.active_streams.get(stream_id, False)

    def mark_active(self, stream_id: str) -> None:
        """
        Mark a stream as active.

        Args:
            stream_id: ID of the stream
        """
        self.active_streams[stream_id] = True

    def mark_inactive(self, stream_id: str) -> None:
        """
        Mark a stream as inactive.

        Args:
            stream_id: ID of the stream
        """
        self.active_streams[stream_id] = False
