"""
Task Management Service

Handles CRUD operations for tasks, learning resources, and subtasks.
"""

import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from models.database.task import Task, LearningResource, Subtask, TaskDependency
import logging

logger = logging.getLogger(__name__)


class TaskService:
    """Service for managing tasks and related entities"""

    def __init__(self, db: Session):
        self.db = db

    # ==================== Task CRUD ====================

    def create_task(
        self,
        project_id: str,  # Changed to str for UUID support
        title: str,
        created_by: str,
        description: Optional[str] = None,
        task_type: Optional[str] = None,  # Optional, flexible field
        status: str = "todo",
        priority: int = 3,
        progress: int = 0,
        idea_node_id: Optional[str] = None,
        milestone_id: Optional[int] = None,
        parent_task_id: Optional[str] = None,
        estimated_hours: Optional[float] = None,
        actual_hours: Optional[float] = None,
        start_date: Optional[datetime] = None,
        due_date: Optional[datetime] = None,
        assigned_to: Optional[str] = None,
        tags: Optional[List[str]] = None,
        metadata: Optional[Dict] = None,  # Flexible metadata for custom fields
    ) -> Task:
        """Create a new task"""
        task_id = str(uuid.uuid4())

        task = Task(
            id=task_id,
            project_id=project_id,
            idea_node_id=idea_node_id,
            milestone_id=milestone_id,
            parent_task_id=parent_task_id,
            title=title,
            description=description,
            task_type=task_type,
            status=status,
            priority=priority,
            progress=progress,
            estimated_hours=estimated_hours,
            actual_hours=actual_hours,
            start_date=start_date,
            due_date=due_date,
            assigned_to=assigned_to,
            created_by=created_by,
            tags=tags or [],
            metadata=metadata,
        )

        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)

        logger.info(f"Created task {task_id} for project {project_id}")
        return task

    def get_task(self, task_id: str, include_resources: bool = False, include_subtasks: bool = False) -> Optional[Task]:
        """Get task by ID"""
        task = self.db.query(Task).filter(Task.id == task_id).first()

        if task and include_resources:
            # Eager load learning resources
            task.learning_resources

        if task and include_subtasks:
            # Eager load subtasks
            task.subtasks

        return task

    def get_tasks_by_project(
        self,
        project_id: str,  # Changed to str for UUID support
        status: Optional[str] = None,
        task_type: Optional[str] = None,
        assigned_to: Optional[str] = None,
        priority: Optional[int] = None,
        milestone_id: Optional[int] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Task]:
        """Get tasks for a project with optional filters"""
        query = self.db.query(Task).filter(Task.project_id == project_id)

        if status:
            query = query.filter(Task.status == status)
        if task_type:
            query = query.filter(Task.task_type == task_type)
        if assigned_to:
            query = query.filter(Task.assigned_to == assigned_to)
        if priority:
            query = query.filter(Task.priority == priority)
        if milestone_id:
            query = query.filter(Task.milestone_id == milestone_id)

        query = query.order_by(Task.created_at.desc())
        query = query.limit(limit).offset(offset)

        return query.all()

    def get_tasks_by_idea_node(self, idea_node_id: str) -> List[Task]:
        """Get all tasks linked to an idea node"""
        return self.db.query(Task).filter(Task.idea_node_id == idea_node_id).all()

    def update_task(
        self,
        task_id: str,
        **kwargs
    ) -> Optional[Task]:
        """Update task fields"""
        task = self.get_task(task_id)
        if not task:
            return None

        # Update allowed fields
        allowed_fields = [
            'title', 'description', 'task_type', 'status', 'priority', 'progress',
            'estimated_hours', 'actual_hours', 'start_date', 'due_date', 'completed_at',
            'assigned_to', 'tags', 'metadata',
            'idea_node_id', 'milestone_id', 'parent_task_id'
        ]

        for key, value in kwargs.items():
            if key in allowed_fields and value is not None:
                setattr(task, key, value)

        task.updated_at = datetime.utcnow()

        # Auto-set completed_at if status changes to 'done'
        if 'status' in kwargs and kwargs['status'] == 'done' and not task.completed_at:
            task.completed_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(task)

        logger.info(f"Updated task {task_id}")
        return task

    def update_task_status(self, task_id: str, status: str) -> Optional[Task]:
        """Quick update of task status"""
        return self.update_task(task_id, status=status)

    def update_task_progress(self, task_id: str, progress: int) -> Optional[Task]:
        """Quick update of task progress"""
        return self.update_task(task_id, progress=progress)

    def delete_task(self, task_id: str) -> bool:
        """Delete a task (cascades to resources and subtasks)"""
        task = self.get_task(task_id)
        if not task:
            return False

        self.db.delete(task)
        self.db.commit()

        logger.info(f"Deleted task {task_id}")
        return True

    def get_task_stats(self, project_id: str) -> Dict[str, Any]:  # Changed to str for UUID support
        """Get task statistics for a project"""
        total = self.db.query(func.count(Task.id)).filter(Task.project_id == project_id).scalar()

        todo = self.db.query(func.count(Task.id)).filter(
            and_(Task.project_id == project_id, Task.status == 'todo')
        ).scalar()

        in_progress = self.db.query(func.count(Task.id)).filter(
            and_(Task.project_id == project_id, Task.status == 'in_progress')
        ).scalar()

        done = self.db.query(func.count(Task.id)).filter(
            and_(Task.project_id == project_id, Task.status == 'done')
        ).scalar()

        blocked = self.db.query(func.count(Task.id)).filter(
            and_(Task.project_id == project_id, Task.status == 'blocked')
        ).scalar()

        return {
            'total': total,
            'todo': todo,
            'in_progress': in_progress,
            'done': done,
            'blocked': blocked,
            'completion_rate': round((done / total * 100) if total > 0 else 0, 2)
        }

    # ==================== Learning Resource CRUD ====================

    def create_learning_resource(
        self,
        task_id: str,
        title: str,
        resource_type: str,
        url: Optional[str] = None,
        description: Optional[str] = None,
        estimated_time_minutes: Optional[int] = None,
        status: str = "not_started",
    ) -> Optional[LearningResource]:
        """Create a learning resource for a task"""
        # Verify task exists and is a learning task
        task = self.get_task(task_id)
        if not task or task.task_type != 'learning':
            logger.warning(f"Cannot add learning resource to non-learning task {task_id}")
            return None

        resource_id = str(uuid.uuid4())

        resource = LearningResource(
            id=resource_id,
            task_id=task_id,
            title=title,
            type=resource_type,
            url=url,
            description=description,
            status=status,
            estimated_time_minutes=estimated_time_minutes,
        )

        self.db.add(resource)
        self.db.commit()
        self.db.refresh(resource)

        # Update task progress based on resources
        self._update_task_progress_from_resources(task_id)

        logger.info(f"Created learning resource {resource_id} for task {task_id}")
        return resource

    def get_learning_resource(self, resource_id: str) -> Optional[LearningResource]:
        """Get learning resource by ID"""
        return self.db.query(LearningResource).filter(LearningResource.id == resource_id).first()

    def get_learning_resources_by_task(self, task_id: str) -> List[LearningResource]:
        """Get all learning resources for a task"""
        return self.db.query(LearningResource).filter(LearningResource.task_id == task_id).all()

    def update_learning_resource(
        self,
        resource_id: str,
        **kwargs
    ) -> Optional[LearningResource]:
        """Update learning resource fields"""
        resource = self.get_learning_resource(resource_id)
        if not resource:
            return None

        allowed_fields = [
            'title', 'type', 'url', 'description', 'status', 'progress',
            'estimated_time_minutes', 'actual_time_minutes', 'notes', 'key_takeaways', 'completed_at'
        ]

        for key, value in kwargs.items():
            if key in allowed_fields and value is not None:
                setattr(resource, key, value)

        resource.updated_at = datetime.utcnow()

        # Auto-set completed_at if status changes to 'completed'
        if 'status' in kwargs and kwargs['status'] == 'completed' and not resource.completed_at:
            resource.completed_at = datetime.utcnow()
            resource.progress = 100

        self.db.commit()
        self.db.refresh(resource)

        # Update parent task progress
        self._update_task_progress_from_resources(resource.task_id)

        logger.info(f"Updated learning resource {resource_id}")
        return resource

    def mark_resource_complete(self, resource_id: str, notes: Optional[str] = None, key_takeaways: Optional[List[str]] = None) -> Optional[LearningResource]:
        """Mark a learning resource as completed"""
        return self.update_learning_resource(
            resource_id,
            status='completed',
            progress=100,
            notes=notes,
            key_takeaways=key_takeaways,
            completed_at=datetime.utcnow()
        )

    def delete_learning_resource(self, resource_id: str) -> bool:
        """Delete a learning resource"""
        resource = self.get_learning_resource(resource_id)
        if not resource:
            return False

        task_id = resource.task_id

        self.db.delete(resource)
        self.db.commit()

        # Update parent task progress
        self._update_task_progress_from_resources(task_id)

        logger.info(f"Deleted learning resource {resource_id}")
        return True

    def _update_task_progress_from_resources(self, task_id: str):
        """Auto-calculate task progress from learning resources"""
        resources = self.get_learning_resources_by_task(task_id)

        if not resources:
            return

        total_resources = len(resources)
        completed_resources = sum(1 for r in resources if r.status == 'completed')

        progress = round((completed_resources / total_resources) * 100)

        # Update task
        task = self.get_task(task_id)
        if task:
            task.progress = progress

            # Auto-update status
            if progress == 0:
                task.status = 'todo'
            elif progress == 100:
                task.status = 'done'
                if not task.completed_at:
                    task.completed_at = datetime.utcnow()
            else:
                task.status = 'in_progress'

            self.db.commit()

    # ==================== Subtask CRUD ====================

    def create_subtask(
        self,
        parent_task_id: str,
        title: str,
        description: Optional[str] = None,
        assigned_to: Optional[str] = None,
        due_date: Optional[datetime] = None,
        status: str = "todo",
    ) -> Optional[Subtask]:
        """Create a subtask for a task"""
        # Verify parent task exists
        parent_task = self.get_task(parent_task_id)
        if not parent_task:
            logger.warning(f"Parent task {parent_task_id} not found")
            return None

        subtask_id = str(uuid.uuid4())

        subtask = Subtask(
            id=subtask_id,
            parent_task_id=parent_task_id,
            title=title,
            description=description,
            status=status,
            assigned_to=assigned_to,
            due_date=due_date,
        )

        self.db.add(subtask)
        self.db.commit()
        self.db.refresh(subtask)

        # Update parent task progress
        self._update_task_progress_from_subtasks(parent_task_id)

        logger.info(f"Created subtask {subtask_id} for task {parent_task_id}")
        return subtask

    def get_subtask(self, subtask_id: str) -> Optional[Subtask]:
        """Get subtask by ID"""
        return self.db.query(Subtask).filter(Subtask.id == subtask_id).first()

    def get_subtasks_by_task(self, task_id: str) -> List[Subtask]:
        """Get all subtasks for a task"""
        return self.db.query(Subtask).filter(Subtask.parent_task_id == task_id).all()

    def update_subtask(
        self,
        subtask_id: str,
        **kwargs
    ) -> Optional[Subtask]:
        """Update subtask fields"""
        subtask = self.get_subtask(subtask_id)
        if not subtask:
            return None

        allowed_fields = ['title', 'description', 'status', 'assigned_to', 'due_date']

        for key, value in kwargs.items():
            if key in allowed_fields and value is not None:
                setattr(subtask, key, value)

        subtask.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(subtask)

        # Update parent task progress
        self._update_task_progress_from_subtasks(subtask.parent_task_id)

        logger.info(f"Updated subtask {subtask_id}")
        return subtask

    def delete_subtask(self, subtask_id: str) -> bool:
        """Delete a subtask"""
        subtask = self.get_subtask(subtask_id)
        if not subtask:
            return False

        parent_task_id = subtask.parent_task_id

        self.db.delete(subtask)
        self.db.commit()

        # Update parent task progress
        self._update_task_progress_from_subtasks(parent_task_id)

        logger.info(f"Deleted subtask {subtask_id}")
        return True

    def _update_task_progress_from_subtasks(self, task_id: str):
        """Auto-calculate task progress from subtasks"""
        subtasks = self.get_subtasks_by_task(task_id)

        if not subtasks:
            return

        total_subtasks = len(subtasks)
        completed_subtasks = sum(1 for s in subtasks if s.status == 'done')

        progress = round((completed_subtasks / total_subtasks) * 100)

        # Update task
        task = self.get_task(task_id)
        if task:
            task.progress = progress

            # Auto-update status
            if progress == 0:
                task.status = 'todo'
            elif progress == 100:
                task.status = 'done'
                if not task.completed_at:
                    task.completed_at = datetime.utcnow()
            else:
                task.status = 'in_progress'

            self.db.commit()

    # ==================== Task Dependencies ====================

    def add_task_dependency(self, task_id: str, depends_on_task_id: str) -> Optional[TaskDependency]:
        """Add a dependency: task_id depends on depends_on_task_id"""
        # Verify both tasks exist
        if not self.get_task(task_id) or not self.get_task(depends_on_task_id):
            logger.warning(f"One or both tasks not found")
            return None

        # Check for circular dependency
        if self._would_create_circular_dependency(task_id, depends_on_task_id):
            logger.warning(f"Circular dependency detected")
            return None

        dependency = TaskDependency(
            task_id=task_id,
            depends_on_task_id=depends_on_task_id,
        )

        self.db.add(dependency)
        self.db.commit()
        self.db.refresh(dependency)

        logger.info(f"Added dependency: task {task_id} depends on {depends_on_task_id}")
        return dependency

    def get_task_dependencies(self, task_id: str) -> List[TaskDependency]:
        """Get all dependencies for a task"""
        return self.db.query(TaskDependency).filter(TaskDependency.task_id == task_id).all()

    def get_dependent_tasks(self, task_id: str) -> List[TaskDependency]:
        """Get all tasks that depend on this task"""
        return self.db.query(TaskDependency).filter(TaskDependency.depends_on_task_id == task_id).all()

    def remove_task_dependency(self, dependency_id: int) -> bool:
        """Remove a task dependency"""
        dependency = self.db.query(TaskDependency).filter(TaskDependency.id == dependency_id).first()
        if not dependency:
            return False

        self.db.delete(dependency)
        self.db.commit()

        logger.info(f"Removed dependency {dependency_id}")
        return True

    def _would_create_circular_dependency(self, task_id: str, depends_on_task_id: str) -> bool:
        """Check if adding this dependency would create a circular dependency"""
        # Simple check: if depends_on_task already depends on task_id (directly or indirectly)
        visited = set()

        def has_path(from_task: str, to_task: str) -> bool:
            if from_task == to_task:
                return True
            if from_task in visited:
                return False
            visited.add(from_task)

            dependencies = self.get_task_dependencies(from_task)
            for dep in dependencies:
                if has_path(dep.depends_on_task_id, to_task):
                    return True
            return False

        return has_path(depends_on_task_id, task_id)

    # ==================== Conversion ====================

    def convert_idea_to_task(
        self,
        idea_node_id: str,
        project_id: str,  # Changed to str for UUID support
        created_by: str,
        title: str,
        description: Optional[str] = None,
        tags: Optional[List[str]] = None,
        metadata: Optional[Dict] = None,
    ) -> Task:
        """Convert an Idea Forest node to a task"""
        # Default to action task type
        task_type = 'action'

        # Create task
        task = self.create_task(
            project_id=project_id,
            title=title,
            description=description,
            task_type=task_type,
            created_by=created_by,
            idea_node_id=idea_node_id,
            tags=tags,
            action_metadata=metadata,
        )

        logger.info(f"Converted idea node {idea_node_id} to task {task.id}")
        return task
