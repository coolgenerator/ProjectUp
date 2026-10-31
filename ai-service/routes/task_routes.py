"""
Task Management API Routes

REST API endpoints for task management system.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from database.connection import get_db
from services.task_service import TaskService

router = APIRouter(prefix="/ai-api/tasks", tags=["Tasks"])


# ==================== Request/Response Models ====================

class TaskCreate(BaseModel):
    project_id: str  # Changed to str for UUID support
    title: str
    description: Optional[str] = None
    task_type: Optional[str] = None  # Optional, flexible field - can be any user-defined value
    status: str = "todo"
    priority: int = 3
    progress: int = 0
    idea_node_id: Optional[str] = None
    milestone_id: Optional[int] = None
    parent_task_id: Optional[str] = None
    estimated_hours: Optional[float] = None
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    assigned_to: Optional[str] = None
    created_by: str
    tags: Optional[List[str]] = None
    metadata: Optional[dict] = None  # Flexible metadata for custom fields


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    task_type: Optional[str] = None  # Optional, flexible field
    status: Optional[str] = None
    priority: Optional[int] = None
    progress: Optional[int] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    completed_at: Optional[str] = None
    assigned_to: Optional[str] = None
    tags: Optional[List[str]] = None
    metadata: Optional[dict] = None  # Flexible metadata for custom fields
    idea_node_id: Optional[str] = None
    milestone_id: Optional[int] = None


class LearningResourceCreate(BaseModel):
    title: str
    type: str  # 'video', 'article', 'book', 'course', 'documentation', 'practice'
    url: Optional[str] = None
    description: Optional[str] = None
    estimated_time_minutes: Optional[int] = None
    status: str = "not_started"


class LearningResourceUpdate(BaseModel):
    title: Optional[str] = None
    type: Optional[str] = None
    url: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    progress: Optional[int] = None
    estimated_time_minutes: Optional[int] = None
    actual_time_minutes: Optional[int] = None
    notes: Optional[str] = None
    key_takeaways: Optional[List[str]] = None


class SubtaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None
    status: str = "todo"


class SubtaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None


class ConvertIdeaRequest(BaseModel):
    idea_node_id: str
    project_id: str  # Changed to str for UUID support
    created_by: str
    title: str
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    metadata: Optional[dict] = None


class TaskDependencyCreate(BaseModel):
    depends_on_task_id: str


# ==================== Health Check ====================

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "task-management"}


# ==================== Task Endpoints ====================

@router.post("/", response_model=dict)
async def create_task(
    task_data: TaskCreate,
    db: Session = Depends(get_db)
):
    """Create a new task"""

    service = TaskService(db)

    # Parse datetime strings
    start_date = datetime.fromisoformat(task_data.start_date) if task_data.start_date else None
    due_date = datetime.fromisoformat(task_data.due_date) if task_data.due_date else None

    task = service.create_task(
        project_id=task_data.project_id,
        title=task_data.title,
        created_by=task_data.created_by,
        description=task_data.description,
        task_type=task_data.task_type,
        status=task_data.status,
        priority=task_data.priority,
        progress=task_data.progress,
        idea_node_id=task_data.idea_node_id,
        milestone_id=task_data.milestone_id,
        parent_task_id=task_data.parent_task_id,
        estimated_hours=task_data.estimated_hours,
        start_date=start_date,
        due_date=due_date,
        assigned_to=task_data.assigned_to,
        tags=task_data.tags,
        metadata=task_data.metadata,
    )

    return {"success": True, "task": task.to_dict()}


@router.get("/{task_id}", response_model=dict)
async def get_task(
    task_id: str,
    include_resources: bool = Query(False),
    include_subtasks: bool = Query(False),
    db: Session = Depends(get_db)
):
    """Get task by ID"""
    service = TaskService(db)
    task = service.get_task(task_id, include_resources=include_resources, include_subtasks=include_subtasks)

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    return {
        "success": True,
        "task": task.to_dict(include_resources=include_resources, include_subtasks=include_subtasks)
    }


@router.get("/project/{project_id}", response_model=dict)
async def get_project_tasks(
    project_id: str,  # Changed to str for UUID support
    status: Optional[str] = None,
    task_type: Optional[str] = None,
    assigned_to: Optional[str] = None,
    priority: Optional[int] = None,
    milestone_id: Optional[int] = None,
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Get all tasks for a project with optional filters"""

    service = TaskService(db)

    tasks = service.get_tasks_by_project(
        project_id=project_id,
        status=status,
        task_type=task_type,
        assigned_to=assigned_to,
        priority=priority,
        milestone_id=milestone_id,
        limit=limit,
        offset=offset,
    )

    return {
        "success": True,
        "tasks": [task.to_dict() for task in tasks],
        "count": len(tasks)
    }


