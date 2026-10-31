from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# Entity type constants
ENTITY_TYPE_PROJECT_POST = 1
ENTITY_TYPE_GENERAL_POST = 2
ENTITY_TYPE_PARTNER_POST = 3


class GenericComment(BaseModel):
    """GenericComment represents a user's comment on any type of content"""
    id: Optional[int] = Field(None, description="Primary key")
    entity_type: int = Field(..., description="Type of content (1: project, 2: general post, 3: partner)")
    entity_id: int = Field(..., description="ID of the entity being commented on")
    user_id: int = Field(..., description="User who created the comment")
    parent_id: Optional[int] = Field(None, description="Parent comment ID (null for top-level)")
    content: str = Field(..., description="Comment text")
    level: int = Field(0, description="Nesting level (0 for top-level)")
    likes_count: int = Field(0, description="Number of likes")
    replies_count: int = Field(0, description="Number of replies")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Update timestamp")
    deleted_at: Optional[datetime] = Field(None, description="Deletion timestamp")
    is_deleted: bool = Field(False, description="Soft delete flag")

    class Config:
        from_attributes = True


class CommentResponse(BaseModel):
    """CommentResponse provides a consistent output format"""
    id: int = Field(..., description="Comment ID")
    entity_type: Optional[int] = Field(None, description="Entity type")
    entity_id: int = Field(..., description="Entity ID")
    user_id: int = Field(..., description="User ID")
    username: str = Field(..., description="Username")
    avatar_url: str = Field(..., description="Avatar URL")
    parent_id: Optional[int] = Field(None, description="Parent comment ID")
    content: str = Field(..., description="Comment content")
    level: int = Field(..., description="Nesting level")
    likes_count: int = Field(..., description="Like count")
    replies_count: int = Field(..., description="Replies count")
    created_at: datetime = Field(..., description="Creation timestamp")
    replies: Optional[List["CommentResponse"]] = Field(None, description="Nested replies")

    class Config:
        from_attributes = True
