"""
Milestone Integration Service

Fetches and manages milestones from the backend API.
"""

import logging
from typing import List, Dict, Any, Optional
from services.backend_client import backend_client

logger = logging.getLogger(__name__)


class MilestoneIntegrationService:
    """Service for integrating with backend milestones API."""

    async def get_project_milestones(self, project_sid: str) -> List[Dict[str, Any]]:
        """
        Get all milestones for a project.

        Args:
            project_sid: Project short ID

        Returns:
            List of milestone dictionaries
        """
        try:
            response = await backend_client.get(f"/projects/{project_sid}/milestones")

            # Handle different response formats
            if isinstance(response, list):
                milestones = response
            elif response.get("success") and "milestones" in response:
                milestones = response["milestones"]
            elif "milestones" in response:
                milestones = response["milestones"]
            else:
                milestones = []

            logger.info(f"Fetched {len(milestones)} milestones for project {project_sid}")
            return milestones

        except Exception as e:
            logger.error(f"Error fetching milestones for project {project_sid}: {str(e)}")
            return []

    async def get_milestone(self, project_sid: str, milestone_id: int) -> Optional[Dict[str, Any]]:
        """Get a specific milestone by ID."""
        try:
            response = await backend_client.get(f"/projects/{project_sid}/milestones/{milestone_id}")

            if response.get("success") and "milestone" in response:
                return response["milestone"]
            elif "milestone" in response:
                return response["milestone"]
            else:
                return None

        except Exception as e:
            logger.error(f"Error fetching milestone {milestone_id}: {str(e)}")
            return None

    async def get_milestones_by_status(self, project_sid: str, status: str) -> List[Dict[str, Any]]:
        """Get milestones filtered by status."""
        all_milestones = await self.get_project_milestones(project_sid)
        return [ms for ms in all_milestones if ms.get("status") == status]

    async def get_pending_milestones(self, project_sid: str) -> List[Dict[str, Any]]:
        """Get all pending/incomplete milestones."""
        all_milestones = await self.get_project_milestones(project_sid)
        return [
            ms for ms in all_milestones
            if ms.get("status") in ["pending", "in_progress", "todo"]
        ]

    async def get_completed_milestones(self, project_sid: str) -> List[Dict[str, Any]]:
        """Get all completed milestones."""
        return await self.get_milestones_by_status(project_sid, "completed")

    async def get_milestone_tasks(self, project_sid: str, milestone_id: int) -> List[Dict[str, Any]]:
        """Get all tasks associated with a milestone."""
        try:
            # Import here to avoid circular dependency
            from .task_integration import task_integration

            all_tasks = await task_integration.get_project_tasks(project_sid)
            return [task for task in all_tasks if task.get("milestone_id") == milestone_id]

        except Exception as e:
            logger.error(f"Error fetching tasks for milestone {milestone_id}: {str(e)}")
            return []

    def format_milestone_list(self, milestones: List[Dict[str, Any]]) -> str:
        """
        Format milestones as readable string for AI processing.

        Args:
            milestones: List of milestone dictionaries

        Returns:
            Formatted milestone list as string
        """
        if not milestones:
            return "No milestones found."

        formatted = []
        for i, ms in enumerate(milestones, 1):
            ms_str = f"{i}. **{ms.get('title', 'Untitled Milestone')}**"

            if ms.get('status'):
                ms_str += f" [{ms['status']}]"

            if ms.get('priority'):
                priority = ms['priority']
                priority_label = {3: "High", 2: "Medium", 1: "Low"}.get(priority, str(priority))
                ms_str += f" (Priority: {priority_label})"

            if ms.get('description'):
                ms_str += f"\n   {ms['description']}"

            if ms.get('due_date'):
                ms_str += f"\n   Due: {ms['due_date']}"

            if ms.get('progress') is not None:
                ms_str += f"\n   Progress: {ms['progress']}%"

            formatted.append(ms_str)

        return "\n\n".join(formatted)

    async def get_milestones_summary(self, project_sid: str) -> Dict[str, Any]:
        """
        Get a summary of milestones for a project.

        Returns:
            Dictionary with milestone statistics
        """
        milestones = await self.get_project_milestones(project_sid)

        if not milestones:
            return {
                "total": 0,
                "by_status": {},
                "by_priority": {},
                "pending_count": 0,
                "completed_count": 0,
                "average_progress": 0
            }

        by_status = {}
        by_priority = {}
        pending_count = 0
        completed_count = 0
        total_progress = 0

        for ms in milestones:
            # Count by status
            status = ms.get('status', 'unknown')
            by_status[status] = by_status.get(status, 0) + 1

            if status in ["pending", "in_progress", "todo"]:
                pending_count += 1
            elif status == "completed":
                completed_count += 1

            # Count by priority
            priority = ms.get('priority', 0)
            priority_label = {3: "High", 2: "Medium", 1: "Low"}.get(priority, "Unknown")
            by_priority[priority_label] = by_priority.get(priority_label, 0) + 1

            # Calculate average progress
            total_progress += ms.get('progress', 0)

        return {
            "total": len(milestones),
            "by_status": by_status,
            "by_priority": by_priority,
            "pending_count": pending_count,
            "completed_count": completed_count,
            "average_progress": total_progress / len(milestones) if milestones else 0,
            "completion_rate": (completed_count / len(milestones) * 100) if milestones else 0
        }


# Singleton instance
milestone_integration = MilestoneIntegrationService()