@router.get("/project/{project_id}/stats", response_model=dict)
async def get_project_task_stats(
    project_id: str,  # Changed to str for UUID support
    db: Session = Depends(get_db)
):
    """Get task statistics for a project"""

    service = TaskService(db)
    stats = service.get_task_stats(project_id)

    return {"success": True, "stats": stats}


@router.get("/idea-node/{idea_node_id}", response_model=dict)
async def get_tasks_by_idea_node(
    idea_node_id: str,
    db: Session = Depends(get_db)
):
    """Get all tasks linked to an idea node"""
    service = TaskService(db)
    tasks = service.get_tasks_by_idea_node(idea_node_id)

    return {
        "success": True,
        "tasks": [task.to_dict() for task in tasks],
        "count": len(tasks)
    }


@router.put("/{task_id}", response_model=dict)
async def update_task(
    task_id: str,
    task_data: TaskUpdate,
    db: Session = Depends(get_db)
):
    """Update task"""
    service = TaskService(db)

    # Parse datetime strings
    update_data = task_data.dict(exclude_none=True)

    if 'start_date' in update_data and update_data['start_date']:
        update_data['start_date'] = datetime.fromisoformat(update_data['start_date'])
    if 'due_date' in update_data and update_data['due_date']:
        update_data['due_date'] = datetime.fromisoformat(update_data['due_date'])
    if 'completed_at' in update_data and update_data['completed_at']:
        update_data['completed_at'] = datetime.fromisoformat(update_data['completed_at'])

    task = service.update_task(task_id, **update_data)

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    return {"success": True, "task": task.to_dict()}


@router.patch("/{task_id}/status", response_model=dict)
async def update_task_status(
    task_id: str,
    status: str,
    db: Session = Depends(get_db)
):
    """Quick update of task status"""
    service = TaskService(db)
    task = service.update_task_status(task_id, status)

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    return {"success": True, "task": task.to_dict()}


@router.patch("/{task_id}/progress", response_model=dict)
async def update_task_progress(
    task_id: str,
    progress: int,
    db: Session = Depends(get_db)
):
    """Quick update of task progress"""
    service = TaskService(db)
    task = service.update_task_progress(task_id, progress)

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    return {"success": True, "task": task.to_dict()}


@router.delete("/{task_id}", response_model=dict)
async def delete_task(
    task_id: str,
    db: Session = Depends(get_db)
):
    """Delete task"""
    service = TaskService(db)
    success = service.delete_task(task_id)

    if not success:
        raise HTTPException(status_code=404, detail="Task not found")

    return {"success": True, "message": "Task deleted successfully"}


# ==================== Learning Resource Endpoints ====================

@router.post("/{task_id}/resources", response_model=dict)
async def create_learning_resource(
    task_id: str,
    resource_data: LearningResourceCreate,
    db: Session = Depends(get_db)
):
    """Create a learning resource for a task"""
    service = TaskService(db)

    resource = service.create_learning_resource(
        task_id=task_id,
        title=resource_data.title,
        resource_type=resource_data.type,
        url=resource_data.url,
        description=resource_data.description,
        estimated_time_minutes=resource_data.estimated_time_minutes,
        status=resource_data.status,
    )

    if not resource:
        raise HTTPException(status_code=400, detail="Cannot add resource to non-learning task")

    return {"success": True, "resource": resource.to_dict()}


