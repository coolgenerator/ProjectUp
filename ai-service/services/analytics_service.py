"""
Analytics Service
Tracks user behavior, calculates metrics, and provides insights
"""

import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from sqlalchemy import func, and_, or_, case
from sqlalchemy.orm import Session
import uuid

from models.database.user_event import UserEvent, TaskInteraction, UserJourney, EventType

logger = logging.getLogger(__name__)


class AnalyticsService:
    """Service for tracking user events and calculating analytics metrics"""

    def __init__(self, db: Session):
        self.db = db

    # ============================================
    # EVENT TRACKING
    # ============================================

    def track_event(
        self,
        user_id: uuid.UUID,
        event_type: EventType,
        event_name: str,
        project_id: Optional[uuid.UUID] = None,
        session_id: Optional[str] = None,
        node_id: Optional[uuid.UUID] = None,
        task_id: Optional[uuid.UUID] = None,
        properties: Optional[Dict[str, Any]] = None,
        duration_seconds: Optional[int] = None,
    ) -> UserEvent:
        """
        Track a user event

        Args:
            user_id: User ID
            event_type: Type of event (from EventType enum)
            event_name: Human-readable event name
            project_id: Optional project context
            session_id: Optional session ID
            node_id: Optional node context
            task_id: Optional task context
            properties: Optional event metadata
            duration_seconds: Optional duration for timed events

        Returns:
            Created UserEvent
        """
        try:
            # Check if this is first time for this event type
            is_first_time = self._is_first_event(user_id, event_type)

            # Create event
            event = UserEvent(
                user_id=user_id,
                project_id=project_id,
                event_type=event_type,
                event_name=event_name,
                session_id=session_id,
                node_id=node_id,
                task_id=task_id,
                properties=properties or {},
                duration_seconds=duration_seconds,
                is_first_time=is_first_time,
                timestamp=datetime.utcnow(),
            )

            self.db.add(event)
            self.db.commit()
            self.db.refresh(event)

            # Update user journey
            self._update_user_journey(user_id, event_type, event.timestamp)

            logger.info(f"Tracked event: {event_type.value} for user {user_id}")
            return event

        except Exception as e:
            logger.error(f"Error tracking event: {e}")
            self.db.rollback()
            raise

    def _is_first_event(self, user_id: uuid.UUID, event_type: EventType) -> bool:
        """Check if this is the first time user has triggered this event"""
        count = (
            self.db.query(UserEvent)
            .filter(UserEvent.user_id == user_id, UserEvent.event_type == event_type)
            .count()
        )
        return count == 0

    def _update_user_journey(
        self, user_id: uuid.UUID, event_type: EventType, timestamp: datetime
    ):
        """Update user journey milestones based on event"""
        try:
            # Get or create journey
            journey = (
                self.db.query(UserJourney)
                .filter(UserJourney.user_id == user_id)
                .first()
            )

            if not journey:
                journey = UserJourney(
                    user_id=user_id, signed_up_at=timestamp, last_active_at=timestamp
                )
                self.db.add(journey)
            else:
                journey.last_active_at = timestamp

            # Update milestones based on event type
            if event_type == EventType.FIRST_PROJECT_CREATED and not journey.first_project_at:
                journey.first_project_at = timestamp
                journey.total_projects_created += 1

            elif event_type == EventType.FIRST_NODE_CREATED and not journey.first_node_at:
                journey.first_node_at = timestamp
                journey.total_nodes_created += 1

            elif event_type == EventType.FIRST_CHAT_MESSAGE and not journey.first_chat_at:
                journey.first_chat_at = timestamp
                journey.total_chat_messages += 1

            elif event_type == EventType.FIRST_TASK_ACCEPTED and not journey.first_task_accepted_at:
                journey.first_task_accepted_at = timestamp

            elif event_type == EventType.TASK_COMPLETED and not journey.first_task_completed_at:
                journey.first_task_completed_at = timestamp
                journey.total_tasks_completed += 1

            elif event_type == EventType.TASK_GUIDANCE_VIEWED:
                journey.total_guidance_viewed += 1

            elif event_type == EventType.CHAT_MESSAGE_SENT:
                journey.total_chat_messages += 1

            elif event_type == EventType.NODE_CREATED:
                journey.total_nodes_created += 1

            elif event_type == EventType.TASK_CREATED:
                journey.total_tasks_created += 1

            elif event_type == EventType.SESSION_STARTED:
                journey.total_sessions += 1

            # Check return dates
            if journey.signed_up_at:
                days_since_signup = (timestamp - journey.signed_up_at).days
                if days_since_signup >= 2 and not journey.day_2_returned:
                    journey.day_2_returned = True
                if days_since_signup >= 7 and not journey.day_7_returned:
                    journey.day_7_returned = True
                if days_since_signup >= 30 and not journey.day_30_returned:
                    journey.day_30_returned = True

            # Check if user is activated (completed key onboarding steps)
            if not journey.is_activated:
                if (
                    journey.first_chat_at
                    and journey.first_task_accepted_at
                    and journey.total_chat_messages >= 3
                ):
                    journey.is_activated = True
                    journey.activated_at = timestamp

            self.db.commit()

        except Exception as e:
            logger.error(f"Error updating user journey: {e}")
            self.db.rollback()

    # ============================================
    # TASK INTERACTION TRACKING
    # ============================================

    def track_task_viewed(
        self, user_id: uuid.UUID, task_id: uuid.UUID, project_id: uuid.UUID
    ):
        """Track that a user viewed a task"""
        interaction = self._get_or_create_task_interaction(
            user_id, task_id, project_id
        )

        interaction.view_count += 1
        if not interaction.first_viewed_at:
            interaction.first_viewed_at = datetime.utcnow()

        self.db.commit()

        # Also track as event
        self.track_event(
            user_id=user_id,
            event_type=EventType.TASK_VIEWED,
            event_name="Task Viewed",
            project_id=project_id,
            task_id=task_id,
        )

    def track_guidance_viewed(
        self,
        user_id: uuid.UUID,
        task_id: uuid.UUID,
        project_id: uuid.UUID,
        steps_total: Optional[int] = None,
    ):
        """Track that a user viewed task guidance"""
        interaction = self._get_or_create_task_interaction(
            user_id, task_id, project_id
        )

        interaction.guidance_view_count += 1
        if not interaction.guidance_first_viewed_at:
            interaction.guidance_first_viewed_at = datetime.utcnow()
        if steps_total:
            interaction.guidance_steps_total = steps_total

        self.db.commit()

        # Also track as event
        self.track_event(
            user_id=user_id,
            event_type=EventType.TASK_GUIDANCE_VIEWED,
            event_name="Task Guidance Viewed",
            project_id=project_id,
            task_id=task_id,
            properties={"steps_total": steps_total},
        )

    def track_guidance_step_completed(
        self, user_id: uuid.UUID, task_id: uuid.UUID, project_id: uuid.UUID, step_number: int
    ):
        """Track that a user completed a guidance step"""
        interaction = self._get_or_create_task_interaction(
            user_id, task_id, project_id
        )

        interaction.guidance_steps_completed = max(
            interaction.guidance_steps_completed, step_number
        )

        self.db.commit()

        # Also track as event
        self.track_event(
            user_id=user_id,
            event_type=EventType.TASK_GUIDANCE_STEP_COMPLETED,
            event_name="Guidance Step Completed",
            project_id=project_id,
            task_id=task_id,
            properties={"step_number": step_number},
        )

    def track_task_completed(
        self, user_id: uuid.UUID, task_id: uuid.UUID, project_id: uuid.UUID
    ):
        """Track that a user completed a task"""
        interaction = self._get_or_create_task_interaction(
            user_id, task_id, project_id
        )

        interaction.completed_at = datetime.utcnow()
        interaction.completion_status = "completed"

        self.db.commit()

        # Also track as event
        self.track_event(
            user_id=user_id,
            event_type=EventType.TASK_COMPLETED,
            event_name="Task Completed",
            project_id=project_id,
            task_id=task_id,
        )

    def submit_task_feedback(
        self,
        user_id: uuid.UUID,
        task_id: uuid.UUID,
        project_id: uuid.UUID,
        rating: int,
        was_helpful: bool,
        comment: Optional[str] = None,
    ):
        """Submit feedback for task guidance"""
        interaction = self._get_or_create_task_interaction(
            user_id, task_id, project_id
        )

        interaction.feedback_submitted = True
        interaction.feedback_rating = rating
        interaction.feedback_was_helpful = was_helpful
        interaction.feedback_comment = comment
        interaction.feedback_timestamp = datetime.utcnow()

        self.db.commit()

        # Also track as event
        self.track_event(
            user_id=user_id,
            event_type=EventType.TASK_FEEDBACK_SUBMITTED,
            event_name="Task Feedback Submitted",
            project_id=project_id,
            task_id=task_id,
            properties={
                "rating": rating,
                "was_helpful": was_helpful,
                "has_comment": bool(comment),
            },
        )

    def _get_or_create_task_interaction(
        self, user_id: uuid.UUID, task_id: uuid.UUID, project_id: uuid.UUID
    ) -> TaskInteraction:
        """Get existing or create new task interaction"""
        interaction = (
            self.db.query(TaskInteraction)
            .filter(
                TaskInteraction.user_id == user_id,
                TaskInteraction.task_id == task_id,
            )
            .first()
        )

        if not interaction:
            interaction = TaskInteraction(
                user_id=user_id, task_id=task_id, project_id=project_id
            )
            self.db.add(interaction)
            self.db.commit()
            self.db.refresh(interaction)

        return interaction

    # ============================================
    # METRICS CALCULATION
    # ============================================

    def get_onboarding_metrics(
        self, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Get Week 1 onboarding metrics

        Returns:
            - % users who send first chat message
            - % users who accept AI task suggestions
            - % users who return Day 2
        """
        query = self.db.query(UserJourney)

        if start_date:
            query = query.filter(UserJourney.signed_up_at >= start_date)
        if end_date:
            query = query.filter(UserJourney.signed_up_at <= end_date)

        journeys = query.all()
        total_users = len(journeys)

        if total_users == 0:
            return {
                "total_users": 0,
                "first_chat_message_rate": 0,
                "task_acceptance_rate": 0,
                "day_2_return_rate": 0,
            }

        users_with_chat = sum(1 for j in journeys if j.first_chat_at)
        users_with_task = sum(1 for j in journeys if j.first_task_accepted_at)
        users_returned_day_2 = sum(1 for j in journeys if j.day_2_returned)

        return {
            "total_users": total_users,
            "first_chat_message_rate": round(
                (users_with_chat / total_users) * 100, 2
            ),
            "task_acceptance_rate": round((users_with_task / total_users) * 100, 2),
            "day_2_return_rate": round((users_returned_day_2 / total_users) * 100, 2),
            "users_with_chat": users_with_chat,
            "users_with_task": users_with_task,
            "users_returned_day_2": users_returned_day_2,
        }

    def get_engagement_metrics(
        self, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Get Month 1 engagement metrics

        Returns:
            - % tasks with guidance viewed
            - % guided tasks completed
            - Average time to complete tasks
        """
        query = self.db.query(TaskInteraction)

        if start_date:
            query = query.filter(TaskInteraction.created_at >= start_date)
        if end_date:
            query = query.filter(TaskInteraction.created_at <= end_date)

        interactions = query.all()
        total_tasks = len(interactions)

        if total_tasks == 0:
            return {
                "total_tasks": 0,
                "guidance_view_rate": 0,
                "guided_completion_rate": 0,
                "avg_time_to_complete_seconds": 0,
            }

        tasks_with_guidance = sum(
            1 for i in interactions if i.guidance_view_count > 0
        )
        guided_tasks_completed = sum(
            1 for i in interactions if i.guidance_view_count > 0 and i.completed_at
        )

        # Calculate average time to completion
        completed_tasks = [i for i in interactions if i.completed_at]
        if completed_tasks:
            avg_time = sum(
                (i.completed_at - i.created_at).total_seconds()
                for i in completed_tasks
            ) / len(completed_tasks)
        else:
            avg_time = 0

        return {
            "total_tasks": total_tasks,
            "guidance_view_rate": round((tasks_with_guidance / total_tasks) * 100, 2),
            "guided_completion_rate": round(
                (guided_tasks_completed / tasks_with_guidance * 100)
                if tasks_with_guidance > 0
                else 0,
                2,
            ),
            "avg_time_to_complete_seconds": round(avg_time, 2),
            "avg_time_to_complete_hours": round(avg_time / 3600, 2),
            "tasks_with_guidance": tasks_with_guidance,
            "guided_tasks_completed": guided_tasks_completed,
            "total_completed": len(completed_tasks),
        }

    def get_retention_metrics(
        self, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Get Month 3 retention metrics

        Returns:
            - Weekly active users
            - Tasks completed per user
            - Average feedback rating
        """
        # Weekly active users (last 7 days)
        week_ago = datetime.utcnow() - timedelta(days=7)
        weekly_active = (
            self.db.query(UserJourney)
            .filter(UserJourney.last_active_at >= week_ago)
            .count()
        )

        # Tasks completed per user
        query = self.db.query(UserJourney)
        if start_date:
            query = query.filter(UserJourney.signed_up_at >= start_date)
        if end_date:
            query = query.filter(UserJourney.signed_up_at <= end_date)

        journeys = query.all()
        total_users = len(journeys)

        if total_users == 0:
            return {
                "weekly_active_users": weekly_active,
                "tasks_per_user": 0,
                "avg_feedback_rating": 0,
                "feedback_helpful_rate": 0,
            }

        total_tasks_completed = sum(j.total_tasks_completed for j in journeys)
        tasks_per_user = total_tasks_completed / total_users

        # Average feedback rating
        feedback_query = self.db.query(TaskInteraction).filter(
            TaskInteraction.feedback_submitted == True
        )
        if start_date:
            feedback_query = feedback_query.filter(
                TaskInteraction.created_at >= start_date
            )
        if end_date:
            feedback_query = feedback_query.filter(
                TaskInteraction.created_at <= end_date
            )

        feedbacks = feedback_query.all()
        if feedbacks:
            avg_rating = sum(f.feedback_rating for f in feedbacks if f.feedback_rating) / len(
                [f for f in feedbacks if f.feedback_rating]
            )
            helpful_count = sum(1 for f in feedbacks if f.feedback_was_helpful)
            helpful_rate = (helpful_count / len(feedbacks)) * 100
        else:
            avg_rating = 0
            helpful_rate = 0

        return {
            "weekly_active_users": weekly_active,
            "total_users": total_users,
            "tasks_per_user": round(tasks_per_user, 2),
            "total_tasks_completed": total_tasks_completed,
            "avg_feedback_rating": round(avg_rating, 2),
            "feedback_helpful_rate": round(helpful_rate, 2),
            "total_feedback_count": len(feedbacks),
        }

    def get_user_analytics(self, user_id: uuid.UUID) -> Dict[str, Any]:
        """Get comprehensive analytics for a specific user"""
        journey = (
            self.db.query(UserJourney)
            .filter(UserJourney.user_id == user_id)
            .first()
        )

        if not journey:
            return {"user_id": str(user_id), "journey_found": False}

        return {
            "user_id": str(user_id),
            "journey_found": True,
            "journey": journey.to_dict(),
            "is_activated": journey.is_activated,
            "total_sessions": journey.total_sessions,
            "total_tasks_completed": journey.total_tasks_completed,
            "total_guidance_viewed": journey.total_guidance_viewed,
            "day_2_returned": journey.day_2_returned,
            "day_7_returned": journey.day_7_returned,
            "day_30_returned": journey.day_30_returned,
        }
