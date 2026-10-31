"""
User Progress Service

Handles tracking user's learning progress on courses.
"""

import logging
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from datetime import datetime

from models.database.course_models import UserCourseProgress, CourseRequest, CourseSection, UserTaskCompletion

logger = logging.getLogger(__name__)


class UserProgressService:
    """Service for managing user learning progress."""

    def get_or_create_progress(
        self,
        db: Session,
        user_id: str,
        course_id: str
    ) -> UserCourseProgress:
        """
        Get existing progress record or create a new one.

        Args:
            db: Database session
            user_id: User ID
            course_id: Course ID

        Returns:
            UserCourseProgress instance
        """
        try:
            # Check if progress exists
            progress = db.query(UserCourseProgress).filter(
                UserCourseProgress.user_id == user_id,
                UserCourseProgress.course_id == course_id
            ).first()

            if not progress:
                # Create new progress record
                progress = UserCourseProgress(
                    user_id=user_id,
                    course_id=course_id,
                    learning_status='NOT_STARTED',
                    progress_percentage=0,
                    total_time_spent=0,
                    completed_sections=[],
                    created_at=datetime.utcnow()
                )
                db.add(progress)
                db.commit()
                db.refresh(progress)
                logger.info(f"Created new progress record for user {user_id} on course {course_id}")

            return progress

        except Exception as e:
            logger.error(f"Error getting/creating progress: {e}", exc_info=True)
            db.rollback()
            raise

    def start_course(
        self,
        db: Session,
        user_id: str,
        course_id: str
    ) -> Dict[str, Any]:
        """
        Mark course as started by the user.

        Args:
            db: Database session
            user_id: User ID
            course_id: Course ID

        Returns:
            Updated progress data
        """
        try:
            progress = self.get_or_create_progress(db, user_id, course_id)

            # Update status to IN_PROGRESS
            if progress.learning_status == 'NOT_STARTED':
                progress.learning_status = 'IN_PROGRESS'
                progress.started_at = datetime.utcnow()

            progress.last_accessed_at = datetime.utcnow()
            progress.updated_at = datetime.utcnow()

            db.commit()
            db.refresh(progress)

            logger.info(f"User {user_id} started course {course_id}")

            return self._format_progress(progress)

        except Exception as e:
            logger.error(f"Error starting course: {e}", exc_info=True)
            db.rollback()
            raise

    def update_progress(
        self,
        db: Session,
        user_id: str,
        course_id: str,
        current_section_id: Optional[int] = None,
        completed_section_id: Optional[int] = None,
        time_spent: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Update user's progress on a course.

        Args:
            db: Database session
            user_id: User ID
            course_id: Course ID
            current_section_id: ID of current section being studied
            completed_section_id: ID of section just completed
            time_spent: Additional minutes spent

        Returns:
            Updated progress data
        """
        try:
            progress = self.get_or_create_progress(db, user_id, course_id)

            # Update current section
            if current_section_id is not None:
                progress.current_section_id = current_section_id

            # Mark section as completed
            if completed_section_id is not None:
                completed = progress.completed_sections or []
                if completed_section_id not in completed:
                    completed.append(completed_section_id)
                    progress.completed_sections = completed

            # Update time spent
            if time_spent is not None:
                progress.total_time_spent = (progress.total_time_spent or 0) + time_spent

            # Calculate progress percentage
            total_sections = db.query(CourseSection).filter(
                CourseSection.course_id == course_id
            ).count()

            if total_sections > 0:
                completed_count = len(progress.completed_sections or [])
                progress.progress_percentage = int((completed_count / total_sections) * 100)

                # Mark as completed if all sections are done
                if completed_count >= total_sections and progress.learning_status != 'COMPLETED':
                    progress.learning_status = 'COMPLETED'
                    progress.completed_at = datetime.utcnow()
                elif progress.learning_status == 'NOT_STARTED':
                    progress.learning_status = 'IN_PROGRESS'
                    progress.started_at = datetime.utcnow()

            progress.last_accessed_at = datetime.utcnow()
            progress.updated_at = datetime.utcnow()

            db.commit()
            db.refresh(progress)

            logger.info(f"Updated progress for user {user_id} on course {course_id}: {progress.progress_percentage}%")

            return self._format_progress(progress)

        except Exception as e:
            logger.error(f"Error updating progress: {e}", exc_info=True)
            db.rollback()
            raise

    def get_user_progress(
        self,
        db: Session,
        user_id: str,
        course_id: str
    ) -> Dict[str, Any]:
        """
        Get user's progress on a course.

        Args:
            db: Database session
            user_id: User ID
            course_id: Course ID

        Returns:
            Progress data including task completion map
        """
        try:
            progress = db.query(UserCourseProgress).filter(
                UserCourseProgress.user_id == user_id,
                UserCourseProgress.course_id == course_id
            ).first()

            # Get task completions
            task_completion_map = self.get_user_task_completions(db, user_id, course_id)
            logger.info(f"Fetched task completions for course {course_id}: {len(task_completion_map)} tasks, {sum(task_completion_map.values())} completed")

            if not progress:
                # Return default progress
                return {
                    'user_id': user_id,
                    'course_id': course_id,
                    'learning_status': 'NOT_STARTED',
                    'progress_percentage': 0,
                    'total_time_spent': 0,
                    'completed_sections': [],
                    'current_section_id': None,
                    'task_completion_map': task_completion_map
                }

            progress_data = self._format_progress(progress)
            progress_data['task_completion_map'] = task_completion_map
            return progress_data

        except Exception as e:
            logger.error(f"Error getting progress: {e}", exc_info=True)
            raise

    def toggle_task_completion(
        self,
        db: Session,
        user_id: str,
        course_id: str,
        task_id: int
    ) -> Dict[str, Any]:
        """
        Toggle task completion status and recalculate progress.

        Args:
            db: Database session
            user_id: User ID
            course_id: Course ID
            task_id: Task/section ID

        Returns:
            Updated task completion and progress data
        """
        try:
            # First, verify that the task/section exists in the database
            section = db.query(CourseSection).filter(
                CourseSection.id == task_id,
                CourseSection.course_id == course_id
            ).first()

            if not section:
                error_msg = f"Task/section {task_id} not found in course {course_id}. The task may have been deleted or the course was regenerated."
                logger.error(error_msg)
                raise ValueError(error_msg)

            # Get or create task completion record
            task_completion = db.query(UserTaskCompletion).filter(
                UserTaskCompletion.user_id == user_id,
                UserTaskCompletion.course_id == course_id,
                UserTaskCompletion.task_id == task_id
            ).first()

            if not task_completion:
                # Create new task completion record
                task_completion = UserTaskCompletion(
                    user_id=user_id,
                    course_id=course_id,
                    task_id=task_id,
                    completed=True,
                    completed_at=datetime.utcnow()
                )
                db.add(task_completion)
            else:
                # Toggle completion status
                task_completion.completed = not task_completion.completed
                task_completion.completed_at = datetime.utcnow() if task_completion.completed else None
                task_completion.updated_at = datetime.utcnow()

            db.commit()
            db.refresh(task_completion)

            # Update overall progress
            self._recalculate_course_progress(db, user_id, course_id)

            logger.info(f"Toggled task {task_id} for user {user_id}: {task_completion.completed}")

            return {
                'task_id': task_id,
                'completed': task_completion.completed,
                'completed_at': task_completion.completed_at.isoformat() if task_completion.completed_at else None
            }

        except ValueError as e:
            # Re-raise ValueError with clear message for the frontend
            logger.error(f"Validation error toggling task: {e}")
            raise
        except Exception as e:
            logger.error(f"Error toggling task completion: {e}", exc_info=True)
            db.rollback()
            raise

    def _recalculate_course_progress(
        self,
        db: Session,
        user_id: str,
        course_id: str
    ) -> None:
        """
        Recalculate overall course progress based on completed tasks.

        Args:
            db: Database session
            user_id: User ID
            course_id: Course ID
        """
        try:
            # Get or create progress record
            progress = self.get_or_create_progress(db, user_id, course_id)

            # Count total tasks
            total_tasks = db.query(CourseSection).filter(
                CourseSection.course_id == course_id,
                CourseSection.is_module == False  # Only count actual tasks, not parent modules
            ).count()

            # Count completed tasks
            completed_tasks = db.query(UserTaskCompletion).filter(
                UserTaskCompletion.user_id == user_id,
                UserTaskCompletion.course_id == course_id,
                UserTaskCompletion.completed == True
            ).count()

            # Calculate progress percentage
            if total_tasks > 0:
                progress.progress_percentage = int((completed_tasks / total_tasks) * 100)

                # Update learning status
                if completed_tasks == 0:
                    progress.learning_status = 'NOT_STARTED'
                elif completed_tasks >= total_tasks:
                    progress.learning_status = 'COMPLETED'
                    if not progress.completed_at:
                        progress.completed_at = datetime.utcnow()
                else:
                    if progress.learning_status == 'NOT_STARTED':
                        progress.learning_status = 'IN_PROGRESS'
                        progress.started_at = datetime.utcnow()
            else:
                progress.progress_percentage = 0

            progress.last_accessed_at = datetime.utcnow()
            progress.updated_at = datetime.utcnow()

            db.commit()

            logger.info(f"Recalculated progress for course {course_id}: {progress.progress_percentage}% ({completed_tasks}/{total_tasks})")

        except Exception as e:
            logger.error(f"Error recalculating progress: {e}", exc_info=True)
            db.rollback()
            raise

    def get_user_task_completions(
        self,
        db: Session,
        user_id: str,
        course_id: str
    ) -> Dict[int, bool]:
        """
        Get all task completion statuses for a user on a course.

        Args:
            db: Database session
            user_id: User ID
            course_id: Course ID

        Returns:
            Dictionary mapping task_id to completion status
        """
        try:
            completions = db.query(UserTaskCompletion).filter(
                UserTaskCompletion.user_id == user_id,
                UserTaskCompletion.course_id == course_id
            ).all()

            return {
                completion.task_id: completion.completed
                for completion in completions
            }

        except Exception as e:
            logger.error(f"Error getting task completions: {e}", exc_info=True)
            raise

    def _format_progress(self, progress: UserCourseProgress) -> Dict[str, Any]:
        """Format progress record for API response."""
        return {
            'id': progress.id,
            'user_id': progress.user_id,
            'course_id': progress.course_id,
            'learning_status': progress.learning_status,
            'progress_percentage': progress.progress_percentage or 0,
            'current_section_id': progress.current_section_id,
            'completed_sections': progress.completed_sections or [],
            'total_time_spent': progress.total_time_spent or 0,
            'last_accessed_at': progress.last_accessed_at.isoformat() if progress.last_accessed_at else None,
            'started_at': progress.started_at.isoformat() if progress.started_at else None,
            'completed_at': progress.completed_at.isoformat() if progress.completed_at else None,
            'notes': progress.notes,
            'bookmarks': progress.bookmarks or []
        }
