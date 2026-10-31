from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class Notification(BaseModel):
    """Notification represents a user notification"""
    notification_id: Optional[int] = Field(None, description="Primary key")
    user_id: int = Field(..., description="User ID")
    title: str = Field(..., max_length=255, description="Notification title")
    description: str = Field(..., description="Notification description")
    url: str = Field(..., max_length=255, description="URL for details")
    is_read: bool = Field(False, description="Read status")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")

    class Config:
        from_attributes = True
