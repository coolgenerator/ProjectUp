"""
Project routes for the AI Agent API.
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any
import logging

from models.requests.project_requests import (
    ProjectIdeasRequest,
    ProjectRoadmapRequest,
    EnhancedRoadmapRequest
)
from models.responses.project_responses import (
    ProjectIdeasResponse,
    ProjectRoadmapResponse
)
from services.project_service import ProjectService

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize service
project_service = ProjectService()

@router.post("/projects/ideas", response_model=ProjectIdeasResponse)
async def generate_project_ideas(request: ProjectIdeasRequest):
    """Generate project ideas based on the request parameters."""
    try:
        result = await project_service.generate_ideas(request)
        return result
    except Exception as e:
        logger.error(f"Error generating project ideas: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/projects/roadmap", response_model=ProjectRoadmapResponse)
async def generate_project_roadmap(request: ProjectRoadmapRequest):
    """Generate a project roadmap with milestones and timeline."""
    try:
        result = await project_service.generate_roadmap(request)
        return result
    except Exception as e:
        logger.error(f"Error generating project roadmap: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/projects/enhanced-roadmap", response_model=ProjectRoadmapResponse)
async def generate_enhanced_roadmap(request: EnhancedRoadmapRequest):
    """Generate an enhanced project roadmap with additional details."""
    try:
        result = await project_service.generate_enhanced_roadmap(request)
        return result
    except Exception as e:
        logger.error(f"Error generating enhanced roadmap: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/projects/{project_id}/status")
async def get_project_status(project_id: str):
    """Get the status of a project generation request."""
    try:
        result = await project_service.get_project_status(project_id)
        return result
    except Exception as e:
        logger.error(f"Error getting project status: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))