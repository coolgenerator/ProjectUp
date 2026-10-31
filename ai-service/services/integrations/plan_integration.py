"""
Plan Integration Service

Fetches and manages project plans from the backend API.
"""

import logging
from typing import List, Dict, Any, Optional
from services.backend_client import backend_client

logger = logging.getLogger(__name__)


class PlanIntegrationService:
    """Service for integrating with backend plans API."""

    async def get_project_plans(self, project_sid: str) -> List[Dict[str, Any]]:
        """
        Get all plans for a project.

        Args:
            project_sid: Project short ID

        Returns:
            List of plan dictionaries
        """
        try:
            response = await backend_client.get(f"/projects/{project_sid}/plans")

            if response.get("success") and "plans" in response:
                plans = response["plans"]
                logger.info(f"Fetched {len(plans)} plans for project {project_sid}")
                return plans
            else:
                logger.warning(f"No plans found for project {project_sid}")
                return []

        except Exception as e:
            logger.error(f"Error fetching plans for project {project_sid}: {str(e)}")
            return []

    async def get_plan(self, project_sid: str, plan_id: int) -> Optional[Dict[str, Any]]:
        """
        Get a specific plan by ID.

        Args:
            project_sid: Project short ID
            plan_id: Plan ID

        Returns:
            Plan dictionary or None if not found
        """
        try:
            response = await backend_client.get(f"/projects/{project_sid}/plans/{plan_id}")

            if response.get("success") and "plan" in response:
                return response["plan"]
            else:
                logger.warning(f"Plan {plan_id} not found for project {project_sid}")
                return None

        except Exception as e:
            logger.error(f"Error fetching plan {plan_id}: {str(e)}")
            return None

    async def get_plans_by_type(self, project_sid: str, plan_type: str) -> List[Dict[str, Any]]:
        """
        Get plans filtered by type.

        Args:
            project_sid: Project short ID
            plan_type: Plan type (roadmap, curriculum, sprint, custom)

        Returns:
            List of filtered plans
        """
        all_plans = await self.get_project_plans(project_sid)
        return [plan for plan in all_plans if plan.get("plan_type") == plan_type]

    async def get_plans_by_category(self, project_sid: str, category: str) -> List[Dict[str, Any]]:
        """Get plans filtered by category."""
        all_plans = await self.get_project_plans(project_sid)
        return [plan for plan in all_plans if plan.get("category") == category]

    async def get_plans_by_tags(self, project_sid: str, tags: List[str]) -> List[Dict[str, Any]]:
        """Get plans that match any of the provided tags."""
        all_plans = await self.get_project_plans(project_sid)
        filtered = []

        for plan in all_plans:
            plan_tags = plan.get("tags", []) or []
            if any(tag in plan_tags for tag in tags):
                filtered.append(plan)

        return filtered

    def extract_plan_content(self, plan: Dict[str, Any]) -> str:
        """
        Extract readable content from a plan for AI processing.

        Args:
            plan: Plan dictionary

        Returns:
            Formatted plan content as string
        """
        content_parts = [
            f"# {plan.get('title', 'Untitled Plan')}",
            f"\n**Type:** {plan.get('plan_type', 'unknown')}",
            f"**Status:** {plan.get('status', 'unknown')}",
        ]

        if plan.get('category'):
            content_parts.append(f"**Category:** {plan['category']}")

        if plan.get('tags'):
            content_parts.append(f"**Tags:** {', '.join(plan['tags'])}")

        if plan.get('description'):
            content_parts.append(f"\n## Description\n{plan['description']}")

        # Extract content
        content = plan.get('content', {})

        # Handle markdown content (custom plans)
        if isinstance(content, dict) and 'markdown' in content:
            content_parts.append(f"\n## Content\n{content['markdown']}")

        # Handle structured sections (AI-generated plans)
        elif isinstance(content, dict) and 'sections' in content:
            content_parts.append("\n## Sections")
            for section in content['sections']:
                content_parts.append(f"\n### {section.get('title', 'Section')}")
                content_parts.append(section.get('content', ''))

        return "\n".join(content_parts)

    async def get_plans_summary(self, project_sid: str) -> Dict[str, Any]:
        """
        Get a summary of all plans for a project.

        Returns:
            Dictionary with plan statistics and summaries
        """
        plans = await self.get_project_plans(project_sid)

        if not plans:
            return {
                "total": 0,
                "by_type": {},
                "by_status": {},
                "categories": [],
                "all_tags": []
            }

        # Calculate statistics
        by_type = {}
        by_status = {}
        categories = set()
        all_tags = set()

        for plan in plans:
            # Count by type
            plan_type = plan.get('plan_type', 'unknown')
            by_type[plan_type] = by_type.get(plan_type, 0) + 1

            # Count by status
            status = plan.get('status', 'unknown')
            by_status[status] = by_status.get(status, 0) + 1

            # Collect categories
            if plan.get('category'):
                categories.add(plan['category'])

            # Collect tags
            if plan.get('tags'):
                all_tags.update(plan['tags'])

        return {
            "total": len(plans),
            "by_type": by_type,
            "by_status": by_status,
            "categories": sorted(list(categories)),
            "all_tags": sorted(list(all_tags)),
            "plans": [
                {
                    "id": p.get("id"),
                    "title": p.get("title"),
                    "plan_type": p.get("plan_type"),
                    "status": p.get("status"),
                    "category": p.get("category"),
                    "tags": p.get("tags", [])
                }
                for p in plans
            ]
        }


# Singleton instance
plan_integration = PlanIntegrationService()
