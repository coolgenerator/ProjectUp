"""
Node Suggestion Routes

API endpoints for AI-powered child node suggestions.
"""

import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

from services.node_suggestion_service import get_suggestion_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai-api/node-suggestions", tags=["node-suggestions"])


class NodeSuggestionRequest(BaseModel):
    """Request for child node suggestions"""
    parent_node_id: str = Field(..., description="Parent node ID")
    parent_title: str = Field(..., description="Parent node title")
    parent_description: str = Field("", description="Parent node description")
    existing_children: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Existing child nodes to avoid duplicates"
    )
    recent_chat: List[str] = Field(
        default_factory=list,
        description="Recent chat messages for context"
    )
    count: int = Field(5, ge=1, le=10, description="Number of suggestions to generate")
    session_id: str = Field(..., description="Tree session ID")


class NodeSuggestionResponse(BaseModel):
    """Response with node suggestions"""
    success: bool
    suggestions: List[Dict[str, Any]]
    message: Optional[str] = None


class RootNodeSuggestionRequest(BaseModel):
    """Request for root node suggestions based on project context"""
    project_id: str = Field(..., description="Project ID")
    project_title: str = Field(..., description="Project title")
    project_goals: str = Field("", description="Project goals/description")
    count: int = Field(5, ge=1, le=10, description="Number of suggestions to generate")
    session_id: str = Field(..., description="Tree session ID")


@router.post(
    "/generate",
    response_model=NodeSuggestionResponse,
    summary="Generate Child Node Suggestions",
    description="""
    Generate AI-powered suggestions for child nodes based on parent context.

    Uses parent node content, existing children, and recent chat to suggest
    3-5 relevant child nodes that would help develop the parent idea.

    **Context Analyzed:**
    - Parent node title and description
    - Existing child nodes (to avoid duplicates)
    - Recent chat messages (for additional context)

    **Suggestions Include:**
    - Title and description
    - Template type recommendation
    - Rationale for the suggestion
    - Priority ranking (1=high, 2=medium, 3=low)

    **Example Use Cases:**
    - Parent: "Build Authentication System"
      → Suggests: Login, Signup, Password Reset, Session Management, OAuth

    - Parent: "Learn React Hooks"
      → Suggests: useState, useEffect, Custom Hooks, Performance, Practice Projects
    """
)
async def generate_suggestions(request: NodeSuggestionRequest) -> NodeSuggestionResponse:
    """
    Generate contextual child node suggestions.

    This endpoint provides AI-powered suggestions to help users quickly
    create relevant child nodes without manual brainstorming.
    """
    try:
        service = get_suggestion_service()

        suggestions = await service.generate_suggestions(
            parent_node_id=request.parent_node_id,
            parent_title=request.parent_title,
            parent_description=request.parent_description,
            existing_children=request.existing_children,
            recent_chat=request.recent_chat,
            count=request.count
        )

        return NodeSuggestionResponse(
            success=True,
            suggestions=suggestions,
            message=f"Generated {len(suggestions)} suggestion(s)"
        )

    except Exception as e:
        logger.error(f"Error in generate_suggestions: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate suggestions: {str(e)}"
        )


@router.post(
    "/root-node",
    response_model=NodeSuggestionResponse,
    summary="Generate Root Node Suggestions",
    description="""
    Generate AI-powered suggestions for the first node in an idea tree based on project context.

    Uses project title and goals to suggest relevant starting points that align with the project's objectives.

    **Context Analyzed:**
    - Project title
    - Project goals/description

    **Suggestions Include:**
    - Title and description
    - Template type recommendation
    - Rationale for the suggestion
    - Priority ranking (1=high, 2=medium, 3=low)

    **Example Use Cases:**
    - Project: "E-commerce Platform"
      → Suggests: User Authentication, Product Catalog, Shopping Cart, Payment Processing, Admin Dashboard

    - Project: "Learn Machine Learning"
      → Suggests: Python Basics, Math Fundamentals, ML Algorithms, Practice Projects, Model Deployment
    """
)
async def generate_root_node_suggestions(request: RootNodeSuggestionRequest) -> NodeSuggestionResponse:
    """
    Generate contextual root node suggestions based on project context.

    This endpoint helps users start new idea trees with relevant first nodes
    that align with their project goals.
    """
    try:
        service = get_suggestion_service()

        suggestions = await service.generate_root_node_suggestions(
            project_id=request.project_id,
            project_title=request.project_title,
            project_goals=request.project_goals,
            count=request.count
        )

        return NodeSuggestionResponse(
            success=True,
            suggestions=suggestions,
            message=f"Generated {len(suggestions)} root node suggestion(s)"
        )

    except Exception as e:
        logger.error(f"Error in generate_root_node_suggestions: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate root node suggestions: {str(e)}"
        )


@router.get(
    "/health",
    summary="Suggestion Service Health Check",
    description="Check if the node suggestion service is operational"
)
async def health_check():
    """Check if suggestion service is operational"""
    try:
        service = get_suggestion_service()
        return {
            "status": "healthy",
            "service": "node-suggestions",
            "service_ready": service is not None
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }
