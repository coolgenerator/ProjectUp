from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class PrivateChat(BaseModel):
    """PrivateChat represents a private chat between two users"""
    id: Optional[int] = Field(None, description="Primary key")
    name: str = Field(..., description="Chat name")
    user1_id: int = Field(..., description="First user ID")
    user2_id: int = Field(..., description="Second user ID")
    status: int = Field(0, description="Status (0: Active, 1: Hidden, 2: Deleted)")
    updated_at: Optional[datetime] = Field(None, description="Update timestamp")

    class Config:
        from_attributes = True


class PrivateMessage(BaseModel):
    """PrivateMessage represents a message in a private chat"""
    id: Optional[int] = Field(None, description="Primary key")
    chat_id: int = Field(..., description="Chat ID")
    sender_id: int = Field(..., description="Sender user ID")
    content: str = Field(..., description="Message content")
    timestamp: Optional[datetime] = Field(None, description="Message timestamp")
    is_read: bool = Field(False, description="Read status")

    class Config:
        from_attributes = True


class GroupChat(BaseModel):
    """GroupChat represents a group chat"""
    id: Optional[int] = Field(None, description="Primary key")
    name: str = Field(..., description="Chat name")
    status: int = Field(0, description="Status (0: Active, 1: Hidden, 2: Deleted)")
    updated_at: Optional[datetime] = Field(None, description="Update timestamp")

    class Config:
        from_attributes = True


class GroupMessage(BaseModel):
    """GroupMessage represents a message in a group chat"""
    id: Optional[int] = Field(None, description="Primary key")
    chat_id: int = Field(..., description="Chat ID")
    sender_id: int = Field(..., description="Sender user ID")
    content: str = Field(..., description="Message content")
    timestamp: Optional[datetime] = Field(None, description="Message timestamp")

    class Config:
        from_attributes = True


class GroupMember(BaseModel):
    """GroupMember represents a member in a group chat"""
    member_id: Optional[int] = Field(None, description="Primary key")
    group_id: int = Field(..., description="Group ID")
    user_id: int = Field(..., description="User ID")
    project_id: int = Field(..., description="Project ID")
    role: str = Field("member", max_length=50, description="Member role")
    joined_at: Optional[datetime] = Field(None, description="Join timestamp")
    updated_at: Optional[datetime] = Field(None, description="Update timestamp")

    class Config:
        from_attributes = True
