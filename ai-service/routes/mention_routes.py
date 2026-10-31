"""
Mention Routes - API endpoints for @ mention functionality

Provides endpoints for:
1. Fetching all mentionable materials
2. Semantic search across materials
3. Context-aware suggestions
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from services.mention_service import get_mention_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai-api/mentions", tags=["Mentions"])


# Request/Response Models
class SemanticSearchRequest(BaseModel):
    """Request for semantic search"""
    query: str = Field(..., description="Search query text")
    project_id: str = Field(..., description="Project ID to search within")
    limit: int = Field(default=5, ge=1, le=20, description="Maximum number of results")
    context: Optional[dict] = Field(default=None, description="Additional context")


class SuggestionsRequest(BaseModel):
    """Request for context-aware suggestions"""
    node_id: str = Field(..., description="Current node ID")
    node_title: str = Field(..., description="Current node title")
    node_description: str = Field(default="", description="Current node description")
    recent_messages: List[str] = Field(default=[], description="Recent chat messages")
    project_id: str = Field(..., description="Project ID")
    limit: int = Field(default=5, ge=1, le=10, description="Maximum number of suggestions")


@router.get("/materials/{project_id}")
async def get_mentionable_materials(
    project_id: str,
    user_id: Optional[int] = Query(default=None, description="User ID for permissions")
):
    """
    Get all mentionable materials for a project

    Returns nodes, papers (PDF only), resources, and courses.

    **Example Response:**
    ```json
    {
        "success": true,
        "data": {
            "nodes": [...],
            "papers": [...],
            "resources": [...],
            "courses": [...],
            "total_count": 42
        }
    }
    ```
    """
    try:
        mention_service = get_mention_service()
        materials = await mention_service.get_all_mentionable_materials(
            project_id=project_id,
            user_id=user_id
        )

        return {
            "success": True,
            "data": materials,
            "message": f"Found {materials['total_count']} mentionable materials"
        }

    except Exception as e:
        logger.error(f"Error fetching mentionable materials: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch materials: {str(e)}"
        )


@router.post("/semantic-search")
async def semantic_search(request: SemanticSearchRequest):
    """
    Perform semantic search across project materials

    Uses embeddings and vector similarity to find relevant materials
    based on the search query.

    **Example Request:**
    ```json
    {
        "query": "authentication system implementation",
        "project_id": "proj_123",
        "limit": 5,
        "context": {
            "node_id": "node_456"
        }
    }
    ```

    **Example Response:**
    ```json
    {
        "success": true,
        "results": [
            {
                "id": "node_789",
                "title": "JWT Authentication",
                "description": "...",
                "type": "node",
                "relevance_score": 0.89
            }
        ],
        "count": 5
    }
    ```
    """
    try:
        mention_service = get_mention_service()
        results = await mention_service.semantic_search(
            query=request.query,
            project_id=request.project_id,
            limit=request.limit,
            context=request.context
        )

        return {
            "success": True,
            "results": results,
            "count": len(results),
            "query": request.query
        }

    except Exception as e:
        logger.error(f"Error in semantic search: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Semantic search failed: {str(e)}"
        )


@router.post("/suggestions")
async def get_suggestions(request: SuggestionsRequest):
    """
    Get context-aware material suggestions

    Returns materials that are relevant to the current node
    and recent conversation context.

    **Example Request:**
    ```json
    {
        "node_id": "node_123",
        "node_title": "Implement Login",
        "node_description": "Build user authentication",
        "recent_messages": [
            "We need to support OAuth",
            "JWT tokens for API access"
        ],
        "project_id": "proj_456",
        "limit": 5
    }
    ```

    **Example Response:**
    ```json
    {
        "success": true,
        "suggestions": [
            {
                "id": "paper_789",
                "title": "OAuth 2.0 Security Best Practices",
                "type": "paper",
                "relevance_score": 0.92
            }
        ],
        "count": 5
    }
    ```
    """
    try:
        mention_service = get_mention_service()
        suggestions = await mention_service.get_context_aware_suggestions(
            node_id=request.node_id,
            node_title=request.node_title,
            node_description=request.node_description,
            recent_messages=request.recent_messages,
            project_id=request.project_id,
            limit=request.limit
        )

        return {
            "success": True,
            "suggestions": suggestions,
            "count": len(suggestions),
            "context": {
                "node_id": request.node_id,
                "node_title": request.node_title
            }
        }

    except Exception as e:
        logger.error(f"Error getting suggestions: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get suggestions: {str(e)}"
        )


@router.get("/health")
async def mention_health_check():
    """Health check endpoint for mention service"""
    return {
        "status": "healthy",
        "service": "mentions",
        "features": {
            "semantic_search": "enabled",
            "suggestions": "enabled",
            "vector_db": "pending"  # Will be "enabled" when vector DB is integrated
        }
    }
