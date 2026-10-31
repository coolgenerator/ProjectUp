"""
Response models for version control operations
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID


class VersionResponse(BaseModel):
    """Response for a single version"""
    id: str
    node_id: str
    version_number: int
    branch_name: str
    full_version: str
    parent_version_id: Optional[str]
    is_current: bool
    is_archived: bool

    # Content
    title: str
    summary: str
    content: str
    tags: Optional[List[str]]
    metadata: Optional[Dict[str, Any]]

    # Version metadata
    change_description: Optional[str]
    change_type: Optional[str]
    changed_fields: Optional[List[str]]
    chat_session_id: Optional[str]

    # Audit
    created_by: int
    created_at: str

    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "node_id": "456e4567-e89b-12d3-a456-426614174000",
                "version_number": 2,
                "branch_name": "main",
                "full_version": "main.2",
                "parent_version_id": "789e4567-e89b-12d3-a456-426614174000",
                "is_current": True,
                "is_archived": False,
                "title": "Database Architecture",
                "summary": "PostgreSQL with sharding",
                "content": "Detailed implementation...",
                "tags": ["production", "v1.0"],
                "change_description": "Added sharding strategy",
                "change_type": "chat_conclusion",
                "changed_fields": ["summary", "content"],
                "created_by": 1,
                "created_at": "2025-01-10T10:30:00Z"
            }
        }


class BranchResponse(BaseModel):
    """Response for a branch"""
    id: str
    node_id: str
    branch_name: str
    display_name: Optional[str]
    description: Optional[str]
    prompt: Optional[str]
    parent_version_id: Optional[str]
    chat_session_id: Optional[str]
    is_active: bool
    is_merged: bool
    merged_at: Optional[str]
    merged_by: Optional[int]
    version_count: int
    created_by: int
    created_at: str

    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "node_id": "456e4567-e89b-12d3-a456-426614174000",
                "branch_name": "option_a_postgres",
                "display_name": "PostgreSQL with Strong Consistency",
                "description": "Explore PostgreSQL approach",
                "prompt": "Show me SQL vs NoSQL approaches",
                "parent_version_id": "789e4567-e89b-12d3-a456-426614174000",
                "is_active": True,
                "is_merged": False,
                "version_count": 3,
                "created_by": 1,
                "created_at": "2025-01-10T10:00:00Z"
            }
        }


class VersionTreeNode(BaseModel):
    """Tree node representation"""
    version: VersionResponse
    children: List[str]  # List of version IDs


class VersionTreeResponse(BaseModel):
    """Response for version tree structure"""
    branches: Dict[str, List[VersionResponse]]  # branch_name -> versions
    tree: Dict[str, VersionTreeNode]  # full_version -> node with children

    class Config:
        json_schema_extra = {
            "example": {
                "branches": {
                    "main": [
                        {"full_version": "main.1", "title": "Initial"},
                        {"full_version": "main.2", "title": "Adopted PostgreSQL"}
                    ],
                    "option_a_postgres": [
                        {"full_version": "option_a_postgres.1", "title": "Basic PostgreSQL"},
                        {"full_version": "option_a_postgres.2", "title": "With replicas"}
                    ]
                },
                "tree": {
                    "main.1": {
                        "version": {"full_version": "main.1"},
                        "children": ["option_a_postgres.1", "option_b_mongo.1"]
                    }
                }
            }
        }


class VersionDiffStats(BaseModel):
    """Diff statistics between versions"""
    added: int = Field(..., description="Characters added")
    removed: int = Field(..., description="Characters removed")
    similarity: float = Field(..., ge=0.0, le=1.0, description="Similarity score (0-1)")


class VersionComparisonResponse(BaseModel):
    """Response for version comparison"""
    version_a: VersionResponse
    version_b: VersionResponse
    title_changed: bool
    summary_diff: VersionDiffStats
    content_diff: VersionDiffStats
    tags_changed: bool

    class Config:
        json_schema_extra = {
            "example": {
                "version_a": {"full_version": "option_a.1", "title": "PostgreSQL Basic"},
                "version_b": {"full_version": "option_a.3", "title": "PostgreSQL Sharded"},
                "title_changed": True,
                "summary_diff": {
                    "added": 50,
                    "removed": 0,
                    "similarity": 0.85
                },
                "content_diff": {
                    "added": 270,
                    "removed": 0,
                    "similarity": 0.75
                },
                "tags_changed": False
            }
        }


class BranchListResponse(BaseModel):
    """Response for list of branches"""
    branches: List[BranchResponse]
    total: int

    class Config:
        json_schema_extra = {
            "example": {
                "branches": [
                    {"branch_name": "main", "version_count": 2, "is_active": True},
                    {"branch_name": "option_a_postgres", "version_count": 3, "is_merged": True}
                ],
                "total": 2
            }
        }


class VersionListResponse(BaseModel):
    """Response for list of versions"""
    versions: List[VersionResponse]
    total: int
    current_version: Optional[VersionResponse]

    class Config:
        json_schema_extra = {
            "example": {
                "versions": [
                    {"full_version": "main.1", "is_current": False},
                    {"full_version": "main.2", "is_current": True}
                ],
                "total": 2,
                "current_version": {"full_version": "main.2", "is_current": True}
            }
        }


class AdoptVersionResponse(BaseModel):
    """Response for version adoption"""
    new_version: VersionResponse
    adopted_from: str  # full_version of source
    target_branch: str
    archived_branches: List[str]  # Branches that were archived

    class Config:
        json_schema_extra = {
            "example": {
                "new_version": {"full_version": "main.2", "title": "Adopted PostgreSQL"},
                "adopted_from": "option_a_postgres.3",
                "target_branch": "main",
                "archived_branches": ["option_b_mongo", "option_c_mysql"]
            }
        }


class CreateMultiOptionResponse(BaseModel):
    """Response for creating multiple options"""
    versions: List[VersionResponse]
    branches: List[BranchResponse]
    total_created: int

    class Config:
        json_schema_extra = {
            "example": {
                "versions": [
                    {"full_version": "option_a_postgres.1"},
                    {"full_version": "option_b_mongo.1"}
                ],
                "branches": [
                    {"branch_name": "option_a_postgres"},
                    {"branch_name": "option_b_mongo"}
                ],
                "total_created": 2
            }
        }
