"""
Course Content Service

Handles saving and retrieving structured course content from the database.
"""

import logging
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from datetime import datetime

from models.database.course_models import CourseRequest, CourseSection

logger = logging.getLogger(__name__)


class CourseContentService:
    """Service for managing structured course content in the database."""

    def save_generated_course_to_sections(
        self,
        db: Session,
        request_id: str,
        generated_course: Dict[str, Any]
    ) -> bool:
        """
        Parse generated course content and save it as structured CourseSection records.

        Args:
            db: Database session
            request_id: Course request ID
            generated_course: Generated course content from workflow

        Returns:
            True if successful, False otherwise
        """
        try:
            from uuid import UUID

            # Ensure request_id is UUID type
            request_uuid = UUID(request_id) if isinstance(request_id, str) else request_id

            # Get the course request
            course_request = db.query(CourseRequest).filter(
                CourseRequest.id == request_uuid
            ).first()

            if not course_request:
                logger.error(f"Course request {request_id} not found")
                return False

            # Delete existing sections (if any) to allow regeneration
            db.query(CourseSection).filter(
                CourseSection.course_id == request_uuid
            ).delete()

            # Parse the roadmap steps from generated course
            roadmap = generated_course.get('roadmap', {})
            steps = roadmap.get('steps', [])

            if not steps:
                logger.warning(f"No roadmap steps found in generated course for {request_id}")
                return False

            # Get all topics, resources, and learning content for reference
            all_topics = {t['topic_id']: t for t in generated_course.get('topics', [])}
            resources_data = generated_course.get('resources', {})
            all_resources = {r['resource_id']: r for r in resources_data.get('all_resources', [])}
            resources_by_step = resources_data.get('by_step', {})

            # Get AI-generated learning content
            learning_content_data = generated_course.get('learning_content', {})
            content_by_step = learning_content_data.get('by_step', {})

            # Create CourseSection for each roadmap step
            sections_created = 0
            for step in steps:
                step_id = step.get('step_id')

                # Gather concepts from topics in this step
                concepts = []
                for topic_id in step.get('topics', []):
                    topic = all_topics.get(topic_id)
                    if topic:
                        concepts.extend(topic.get('key_concepts', []))

                # Gather resources for this step
                step_resources = []
                resource_ids = resources_by_step.get(step_id, [])
                for resource_id in resource_ids:
                    resource = all_resources.get(resource_id)
                    if resource:
                        step_resources.append({
                            'title': resource.get('title'),
                            'url': resource.get('url'),
                            'type': resource.get('type'),
                            'source': resource.get('source'),
                            'duration': resource.get('duration'),
                            'difficulty': resource.get('difficulty'),
                            'description': resource.get('description'),
                            'free': resource.get('free', True)
                        })

                # Get AI-generated content for this step
                ai_content = content_by_step.get(step_id, None)

                # Create section record
                section = CourseSection(
                    course_id=request_uuid,
                    title=step.get('title'),
                    description=step.get('description'),
                    week_number=step.get('order'),
                    order_index=step.get('order'),
                    ai_generated_content=ai_content,  # Add AI-generated content
                    parent_module_id=None,  # For now, all are top-level; could be updated for hierarchy
                    is_module=False,  # For now, all are subtopics
                    concepts=concepts,
                    resources=step_resources,
                    estimated_hours=step.get('estimated_hours'),
                    exercises=None,  # Could be added in future
                    milestones=None,  # Could be added in future
                    assessment_criteria=None,  # Could be added in future
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )

                db.add(section)
                sections_created += 1

            # Commit all sections
            db.commit()

            return True

        except Exception as e:
            logger.error(f"Error saving course sections: {e}", exc_info=True)
            db.rollback()
            return False

    def get_course_with_sections(
        self,
        db: Session,
        request_id: str
    ) -> Dict[str, Any]:
        """
        Get complete course with all sections structured into modules and tasks.

        Args:
            db: Database session
            request_id: Course request ID

        Returns:
            Complete course data with modules containing tasks (subtopics)
        """
        try:
            from uuid import UUID

            # Ensure request_id is UUID type
            request_uuid = UUID(request_id) if isinstance(request_id, str) else request_id

            # Get course request
            course = db.query(CourseRequest).filter(
                CourseRequest.id == request_uuid
            ).first()

            if not course:
                logger.warning(f"Course not found for ID: {request_id}")
                return None

            # Get all sections ordered by week
            sections = db.query(CourseSection).filter(
                CourseSection.course_id == request_uuid
            ).order_by(CourseSection.order_index).all()

            # Get full generated course from preferences for syllabus and modules
            generated_course = None
            if course.preferences and isinstance(course.preferences, dict):
                generated_course = course.preferences.get('generated_course')

            # Build modules structure from grouped_modules if available
            modules = []

            if generated_course and 'modules' in generated_course:
                # Use the grouped modules from the workflow
                roadmap_steps = generated_course.get('roadmap', {}).get('steps', [])
                # Create mappings: step_id -> step data, topic_id -> step data, and order -> section
                step_by_id = {step['step_id']: step for step in roadmap_steps}
                step_by_topic_id = {step.get('topic_id'): step for step in roadmap_steps if step.get('topic_id')}
                section_by_order = {s.order_index: s for s in sections}

                # Debug logging
                logger.info(f"📊 Available mappings:")
                logger.info(f"  step_by_id keys (first 5): {list(step_by_id.keys())[:5]}")
                logger.info(f"  step_by_topic_id keys (first 5): {list(step_by_topic_id.keys())[:5]}")
                logger.info(f"  section_by_order keys (first 5): {list(section_by_order.keys())[:5]}")

                for module_idx, module_data in enumerate(generated_course['modules']):
                    # NEW: Check if this is topic-based structure (has subtopics)
                    if 'subtopics' in module_data and module_data['subtopics']:
                        # Topic-based structure (NEW format)
                        tasks = []

                        logger.info(f"🔍 Processing topic '{module_data.get('title')}' with {len(module_data.get('subtopics', []))} subtopics")

                        for subtopic in module_data.get('subtopics', []):
                            # Get related topic IDs for this subtopic
                            related_topic_ids = subtopic.get('related_topic_ids', [])
                            logger.info(f"  📌 Subtopic '{subtopic.get('title')}' has related_topic_ids: {related_topic_ids}")

                            # Find sections for these topics
                            for topic_id in related_topic_ids:
                                # Try matching by topic_id first
                                step = step_by_topic_id.get(topic_id)

                                # If not found, try matching by step_id
                                if not step:
                                    step = step_by_id.get(topic_id)

                                if not step:
                                    logger.warning(f"    ⚠️ Could not find step for topic_id '{topic_id}'")
                                    continue

                                step_order = step.get('order')
                                section = section_by_order.get(step_order)

                                if section:
                                    logger.info(f"    ✅ Matched to section: {section.title}")
                                else:
                                    logger.warning(f"    ⚠️ No section found for step order {step_order}")

                                if section:
                                    # Separate video and text resources
                                    video_resources = [r for r in (section.resources or []) if r.get('type') == 'video']
                                    text_resources = [r for r in (section.resources or []) if r.get('type') in ['article', 'documentation', 'tutorial', 'course', 'repository']]

                                    task_data = {
                                        'id': f"{section.id}",
                                        'title': section.title,
                                        'description': section.description,
                                        'content': section.ai_generated_content,
                                        'text_content': section.ai_generated_content,
                                        'video_content': {
                                            'videos': video_resources
                                        } if video_resources else None,
                                        'resources': text_resources,
                                        'concepts': section.concepts,
                                        'estimated_hours': section.estimated_hours,
                                        'completed': False
                                    }
                                    tasks.append(task_data)

                        # If no tasks found, try to match all sections to this topic
                        if not tasks:
                            logger.warning(f"⚠️ No tasks found for topic '{module_data.get('title')}', assigning all sections")
                            # Fallback: assign sections proportionally
                            topic_count = len(generated_course['modules'])
                            sections_per_topic = max(1, len(sections) // topic_count)
                            start_idx = module_idx * sections_per_topic
                            end_idx = start_idx + sections_per_topic if module_idx < topic_count - 1 else len(sections)

                            for section in sections[start_idx:end_idx]:
                                video_resources = [r for r in (section.resources or []) if r.get('type') == 'video']
                                text_resources = [r for r in (section.resources or []) if r.get('type') in ['article', 'documentation', 'tutorial', 'course', 'repository']]

                                task_data = {
                                    'id': f"{section.id}",
                                    'title': section.title,
                                    'description': section.description,
                                    'content': section.ai_generated_content,
                                    'text_content': section.ai_generated_content,
                                    'video_content': {'videos': video_resources} if video_resources else None,
                                    'resources': text_resources,
                                    'concepts': section.concepts,
                                    'estimated_hours': section.estimated_hours,
                                    'completed': False
                                }
                                tasks.append(task_data)

                        module = {
                            'id': f"module-{module_idx}",
                            'name': module_data.get('title', f"Topic {module_idx + 1}"),
                            'description': module_data.get('description', ''),
                            'duration': f"{module_data.get('estimated_hours', 0)} hours",
                            'orderIndex': module_idx,
                            'tasks': tasks,
                            'completed': False
                        }
                        modules.append(module)

                    else:
                        # OLD format: has step_ids
                        module_step_ids = module_data.get('step_ids', [])
                        tasks = []

                        for step_id in module_step_ids:
                            step = step_by_id.get(step_id)
                            if not step:
                                continue

                            step_order = step.get('order')
                            section = section_by_order.get(step_order)

                            if section:
                                video_resources = [r for r in (section.resources or []) if r.get('type') == 'video']
                                text_resources = [r for r in (section.resources or []) if r.get('type') in ['article', 'documentation', 'tutorial', 'course', 'repository']]

                                task_data = {
                                    'id': f"{section.id}",
                                    'title': section.title,
                                    'description': section.description,
                                    'content': section.ai_generated_content,
                                    'text_content': section.ai_generated_content,
                                    'video_content': {'videos': video_resources} if video_resources else None,
                                    'resources': text_resources,
                                    'concepts': section.concepts,
                                    'estimated_hours': section.estimated_hours,
                                    'completed': False
                                }
                                tasks.append(task_data)

                        module = {
                            'id': f"module-{module_idx}",
                            'name': module_data.get('module_name', f"Module {module_idx + 1}"),
                            'description': module_data.get('description', ''),
                            'duration': f"{module_data.get('total_hours', 0)} hours",
                            'orderIndex': module_idx,
                            'tasks': tasks,
                            'completed': False
                        }
                        modules.append(module)

                # Check if modules are empty and fallback if needed
                total_tasks = sum(len(m['tasks']) for m in modules)
                if total_tasks == 0:
                    logger.warning("⚠️ All modules have empty tasks! Falling back to week-based grouping")
                    modules = []  # Clear and use fallback

            if not modules or len(modules) == 0:
                # Fallback: group sections by week number into modules
                sections_by_week = {}
                for section in sections:
                    week = section.week_number or 1
                    if week not in sections_by_week:
                        sections_by_week[week] = []
                    sections_by_week[week].append(section)

                for week_num, week_sections in sorted(sections_by_week.items()):
                    tasks = []
                    total_hours = 0
                    for section in week_sections:
                        # Separate video and text resources
                        video_resources = [r for r in (section.resources or []) if r.get('type') == 'video']
                        text_resources = [r for r in (section.resources or []) if r.get('type') in ['article', 'documentation', 'tutorial', 'course', 'repository']]

                        task = {
                            'id': f"{section.id}",
                            'title': section.title,
                            'description': section.description,
                            'content': section.ai_generated_content,
                            'text_content': section.ai_generated_content,
                            'video_content': {
                                'videos': video_resources
                            } if video_resources else None,
                            'resources': text_resources,
                            'concepts': section.concepts,
                            'estimated_hours': section.estimated_hours,
                            'completed': False
                        }

                        tasks.append(task)
                        total_hours += section.estimated_hours or 0

                    module = {
                        'id': f"module-week-{week_num}",
                        'name': f"Week {week_num}",
                        'description': f"Learning content for week {week_num}",
                        'duration': f"{total_hours} hours",
                        'orderIndex': week_num - 1,
                        'tasks': tasks,
                        'completed': False
                    }
                    modules.append(module)

            # Build response
            course_data = {
                'id': str(course.id),
                'user_id': course.user_id,
                'topic': course.topic,
                'difficulty': course.difficulty,
                'estimated_weeks': course.estimated_weeks,
                'time_commitment': course.time_commitment,
                'status': course.status,
                'created_at': course.created_at.isoformat() if course.created_at else None,
                'completed_at': course.completed_at.isoformat() if course.completed_at else None,
                'modules': modules,  # Frontend expects modules (legacy week-based)
                'sections': []  # Keep for backwards compatibility
            }

            # Add syllabus and topic-based structure if available
            if generated_course:
                syllabus_data = generated_course.get('syllabus', {})
                course_data['syllabus'] = {
                    'content': syllabus_data.get('content'),
                    'goals': syllabus_data.get('goals', course.goals if hasattr(course, 'goals') and course.goals else []),
                    'prerequisites': syllabus_data.get('prerequisites', [])
                }

                # NEW: Add topic-based structure directly for frontend
                if 'modules' in generated_course and generated_course['modules']:
                    # Enrich topics with tasks from the processed modules
                    topics_with_tasks = []
                    for i, topic_data in enumerate(generated_course['modules']):
                        # Copy topic data
                        topic = dict(topic_data)

                        # Add tasks from the corresponding module (if it exists)
                        if i < len(modules):
                            topic['tasks'] = modules[i].get('tasks', [])
                        else:
                            topic['tasks'] = []

                        topics_with_tasks.append(topic)

                    course_data['topics'] = topics_with_tasks
                    logger.info(f"✅ Added {len(topics_with_tasks)} topics to course response")

                # Also include full course data
                course_data['full_course'] = generated_course

            # Add legacy sections format for backwards compatibility
            for section in sections:
                course_data['sections'].append({
                    'id': section.id,
                    'title': section.title,
                    'description': section.description,
                    'week_number': section.week_number,
                    'order_index': section.order_index,
                    'ai_generated_content': section.ai_generated_content,
                    'parent_module_id': section.parent_module_id,
                    'is_module': section.is_module,
                    'concepts': section.concepts,
                    'resources': section.resources,
                    'exercises': section.exercises,
                    'estimated_hours': section.estimated_hours,
                    'milestones': section.milestones
                })

            # 📤 LOG WHAT'S BEING SENT TO FRONTEND
            logger.info("=" * 80)
            logger.info("📤 COURSE DATA BEING SENT TO FRONTEND")
            logger.info("=" * 80)
            logger.info(f"Course ID: {course_data['id']}")
            logger.info(f"Topic: {course_data['topic']}")
            logger.info(f"Status: {course_data['status']}")
            logger.info(f"")
            logger.info(f"📊 Structure Overview:")
            logger.info(f"  Topics: {len(course_data.get('topics', []))}")
            logger.info(f"  Modules: {len(course_data.get('modules', []))}")
            logger.info(f"  Sections: {len(course_data.get('sections', []))}")
            logger.info(f"")

            # Log topics details
            if course_data.get('topics'):
                logger.info(f"📚 TOPICS STRUCTURE (NEW):")
                for i, topic in enumerate(course_data['topics'], 1):
                    logger.info(f"  Topic {i}: {topic.get('title', '')}")
                    subtopics = topic.get('subtopics', [])
                    logger.info(f"    Subtopics: {len(subtopics)}")
                    for j, subtopic in enumerate(subtopics, 1):
                        logger.info(f"      {j}. {subtopic.get('title', '')} (IDs: {subtopic.get('related_topic_ids', [])})")

                    # Check if topic has tasks (from modules structure)
                    tasks = topic.get('tasks', [])
                    logger.info(f"    Tasks: {len(tasks)}")
                    if tasks:
                        for k, task in enumerate(tasks, 1):
                            has_content = bool(task.get('content') or task.get('text_content'))
                            content_length = len(task.get('content') or task.get('text_content') or '')
                            video_content = task.get('video_content') or {}
                            video_count = len(video_content.get('videos', []))
                            resource_count = len(task.get('resources') or [])
                            logger.info(f"      Task {k}: {task.get('title', '')}")
                            logger.info(f"        Content: {'✅' if has_content else '❌'} ({content_length} chars)")
                            logger.info(f"        Videos: {video_count}, Resources: {resource_count}")
                logger.info(f"")

            # Log modules details
            if course_data.get('modules'):
                logger.info(f"📅 MODULES STRUCTURE (OLD/FALLBACK):")
                for i, module in enumerate(course_data['modules'], 1):
                    logger.info(f"  Module {i}: {module.get('name', '')}")
                    tasks = module.get('tasks', [])
                    logger.info(f"    Tasks: {len(tasks)}")
                    if tasks:
                        for j, task in enumerate(tasks[:3], 1):  # First 3 tasks only
                            has_content = bool(task.get('content') or task.get('text_content'))
                            content_length = len(task.get('content') or task.get('text_content') or '')
                            video_content = task.get('video_content') or {}
                            video_count = len(video_content.get('videos', []))
                            resource_count = len(task.get('resources') or [])
                            logger.info(f"      Task {j}: {task.get('title', '')}")
                            logger.info(f"        Content: {'✅' if has_content else '❌'} ({content_length} chars)")
                            logger.info(f"        Videos: {video_count}, Resources: {resource_count}")
                        if len(tasks) > 3:
                            logger.info(f"      ... and {len(tasks) - 3} more tasks")
                logger.info(f"")

            logger.info("=" * 80)

            return course_data

        except Exception as e:
            logger.error(f"Error getting course with sections: {e}", exc_info=True)
            return None

    def get_course_section(
        self,
        db: Session,
        section_id: int
    ) -> Dict[str, Any]:
        """
        Get a single course section by ID.

        Args:
            db: Database session
            section_id: Section ID (integer primary key)

        Returns:
            Section data
        """
        try:
            section = db.query(CourseSection).filter(
                CourseSection.id == section_id
            ).first()

            if not section:
                logger.warning(f"Section not found for ID: {section_id}")
                return None

            return {
                'id': section.id,
                'course_id': section.course_id,
                'title': section.title,
                'description': section.description,
                'week_number': section.week_number,
                'order_index': section.order_index,
                'concepts': section.concepts,
                'resources': section.resources,
                'exercises': section.exercises,
                'estimated_hours': section.estimated_hours,
                'milestones': section.milestones,
                'assessment_criteria': section.assessment_criteria
            }

        except Exception as e:
            logger.error(f"Error getting course section: {e}", exc_info=True)
            return None
