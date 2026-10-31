from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


# Interaction type constants
INTERACTION_TYPE_LIKE = 1
INTERACTION_TYPE_SAVE = 2
INTERACTION_TYPE_VIEW = 3
INTERACTION_TYPE_SHARE = 4


class Interaction(BaseModel):
    """Interaction represents any user interaction with content"""
    id: Optional[int] = Field(None, description="Primary key")
    entity_type: int = Field(..., description="Type of content (1: project, 2: general post, 3: partner)")
    entity_id: int = Field(..., description="ID of the entity interacted with")
    user_id: int = Field(..., description="User who performed the interaction")
    type: int = Field(..., description="Type of interaction (like, save, view, share)")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional interaction data (JSONB)")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Update timestamp")

    class Config:
        from_attributes = True


class ProjectInteraction(BaseModel):
    """ProjectInteraction is a legacy model kept for conversion purposes"""
    id: Optional[int] = Field(None, description="Primary key")
    user_id: int = Field(..., description="User ID")
    post_id: int = Field(..., description="Post ID")
    interaction_type: str = Field(..., description="Interaction type (like, save, etc.)")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Update timestamp")

    class Config:
        from_attributes = True


class InteractionCountResponse(BaseModel):
    """InteractionCountResponse provides a standard format for interaction count responses"""
    entity_id: int = Field(..., description="Entity ID")
    like_count: int = Field(..., description="Like count")
    save_count: int = Field(..., description="Save count")
    view_count: int = Field(..., description="View count")
    is_liked: bool = Field(..., description="Whether current user liked")
    is_saved: bool = Field(..., description="Whether current user saved")

    class Config:
        from_attributes = True


def convert_interaction_type_to_int(type_str: str) -> int:
    """Helper function to convert string interaction type to int"""
    type_map = {
        "love": INTERACTION_TYPE_LIKE,
        "like": INTERACTION_TYPE_LIKE,
        "save": INTERACTION_TYPE_SAVE,
        "view": INTERACTION_TYPE_VIEW,
        "share": INTERACTION_TYPE_SHARE,
    }
    return type_map.get(type_str.lower(), 0)


def convert_interaction_type_to_string(type_int: int) -> str:
    """Helper function to convert int interaction type to string"""
    type_map = {
        INTERACTION_TYPE_LIKE: "like",
        INTERACTION_TYPE_SAVE: "save",
        INTERACTION_TYPE_VIEW: "view",
        INTERACTION_TYPE_SHARE: "share",
    }
    return type_map.get(type_int, "unknown")
