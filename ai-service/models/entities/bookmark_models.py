from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class Bookmark(BaseModel):
    """Bookmark represents a saved bookmark/link"""
    id: Optional[int] = Field(None, description="Primary key")
    user_id: int = Field(..., description="User ID")
    url: str = Field(..., description="Bookmark URL")
    title: str = Field(..., max_length=500, description="Bookmark title")
    description: str = Field(..., description="Bookmark description")
    thumbnail: str = Field(..., description="Thumbnail URL")
    category: str = Field(..., max_length=100, description="Category")
    tags: str = Field(..., description="Comma-separated tags")
    platform: str = Field(..., max_length=50, description="Platform (youtube, bilibili, article, etc.)")
    author: str = Field(..., max_length=255, description="Author name")
    author_avatar: str = Field(..., description="Author avatar URL")
    view_count: int = Field(0, description="View count")
    like_count: int = Field(0, description="Like count")
    collections: str = Field(..., description="Comma-separated collection names")
    is_favorite: bool = Field(False, description="Favorite status")
    is_archived: bool = Field(False, description="Archived status")
    imported_at: datetime = Field(..., description="Import timestamp")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Update timestamp")
    deleted_at: Optional[datetime] = Field(None, description="Deletion timestamp")

    class Config:
        from_attributes = True


class BookmarkCategory(BaseModel):
    """BookmarkCategory represents predefined categories for bookmarks"""
    id: Optional[int] = Field(None, description="Primary key")
    name: str = Field(..., max_length=100, description="Category name")
    icon: str = Field(..., max_length=50, description="Icon name")
    color: str = Field(..., max_length=50, description="Color code")
    keywords: str = Field(..., description="Keywords for auto-categorization")
    description: str = Field(..., description="Category description")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Update timestamp")

    class Config:
        from_attributes = True


class BookmarkRequest(BaseModel):
    """BookmarkRequest represents the request to create a bookmark"""
    url: str = Field(..., description="Bookmark URL")
    title: str = Field(..., description="Bookmark title")
    description: str = Field(..., description="Bookmark description")
    tags: List[str] = Field(..., description="Tags list")
    collections: List[str] = Field(..., description="Collections list")

    class Config:
        from_attributes = True


class BookmarkResponse(BaseModel):
    """BookmarkResponse represents the API response for bookmarks"""
    bookmarks: List[Bookmark] = Field(..., description="List of bookmarks")
    total_count: int = Field(..., description="Total count")
    page: int = Field(..., description="Current page")
    page_size: int = Field(..., description="Page size")

    class Config:
        from_attributes = True
