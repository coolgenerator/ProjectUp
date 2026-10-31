"""
Request models for version control operations
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from uuid import UUID


class CreateVersionRequest(BaseModel):
    """Request to create a new version in a branch"""
    node_id: UUID = Field(..., description="ID of the node to version")
    branch_name: str = Field(default="main", description="Branch name (main, option_a, etc)")
    title: str = Field(..., min_length=1, max_length=255)
    summary: str = Field(..., description="TL;DR summary for embeddings and quick reference")
    content: str = Field(..., description="Full detailed content")
    change_description: Optional[str] = Field(None, description="What changed in this version")
    parent_version_id: Optional[UUID] = Field(None, description="Parent version for branching")
    changed_fields: Optional[List[str]] = Field(default=["summary", "content"], description="Fields that changed")
    tags: Optional[List[str]] = Field(default=None, description="Tags for this version")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional metadata")

    class Config:
        json_schema_extra = {
            "example": {
                "node_id": "123e4567-e89b-12d3-a456-426614174000",
                "branch_name": "main",
                "title": "Database Architecture",
                "summary": "PostgreSQL with read replicas and sharding for horizontal scale",
                "content": "Detailed implementation plan...",
                "change_description": "Added sharding strategy",
                "changed_fields": ["summary", "content"]
            }
        }


class CreateBranchRequest(BaseModel):
    """Request to create a new exploration branch"""
    node_id: UUID = Field(..., description="ID of the node to branch")
    branch_name: str = Field(..., description="Branch name (option_a, option_b, etc)")
    display_name: str = Field(..., description="User-friendly branch name")
    description: Optional[str] = Field(None, description="What this branch explores")
    prompt: str = Field(..., description="Original prompt that created this branch")
    parent_version_id: Optional[UUID] = Field(None, description="Version to branch from")

    class Config:
        json_schema_extra = {
            "example": {
                "node_id": "123e4567-e89b-12d3-a456-426614174000",
                "branch_name": "option_a_postgres",
                "display_name": "PostgreSQL with Strong Consistency",
                "description": "Explore PostgreSQL approach for database",
                "prompt": "Show me SQL vs NoSQL approaches",
                "parent_version_id": "456e4567-e89b-12d3-a456-426614174000"
            }
        }


class MultiOptionRequest(BaseModel):
    """Request to create multiple option branches from chat"""
    node_id: UUID = Field(..., description="ID of the node")
    chat_session_id: UUID = Field(..., description="Chat session creating these options")
    options: List[Dict[str, str]] = Field(..., description="List of option configurations")

    class Config:
        json_schema_extra = {
            "example": {
                "node_id": "123e4567-e89b-12d3-a456-426614174000",
                "chat_session_id": "789e4567-e89b-12d3-a456-426614174000",
                "options": [
                    {
                        "branch_name": "option_a_postgres",
                        "display_name": "PostgreSQL",
                        "title": "Database: PostgreSQL",
                        "summary": "Use PostgreSQL for ACID compliance",
                        "content": "Detailed PostgreSQL approach..."
                    },
                    {
                        "branch_name": "option_b_mongo",
                        "display_name": "MongoDB",
                        "title": "Database: MongoDB",
                        "summary": "Use MongoDB for flexibility",
                        "content": "Detailed MongoDB approach..."
                    }
                ]
            }
        }


class AdoptVersionRequest(BaseModel):
    """Request to adopt a version into another branch"""
    node_id: UUID = Field(..., description="ID of the node")
    version_id: UUID = Field(..., description="Version to adopt")
    target_branch: str = Field(default="main", description="Branch to adopt into")

    class Config:
        json_schema_extra = {
            "example": {
                "node_id": "123e4567-e89b-12d3-a456-426614174000",
                "version_id": "456e4567-e89b-12d3-a456-426614174000",
                "target_branch": "main"
            }
        }


class CompareVersionsRequest(BaseModel):
    """Request to compare two versions"""
    version_a_id: UUID = Field(..., description="First version to compare")
    version_b_id: UUID = Field(..., description="Second version to compare")

    class Config:
        json_schema_extra = {
            "example": {
                "version_a_id": "123e4567-e89b-12d3-a456-426614174000",
                "version_b_id": "456e4567-e89b-12d3-a456-426614174000"
            }
        }


class ArchiveBranchRequest(BaseModel):
    """Request to archive a branch"""
    node_id: UUID = Field(..., description="ID of the node")
    branch_name: str = Field(..., description="Branch to archive")

    class Config:
        json_schema_extra = {
            "example": {
                "node_id": "123e4567-e89b-12d3-a456-426614174000",
                "branch_name": "option_b_mongo"
            }
        }
