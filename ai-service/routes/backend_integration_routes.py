"""
Backend Integration Test Routes

Test endpoints for verifying backend API integration.
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any
import logging

from services.integrations.plan_integration import plan_integration
from services.integrations.task_integration import task_integration
from services.integrations.milestone_integration import milestone_integration

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai-api/backend-integration", tags=["backend-integration"])


@router.get("/test",
    summary="Test Backend Connection",
    description="Verify that the AI service can connect to the backend API"
)
async def test_backend_connection():
    """Test endpoint to verify backend connectivity."""
    try:
        from services.backend_client import backend_client
        from config.settings import settings

        return {
            "status": "ok",
            "message": "Backend integration service is operational",
            "backend_url": settings.backend_url,
            "api_prefix": settings.backend_api_prefix,
            "timeout": settings.backend_timeout
        }
    except Exception as e:
        logger.error(f"Backend connection test failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/projects/{project_sid}/plans",
    summary="Test Plans Integration",
    description="Fetch plans from backend and return summary"
)
async def test_plans_integration(project_sid: str):
    """Test endpoint for plans integration."""
    try:
        # Fetch plans
        plans = await plan_integration.get_project_plans(project_sid)

        # Get summary
        summary = await plan_integration.get_plans_summary(project_sid)

        return {
            "status": "success",
            "project_sid": project_sid,
            "plans_count": len(plans),
            "summary": summary,
            "sample_plans": plans[:3] if plans else []  # Return first 3 plans
        }

    except Exception as e:
        logger.error(f"Plans integration test failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/projects/{project_sid}/tasks",
    summary="Test Tasks Integration",
    description="Fetch tasks from backend and return summary"
)
async def test_tasks_integration(project_sid: str):
    """Test endpoint for tasks integration."""
    try:
        # Fetch tasks
        tasks = await task_integration.get_project_tasks(project_sid)

        # Get summary
        summary = await task_integration.get_tasks_summary(project_sid)

        # Get pending tasks
        pending_tasks = await task_integration.get_pending_tasks(project_sid)

        return {
            "status": "success",
            "project_sid": project_sid,
            "tasks_count": len(tasks),
            "pending_count": len(pending_tasks),
            "summary": summary,
            "sample_tasks": tasks[:5] if tasks else []  # Return first 5 tasks
        }

    except Exception as e:
        logger.error(f"Tasks integration test failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/projects/{project_sid}/milestones",
    summary="Test Milestones Integration",
    description="Fetch milestones from backend and return summary"
)
async def test_milestones_integration(project_sid: str):
    """Test endpoint for milestones integration."""
    try:
        # Fetch milestones
        milestones = await milestone_integration.get_project_milestones(project_sid)

        # Get summary
        summary = await milestone_integration.get_milestones_summary(project_sid)

        # Get pending milestones
        pending_milestones = await milestone_integration.get_pending_milestones(project_sid)

        return {
            "status": "success",
            "project_sid": project_sid,
            "milestones_count": len(milestones),
            "pending_count": len(pending_milestones),
            "summary": summary,
            "sample_milestones": milestones[:3] if milestones else []  # Return first 3
        }

    except Exception as e:
        logger.error(f"Milestones integration test failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/projects/{project_sid}/all",
    summary="Test All Integrations",
    description="Fetch plans, tasks, and milestones from backend"
)
async def test_all_integrations(project_sid: str):
    """Test endpoint for all backend integrations."""
    try:
        import asyncio

        # Fetch all data in parallel
        plans, tasks, milestones = await asyncio.gather(
            plan_integration.get_project_plans(project_sid),
            task_integration.get_project_tasks(project_sid),
            milestone_integration.get_project_milestones(project_sid),
            return_exceptions=True
        )

        # Get summaries
        plans_summary = await plan_integration.get_plans_summary(project_sid) if not isinstance(plans, Exception) else {}
        tasks_summary = await task_integration.get_tasks_summary(project_sid) if not isinstance(tasks, Exception) else {}
        milestones_summary = await milestone_integration.get_milestones_summary(project_sid) if not isinstance(milestones, Exception) else {}

        return {
            "status": "success",
            "project_sid": project_sid,
            "plans": {
                "count": len(plans) if not isinstance(plans, Exception) else 0,
                "summary": plans_summary,
                "error": str(plans) if isinstance(plans, Exception) else None
            },
            "tasks": {
                "count": len(tasks) if not isinstance(tasks, Exception) else 0,
                "summary": tasks_summary,
                "error": str(tasks) if isinstance(tasks, Exception) else None
            },
            "milestones": {
                "count": len(milestones) if not isinstance(milestones, Exception) else 0,
                "summary": milestones_summary,
                "error": str(milestones) if isinstance(milestones, Exception) else None
            }
        }

    except Exception as e:
        logger.error(f"All integrations test failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/projects/{project_sid}/plans/{plan_id}",
    summary="Test Single Plan Fetch",
    description="Fetch and extract content from a specific plan"
)
async def test_single_plan_fetch(project_sid: str, plan_id: int):
    """Test fetching and extracting content from a single plan."""
    try:
        # Fetch plan
        plan = await plan_integration.get_plan(project_sid, plan_id)

        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found")

        # Extract content
        extracted_content = plan_integration.extract_plan_content(plan)

        return {
            "status": "success",
            "plan": plan,
            "extracted_content": extracted_content,
            "content_length": len(extracted_content)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Single plan fetch test failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
