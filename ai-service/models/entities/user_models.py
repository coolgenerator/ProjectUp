from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class User(BaseModel):
    """User contains authentication and identity information"""
    id: Optional[int] = Field(None, description="Primary key")
    username: Optional[str] = Field(None, max_length=50, description="Username")
    password: Optional[str] = Field(None, max_length=255, description="Hashed password")
    email: Optional[str] = Field(None, max_length=100, description="Email, unique")
    email_verified: bool = Field(False, description="Email verification status")
    token: Optional[str] = Field(None, description="Access token")
    refresh_token: Optional[str] = Field(None, description="Refresh token")
    user_type: Optional[str] = Field("USER", max_length=50, description="Role (e.g., ADMIN or USER)")
    verified: bool = Field(False, description="Verification status")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Update timestamp")

    class Config:
        from_attributes = True


class Profile(BaseModel):
    """Profile contains personal information and preferences"""
    user_id: int = Field(..., description="Primary key and foreign key to User")
    sid: str = Field(..., max_length=20, description="Short ID for public access")
    first_name: Optional[str] = Field(None, max_length=100, description="First name")
    last_name: Optional[str] = Field(None, max_length=100, description="Last name")
    preferred_name: Optional[str] = Field(None, max_length=100, description="Preferred name")
    avatar_url: Optional[str] = Field(None, max_length=255, description="Avatar URL")
    website: Optional[str] = Field(None, max_length=255, description="Personal website")
    school_email: Optional[str] = Field(None, max_length=100, description="School email")
    school_email_verified: bool = Field(False, description="School email verification status")
    field: Optional[str] = Field(None, max_length=255, description="Field of study")
    phone: Optional[str] = Field(None, max_length=15, description="Phone number")
    school: Optional[str] = Field(None, max_length=100, description="School name")
    biography: Optional[str] = Field(None, description="Biography")
    state: Optional[str] = Field(None, max_length=50, description="State or province")
    city: Optional[str] = Field(None, max_length=50, description="City")
    country: Optional[str] = Field(None, max_length=50, description="Country")
    zip_code: Optional[str] = Field(None, max_length=10, description="ZIP code")
    language: str = Field("English", max_length=255, description="Languages (comma-separated)")
    resume_url: Optional[str] = Field(None, max_length=255, description="Resume URL")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Update timestamp")

    class Config:
        from_attributes = True


class Category(BaseModel):
    """Category represents a category for concepts"""
    id: Optional[int] = Field(None, description="Primary key")
    name: str = Field(..., max_length=50, description="Category name")

    class Config:
        from_attributes = True


class UserConcept(BaseModel):
    """UserConcept represents a central concept for skills and interests"""
    id: Optional[int] = Field(None, description="Primary key")
    name: str = Field(..., max_length=100, description="Canonical name")
    category_id: int = Field(..., description="Category ID")
    popularity: int = Field(0, description="Popularity score")

    class Config:
        from_attributes = True


class UserSkill(BaseModel):
    """UserSkill represents a user's skill"""
    id: Optional[int] = Field(None, description="Primary key")
    user_id: int = Field(..., description="User ID")
    name: str = Field(..., max_length=100, description="Skill name")
    level: int = Field(3, description="Skill level")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Update timestamp")

    class Config:
        from_attributes = True


class UserInterest(BaseModel):
    """UserInterest represents a user's interest"""
    id: Optional[int] = Field(None, description="Primary key")
    user_id: int = Field(..., description="User ID")
    name: str = Field(..., max_length=100, description="Interest name")
    level: int = Field(3, description="Interest level")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Update timestamp")

    class Config:
        from_attributes = True


class SkillData(BaseModel):
    """SkillData represents skill data with proficiency level"""
    name: str = Field(..., description="Skill name")
    level: int = Field(..., description="Proficiency level")

    class Config:
        from_attributes = True


class InterestData(BaseModel):
    """InterestData represents interest data with interest level"""
    name: str = Field(..., description="Interest name")
    level: int = Field(..., description="Interest level")

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    """Required user credentials to authenticate"""
    identifier: str = Field(..., description="Username or email")
    password: str = Field(..., description="Password")

    class Config:
        from_attributes = True


class VerifiedUser(BaseModel):
    """VerifiedUser represents email verification record"""
    email: str = Field(..., description="User's email address")
    verification_token: str = Field(..., description="Unique token for email verification")
    created_at: Optional[datetime] = Field(None, description="Record creation timestamp")

    class Config:
        from_attributes = True