@router.get("/{task_id}/resources", response_model=dict)
async def get_learning_resources(
    task_id: str,
    db: Session = Depends(get_db)
):
    """Get all learning resources for a task"""
    service = TaskService(db)
    resources = service.get_learning_resources_by_task(task_id)

    return {
        "success": True,
        "resources": [r.to_dict() for r in resources],
        "count": len(resources)
    }


@router.get("/{task_id}/resources/{resource_id}", response_model=dict)
async def get_learning_resource(
    task_id: str,
    resource_id: str,
    db: Session = Depends(get_db)
):
    """Get a specific learning resource"""
    service = TaskService(db)
    resource = service.get_learning_resource(resource_id)

    if not resource or resource.task_id != task_id:
        raise HTTPException(status_code=404, detail="Resource not found")

    return {"success": True, "resource": resource.to_dict()}


@router.put("/{task_id}/resources/{resource_id}", response_model=dict)
async def update_learning_resource(
    task_id: str,
    resource_id: str,
    resource_data: LearningResourceUpdate,
    db: Session = Depends(get_db)
):
    """Update learning resource"""
    service = TaskService(db)

    update_data = resource_data.dict(exclude_none=True)
    resource = service.update_learning_resource(resource_id, **update_data)

    if not resource or resource.task_id != task_id:
        raise HTTPException(status_code=404, detail="Resource not found")

    return {"success": True, "resource": resource.to_dict()}


@router.post("/{task_id}/resources/{resource_id}/complete", response_model=dict)
async def mark_resource_complete(
    task_id: str,
    resource_id: str,
    notes: Optional[str] = None,
    key_takeaways: Optional[List[str]] = None,
    db: Session = Depends(get_db)
):
    """Mark a learning resource as completed"""
    service = TaskService(db)

    resource = service.mark_resource_complete(resource_id, notes, key_takeaways)

    if not resource or resource.task_id != task_id:
        raise HTTPException(status_code=404, detail="Resource not found")

    return {"success": True, "resource": resource.to_dict()}


@router.delete("/{task_id}/resources/{resource_id}", response_model=dict)
async def delete_learning_resource(
    task_id: str,
    resource_id: str,
    db: Session = Depends(get_db)
):
    """Delete learning resource"""
    service = TaskService(db)

    # Verify resource belongs to task
    resource = service.get_learning_resource(resource_id)
    if not resource or resource.task_id != task_id:
        raise HTTPException(status_code=404, detail="Resource not found")

    success = service.delete_learning_resource(resource_id)

    if not success:
        raise HTTPException(status_code=404, detail="Resource not found")

    return {"success": True, "message": "Resource deleted successfully"}


# ==================== Subtask Endpoints ====================

@router.post("/{task_id}/subtasks", response_model=dict)
async def create_subtask(
    task_id: str,
    subtask_data: SubtaskCreate,
    db: Session = Depends(get_db)
):
    """Create a subtask for a task"""
    service = TaskService(db)

    due_date = datetime.fromisoformat(subtask_data.due_date) if subtask_data.due_date else None

    subtask = service.create_subtask(
        parent_task_id=task_id,
        title=subtask_data.title,
        description=subtask_data.description,
        assigned_to=subtask_data.assigned_to,
        due_date=due_date,
        status=subtask_data.status,
    )

    if not subtask:
        raise HTTPException(status_code=400, detail="Parent task not found")

    return {"success": True, "subtask": subtask.to_dict()}


@router.get("/{task_id}/subtasks", response_model=dict)
async def get_subtasks(
    task_id: str,
    db: Session = Depends(get_db)
):
    """Get all subtasks for a task"""
    service = TaskService(db)
    subtasks = service.get_subtasks_by_task(task_id)

    return {
        "success": True,
        "subtasks": [s.to_dict() for s in subtasks],
        "count": len(subtasks)
    }


