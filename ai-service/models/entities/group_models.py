from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class ProjectGroup(BaseModel):
    """ProjectGroup represents a group in a project with specific permissions"""
    group_id: Optional[int] = Field(None, description="Primary key")
    project_id: int = Field(..., description="Project ID")
    name: str = Field(..., max_length=100, description="Group name")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Update timestamp")

    class Config:
        from_attributes = True


class ProjectGroupMember(BaseModel):
    """ProjectGroupMember represents the many-to-many relationship between users and project groups"""
    project_id: int = Field(..., description="Project ID")
    user_id: int = Field(..., description="User ID")
    group_id: int = Field(..., description="Group ID")
    joined_at: Optional[datetime] = Field(None, description="Join timestamp")

    class Config:
        from_attributes = True


class ProjectMember(BaseModel):
    """ProjectMember represents project membership with permissions"""
    project_id: int = Field(..., description="Project ID")
    user_id: int = Field(..., description="User ID")
    role: str = Field("member", max_length=50, description="Role (admin, editor, viewer, member)")
    permissions: int = Field(..., description="Permissions")
    joined_at: Optional[datetime] = Field(None, description="Join timestamp")
    updated_at: Optional[datetime] = Field(None, description="Update timestamp")

    class Config:
        from_attributes = True
