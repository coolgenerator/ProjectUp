"""
Agent-Specific Streaming

Streaming implementation tailored for AI agents with support for
tool calls, reasoning steps, and structured outputs.
"""

from typing import AsyncIterator, Dict, Any, Optional
from datetime import datetime
from .base import StreamingProtocol, StreamChunk, StreamChunkType
from .sse import SSEStreamer


class AgentStreamer:
    """
    Agent-specific streaming with support for complex agent behaviors.

    Handles:
    - Tool calls and results
    - Reasoning steps
    - Structured outputs
    - Progress updates
    """

    def __init__(self, protocol: StreamingProtocol):
        """
        Initialize agent streamer.

        Args:
            protocol: Underlying streaming protocol (SSE or WebSocket)
        """
        self.protocol = protocol
        self.current_step: Optional[str] = None
        self.steps_completed: int = 0

    async def stream_start(self, agent_id: str, metadata: Optional[Dict[str, Any]] = None) -> None:
        """
        Signal the start of agent processing.

        Args:
            agent_id: ID of the agent
            metadata: Optional metadata about the agent/task
        """
        chunk = StreamChunk(
            type=StreamChunkType.START,
            content="",
            metadata={
                "agent_id": agent_id,
                **(metadata or {})
            }
        )
        await self.protocol.send_chunk(chunk)

    async def stream_step(self, step_name: str, description: Optional[str] = None) -> None:
        """
        Stream a processing step.

        Args:
            step_name: Name of the step
            description: Optional description of what the step does
        """
        self.current_step = step_name
        self.steps_completed += 1

        chunk = StreamChunk(
            type=StreamChunkType.METADATA,
            content=step_name,
            metadata={
                "step": step_name,
                "description": description,
                "step_number": self.steps_completed
            }
        )
        await self.protocol.send_chunk(chunk)

    async def stream_tool_call(
        self,
        tool_name: str,
        tool_args: Dict[str, Any],
        call_id: Optional[str] = None
    ) -> None:
        """
        Stream a tool call.

        Args:
            tool_name: Name of the tool being called
            tool_args: Arguments passed to the tool
            call_id: Optional unique identifier for this call
        """
        chunk = StreamChunk(
            type=StreamChunkType.TOOL_CALL,
            content=tool_name,
            metadata={
                "tool_name": tool_name,
                "args": tool_args,
                "call_id": call_id or f"call_{datetime.now().timestamp()}"
            }
        )
        await self.protocol.send_chunk(chunk)

    async def stream_tool_result(
        self,
        tool_name: str,
        result: Any,
        call_id: Optional[str] = None
    ) -> None:
        """
        Stream a tool result.

        Args:
            tool_name: Name of the tool that was called
            result: Result from the tool
            call_id: Optional unique identifier matching the call
        """
        chunk = StreamChunk(
            type=StreamChunkType.TOOL_RESULT,
            content=str(result),
            metadata={
                "tool_name": tool_name,
                "call_id": call_id,
                "result_type": type(result).__name__
            }
        )
        await self.protocol.send_chunk(chunk)

    async def stream_token(self, token: str, metadata: Optional[Dict[str, Any]] = None) -> None:
        """
        Stream a single token.

        Args:
            token: The token to stream
            metadata: Optional metadata about the token
        """
        chunk = StreamChunk(
            type=StreamChunkType.TOKEN,
            content=token,
            metadata=metadata
        )
        await self.protocol.send_chunk(chunk)

    async def stream_tokens(
        self,
        token_generator: AsyncIterator[str],
        metadata_updater: Optional[AsyncIterator[Dict[str, Any]]] = None
    ) -> None:
        """
        Stream multiple tokens from a generator.

        Args:
            token_generator: Async generator yielding tokens
            metadata_updater: Optional async generator yielding metadata updates
        """
        async for token in token_generator:
            metadata = None
            if metadata_updater:
                try:
                    metadata = await metadata_updater.__anext__()
                except StopAsyncIteration:
                    pass

            await self.stream_token(token, metadata)

    async def stream_complete(
        self,
        final_output: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Signal completion of agent processing.

        Args:
            final_output: Optional final output from the agent
            metadata: Optional completion metadata
        """
        chunk = StreamChunk(
            type=StreamChunkType.COMPLETE,
            content=final_output or "",
            metadata={
                "steps_completed": self.steps_completed,
                **(metadata or {})
            }
        )
        await self.protocol.send_chunk(chunk)

    async def stream_error(self, error: Exception, context: Optional[Dict[str, Any]] = None) -> None:
        """
        Stream an error.

        Args:
            error: The error that occurred
            context: Optional context about where/when the error occurred
        """
        chunk = StreamChunk(
            type=StreamChunkType.ERROR,
            content=str(error),
            metadata={
                "error_type": type(error).__name__,
                "current_step": self.current_step,
                **(context or {})
            }
        )
        await self.protocol.send_chunk(chunk)

    async def stream_progress(
        self,
        current: int,
        total: int,
        message: Optional[str] = None
    ) -> None:
        """
        Stream progress information.

        Args:
            current: Current progress value
            total: Total expected value
            message: Optional progress message
        """
        percentage = (current / total * 100) if total > 0 else 0

        chunk = StreamChunk(
            type=StreamChunkType.METADATA,
            content=message or f"Progress: {current}/{total}",
            metadata={
                "progress": {
                    "current": current,
                    "total": total,
                    "percentage": round(percentage, 2)
                }
            }
        )
        await self.protocol.send_chunk(chunk)
