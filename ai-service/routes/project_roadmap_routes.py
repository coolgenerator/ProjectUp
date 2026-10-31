"""
API routes for AI-powered project roadmap generation.
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
import logging

from models.requests.project_roadmap_requests import (
    GenerateProjectRoadmapRequest,
    RegenerateRoadmapSectionRequest,
    ExpandMilestoneRequest
)
from models.responses.project_roadmap_responses import (
    GenerateProjectRoadmapResponse,
    RoadmapSection,
    RoadmapMilestone
)
from services.projects.project_roadmap_generator import ProjectRoadmapGenerator
from services.backend_client import BackendClient

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai-api/project-roadmap", tags=["Project Roadmap"])

# Initialize services
roadmap_generator = ProjectRoadmapGenerator()
backend_client = BackendClient()


@router.post("/generate", response_model=GenerateProjectRoadmapResponse)
async def generate_project_roadmap(request: GenerateProjectRoadmapRequest):
    """
    Generate a comprehensive project roadmap with sections, milestones, tasks, and dependencies.

    This endpoint generates a structured roadmap for a project using AI, including:
    - Sections (major phases)
    - Milestones (significant achievements)
    - Tasks (actionable items with dependencies)
    - Subtasks (detailed breakdowns)
    - Proposals (strategic approaches)
    - Dependency graph

    Args:
        request: Project details and generation parameters

    Returns:
        Complete roadmap with all components
    """
    try:
        logger.info(f"Generating roadmap for project {request.project_id}: {request.project_title}")

        # Generate roadmap using AI
        response = await roadmap_generator.generate_roadmap(request)

        if not response.success:
            raise HTTPException(
                status_code=500,
                detail=response.error_message or "Failed to generate roadmap"
            )

        logger.info(
            f"Successfully generated roadmap: {response.total_milestones} milestones, "
            f"{response.total_tasks} tasks, {response.total_estimated_hours:.1f} hours"
        )

        return response

    except Exception as e:
        logger.error(f"Error generating roadmap: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-and-store")
async def generate_and_store_roadmap(request: GenerateProjectRoadmapRequest):
    """
    Generate a project roadmap and immediately store it in the backend database.

    This endpoint:
    1. Generates the roadmap using AI
    2. Sends the structured data to the backend for storage
    3. Creates sections, milestones, tasks, subtasks, dependencies, and proposals

    Args:
        request: Project details and generation parameters

    Returns:
        Generation response with storage status
    """
    try:
        logger.info(f"Generating and storing roadmap for project {request.project_id}")

        # Step 1: Generate roadmap
        roadmap_response = await roadmap_generator.generate_roadmap(request)

        if not roadmap_response.success:
            raise HTTPException(
                status_code=500,
                detail=roadmap_response.error_message or "Failed to generate roadmap"
            )

        # Step 2: Store in backend
        storage_response = await backend_client.store_project_roadmap(
            project_id=request.project_id,
            roadmap_data=roadmap_response.dict()
        )

        return {
            "success": True,
            "roadmap": roadmap_response,
            "storage": storage_response,
            "message": "Roadmap generated and stored successfully"
        }

    except Exception as e:
        logger.error(f"Error in generate-and-store: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/regenerate-section", response_model=RoadmapSection)
async def regenerate_roadmap_section(request: RegenerateRoadmapSectionRequest):
    """
    Regenerate a specific section of the roadmap with fresh AI generation.

    Useful for:
    - Updating outdated sections
    - Incorporating new requirements
    - Trying different approaches

    Args:
        request: Section details and context

    Returns:
        Newly generated section with milestones and tasks
    """
    try:
        logger.info(f"Regenerating section '{request.section_name}' for project {request.project_id}")

        section = await roadmap_generator.regenerate_section(request)

        if not section:
            raise HTTPException(status_code=500, detail="Failed to regenerate section")

        return section

    except Exception as e:
        logger.error(f"Error regenerating section: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/expand-milestone", response_model=RoadmapMilestone)
async def expand_milestone(request: ExpandMilestoneRequest):
    """
    Expand a milestone with more detailed tasks and subtasks.

    Useful for:
    - Breaking down complex milestones
    - Adding more granular tasks
    - Incorporating additional requirements

    Args:
        request: Milestone details and additional context

    Returns:
        Expanded milestone with detailed tasks
    """
    try:
        logger.info(f"Expanding milestone '{request.milestone_title}' for project {request.project_id}")

        milestone = await roadmap_generator.expand_milestone(request)

        if not milestone:
            raise HTTPException(status_code=500, detail="Failed to expand milestone")

        return milestone

    except Exception as e:
        logger.error(f"Error expanding milestone: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Health check endpoint for roadmap generation service"""
    return {
        "status": "healthy",
        "service": "project-roadmap-generator",
        "version": "1.0.0"
    }
