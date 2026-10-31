"""
Milestone Executor

Creates milestone nodes with deadline tracking when AI detects date mentions.
"""

import logging
from datetime import datetime
from typing import Dict, Any

from .base_executor import BaseExecutor
from models.entities.intent import ActionExecutionResult, ActionType

logger = logging.getLogger(__name__)


class MilestoneExecutor(BaseExecutor):
    """
    Executor for CREATE_MILESTONE action.

    Creates a milestone node with:
    - Due date tracking
    - Auto-created flag
    - Optional reminder scheduling
    """

    async def execute(
        self,
        parameters: Dict[str, Any],
        context: Dict[str, Any]
    ) -> ActionExecutionResult:
        """
        Execute milestone creation.

        Expected parameters:
            - milestone_title: Title for the milestone
            - due_date: Target completion date (ISO format or natural language)
            - description: Optional description
            - reminder_days_before: Optional reminder scheduling

        Expected context:
            - node_id: Parent node ID
            - session_id: Tree session ID
            - project_id: Project ID
            - user_id: User ID
        """
        try:
            logger.info("Executing CREATE_MILESTONE action")

            # Extract parameters
            title = parameters.get("milestone_title", "Milestone")
            due_date = parameters.get("due_date")
            description = parameters.get("description", "")
            reminder_days = parameters.get("reminder_days_before", 1)

            session_id = context.get("session_id")
            parent_id = context.get("node_id")

            if not session_id:
                raise ValueError("session_id required in context")

            # Parse due date if needed
            if isinstance(due_date, str):
                due_date = self._parse_date(due_date)

            # Create milestone node with metadata
            metadata = {
                "is_milestone": True,
                "due_date": due_date,
                "auto_created": True,
                "created_from_chat": True,
                "created_at": datetime.utcnow().isoformat(),
                "reminder_scheduled": False
            }

            node = await self.create_node(
                session_id=session_id,
                title=title,
                description=description,
                metadata=metadata,
                parent_id=parent_id
            )

            # TODO: Schedule reminder (future enhancement)
            # if reminder_days and due_date:
            #     await self._schedule_reminder(node["id"], due_date, reminder_days)

            return ActionExecutionResult(
                success=True,
                action_type=ActionType.CREATE_MILESTONE,
                message=f"✅ Created milestone '{title}' with deadline {due_date}",
                created_nodes=[node],
                metadata={
                    "due_date": due_date,
                    "reminder_scheduled": False
                }
            )

        except Exception as e:
            logger.error(f"Error executing CREATE_MILESTONE: {e}")
            return ActionExecutionResult(
                success=False,
                action_type=ActionType.CREATE_MILESTONE,
                message="Failed to create milestone",
                error=str(e)
            )

    def _parse_date(self, date_str: str) -> str:
        """
        Parse date string to ISO format.

        Handles formats like:
        - "2025-03-15"
        - "March 15, 2025"
        - "next Friday"

        Returns ISO format string.
        """
        try:
            # Try ISO format first
            if "T" in date_str or "-" in date_str:
                dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                return dt.date().isoformat()

            # For now, return as-is and let frontend handle natural language
            # TODO: Implement natural language date parsing
            return date_str

        except Exception as e:
            logger.warning(f"Could not parse date '{date_str}': {e}")
            return date_str
