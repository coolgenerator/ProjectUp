"""
Response models for node chat API endpoints
"""

from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class ChatMessageResponse(BaseModel):
    """Response from AI in chat session"""
    session_id: str
    message: str
    conclusion: Optional[str] = None  # Updated conclusion if AI suggests one
    metadata: Dict[str, Any] = {}


class SessionResponse(BaseModel):
    """Chat session information"""
    id: str
    node_id: str
    project_id: str
    title: str
    is_active: bool
    message_count: int
    conclusion: Optional[str]
    created_at: datetime
    updated_at: datetime
    last_message_at: Optional[datetime]


class VersionResponse(BaseModel):
    """Node version information"""
    id: str
    node_id: str
    version_number: int
    is_current: bool
    title: str
    description: Optional[str]
    tags: Optional[List[str]]
    change_description: Optional[str]
    change_type: Optional[str]
    created_at: datetime
    created_by: int
