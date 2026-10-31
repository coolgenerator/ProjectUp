from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class Project(BaseModel):
    """Project entity containing metadata and relationships"""
    project_id: Optional[int] = Field(None, description="Primary key")
    sid: str = Field(..., max_length=10, description="Short ID for public access")
    owner_id: int = Field(..., description="Owner's user ID")
    slug: str = Field(..., max_length=255, description="URL slug")
    cover: Optional[str] = Field(None, max_length=255, description="Cover image URL")
    project_media_url: Optional[Dict[str, Any]] = Field(None, description="Project media URLs (JSONB)")
    refer_link: Optional[str] = Field(None, description="Reference link")
    communication_app: Optional[str] = Field(None, max_length=100, description="Communication app")
    project_type: Optional[str] = Field(None, max_length=100, description="Project type")
    title: Optional[str] = Field(None, max_length=100, description="Project title")
    description: Optional[str] = Field(None, description="Project description")
    topic: Optional[Dict[str, Any]] = Field(None, description="Topics (JSONB)")
    school: Optional[str] = Field(None, max_length=100, description="School name")
    class_name: Optional[str] = Field(None, max_length=100, description="Class name", alias="class")
    location: Optional[str] = Field(None, max_length=100, description="Location")
    start_time: Optional[datetime] = Field(None, description="Start time")
    end_time: Optional[datetime] = Field(None, description="End time")
    hidden: bool = Field(False, description="Hidden status")
    is_published: bool = Field(False, description="Published status")
    status: int = Field(..., description="Status (1: Active, 2: Archived, 3: Completed, 4: Deleted)")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Update timestamp")
    deleted_at: Optional[datetime] = Field(None, description="Deletion timestamp")

    class Config:
        from_attributes = True
        populate_by_name = True


class ProjectPost(BaseModel):
    """ProjectPost represents a post for a project"""
    post_id: Optional[int] = Field(None, description="Primary key")
    user_id: int = Field(..., description="User ID")
    project_id: int = Field(..., description="Project ID")
    sid: str = Field(..., max_length=10, description="Short ID")
    title: str = Field(..., max_length=255, description="Post title")
    cover: Optional[str] = Field(None, max_length=255, description="Cover image")
    medias: Optional[Dict[str, Any]] = Field(None, description="Media files (JSONB)")
    spots: Optional[Dict[str, Any]] = Field(None, description="Spots (JSONB)")
    start_time: Optional[datetime] = Field(None, description="Start time")
    deadline: Optional[datetime] = Field(None, description="Deadline")
    location: Optional[str] = Field(None, max_length=255, description="Location")
    like_count: int = Field(0, description="Like count")
    description: Optional[str] = Field(None, description="Description")
    visibility: int = Field(..., description="Visibility (1: private, 2: public, 3: local, 4: organization)")
    status: int = Field(..., description="Status (1: Active, 2: Archived, 3: Pastdue, 4: Deleted)")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Update timestamp")

    class Config:
        from_attributes = True


class ProjectApplication(BaseModel):
    """ProjectApplication represents an application to join a project"""
    application_id: Optional[int] = Field(None, description="Primary key")
    user_id: int = Field(..., description="User ID")
    post_id: int = Field(..., description="Post ID")
    status: int = Field(..., description="Application status")
    applied_at: datetime = Field(..., description="Application timestamp")
    review_at: Optional[datetime] = Field(None, description="Review timestamp")
    description: str = Field(..., description="Application description")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")

    class Config:
        from_attributes = True


class ApplicationQuestion(BaseModel):
    """ApplicationQuestion represents a question in project application"""
    question_id: Optional[int] = Field(None, description="Primary key")
    post_id: int = Field(..., description="Post ID")
    text: str = Field(..., description="Question text")
    type: int = Field(..., description="Question type")
    choices: Optional[Dict[str, Any]] = Field(None, description="Choices (JSONB)")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")

    class Config:
        from_attributes = True


class ApplicationAnswer(BaseModel):
    """ApplicationAnswer represents an answer to application question"""
    answer_id: Optional[int] = Field(None, description="Primary key")
    application_id: int = Field(..., description="Application ID")
    question_id: int = Field(..., description="Question ID")
    answer_text: str = Field(..., description="Answer text")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")

    class Config:
        from_attributes = True


class ProjectInvitation(BaseModel):
    """ProjectInvitation represents an invitation to join a project"""
    invitation_id: Optional[int] = Field(None, description="Primary key")
    project_id: int = Field(..., description="Project ID")
    email: str = Field(..., max_length=255, description="Invitee email")
    invited_by_user_id: int = Field(..., description="Inviter user ID")
    status: int = Field(0, description="Status (0: Pending, 1: Accepted, 2: Rejected)")
    role: str = Field(..., max_length=50, description="Role")
    permissions: int = Field(1, description="Permissions")
    token: str = Field(..., max_length=255, description="Invitation token")
    expires_at: datetime = Field(..., description="Expiration timestamp")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Update timestamp")

    class Config:
        from_attributes = True


class ProjectShare(BaseModel):
    """ProjectShare represents a shareable link for a project"""
    share_id: Optional[int] = Field(None, description="Primary key")
    project_id: int = Field(..., description="Project ID")
    shared_by_user_id: int = Field(..., description="Sharer user ID")
    share_token: str = Field(..., description="Share token")
    expires_at: datetime = Field(..., description="Expiration timestamp")
    access_level: str = Field(..., description="Access level (view, edit)")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Update timestamp")

    class Config:
        from_attributes = True


class ProjectPostShare(BaseModel):
    """ProjectPostShare represents a shareable link for a project post"""
    share_id: Optional[int] = Field(None, description="Primary key")
    post_id: int = Field(..., description="Post ID")
    shared_by_user_id: int = Field(..., description="Sharer user ID")
    share_token: str = Field(..., max_length=255, description="Share token")
    expires_at: datetime = Field(..., description="Expiration timestamp")
    access_level: str = Field(..., description="Access level (view, edit)")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Update timestamp")

    class Config:
        from_attributes = True


class InviteMemberRequest(BaseModel):
    """InviteMemberRequest represents the request body for inviting a member"""
    email: str = Field(..., description="Email address")
    role: str = Field(..., description="Role")
    permissions: int = Field(..., description="Permissions")

    class Config:
        from_attributes = True


class CreateShareRequest(BaseModel):
    """CreateShareRequest represents the request body for creating a share link"""
    access_level: str = Field(..., description="Access level (view, edit)")
    expiry_days: int = Field(..., ge=1, le=30, description="Expiry days (1-30)")

    class Config:
        from_attributes = True
