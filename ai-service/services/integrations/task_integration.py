"""
Task Integration Service

Fetches and manages tasks from the backend API.
"""

import logging
from typing import List, Dict, Any, Optional
from services.backend_client import backend_client

logger = logging.getLogger(__name__)


class TaskIntegrationService:
    """Service for integrating with backend tasks API."""

    async def get_project_tasks(self, project_sid: str) -> List[Dict[str, Any]]:
        """
        Get all tasks for a project.

        Args:
            project_sid: Project short ID

        Returns:
            List of task dictionaries
        """
        try:
            response = await backend_client.get(f"/projects/{project_sid}/tasks")

            # Backend returns tasks directly in array or wrapped in success object
            if isinstance(response, list):
                tasks = response
            elif response.get("success") and "tasks" in response:
                tasks = response["tasks"]
            elif "tasks" in response:
                tasks = response["tasks"]
            else:
                tasks = []

            logger.info(f"Fetched {len(tasks)} tasks for project {project_sid}")
            return tasks

        except Exception as e:
            logger.error(f"Error fetching tasks for project {project_sid}: {str(e)}")
            return []

    async def get_tasks_by_status(self, project_sid: str, status: str) -> List[Dict[str, Any]]:
        """Get tasks filtered by status (todo, in_progress, done, etc.)."""
        all_tasks = await self.get_project_tasks(project_sid)
        return [task for task in all_tasks if task.get("status") == status]

    async def get_tasks_by_priority(self, project_sid: str, min_priority: int) -> List[Dict[str, Any]]:
        """Get tasks with priority >= min_priority."""
        all_tasks = await self.get_project_tasks(project_sid)
        return [task for task in all_tasks if task.get("priority", 0) >= min_priority]

    async def get_pending_tasks(self, project_sid: str) -> List[Dict[str, Any]]:
        """Get all pending/incomplete tasks."""
        all_tasks = await self.get_project_tasks(project_sid)
        return [
            task for task in all_tasks
            if task.get("status") in ["todo", "in_progress", "pending"]
        ]

    async def get_completed_tasks(self, project_sid: str) -> List[Dict[str, Any]]:
        """Get all completed tasks."""
        return await self.get_tasks_by_status(project_sid, "done")

    def format_task_list(self, tasks: List[Dict[str, Any]]) -> str:
        """
        Format tasks as readable string for AI processing.

        Args:
            tasks: List of task dictionaries

        Returns:
            Formatted task list as string
        """
        if not tasks:
            return "No tasks found."

        formatted = []
        for i, task in enumerate(tasks, 1):
            task_str = f"{i}. **{task.get('title', 'Untitled Task')}**"

            if task.get('status'):
                task_str += f" [{task['status']}]"

            if task.get('priority'):
                priority = task['priority']
                priority_label = {5: "Critical", 4: "High", 3: "Medium", 2: "Low", 1: "Minimal"}.get(priority, str(priority))
                task_str += f" (Priority: {priority_label})"

            if task.get('description'):
                task_str += f"\n   {task['description']}"

            if task.get('due_date'):
                task_str += f"\n   Due: {task['due_date']}"

            formatted.append(task_str)

        return "\n\n".join(formatted)

    async def get_tasks_summary(self, project_sid: str) -> Dict[str, Any]:
        """
        Get a summary of tasks for a project.

        Returns:
            Dictionary with task statistics
        """
        tasks = await self.get_project_tasks(project_sid)

        if not tasks:
            return {
                "total": 0,
                "by_status": {},
                "by_priority": {},
                "pending_count": 0,
                "completed_count": 0
            }

        by_status = {}
        by_priority = {}
        pending_count = 0
        completed_count = 0

        for task in tasks:
            # Count by status
            status = task.get('status', 'unknown')
            by_status[status] = by_status.get(status, 0) + 1

            if status in ["todo", "in_progress", "pending"]:
                pending_count += 1
            elif status == "done":
                completed_count += 1

            # Count by priority
            priority = task.get('priority', 0)
            priority_label = {5: "Critical", 4: "High", 3: "Medium", 2: "Low", 1: "Minimal"}.get(priority, "Unknown")
            by_priority[priority_label] = by_priority.get(priority_label, 0) + 1

        return {
            "total": len(tasks),
            "by_status": by_status,
            "by_priority": by_priority,
            "pending_count": pending_count,
            "completed_count": completed_count,
            "completion_rate": (completed_count / len(tasks) * 100) if tasks else 0
        }


# Singleton instance
task_integration = TaskIntegrationService()
