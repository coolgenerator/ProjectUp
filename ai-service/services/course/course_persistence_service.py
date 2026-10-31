"""
Course Persistence Service

Handles database operations for courses.
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc

from models.database.course_models import CourseRequest, CourseSection, CourseGenerationProgress, CourseRefinement

logger = logging.getLogger(__name__)


class CoursePersistenceService:
    """Service for course database operations"""

    def create_course_request(
        self,
        db: Session,
        user_id: str,
        course_id: str,
        topic: str,
        goals: List[str],
        user_experience: str,
        user_skills: List[str] = None,
        interests: List[str] = None,
        preferences: Dict[str, Any] = None,
        estimated_weeks: int = 4,
        time_commitment: int = 10,
        difficulty: str = "intermediate",
        preferred_learning_style: str = "mixed"
    ) -> CourseRequest:
        """
        Create a new course request in the database.

        Args:
            db: Database session
            user_id: ID of the user creating the course
            request_id: Unique request identifier
            topic: Course topic
            goals: List of learning goals
            user_experience: User's experience level
            user_skills: List of user's skills
            interests: List of user's interests
            preferences: Additional preferences dict
            estimated_weeks: Number of weeks for the course
            time_commitment: Hours per week
            difficulty: Difficulty level
            preferred_learning_style: Learning style preference

        Returns:
            Created CourseRequest object
        """
        try:
            course_request = CourseRequest(
                id=course_id,
                user_id=user_id,
                topic=topic,
                goals=goals,
                user_experience=user_experience,
                user_skills=user_skills or [],
                interests=interests or [],
                preferences=preferences or {},
                estimated_weeks=estimated_weeks,
                time_commitment=time_commitment,
                difficulty=difficulty,
                preferred_learning_style=preferred_learning_style,
                status='GENERATING'
            )

            db.add(course_request)
            db.commit()
            db.refresh(course_request)

            logger.info(f"Created course request {course_id} for user {user_id}")
            return course_request

        except Exception as e:
            db.rollback()
            logger.error(f"Error creating course request: {e}")
            raise

    def get_courses_by_user(self, db: Session, user_id: str) -> List[CourseRequest]:
        """
        Get all courses for a user.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            List of CourseRequest objects
        """
        try:
            courses = db.query(CourseRequest).filter(
                CourseRequest.user_id == user_id
            ).order_by(desc(CourseRequest.created_at)).all()

            return courses

        except Exception as e:
            logger.error(f"Error fetching courses for user {user_id}: {e}")
            return []

    def get_course_by_request_id(self, db: Session, request_id: str) -> Optional[CourseRequest]:
        """
        Get a course by request ID (course id).

        Args:
            db: Database session
            request_id: Request ID (course id)

        Returns:
            CourseRequest object or None
        """
        try:
            return db.query(CourseRequest).filter(
                CourseRequest.id == request_id
            ).first()

        except Exception as e:
            logger.error(f"Error fetching course {request_id}: {e}")
            return None

    def update_course_status(self, db: Session, request_id: str, status: str) -> bool:
        """
        Update course status.

        Args:
            db: Database session
            request_id: Request ID
            status: New status

        Returns:
            Success boolean
        """
        try:
            course = self.get_course_by_request_id(db, request_id)
            if course:
                course.status = status
                db.commit()
                return True
            return False

        except Exception as e:
            db.rollback()
            logger.error(f"Error updating course status: {e}")
            return False

    def add_course_section(
        self,
        db: Session,
        request_id: str,
        section_number: int,
        title: str,
        description: str = None,
        learning_objectives: List[str] = None,
        topics: List[str] = None,
        estimated_hours: int = None,
        resources: List[Dict[str, Any]] = None
    ) -> CourseSection:
        """
        Add a section to a course.

        Args:
            db: Database session
            request_id: Request ID
            section_number: Section order number
            title: Section title
            description: Section description
            learning_objectives: List of objectives
            topics: List of topics covered
            estimated_hours: Estimated time to complete
            resources: List of resource dicts

        Returns:
            Created CourseSection object
        """
        try:
            section = CourseSection(
                request_id=request_id,
                section_number=section_number,
                title=title,
                description=description,
                learning_objectives=learning_objectives or [],
                topics=topics or [],
                estimated_hours=estimated_hours,
                resources=resources or []
            )

            db.add(section)
            db.commit()
            db.refresh(section)

            logger.info(f"Added section {section_number} to course {request_id}")
            return section

        except Exception as e:
            db.rollback()
            logger.error(f"Error adding course section: {e}")
            raise

    def get_course_sections(self, db: Session, request_id: str) -> List[CourseSection]:
        """
        Get all sections for a course.

        Args:
            db: Database session
            request_id: Request ID

        Returns:
            List of CourseSection objects
        """
        try:
            return db.query(CourseSection).filter(
                CourseSection.request_id == request_id
            ).order_by(CourseSection.section_number).all()

        except Exception as e:
            logger.error(f"Error fetching course sections: {e}")
            return []

    def delete_course(self, db: Session, course_id: str) -> bool:
        """
        Delete a course by ID.

        Args:
            db: Database session
            course_id: Course ID

        Returns:
            Success boolean
        """
        try:
            course = db.query(CourseRequest).filter(
                CourseRequest.id == course_id
            ).first()

            if course:
                db.delete(course)
                db.commit()
                logger.info(f"Deleted course {course_id}")
                return True

            logger.warning(f"Course {course_id} not found")
            return False

        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting course {course_id}: {e}")
            return False

    def _course_to_dict(self, course: CourseRequest) -> Dict[str, Any]:
        """Convert CourseRequest to dictionary"""
        return {
            "id": str(course.id),
            "user_id": course.user_id,
            "title": course.topic,
            "topic": course.topic,
            "goals": course.goals,
            "user_experience": course.user_experience,
            "user_skills": course.user_skills,
            "interests": course.interests,
            "preferences": course.preferences,
            "estimated_weeks": course.estimated_weeks,
            "time_commitment": course.time_commitment,
            "difficulty": course.difficulty,
            "preferred_learning_style": course.preferred_learning_style,
            "status": course.status,
            "created_at": course.created_at.isoformat() if course.created_at else None,
            "updated_at": course.updated_at.isoformat() if course.updated_at else None
        }
