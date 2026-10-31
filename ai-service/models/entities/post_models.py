from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class Post(BaseModel):
    """Post represents a post in the system"""
    id: Optional[int] = Field(None, description="Primary key")
    short_id: str = Field(..., max_length=10, description="Short ID")
    user_id: int = Field(..., description="User ID")
    title: str = Field(..., max_length=255, description="Post title")
    content: str = Field(..., description="Post content")
    post_type: str = Field(..., max_length=50, description="Post type")
    visibility: int = Field(..., description="Visibility (1: private, 2: public, 3: local, 4: organization)")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Update timestamp")
    deleted_at: Optional[datetime] = Field(None, description="Deletion timestamp")
    is_deleted: bool = Field(False, description="Soft delete flag")
    tags: Optional[List[str]] = Field(None, description="Tags")
    media: Optional[List[Dict[str, Any]]] = Field(None, description="Media items (JSON)")

    class Config:
        from_attributes = True


class MediaItem(BaseModel):
    """MediaItem represents a single media item in a post"""
    url: str = Field(..., description="Media URL")
    type: str = Field(..., description="Media type")

    class Config:
        from_attributes = True
