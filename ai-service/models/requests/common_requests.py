"""
Common request schemas used across the AI Agent system.
"""

from typing import Optional, Dict, Any
from pydantic import BaseModel


class MessageRequest(BaseModel):
    """Request model for sending messages."""
    message: str
    session_id: Optional[str] = None
    user_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class SessionRequest(BaseModel):
    """Request model for session operations."""
    session_id: Optional[str] = None
    user_id: Optional[str] = None
    workflow_type: Optional[str] = None