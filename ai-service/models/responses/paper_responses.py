"""
Response models for paper-related API endpoints
"""

from pydantic import BaseModel
from typing import List, Optional, Dict, Any, TYPE_CHECKING
from datetime import datetime

if TYPE_CHECKING:
    from services.paper.llm_service import OutlineSection, Reference


class GenerateOutlineResponse(BaseModel):
    outline: List[Any]  # List[OutlineSection] - using Any to avoid circular import


class GenerateReferencesResponse(BaseModel):
    references: List[Any]  # List[Reference] - using Any to avoid circular import


class ChatResponse(BaseModel):
    response: str


class GenerateTitleResponse(BaseModel):
    title: str


# Paper Persistence Responses

class ChatSessionResponse(BaseModel):
    id: str
    paper_id: str
    user_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

    class Config:
        from_attributes = True


class ChatMessageResponse(BaseModel):
    id: str
    role: str
    content: str
    context: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class NoteResponse(BaseModel):
    id: str
    paper_id: str
    user_id: str
    page: int
    content: str
    note_type: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OutlineResponse(BaseModel):
    id: str
    paper_id: str
    sections: List[Dict[str, Any]]
    generated_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ReferenceResponse(BaseModel):
    id: str
    ref_id: str
    title: str
    authors: List[str]
    year: Optional[int]
    venue: Optional[str]
    doi: Optional[str]
    url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# Simplified response models for API routes (using string dates)

class ChatSession(BaseModel):
    """Chat session response with string timestamps"""
    id: str
    paper_id: str
    user_id: str
    title: str
    created_at: str
    updated_at: str
    message_count: int = 0


class ChatMessage(BaseModel):
    """Chat message response with string timestamp"""
    id: str
    role: str
    content: str
    context: Optional[str] = None
    created_at: str
