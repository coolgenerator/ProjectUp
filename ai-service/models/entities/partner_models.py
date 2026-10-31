from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class PartnerEvent(BaseModel):
    """PartnerEvent represents a partner event"""
    event_id: Optional[int] = Field(None, description="Primary key")
    user_id: int = Field(..., description="Organizer user ID")
    title: str = Field(..., max_length=255, description="Event title")
    description: str = Field(..., description="Event description")
    date: datetime = Field(..., description="Event date")
    location: str = Field(..., max_length=255, description="Event location")
    cover: Optional[str] = Field(None, max_length=255, description="Cover image URL")
    medias: Optional[Dict[str, Any]] = Field(None, description="Media files (JSONB)")
    category: Optional[str] = Field(None, max_length=100, description="Event category")
    topics: Optional[Dict[str, Any]] = Field(None, description="Topics (JSONB)")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")

    class Config:
        from_attributes = True


class EventParticipant(BaseModel):
    """EventParticipant represents a participant in an event"""
    participant_id: Optional[int] = Field(None, description="Primary key")
    user_id: int = Field(..., description="User ID")
    event_id: int = Field(..., description="Event ID")
    joined_at: Optional[datetime] = Field(None, description="Join timestamp")

    class Config:
        from_attributes = True


class EventMemo(BaseModel):
    """EventMemo represents a memo associated with an event"""
    memo_id: Optional[int] = Field(None, description="Primary key")
    event_id: int = Field(..., description="Event ID")
    user_id: int = Field(..., description="User ID")
    title: str = Field(..., max_length=255, description="Memo title")
    content: Optional[str] = Field(None, description="Memo content")
    parent_memo: Optional[int] = Field(None, description="Parent memo ID for hierarchy")
    bucket_list: bool = Field(False, description="Indicates if this is a bucket list item")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Update timestamp")

    class Config:
        from_attributes = True
