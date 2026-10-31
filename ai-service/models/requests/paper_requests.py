"""
Request models for paper-related API endpoints
"""

from pydantic import BaseModel, HttpUrl
from typing import Optional, List, Dict, Any


class GenerateOutlineRequest(BaseModel):
    pdf_url: HttpUrl
    token: Optional[str] = None


class ChatRequest(BaseModel):
    pdf_url: HttpUrl
    token: Optional[str] = None
    message: str
    context: Optional[str] = None
    # ReAct reasoning parameters
    max_iterations: Optional[int] = 5
    enable_reflection: Optional[bool] = True
    enable_web_search: Optional[bool] = True


class GenerateTitleRequest(BaseModel):
    node_content: str
    node_description: Optional[str] = None


class GenerateChatTitleRequest(BaseModel):
    user_message: str
    ai_response: str


# Paper Persistence Requests

class ChatSessionCreate(BaseModel):
    session_id: str
    paper_id: str
    user_id: str
    title: str = "New Chat"


class ChatMessageCreate(BaseModel):
    message_id: str
    session_id: str
    role: str  # 'user' or 'assistant'
    content: str
    context: Optional[str] = None


class MessageCreateRequest(BaseModel):
    """Request model for creating a new message"""
    message_id: str
    role: str  # 'user' or 'assistant'
    content: str
    context: Optional[str] = None


class NoteCreate(BaseModel):
    note_id: str
    paper_id: str
    user_id: str
    page: int
    content: str
    note_type: str = "note"


class NoteUpdate(BaseModel):
    content: str


class OutlineSave(BaseModel):
    outline_id: str
    paper_id: str
    sections: List[Dict[str, Any]]


class ReferencesSave(BaseModel):
    paper_id: str
    references: List[Dict[str, Any]]


# Paper content structure models

class Section(BaseModel):
    """Paper outline section"""
    title: str
    page_number: int = 0
    level: int = 1
    subsections: List['Section'] = []


class Outline(BaseModel):
    """Paper outline structure"""
    sections: List[Section] = []


class PaperReference(BaseModel):
    """Paper reference/citation"""
    id: str
    title: str
    authors: List[str] = []
    year: Optional[int] = None
    venue: Optional[str] = None
    doi: Optional[str] = None
    url: Optional[str] = None