@router.put("/{task_id}/subtasks/{subtask_id}", response_model=dict)
async def update_subtask(
    task_id: str,
    subtask_id: str,
    subtask_data: SubtaskUpdate,
    db: Session = Depends(get_db)
):
    """Update subtask"""
    service = TaskService(db)

    update_data = subtask_data.dict(exclude_none=True)

    if 'due_date' in update_data and update_data['due_date']:
        update_data['due_date'] = datetime.fromisoformat(update_data['due_date'])

    subtask = service.update_subtask(subtask_id, **update_data)

    if not subtask or subtask.parent_task_id != task_id:
        raise HTTPException(status_code=404, detail="Subtask not found")

    return {"success": True, "subtask": subtask.to_dict()}


@router.delete("/{task_id}/subtasks/{subtask_id}", response_model=dict)
async def delete_subtask(
    task_id: str,
    subtask_id: str,
    db: Session = Depends(get_db)
):
    """Delete subtask"""
    service = TaskService(db)

    # Verify subtask belongs to task
    subtask = service.get_subtask(subtask_id)
    if not subtask or subtask.parent_task_id != task_id:
        raise HTTPException(status_code=404, detail="Subtask not found")

    success = service.delete_subtask(subtask_id)

    if not success:
        raise HTTPException(status_code=404, detail="Subtask not found")

    return {"success": True, "message": "Subtask deleted successfully"}


# ==================== Task Dependencies ====================

@router.post("/{task_id}/dependencies", response_model=dict)
async def add_task_dependency(
    task_id: str,
    dependency_data: TaskDependencyCreate,
    db: Session = Depends(get_db)
):
    """Add a task dependency"""
    service = TaskService(db)

    dependency = service.add_task_dependency(task_id, dependency_data.depends_on_task_id)

    if not dependency:
        raise HTTPException(status_code=400, detail="Cannot create dependency (circular or tasks not found)")

    return {"success": True, "dependency": dependency.to_dict()}


@router.get("/{task_id}/dependencies", response_model=dict)
async def get_task_dependencies(
    task_id: str,
    db: Session = Depends(get_db)
):
    """Get all dependencies for a task"""
    service = TaskService(db)
    dependencies = service.get_task_dependencies(task_id)

    return {
        "success": True,
        "dependencies": [d.to_dict() for d in dependencies],
        "count": len(dependencies)
    }


@router.get("/{task_id}/dependent-tasks", response_model=dict)
async def get_dependent_tasks(
    task_id: str,
    db: Session = Depends(get_db)
):
    """Get all tasks that depend on this task"""
    service = TaskService(db)
    dependencies = service.get_dependent_tasks(task_id)

    return {
        "success": True,
        "dependent_tasks": [d.to_dict() for d in dependencies],
        "count": len(dependencies)
    }


@router.delete("/dependencies/{dependency_id}", response_model=dict)
async def remove_task_dependency(
    dependency_id: int,
    db: Session = Depends(get_db)
):
    """Remove a task dependency"""
    service = TaskService(db)
    success = service.remove_task_dependency(dependency_id)

    if not success:
        raise HTTPException(status_code=404, detail="Dependency not found")

    return {"success": True, "message": "Dependency removed successfully"}


# ==================== Conversion ====================

@router.post("/convert-from-idea", response_model=dict)
async def convert_idea_to_task(
    convert_data: ConvertIdeaRequest,
    db: Session = Depends(get_db)
):
    """Convert an Idea Forest node to a task"""

    service = TaskService(db)

    task = service.convert_idea_to_task(
        idea_node_id=convert_data.idea_node_id,
        project_id=convert_data.project_id,
        created_by=convert_data.created_by,
        title=convert_data.title,
        description=convert_data.description,
        tags=convert_data.tags,
        metadata=convert_data.metadata,
    )

    return {"success": True, "task": task.to_dict()}
