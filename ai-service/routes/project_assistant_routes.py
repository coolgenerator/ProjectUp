"""
API routes for AI Project Assistant service.
Provides endpoints for project idea generation.

Note: Roadmap generation has been moved to /ai-api/project-roadmap/generate
"""

from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import StreamingResponse, JSONResponse
from typing import Dict, Any, Optional, List
import logging
import json
import asyncio

from services.project_assistant.project_assistant_service import ProjectAssistantService
from models.requests.project_assistant_requests import (
    ProjectIdeasRequest,
    ProjectIdeasResponse
)

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/ai-api/agents", tags=["Project Assistant"])

# Initialize service (singleton)
project_assistant_service = ProjectAssistantService()


@router.post("/project-ideas")
async def generate_project_ideas(request: ProjectIdeasRequest, response: Response):
    """Generate personalized project ideas based on user skills, interests, and preferences.

    Args:
        request: Project ideas request with user profile
        response: FastAPI Response object for setting headers

    Returns:
        Project ideas response with generated ideas
    """
    try:
        # Add cache-busting headers
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"

        result = await project_assistant_service.generate_project_ideas(
            skills=request.skills,
            interests=request.interests,
            goal=request.goal,
            reference=request.reference,
            hours_per_week=request.hoursPerWeek,
            preferred_difficulty=request.preferredDifficulty,
            preferred_timeframe=request.preferredTimeframe,
            deadline=request.deadline,
            custom_time_period=request.customTimePeriod,
            num_ideas=request.numIdeas
        )

        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])

        return JSONResponse(
            content={
                "response": result["response"],
                "status": "success",
                "message": "Project ideas generated successfully"
            },
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating project ideas: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/project-ideas/stream")
async def generate_project_ideas_stream(request: ProjectIdeasRequest):
    """Stream project ideas generation with progress updates.

    Args:
        request: Project ideas request with user profile

    Returns:
        Server-sent events stream with progress and results
    """
    async def generate():
        try:
            # Send initial status
            yield f"data: {json.dumps({'status': 'started', 'stage': 'Analyzing profile', 'progress': 0})}\n\n"
            await asyncio.sleep(0.1)

            # Progress stages
            stages = [
                {"stage": "Analyzing skills and interests", "progress": 15},
                {"stage": "Processing constraints", "progress": 30},
                {"stage": "Searching project domains", "progress": 45},
                {"stage": "Evaluating difficulty", "progress": 60},
                {"stage": "Generating ideas", "progress": 75},
                {"stage": "Finalizing recommendations", "progress": 90}
            ]

            # Send progress updates
            for stage_info in stages:
                yield f"data: {json.dumps({'status': 'processing', **stage_info})}\n\n"
                await asyncio.sleep(0.5)

            # Generate actual ideas
            result = await project_assistant_service.generate_project_ideas(
                skills=request.skills,
                interests=request.interests,
                goal=request.goal,
                reference=request.reference,
                hours_per_week=request.hoursPerWeek,
                preferred_difficulty=request.preferredDifficulty,
                preferred_timeframe=request.preferredTimeframe,
                deadline=request.deadline,
                custom_time_period=request.customTimePeriod,
                num_ideas=request.numIdeas
            )

            if "error" in result:
                yield f"data: {json.dumps({'status': 'error', 'error': result['error']})}\n\n"
            else:
                # Send completion with data
                yield f"data: {json.dumps({'status': 'completed', 'progress': 100, 'response': result['response']})}\n\n"

        except Exception as e:
            logger.error(f"Error in streaming project ideas: {e}")
            yield f"data: {json.dumps({'status': 'error', 'error': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


# DEPRECATED: Old endpoints removed - use /ai-api/project-roadmap/generate instead
# The following endpoints have been replaced by the new enhanced roadmap system:
# - /roadmap-steps
# - /roadmap-steps/stream
# - /curriculum-alignment
# - /project-checklist
