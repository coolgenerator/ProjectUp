"""
API routes for AI Plan service.
Provides endpoints for converting AI-generated data to plan format.
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
import logging

from models.plan_models import (
    ProjectPlan,
    RoadmapStep,
    CurriculumAlignment,
    ChecklistItem,
    AIGeneratedProject,
    create_roadmap_plan,
    create_curriculum_plan
)

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/ai-api/plans", tags=["Plans"])


@router.post("/convert-roadmap")
async def convert_roadmap_to_plan(data: Dict[str, Any]):
    """Convert roadmap data to plan format.

    Args:
        data: Dictionary containing project_id and roadmap steps

    Returns:
        ProjectPlan in JSON format
    """
    try:
        project_id = data.get("project_id")
        roadmap_data = data.get("roadmap", [])

        if not project_id:
            raise HTTPException(status_code=400, detail="project_id is required")

        if not roadmap_data:
            raise HTTPException(status_code=400, detail="roadmap data is required")

        # Parse roadmap steps
        roadmap_steps = [RoadmapStep(**step) for step in roadmap_data]

        # Create plan
        plan = create_roadmap_plan(project_id, roadmap_steps)

        return plan.dict()

    except Exception as e:
        logger.error(f"Error converting roadmap to plan: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/convert-curriculum")
async def convert_curriculum_to_plan(data: Dict[str, Any]):
    """Convert curriculum alignment data to plan format.

    Args:
        data: Dictionary containing project_id and curriculum alignment

    Returns:
        ProjectPlan in JSON format
    """
    try:
        project_id = data.get("project_id")
        curriculum_data = data.get("curriculum")

        if not project_id:
            raise HTTPException(status_code=400, detail="project_id is required")

        if not curriculum_data:
            raise HTTPException(status_code=400, detail="curriculum data is required")

        # Parse curriculum alignment
        curriculum = CurriculumAlignment(**curriculum_data)

        # Create plan
        plan = create_curriculum_plan(project_id, curriculum)

        return plan.dict()

    except Exception as e:
        logger.error(f"Error converting curriculum to plan: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/convert-all")
async def convert_ai_project_to_plans(data: Dict[str, Any]):
    """Convert complete AI-generated project data to multiple plans.

    Args:
        data: Dictionary containing project_id, roadmap, curriculum, and checklist

    Returns:
        Dictionary with roadmap_plan and curriculum_plan
    """
    try:
        project_id = data.get("project_id")
        roadmap_data = data.get("roadmap", [])
        curriculum_data = data.get("curriculum")

        if not project_id:
            raise HTTPException(status_code=400, detail="project_id is required")

        plans = {}

        # Convert roadmap if provided
        if roadmap_data:
            roadmap_steps = [RoadmapStep(**step) for step in roadmap_data]
            roadmap_plan = create_roadmap_plan(project_id, roadmap_steps)
            plans["roadmap_plan"] = roadmap_plan.dict()

        # Convert curriculum if provided
        if curriculum_data:
            curriculum = CurriculumAlignment(**curriculum_data)
            curriculum_plan = create_curriculum_plan(project_id, curriculum)
            plans["curriculum_plan"] = curriculum_plan.dict()

        return plans

    except Exception as e:
        logger.error(f"Error converting AI project to plans: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate-plan")
async def validate_plan_data(plan_data: Dict[str, Any]):
    """Validate plan data structure.

    Args:
        plan_data: Dictionary containing plan data to validate

    Returns:
        Validation result with errors if any
    """
    try:
        # Try to parse as ProjectPlan
        plan = ProjectPlan(**plan_data)

        return {
            "valid": True,
            "message": "Plan data is valid"
        }

    except Exception as e:
        return {
            "valid": False,
            "errors": str(e)
        }


@router.post("/format-checklist")
async def format_checklist_items(data: Dict[str, Any]):
    """Format checklist items for storage.

    Args:
        data: Dictionary containing checklist items

    Returns:
        Formatted checklist items
    """
    try:
        checklist_data = data.get("checklist", [])

        if not checklist_data:
            raise HTTPException(status_code=400, detail="checklist data is required")

        # Parse and validate checklist items
        checklist_items = [ChecklistItem(**item) for item in checklist_data]

        return {
            "items": [item.dict() for item in checklist_items],
            "count": len(checklist_items)
        }

    except Exception as e:
        logger.error(f"Error formatting checklist: {e}")
        raise HTTPException(status_code=500, detail=str(e))
