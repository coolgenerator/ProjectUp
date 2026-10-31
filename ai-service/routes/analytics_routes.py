"""
Analytics API Routes
Track user events and retrieve analytics metrics
"""

from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime
from sqlalchemy.orm import Session
import uuid

from core.database import get_session
from services.analytics_service import AnalyticsService
from models.database.user_event import EventType

router = APIRouter(prefix="/ai-api/analytics", tags=["analytics"])


# ============================================
# REQUEST MODELS
# ============================================


class TrackEventRequest(BaseModel):
    """Request to track a user event"""

    user_id: str
    event_type: str
    event_name: str
    project_id: Optional[str] = None
    session_id: Optional[str] = None
    node_id: Optional[str] = None
    task_id: Optional[str] = None
    properties: Optional[Dict[str, Any]] = None
    duration_seconds: Optional[int] = None


class TrackTaskViewRequest(BaseModel):
    """Request to track task view"""

    user_id: str
    task_id: str
    project_id: str


class TrackGuidanceViewRequest(BaseModel):
    """Request to track guidance view"""

    user_id: str
    task_id: str
    project_id: str
    steps_total: Optional[int] = None


class TrackGuidanceStepRequest(BaseModel):
    """Request to track guidance step completion"""

    user_id: str
    task_id: str
    project_id: str
    step_number: int


class SubmitFeedbackRequest(BaseModel):
    """Request to submit task feedback"""

    user_id: str
    task_id: str
    project_id: str
    rating: int  # 1-5
    was_helpful: bool
    comment: Optional[str] = None


# ============================================
# EVENT TRACKING ENDPOINTS
# ============================================


