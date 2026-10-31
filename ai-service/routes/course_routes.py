"""
Course Routes

API endpoints for managing courses.
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
import asyncio
import json
import logging

from models.requests.course_requests import CourseGenerationRequest
from models.responses.course_responses import (
    CourseListResponse,
    CourseDeleteResponse,
    CourseItemResponse,
    CourseGenerationResponse,
    CourseStatusResponse
)
from models.database.course_models import CourseRequest, CourseGenerationProgress
from services.course.course_persistence_service import CoursePersistenceService
from services.course.course_generation_service import CourseGenerationService
from services.course.course_content_service import CourseContentService
from services.course.user_progress_service import UserProgressService
from database.session import get_db_session

# Initialize logger
logger = logging.getLogger(__name__)

# Initialize services
course_service = CoursePersistenceService()
generation_service = CourseGenerationService()
content_service = CourseContentService()
progress_service = UserProgressService()

# Course routes
router = APIRouter(
    prefix="/ai-api/courses",
    tags=["courses"]
)


@router.post("/generate", response_model=CourseGenerationResponse)
async def generate_course(
    request: CourseGenerationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db_session)
):
    """
    Generate a new course.

    This endpoint initiates course generation and returns immediately with a request_id.
    The actual generation happens asynchronously via the service layer and workflow.

    Use the returned request_id to check status via GET /courses/{request_id}/status
    or connect to the WebSocket endpoint for real-time updates.
    """
    try:
        # Start course generation via service
        # The service will create the DB record, initialize the workflow, and return
        result = await generation_service.start_course_generation(
            db=db,
            user_id=request.user_id,
            topic=request.topic,
            goals=request.goals,
            user_experience=request.user_experience,
            user_skills=request.user_skills,
            interests=request.interests,
            preferences=request.preferences,
            estimated_weeks=request.estimated_weeks,
            time_commitment=request.time_commitment,
            difficulty=request.difficulty,
            preferred_learning_style=request.preferred_learning_style
        )

        return CourseGenerationResponse(**result)

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to start course generation: {str(e)}")


@router.get("/list", response_model=CourseListResponse)
async def list_courses(user_id: str, db: Session = Depends(get_db_session)):
    """Get list of courses for a user."""
    try:
        # Fetch courses from database
        courses_data = course_service.get_courses_by_user(db, user_id)

        # Convert to response models with title field
        courses = []
        for course in courses_data:
            # Generate a description from the preferences or use a default
            description = "AI-generated learning path"
            if course.preferences and isinstance(course.preferences, dict):
                if 'course_description' in course.preferences:
                    description = course.preferences['course_description']
                elif 'description' in course.preferences:
                    description = course.preferences['description']

            course_dict = {
                "id": str(course.id),
                "request_id": str(course.id),  # Same as id
                "user_id": str(course.user_id),
                "topic": course.topic,
                "title": course.topic,  # Add title field for frontend
                "description": description,
                "status": course.status,
                "created_at": course.created_at,
                "updated_at": course.updated_at,
                "difficulty": course.difficulty,
                "estimated_weeks": course.estimated_weeks,
                "duration_weeks": course.estimated_weeks,  # Alias for estimated_weeks
                "error_message": course.error_message
            }
            courses.append(CourseItemResponse(**course_dict))

        return CourseListResponse(
            courses=courses,
            total=len(courses),
            user_id=user_id
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch courses: {str(e)}")


@router.get("/{course_id}")
async def get_course(
    course_id: str,
    db: Session = Depends(get_db_session)
):
    """
    Get course metadata by ID.

    Returns basic course information without full content.
    """
    try:
        from uuid import UUID

        # Ensure course_id is UUID type
        course_uuid = UUID(course_id) if isinstance(course_id, str) else course_id

        # Get course from database
        course = db.query(CourseRequest).filter(
            CourseRequest.id == course_uuid
        ).first()

        if not course:
            raise HTTPException(status_code=404, detail="Course not found")

        # Return course metadata
        return {
            "id": str(course.id),
            "user_id": str(course.user_id),
            "topic": course.topic,
            "title": course.topic,
            "description": course.preferences.get('course_description', 'AI-generated learning path') if course.preferences else 'AI-generated learning path',
            "status": course.status,
            "difficulty": course.difficulty,
            "estimated_weeks": course.estimated_weeks,
            "duration_weeks": course.estimated_weeks,
            "time_commitment": course.time_commitment,
            "created_at": course.created_at.isoformat() if course.created_at else None,
            "updated_at": course.updated_at.isoformat() if course.updated_at else None,
            "completed_at": course.completed_at.isoformat() if course.completed_at else None,
            "error_message": course.error_message,
            "request_id": str(course.id)
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to get course: {str(e)}")


@router.get("/{request_id}/status", response_model=CourseStatusResponse)
async def get_course_generation_status(
    request_id: str,
    db: Session = Depends(get_db_session)
):
    """
    Get the status of a course generation request.

    Returns current status, progress, and any error messages.
    """
    try:
        result = await generation_service.get_course_generation_status(db, request_id)

        if result.get("status") == "not_found":
            raise HTTPException(status_code=404, detail="Course generation request not found")

        return CourseStatusResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to get course status: {str(e)}")


@router.get("/{request_id}/content")
async def get_course_content(
    request_id: str,
    db: Session = Depends(get_db_session)
):
    """
    Get the complete course content with structured sections.

    Returns the course metadata, sections, resources, and full generated content.
    This endpoint provides the data in a structured format suitable for frontend display.
    """
    try:
        course_data = content_service.get_course_with_sections(db, request_id)

        if not course_data:
            raise HTTPException(status_code=404, detail="Course not found")

        return course_data

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to get course content: {str(e)}")


@router.post("/{course_id}/start")
async def start_course(
    course_id: str,
    user_id: str,
    db: Session = Depends(get_db_session)
):
    """
    Mark a course as started by the user.

    This endpoint is called when a user first opens/starts a course.
    It creates a progress tracking record and sets the status to IN_PROGRESS.
    """
    try:
        progress = progress_service.start_course(db, user_id, course_id)
        return progress

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to start course: {str(e)}")


@router.get("/{course_id}/progress")
async def get_course_progress(
    course_id: str,
    user_id: str,
    db: Session = Depends(get_db_session)
):
    """
    Get user's progress on a specific course.

    Returns learning status, progress percentage, completed sections, time spent, etc.
    """
    try:
        progress = progress_service.get_user_progress(db, user_id, course_id)
        logger.info(f"Returning progress for user {user_id}, course {course_id}: {progress.get('progress_percentage')}%, task_completion_map has {len(progress.get('task_completion_map', {}))} entries")
        return progress

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to get progress: {str(e)}")


@router.put("/{course_id}/progress")
async def update_course_progress(
    course_id: str,
    user_id: str,
    current_section_id: int = None,
    completed_section_id: int = None,
    time_spent: int = None,
    db: Session = Depends(get_db_session)
):
    """
    Update user's progress on a course.

    Query Parameters:
    - current_section_id: ID of the section user is currently viewing
    - completed_section_id: ID of a section just completed
    - time_spent: Additional minutes spent studying (incremental)
    """
    try:
        progress = progress_service.update_progress(
            db=db,
            user_id=user_id,
            course_id=course_id,
            current_section_id=current_section_id,
            completed_section_id=completed_section_id,
            time_spent=time_spent
        )
        return progress

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to update progress: {str(e)}")


@router.post("/{course_id}/regenerate", response_model=CourseGenerationResponse)
async def regenerate_course(
    course_id: str,
    db: Session = Depends(get_db_session)
):
    """
    Regenerate a failed course.

    This endpoint restarts the generation process for a course that failed.
    """
    try:
        # Get the existing course request
        course = course_service.get_course_by_request_id(db, course_id)

        if not course:
            raise HTTPException(status_code=404, detail="Course not found")

        # Only allow regeneration for failed courses
        if course.status != 'FAILED':
            raise HTTPException(
                status_code=400,
                detail=f"Can only regenerate failed courses. Current status: {course.status}"
            )

        # Reset the course status and clear error message
        course.status = 'PENDING'
        course.error_message = None
        course.updated_at = datetime.utcnow()
        db.commit()

        # Start course generation again with the same parameters
        result = await generation_service.start_course_generation(
            db=db,
            user_id=course.user_id,
            topic=course.topic,
            goals=course.goals,
            user_experience=course.user_experience,
            user_skills=course.user_skills,
            interests=course.interests,
            preferences=course.preferences,
            estimated_weeks=course.estimated_weeks,
            time_commitment=course.time_commitment,
            difficulty=course.difficulty,
            preferred_learning_style=course.preferred_learning_style
        )

        # Delete the old course request since we created a new one
        db.delete(course)
        db.commit()

        return CourseGenerationResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to regenerate course: {str(e)}")


@router.delete("/{course_id}", response_model=CourseDeleteResponse)
async def delete_course(course_id: str, db: Session = Depends(get_db_session)):
    """Delete a course by ID."""
    try:
        success = course_service.delete_course(db, course_id)

        if success:
            return CourseDeleteResponse(
                status="deleted",
                course_id=course_id
            )
        else:
            raise HTTPException(status_code=404, detail="Course not found")

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to delete course: {str(e)}")


@router.websocket("/ws/{request_id}")
async def course_generation_websocket(
    websocket: WebSocket,
    request_id: str
):
    """
    WebSocket endpoint for real-time course generation updates.

    Connects to a course generation session and streams progress updates.
    """
    await websocket.accept()

    try:
        # Get a database session
        db = next(get_db_session())

        # Check if course exists
        course = course_service.get_course_by_request_id(db, request_id)
        if not course:
            await websocket.send_json({
                "error": "Course not found",
                "request_id": request_id
            })
            await websocket.close(code=1008, reason="Course not found")
            return

        # Send initial connection message
        await websocket.send_json({
            "message": "Connected to course generation",
            "request_id": request_id,
            "status": course.status,
            "timestamp": datetime.utcnow().isoformat()
        })

        # Track which progress updates we've already sent
        last_progress_id = 0

        while True:
            # Re-query course data to get fresh status
            course = db.query(CourseRequest).filter(
                CourseRequest.id == request_id
            ).first()

            if not course:
                await websocket.send_json({
                    "error": "Course no longer exists",
                    "request_id": request_id
                })
                break

            # Get new progress updates from database
            new_progress_updates = db.query(CourseGenerationProgress).filter(
                CourseGenerationProgress.request_id == request_id,
                CourseGenerationProgress.id > last_progress_id
            ).order_by(CourseGenerationProgress.id).all()

            # Send each new progress update
            for update in new_progress_updates:
                await websocket.send_json({
                    "message": update.message,
                    "task_name": update.task_name,
                    "progress": update.progress_percentage,
                    "status": course.status,
                    "timestamp": update.created_at.isoformat()
                })
                last_progress_id = update.id

            # Check if course is complete or failed
            if course.status == 'COMPLETED':
                await websocket.send_json({
                    "message": "✅ Course generation completed!",
                    "progress": 100,
                    "status": course.status,
                    "task_name": "completed",
                    "timestamp": datetime.utcnow().isoformat()
                })
                break

            elif course.status == 'FAILED':
                await websocket.send_json({
                    "message": f"❌ Course generation failed: {course.error_message or 'Unknown error'}",
                    "progress": 0,
                    "status": course.status,
                    "error": course.error_message,
                    "timestamp": datetime.utcnow().isoformat()
                })
                break

            # Wait before next poll
            await asyncio.sleep(1)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        import traceback
        traceback.print_exc()
        try:
            await websocket.send_json({
                "error": f"WebSocket error: {str(e)}",
                "timestamp": datetime.utcnow().isoformat()
            })
        except:
            pass
    finally:
        try:
            await websocket.close()
        except:
            pass


@router.get("/sse/{request_id}")
async def course_generation_sse(
    request: Request,
    request_id: str
):
    """
    SSE (Server-Sent Events) endpoint for real-time course generation updates.

    More efficient than WebSocket for one-way streaming.
    Better HTTP compatibility and auto-reconnection.

    Usage:
    ```js
    const eventSource = new EventSource('/ai-api/courses/sse/REQUEST_ID');
    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log(data.message, data.progress);
    };
    ```
    """
    async def event_stream():
        db = next(get_db_session())

        try:
            # Check if course exists
            course = course_service.get_course_by_request_id(db, request_id)
            if not course:
                yield f"data: {json.dumps({'error': 'Course not found'})}\n\n"
                return

            # Send initial connection message
            yield f"data: {json.dumps({'message': 'Connected to course generation', 'request_id': request_id, 'status': course.status})}\n\n"

            # Track sent progress
            last_progress_id = 0

            while True:
                # Check if client disconnected
                if await request.is_disconnected():
                    break

                # Re-query course
                course = db.query(CourseRequest).filter(
                    CourseRequest.id == request_id
                ).first()

                if not course:
                    yield f"data: {json.dumps({'error': 'Course no longer exists'})}\n\n"
                    break

                # Get new progress updates
                new_updates = db.query(CourseGenerationProgress).filter(
                    CourseGenerationProgress.request_id == request_id,
                    CourseGenerationProgress.id > last_progress_id
                ).order_by(CourseGenerationProgress.id).all()

                # Send each update
                for update in new_updates:
                    data = {
                        'message': update.message,
                        'task_name': update.task_name,
                        'progress': update.progress_percentage,
                        'status': course.status,
                        'timestamp': update.created_at.isoformat()
                    }
                    yield f"data: {json.dumps(data)}\n\n"
                    last_progress_id = update.id

                # Check completion
                if course.status == 'COMPLETED':
                    yield f"data: {json.dumps({'message': '✅ Course generation completed!', 'progress': 100, 'status': 'COMPLETED', 'task_name': 'completed'})}\n\n"
                    break

                elif course.status == 'FAILED':
                    yield f"data: {json.dumps({'message': f'❌ Generation failed: {course.error_message}', 'progress': 0, 'status': 'FAILED', 'error': course.error_message})}\n\n"
                    break

                # Wait before next poll
                await asyncio.sleep(1)

        except Exception as e:
            import traceback
            traceback.print_exc()
            yield f"data: {json.dumps({'error': f'SSE error: {str(e)}'})}\n\n"
        finally:
            db.close()

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
            "Connection": "keep-alive"
        }
    )


@router.get("/debug/tasks/{course_id}")
async def debug_task_completions(
    course_id: str,
    user_id: str,
    db: Session = Depends(get_db_session)
):
    """
    Debug endpoint to check task completions in database.
    """
    try:
        task_completions = progress_service.get_user_task_completions(db, user_id, course_id)
        return {
            'user_id': user_id,
            'course_id': course_id,
            'task_completion_map': task_completions,
            'total_tasks': len(task_completions),
            'completed_tasks': sum(task_completions.values())
        }
    except Exception as e:
        logger.error(f"Error getting task completions: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get task completions: {str(e)}")


@router.post("/tasks/{task_id}/toggle")
async def toggle_task_completion(
    task_id: int,
    user_id: str,
    course_id: str,
    db: Session = Depends(get_db_session)
):
    """
    Toggle task completion status for a user.
    
    Args:
        task_id: Task/section ID
        user_id: User ID
        course_id: Course UUID
        
    Returns:
        Updated task completion status and overall progress
    """
    try:
        # Toggle task completion
        task_result = progress_service.toggle_task_completion(db, user_id, course_id, task_id)
        
        # Get updated progress
        progress = progress_service.get_user_progress(db, user_id, course_id)
        
        return {
            'task': task_result,
            'progress': progress
        }
    except Exception as e:
        logger.error(f"Error toggling task: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to toggle task: {str(e)}")
