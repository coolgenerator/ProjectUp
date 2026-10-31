"""
Node Template API Routes

RESTful API endpoints for template management and semantic search.
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from database.connection import get_db
from services.template_service import TemplateService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai-api/templates", tags=["templates"])


# Request/Response Models
class TemplateSearchRequest(BaseModel):
    """Request model for semantic search"""
    query: str = Field(..., description="Search query text")
    category: Optional[str] = Field(None, description="Category filter (e.g., business, marketing)")
    limit: int = Field(20, ge=1, le=100, description="Maximum results to return")
    threshold: float = Field(0.5, ge=0.0, le=1.0, description="Minimum similarity threshold")


class TemplateResponse(BaseModel):
    """Response model for template"""
    id: str
    name: str
    description: str
    category: str
    subcategory: Optional[str]
    icon: Optional[str]
    color: Optional[str]
    prompt: Optional[str]
    rationale: Optional[str]
    priority: int
    tags: List[str]
    metadata: dict
    usage_count: int
    similarity: Optional[float] = None


class CategoryResponse(BaseModel):
    """Response model for category"""
    id: str
    name: str
    count: int
    icon: str


class TemplateUsageRequest(BaseModel):
    """Request model for logging template usage"""
    template_id: str
    project_id: Optional[int] = None
    user_id: Optional[str] = None
    node_id: Optional[str] = None
    context: Optional[dict] = None


# Routes
@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "template-service",
        "features": ["semantic_search", "categorization", "usage_tracking"]
    }


@router.get("/categories", response_model=List[CategoryResponse])
async def get_categories(db: Session = Depends(get_db)):
    """
    Get all template categories with counts.

    Returns:
        List of categories with template counts
    """
    try:
        service = TemplateService(db)
        categories = service.get_all_categories()
        return categories
    except Exception as e:
        # If node_templates table doesn't exist, return empty list
        # Template system is optional and shouldn't break the application
        logger.warning(f"Template categories not available (table may not exist): {e}")
        return []


@router.get("/category/{category}", response_model=List[TemplateResponse])
async def get_templates_by_category(
    category: str,
    subcategory: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Get templates by category.

    Args:
        category: Category name (or 'all' for all templates)
        subcategory: Optional subcategory filter
        limit: Maximum number of results

    Returns:
        List of templates
    """
    try:
        service = TemplateService(db)
        templates = service.get_templates_by_category(
            category=category if category != 'all' else None,
            subcategory=subcategory,
            limit=limit
        )

        return [
            {
                **template.to_dict(),
                "similarity": None
            }
            for template in templates
        ]
    except Exception as e:
        # Template system is optional
        logger.warning(f"Templates not available: {e}")
        return []


@router.post("/search", response_model=List[TemplateResponse])
async def semantic_search(
    request: TemplateSearchRequest,
    db: Session = Depends(get_db)
):
    """
    Semantic search for templates using embeddings.

    This endpoint uses vector embeddings to find templates that are
    semantically similar to the search query, providing better results
    than keyword matching.

    Args:
        request: Search request with query and filters

    Returns:
        List of templates ranked by similarity
    """
    try:
        service = TemplateService(db)
        templates = service.semantic_search(
            query=request.query,
            category=request.category,
            limit=request.limit,
            threshold=request.threshold
        )

        return templates
    except Exception as e:
        # Template system is optional
        logger.warning(f"Template search not available: {e}")
        return []


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: str,
    db: Session = Depends(get_db)
):
    """
    Get a specific template by ID.

    Args:
        template_id: Template identifier

    Returns:
        Template details
    """
    try:
        service = TemplateService(db)
        template = service.get_template(template_id)

        if not template:
            raise HTTPException(status_code=404, detail="Template not found")

        return {
            **template.to_dict(),
            "similarity": None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting template: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/usage")
async def log_usage(
    request: TemplateUsageRequest,
    db: Session = Depends(get_db)
):
    """
    Log template usage for analytics.

    Args:
        request: Usage logging request

    Returns:
        Success message
    """
    try:
        service = TemplateService(db)
        service.log_template_usage(
            template_id=request.template_id,
            project_id=request.project_id,
            user_id=request.user_id,
            node_id=request.node_id,
            context=request.context
        )

        return {"status": "success", "message": "Usage logged"}
    except Exception as e:
        logger.error(f"Error logging usage: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{template_id}/regenerate-embedding")
async def regenerate_embedding(
    template_id: str,
    db: Session = Depends(get_db)
):
    """
    Regenerate embedding for a template.

    Useful for updating embeddings after template modifications.

    Args:
        template_id: Template identifier

    Returns:
        Success status
    """
    try:
        service = TemplateService(db)
        success = service.update_template_embedding(template_id)

        if not success:
            raise HTTPException(status_code=404, detail="Template not found")

        return {"status": "success", "message": "Embedding regenerated"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error regenerating embedding: {e}")
        raise HTTPException(status_code=500, detail=str(e))