@router.post("/track-event")
async def track_event(request: TrackEventRequest, db: Session = Depends(get_session)):
    """
    Track a user event

    Track any user interaction for analytics purposes
    """
    try:
        analytics = AnalyticsService(db)

        # Convert string event type to enum
        try:
            event_type_enum = EventType(request.event_type)
        except ValueError:
            raise HTTPException(
                status_code=400, detail=f"Invalid event type: {request.event_type}"
            )

        event = analytics.track_event(
            user_id=uuid.UUID(request.user_id),
            event_type=event_type_enum,
            event_name=request.event_name,
            project_id=uuid.UUID(request.project_id) if request.project_id else None,
            session_id=request.session_id,
            node_id=uuid.UUID(request.node_id) if request.node_id else None,
            task_id=uuid.UUID(request.task_id) if request.task_id else None,
            properties=request.properties,
            duration_seconds=request.duration_seconds,
        )

        return {
            "success": True,
            "event_id": str(event.id),
            "is_first_time": event.is_first_time,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/track-task-view")
async def track_task_view(
    request: TrackTaskViewRequest, db: Session = Depends(get_session)
):
    """Track that a user viewed a task"""
    try:
        analytics = AnalyticsService(db)

        analytics.track_task_viewed(
            user_id=uuid.UUID(request.user_id),
            task_id=uuid.UUID(request.task_id),
            project_id=uuid.UUID(request.project_id),
        )

        return {"success": True}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/track-guidance-view")
async def track_guidance_view(
    request: TrackGuidanceViewRequest, db: Session = Depends(get_session)
):
    """Track that a user viewed task guidance"""
    try:
        analytics = AnalyticsService(db)

        analytics.track_guidance_viewed(
            user_id=uuid.UUID(request.user_id),
            task_id=uuid.UUID(request.task_id),
            project_id=uuid.UUID(request.project_id),
            steps_total=request.steps_total,
        )

        return {"success": True}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/track-guidance-step")
async def track_guidance_step(
    request: TrackGuidanceStepRequest, db: Session = Depends(get_session)
):
    """Track that a user completed a guidance step"""
    try:
        analytics = AnalyticsService(db)

        analytics.track_guidance_step_completed(
            user_id=uuid.UUID(request.user_id),
            task_id=uuid.UUID(request.task_id),
            project_id=uuid.UUID(request.project_id),
            step_number=request.step_number,
        )

        return {"success": True}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/submit-feedback")
async def submit_feedback(
    request: SubmitFeedbackRequest, db: Session = Depends(get_session)
):
    """Submit feedback for task guidance"""
    try:
        analytics = AnalyticsService(db)

        analytics.submit_task_feedback(
            user_id=uuid.UUID(request.user_id),
            task_id=uuid.UUID(request.task_id),
            project_id=uuid.UUID(request.project_id),
            rating=request.rating,
            was_helpful=request.was_helpful,
            comment=request.comment,
        )

        return {"success": True, "message": "Feedback submitted successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# METRICS RETRIEVAL ENDPOINTS
# ============================================


@router.get("/metrics/onboarding")
async def get_onboarding_metrics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_session),
):
    """
    Get Week 1 onboarding metrics

    Returns:
        - % users who send first chat message
        - % users who accept AI task suggestions
        - % users who return Day 2
    """
    try:
        analytics = AnalyticsService(db)

        start = datetime.fromisoformat(start_date) if start_date else None
        end = datetime.fromisoformat(end_date) if end_date else None

        metrics = analytics.get_onboarding_metrics(start_date=start, end_date=end)

        return {
            "success": True,
            "period": "Week 1 - Onboarding",
            "metrics": metrics,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics/engagement")
async def get_engagement_metrics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_session),
):
    """
    Get Month 1 engagement metrics

    Returns:
        - % tasks with guidance viewed
        - % guided tasks completed
        - Average time to complete tasks
    """
    try:
        analytics = AnalyticsService(db)

        start = datetime.fromisoformat(start_date) if start_date else None
        end = datetime.fromisoformat(end_date) if end_date else None

        metrics = analytics.get_engagement_metrics(start_date=start, end_date=end)

        return {
            "success": True,
            "period": "Month 1 - Engagement",
            "metrics": metrics,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics/retention")
async def get_retention_metrics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_session),
):
    """
    Get Month 3 retention metrics

    Returns:
        - Weekly active users
        - Tasks completed per user
        - User feedback ratings
    """
    try:
        analytics = AnalyticsService(db)

        start = datetime.fromisoformat(start_date) if start_date else None
        end = datetime.fromisoformat(end_date) if end_date else None

        metrics = analytics.get_retention_metrics(start_date=start, end_date=end)

        return {
            "success": True,
            "period": "Month 3 - Retention",
            "metrics": metrics,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics/dashboard")
async def get_dashboard_metrics(db: Session = Depends(get_session)):
    """
    Get all metrics for analytics dashboard

    Returns comprehensive metrics across all periods
    """
    try:
        analytics = AnalyticsService(db)

        # Get all metrics
        onboarding = analytics.get_onboarding_metrics()
        engagement = analytics.get_engagement_metrics()
        retention = analytics.get_retention_metrics()

        return {
            "success": True,
            "dashboard": {
                "onboarding": onboarding,
                "engagement": engagement,
                "retention": retention,
            },
            "generated_at": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user/{user_id}")
async def get_user_analytics(user_id: str, db: Session = Depends(get_session)):
    """Get analytics for a specific user"""
    try:
        analytics = AnalyticsService(db)

        user_analytics = analytics.get_user_analytics(uuid.UUID(user_id))

        return {"success": True, "user_analytics": user_analytics}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# BATCH EVENT TRACKING
# ============================================


class BatchEventRequest(BaseModel):
    """Request to track multiple events at once"""

    events: List[TrackEventRequest]


@router.post("/track-batch")
async def track_batch_events(
    request: BatchEventRequest, db: Session = Depends(get_session)
):
    """
    Track multiple events in a single request

    Useful for client-side batching to reduce API calls
    """
    try:
        analytics = AnalyticsService(db)
        results = []

        for event_req in request.events:
            try:
                event_type_enum = EventType(event_req.event_type)

                event = analytics.track_event(
                    user_id=uuid.UUID(event_req.user_id),
                    event_type=event_type_enum,
                    event_name=event_req.event_name,
                    project_id=(
                        uuid.UUID(event_req.project_id)
                        if event_req.project_id
                        else None
                    ),
                    session_id=event_req.session_id,
                    node_id=uuid.UUID(event_req.node_id) if event_req.node_id else None,
                    task_id=uuid.UUID(event_req.task_id) if event_req.task_id else None,
                    properties=event_req.properties,
                    duration_seconds=event_req.duration_seconds,
                )

                results.append(
                    {
                        "success": True,
                        "event_id": str(event.id),
                        "is_first_time": event.is_first_time,
                    }
                )

            except Exception as e:
                results.append({"success": False, "error": str(e)})

        return {"success": True, "results": results, "total": len(results)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
