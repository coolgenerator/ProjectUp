"""
Course Generation Service
Handles business logic for generating learning paths and course structures
"""

import re
import json
import uuid
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from services.llm.vertex_ai_service import VertexAIService
from prompts.course_prompts import CoursePrompts
from models.database.course_models import CourseRequest, CourseGenerationProgress
from services.course.course_persistence_service import CoursePersistenceService
from services.course.course_content_service import CourseContentService

logger = logging.getLogger(__name__)


class CourseGenerationService:
    """Service for generating course structures and learning paths"""

    def __init__(self):
        self.ai_service = VertexAIService()
        self.prompts = CoursePrompts()
        self.persistence_service = CoursePersistenceService()
        self.content_service = CourseContentService()

    async def start_course_generation(
        self,
        db: Session,
        user_id: str,
        topic: str,
        goals: List[str],
        user_experience: str,
        user_skills: Optional[List[str]] = None,
        interests: Optional[List[str]] = None,
        preferences: Optional[Dict[str, Any]] = None,
        estimated_weeks: int = 4,
        time_commitment: int = 10,
        difficulty: str = "intermediate",
        preferred_learning_style: str = "mixed"
    ) -> Dict[str, Any]:
        """
        Start course generation workflow.

        Creates a course request in the database and initiates the generation process.
        The actual generation happens asynchronously via LangGraph workflow.

        Args:
            db: Database session
            user_id: User ID requesting the course
            topic: Course topic
            goals: Learning goals
            user_experience: User's background/experience level
            user_skills: User's existing skills (optional)
            interests: User's interests (optional)
            preferences: Additional preferences (optional)
            estimated_weeks: Estimated course duration in weeks
            time_commitment: Hours per week commitment
            difficulty: Difficulty level
            preferred_learning_style: Learning style preference

        Returns:
            Dict containing request_id, status, message, and websocket_url
        """
        # Generate unique request ID
        request_id = uuid.uuid4()

        # Create course request record in database
        course_request = CourseRequest(
            id=request_id,
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
            status='PENDING',
            created_at=datetime.utcnow()
        )

        db.add(course_request)
        db.commit()
        db.refresh(course_request)

        # Update status to processing
        self.persistence_service.update_course_status(db, str(request_id), 'PROCESSING')

        # Initialize and start the LangGraph workflow
        try:
            from workflows.courses import CourseGenerationWorkflow

            workflow = CourseGenerationWorkflow(llm_provider="vertex_ai")

            # Run workflow asynchronously (in background)
            # Note: In production, you'd want to run this in a background task
            # For now, we'll start it and let it run
            import asyncio
            asyncio.create_task(
                self._run_workflow_with_updates(
                    workflow, db, str(request_id), user_id, topic, goals,
                    user_experience, difficulty, estimated_weeks,
                    time_commitment, user_skills, interests
                )
            )

        except ImportError as e:
            logger.warning(f"Workflow not available, using legacy generation: {e}")
            # Fallback to legacy generation if workflow not available

        return {
            "request_id": str(request_id),
            "status": "processing",
            "message": "Course generation started successfully",
            "websocket_url": f"/ai-api/courses/ws/{str(request_id)}"
        }

    def _save_progress(self, db: Session, request_id: str, message: str, task_name: str, progress: int):
        """Save progress update to database."""
        try:
            progress_update = CourseGenerationProgress(
                request_id=request_id,
                task_name=task_name,
                task_status='in_progress' if progress < 100 else 'completed',
                progress_percentage=progress,
                message=message,
                node_name=task_name,
                created_at=datetime.utcnow()
            )
            db.add(progress_update)
            db.commit()
        except Exception as e:
            logger.error(f"Error saving progress: {e}")
            db.rollback()

    async def _run_workflow_with_updates(
        self,
        workflow,
        db: Session,
        request_id: str,
        user_id: str,
        topic: str,
        goals: List[str],
        user_experience: str,
        difficulty: str,
        estimated_weeks: int,
        time_commitment: int,
        user_skills: List[str],
        interests: List[str]
    ):
        """Run the workflow and update database with progress."""
        try:
            logger.info(f"Running workflow for request {request_id}")

            # Save initial progress
            self._save_progress(db, request_id, "🎯 Starting course generation...", "initialize", 5)

            # Define progress callback
            async def progress_callback(step: str, progress: int, message: str):
                self._save_progress(db, request_id, message, step, progress)

            # Execute workflow with progress callbacks
            result = await workflow.generate_with_callback(
                request_id=request_id,
                user_id=user_id,
                topic=topic,
                goals=goals,
                user_experience=user_experience,
                difficulty=difficulty,
                estimated_weeks=estimated_weeks,
                time_commitment=time_commitment,
                user_skills=user_skills,
                interests=interests,
                progress_callback=progress_callback
            )

            if result['success']:
                # Save completion progress
                self._save_progress(db, request_id, "✅ Course generation completed!", "completed", 100)

                # Update course in database with generated content
                course = db.query(CourseRequest).filter(
                    CourseRequest.id == request_id
                ).first()

                if course:
                    course.status = 'COMPLETED'
                    course.completed_at = datetime.utcnow()
                    # Store the generated course in preferences or a new field
                    course.preferences = {
                        'generated_course': result['course']
                    }
                    db.commit()
                    logger.info(f"Course generation completed for {request_id}")

                    # Save structured course content to CourseSection table
                    try:
                        self.content_service.save_generated_course_to_sections(
                            db=db,
                            request_id=request_id,
                            generated_course=result['course']
                        )
                        logger.info(f"Structured course content saved to sections for {request_id}")
                    except Exception as e:
                        logger.error(f"Error saving structured content: {e}", exc_info=True)
                        # Don't fail the whole process if this fails
            else:
                # Save failure progress
                error_msg = result.get('error', 'Unknown error')
                self._save_progress(db, request_id, f"❌ Generation failed: {error_msg}", "failed", 0)

                # Update with error
                self.persistence_service.update_course_status(
                    db, request_id, 'FAILED'
                )
                course = db.query(CourseRequest).filter(
                    CourseRequest.id == request_id
                ).first()
                if course:
                    course.error_message = error_msg
                    db.commit()
                logger.error(f"Course generation failed for {request_id}: {error_msg}")

        except Exception as e:
            logger.error(f"Workflow execution error for {request_id}: {e}", exc_info=True)

            # Save error progress
            self._save_progress(db, request_id, f"❌ Error: {str(e)}", "error", 0)

            self.persistence_service.update_course_status(db, request_id, 'FAILED')
            course = db.query(CourseRequest).filter(
                CourseRequest.id == request_id
            ).first()
            if course:
                course.error_message = str(e)
                db.commit()

    async def get_course_generation_status(
        self,
        db: Session,
        request_id: str
    ) -> Dict[str, Any]:
        """
        Get the status of a course generation request.

        Args:
            db: Database session
            request_id: Course request ID

        Returns:
            Dict containing status information
        """
        course = self.persistence_service.get_course_by_request_id(db, request_id)

        if not course:
            return {
                "request_id": request_id,
                "status": "not_found",
                "message": "Course generation request not found"
            }

        return {
            "request_id": request_id,
            "status": course.status,
            "topic": course.topic,
            "created_at": course.created_at.isoformat(),
            "updated_at": course.updated_at.isoformat() if course.updated_at else None,
            "completed_at": course.completed_at.isoformat() if course.completed_at else None,
            "error_message": course.error_message
        }

    async def generate_course_structure(
        self,
        request_id: str,
        topic: str,
        goals: List[str],
        user_experience: str,
        estimated_weeks: int,
        time_commitment: int,
        difficulty: str,
        db_session: Session,
        progress_callback: Optional[callable] = None
    ) -> Dict[str, Any]:
        """
        Generate course structure/syllabus without learning materials

        Args:
            request_id: Course request ID
            topic: Course topic
            goals: Learning goals
            user_experience: User's experience level
            estimated_weeks: Number of weeks for the course
            time_commitment: Hours per week
            difficulty: Difficulty level
            db_session: Database session
            progress_callback: Optional callback for progress updates

        Returns:
            Dict with course structure data

        Raises:
            ValueError: If generation fails or invalid data
        """
        try:
            num_modules = min(estimated_weeks, 12)

            if progress_callback:
                await progress_callback(
                    request_id,
                    "🎯 Starting learning path generation...",
                    "initialize",
                    5
                )

            # Get prompt from prompts module
            prompt = self.prompts.get_structure_generation_prompt(
                topic=topic,
                user_experience=user_experience,
                goals=goals,
                time_commitment=time_commitment,
                difficulty=difficulty,
                num_modules=num_modules
            )

            if progress_callback:
                await progress_callback(
                    request_id,
                    f"📝 Generating {num_modules}-week syllabus...",
                    "structure",
                    30
                )

            # Generate with streaming
            response_chunks = []
            current_module = 0
            last_update_time = datetime.utcnow()

            async for chunk in self.ai_service.generate_stream(
                prompt=prompt,
                model_name="gemini-2.5-pro",
                temperature=0.7,
                max_tokens=8192
            ):
                response_chunks.append(chunk)

                partial_text = ''.join(response_chunks)
                week_count = partial_text.lower().count('"week":')

                time_since_update = (datetime.utcnow() - last_update_time).total_seconds()

                if progress_callback and (week_count > current_module or time_since_update >= 2):
                    if week_count > current_module:
                        current_module = week_count
                        progress = 30 + min((current_module / num_modules) * 50, 50)
                        await progress_callback(
                            request_id,
                            f"✨ Designing week {current_module} curriculum...",
                            "structure",
                            int(progress)
                        )
                        last_update_time = datetime.utcnow()

            response = ''.join(response_chunks)

            if progress_callback:
                await progress_callback(
                    request_id,
                    "🔍 Finalizing syllabus...",
                    "parse",
                    85
                )

            # Parse JSON response
            structure_data = self._parse_json_response(response)
            modules = structure_data.get("modules", [])

            # Update course request in database
            course_request = db_session.query(CourseRequest).filter(
                CourseRequest.id == request_id
            ).first()

            if course_request:
                # Store the generated structure in preferences
                course_request.preferences = {
                    "course_title": structure_data.get("course_title", f"{topic} Learning Path"),
                    "course_description": structure_data.get("course_description", f"Comprehensive course on {topic}"),
                    "modules": modules
                }
                course_request.status = 'COMPLETED'
                course_request.completed_at = datetime.utcnow()

                db_session.commit()

                if progress_callback:
                    await progress_callback(
                        request_id,
                        f"✅ Syllabus complete! {len(modules)} weeks ready for review.",
                        "completed",
                        100
                    )

                return {
                    "course_title": course_request.preferences.get("course_title", f"{topic} Learning Path"),
                    "course_description": course_request.preferences.get("course_description", f"Comprehensive course on {topic}"),
                    "modules": modules,
                    "num_modules": len(modules)
                }
            else:
                raise ValueError(f"Course request not found for {request_id}")

        except Exception as e:
            logger.error(f"Error generating course structure: {e}", exc_info=True)

            # Update request status to failed
            course_request = db_session.query(CourseRequest).filter(
                CourseRequest.id == request_id
            ).first()
            if course_request:
                course_request.status = 'FAILED'
                course_request.error_message = str(e)
                db_session.commit()

            if progress_callback:
                await progress_callback(
                    request_id,
                    f"❌ Error: {str(e)}",
                    "failed",
                    0
                )

            raise

    def _parse_json_response(self, response: str) -> Dict[str, Any]:
        """
        Parse JSON from AI response with error handling and cleanup

        Args:
            response: Raw AI response text

        Returns:
            Parsed JSON dictionary

        Raises:
            ValueError: If JSON parsing fails
        """
        # Extract JSON from response
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if not json_match:
            raise ValueError("No JSON found in response")

        json_str = json_match.group(0)

        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            # Cleanup and retry
            json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)  # Remove trailing commas
            json_str = json_str.replace('"', '"').replace('"', '"')  # Fix smart quotes
            json_str = json_str.replace(''', "'").replace(''', "'")  # Fix smart apostrophes

            # Check for truncation and fix unmatched braces
            open_braces = json_str.count('{')
            close_braces = json_str.count('}')
            if open_braces > close_braces:
                json_str += '\n}' * (open_braces - close_braces)

            return json.loads(json_str)

    async def generate_lesson_resources(
        self,
        lesson_title: str,
        lesson_description: str,
        lesson_objectives: List[str],
        user_experience: str,
        difficulty: str
    ) -> List[Dict[str, Any]]:
        """
        Generate learning resources for a specific lesson

        Args:
            lesson_title: Title of the lesson
            lesson_description: Description of lesson content
            lesson_objectives: Learning objectives
            user_experience: User's experience level
            difficulty: Difficulty level

        Returns:
            List of resource dictionaries
        """
        prompt = self.prompts.get_resource_generation_prompt(
            lesson_title=lesson_title,
            lesson_description=lesson_description,
            lesson_objectives=lesson_objectives,
            user_experience=user_experience,
            difficulty=difficulty
        )

        response = await self.ai_service.generate(
            prompt=prompt,
            model_name="gemini-2.5-pro",
            temperature=0.7,
            max_tokens=2048
        )

        result_data = self._parse_json_response(response)
        return result_data.get("resources", [])

    async def refine_course_structure(
        self,
        refinement_type: str,
        description: str,
        current_structure: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Refine course structure based on user feedback

        Args:
            refinement_type: Type of refinement
            description: User's refinement request
            current_structure: Current course structure

        Returns:
            Refined course structure
        """
        prompt = self.prompts.get_refinement_prompt(
            refinement_type=refinement_type,
            description=description,
            current_structure=current_structure
        )

        response = await self.ai_service.generate(
            prompt=prompt,
            model_name="gemini-2.5-pro",
            temperature=0.7,
            max_tokens=8192
        )

        return self._parse_json_response(response)
