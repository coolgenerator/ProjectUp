"""
Project Context Builder
Builds comprehensive project context for node chats with access to tasks, resources, milestones, and more
"""

import logging
import uuid
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from datetime import datetime

logger = logging.getLogger(__name__)


class ProjectContextBuilder:
    """Build rich project context for AI chat with access to all project data"""

    def __init__(self, db: Session):
        self.db = db

    async def build_full_context(
        self,
        node_id: uuid.UUID,
        project_id: str,
        include_tasks: bool = True,
        include_resources: bool = True,
        include_milestones: bool = True,
        include_sibling_nodes: bool = True,
        include_project_description: bool = True
    ) -> Dict[str, Any]:
        """
        Build comprehensive project context for chat

        Args:
            node_id: Current node UUID
            project_id: Project identifier
            include_tasks: Include project tasks
            include_resources: Include project resources
            include_milestones: Include project milestones
            include_sibling_nodes: Include sibling nodes for context
            include_project_description: Include project overview

        Returns:
            Rich context dictionary with all requested data
        """
        context = {
            "node_id": str(node_id),
            "project_id": project_id,
            "timestamp": datetime.utcnow().isoformat()
        }

        try:
            # Get current node details
            node_context = await self._get_node_context(node_id)
            context["current_node"] = node_context

            # Get project description and metadata
            if include_project_description:
                project_context = await self._get_project_context(project_id)
                context["project"] = project_context

            # Get tasks related to this project/node
            if include_tasks:
                tasks_context = await self._get_tasks_context(project_id, node_id)
                context["tasks"] = tasks_context

            # Get resources
            if include_resources:
                resources_context = await self._get_resources_context(project_id, node_id)
                context["resources"] = resources_context

            # Get milestones
            if include_milestones:
                milestones_context = await self._get_milestones_context(project_id)
                context["milestones"] = milestones_context

            # Get sibling and related nodes
            if include_sibling_nodes:
                related_nodes = await self._get_related_nodes_context(node_id)
                context["related_nodes"] = related_nodes

            # Build summary statistics
            context["statistics"] = self._build_statistics_summary(context)

            logger.info(f"Built full project context for node {node_id}: {len(context)} sections")
            return context

        except Exception as e:
            logger.error(f"Error building project context: {e}")
            # Return minimal context on error
            return {
                "node_id": str(node_id),
                "project_id": project_id,
                "error": str(e),
                "current_node": node_context if 'node_context' in locals() else {}
            }

    async def _get_node_context(self, node_id: uuid.UUID) -> Dict[str, Any]:
        """Get current node details"""
        from models.database.tree_models import IdeaNode

        node = self.db.query(IdeaNode).filter(IdeaNode.id == node_id).first()

        if not node:
            return {}

        return {
            "id": str(node.id),
            "title": node.title,
            "description": node.description,
            "summary": node.summary,
            "metadata": node.node_metadata or {},
            "tags": node.tags or [],
            "created_at": node.created_at.isoformat() if node.created_at else None,
            "parent_id": str(node.parent_id) if node.parent_id else None
        }

    async def _get_project_context(self, project_id: str) -> Dict[str, Any]:
        """Get project overview and description"""
        # Import here to avoid circular imports
        from models.database.project_models import Project

        try:
            # project_id is the sid (string), not the integer id
            project = self.db.query(Project).filter(Project.sid == project_id).first()

            if not project:
                return {"error": "Project not found"}

            return {
                "id": project.project_id,  # Primary key is project_id, not id
                "sid": project.sid,
                "name": project.title,  # Project uses 'title', not 'name'
                "description": project.description,
                "project_type": project.project_type,
                "status": project.status,
                "created_at": project.created_at.isoformat() if project.created_at else None,
                "owner_id": project.owner_id
            }
        except Exception as e:
            logger.error(f"Error getting project context: {e}")
            return {"error": str(e)}

    async def _get_tasks_context(self, project_id: str, node_id: uuid.UUID) -> Dict[str, Any]:
        """Get tasks related to project and node"""
        from models.database.task import Task

        try:
            # Get tasks for this node
            node_tasks = self.db.query(Task).filter(
                Task.idea_node_id == str(node_id)
            ).all()

            # Get all project tasks for context
            project_tasks = self.db.query(Task).filter(
                Task.project_id == project_id
            ).limit(50).all()

            return {
                "node_tasks": [self._task_to_dict(t) for t in node_tasks],
                "project_tasks_summary": {
                    "total": len(project_tasks),
                    "by_status": self._group_by_status(project_tasks),
                    "by_type": self._group_by_type(project_tasks),
                    "high_priority": [
                        self._task_to_dict(t) for t in project_tasks
                        if t.priority <= 2
                    ][:10]  # Top 10 high priority tasks
                }
            }
        except Exception as e:
            logger.error(f"Error getting tasks context: {e}")
            return {"error": str(e)}

    async def _get_resources_context(self, project_id: str, node_id: uuid.UUID) -> Dict[str, Any]:
        """Get resources related to project"""
        # TODO: Implement resource retrieval when resource model is defined
        # For now, return placeholder
        return {
            "node_resources": [],
            "project_resources": [],
            "note": "Resource retrieval not yet implemented"
        }

    async def _get_milestones_context(self, project_id: str) -> Dict[str, Any]:
        """Get project milestones"""
        from models.database.milestone import Milestone
        from models.database.project_models import Project

        try:
            # project_id is the sid (string), need to get the integer project_id
            project = self.db.query(Project).filter(Project.sid == project_id).first()
            if not project:
                return {"error": "Project not found"}

            milestones = self.db.query(Milestone).filter(
                Milestone.project_id == project.project_id
            ).all()

            return {
                "total": len(milestones),
                "by_status": self._group_milestones_by_status(milestones),
                "upcoming": [
                    self._milestone_to_dict(m) for m in milestones
                    if m.target_date and m.target_date > datetime.utcnow()
                ][:5],  # Next 5 upcoming
                "all": [self._milestone_to_dict(m) for m in milestones]
            }
        except Exception as e:
            logger.error(f"Error getting milestones context: {e}")
            return {"error": str(e)}

    async def _get_related_nodes_context(self, node_id: uuid.UUID) -> Dict[str, Any]:
        """Get sibling and child nodes for context"""
        from models.database.tree_models import IdeaNode

        try:
            current_node = self.db.query(IdeaNode).filter(IdeaNode.id == node_id).first()

            if not current_node:
                return {}

            # Get siblings (same parent)
            siblings = []
            if current_node.parent_id:
                siblings = self.db.query(IdeaNode).filter(
                    IdeaNode.parent_id == current_node.parent_id,
                    IdeaNode.id != node_id
                ).limit(10).all()

            # Get children
            children = self.db.query(IdeaNode).filter(
                IdeaNode.parent_id == node_id
            ).limit(20).all()

            # Get parent
            parent = None
            if current_node.parent_id:
                parent = self.db.query(IdeaNode).filter(
                    IdeaNode.id == current_node.parent_id
                ).first()

            return {
                "parent": self._node_to_summary(parent) if parent else None,
                "siblings": [self._node_to_summary(n) for n in siblings],
                "children": [self._node_to_summary(n) for n in children]
            }
        except Exception as e:
            logger.error(f"Error getting related nodes: {e}")
            return {"error": str(e)}

    def _build_statistics_summary(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Build summary statistics from context"""
        stats = {}

        # Task statistics
        if "tasks" in context:
            tasks = context["tasks"]
            if "node_tasks" in tasks:
                stats["node_tasks_count"] = len(tasks["node_tasks"])
            if "project_tasks_summary" in tasks:
                stats["project_tasks_total"] = tasks["project_tasks_summary"].get("total", 0)

        # Milestone statistics
        if "milestones" in context:
            milestones = context["milestones"]
            stats["milestones_total"] = milestones.get("total", 0)
            stats["upcoming_milestones"] = len(milestones.get("upcoming", []))

        # Node statistics
        if "related_nodes" in context:
            related = context["related_nodes"]
            stats["sibling_nodes"] = len(related.get("siblings", []))
            stats["child_nodes"] = len(related.get("children", []))

        return stats

    def _task_to_dict(self, task) -> Dict[str, Any]:
        """Convert task to dictionary"""
        return {
            "id": task.id,
            "title": task.title,
            "description": task.description,
            "task_type": task.task_type,
            "status": task.status,
            "priority": task.priority,
            "estimated_hours": float(task.estimated_hours) if task.estimated_hours else None,
            "due_date": task.due_date.isoformat() if task.due_date else None,
            "tags": task.tags or []
        }

    def _milestone_to_dict(self, milestone) -> Dict[str, Any]:
        """Convert milestone to dictionary"""
        return {
            "id": milestone.milestone_id,  # Primary key is milestone_id, not id
            "title": milestone.title,
            "description": milestone.description,
            "status": milestone.status,
            "target_date": milestone.target_date.isoformat() if milestone.target_date else None,
            "priority": milestone.priority
        }

    def _node_to_summary(self, node) -> Dict[str, Any]:
        """Convert node to summary dict"""
        return {
            "id": str(node.id),
            "title": node.title,
            "summary": node.summary,
            "tags": node.tags or []
        }

    def _group_by_status(self, tasks: List) -> Dict[str, int]:
        """Group tasks by status"""
        status_counts = {}
        for task in tasks:
            status = task.status or "unknown"
            status_counts[status] = status_counts.get(status, 0) + 1
        return status_counts

    def _group_by_type(self, tasks: List) -> Dict[str, int]:
        """Group tasks by type"""
        type_counts = {}
        for task in tasks:
            task_type = task.task_type or "unknown"
            type_counts[task_type] = type_counts.get(task_type, 0) + 1
        return type_counts

    def _group_milestones_by_status(self, milestones: List) -> Dict[str, int]:
        """Group milestones by status"""
        status_counts = {}
        for milestone in milestones:
            status = getattr(milestone, 'status', 'unknown')
            status_counts[status] = status_counts.get(status, 0) + 1
        return status_counts

    def format_context_for_prompt(self, context: Dict[str, Any]) -> str:
        """
        Format context into human-readable string for LLM prompt

        Returns:
            Formatted context string
        """
        lines = []

        # Project information
        if "project" in context:
            proj = context["project"]
            lines.append("## Project Information")
            lines.append(f"**Name:** {proj.get('name', 'N/A')}")
            if proj.get('description'):
                lines.append(f"**Description:** {proj['description']}")
            lines.append("")

        # Current node
        if "current_node" in context:
            node = context["current_node"]
            lines.append("## Current Node")
            lines.append(f"**Title:** {node.get('title', 'N/A')}")
            if node.get('description'):
                lines.append(f"**Description:** {node['description']}")
            if node.get('summary'):
                lines.append(f"**Summary:** {node['summary']}")
            lines.append("")

        # Tasks
        if "tasks" in context:
            tasks = context["tasks"]
            lines.append("## Tasks")

            if tasks.get("node_tasks"):
                lines.append(f"**Tasks for this node:** {len(tasks['node_tasks'])}")
                for task in tasks["node_tasks"][:5]:
                    lines.append(f"  - [{task['status']}] {task['title']} (Priority: {task['priority']})")

            if tasks.get("project_tasks_summary"):
                summary = tasks["project_tasks_summary"]
                lines.append(f"\n**Project-wide tasks:** {summary.get('total', 0)} total")
                if summary.get("by_status"):
                    status_str = ", ".join([f"{k}: {v}" for k, v in summary["by_status"].items()])
                    lines.append(f"  Status breakdown: {status_str}")

            lines.append("")

        # Milestones
        if "milestones" in context:
            milestones = context["milestones"]
            lines.append("## Milestones")
            lines.append(f"**Total:** {milestones.get('total', 0)}")

            if milestones.get("upcoming"):
                lines.append(f"**Upcoming milestones:**")
                for ms in milestones["upcoming"]:
                    lines.append(f"  - {ms['title']} (Due: {ms.get('target_date', 'N/A')})")

            lines.append("")

        # Related nodes
        if "related_nodes" in context:
            related = context["related_nodes"]

            if related.get("parent"):
                parent = related["parent"]
                lines.append("## Parent Node")
                lines.append(f"**{parent['title']}**")
                if parent.get('summary'):
                    lines.append(f"{parent['summary']}")
                lines.append("")

            if related.get("siblings"):
                lines.append(f"## Sibling Nodes ({len(related['siblings'])})")
                for sib in related["siblings"][:5]:
                    lines.append(f"  - {sib['title']}")
                lines.append("")

            if related.get("children"):
                lines.append(f"## Child Nodes ({len(related['children'])})")
                for child in related["children"][:5]:
                    lines.append(f"  - {child['title']}")
                lines.append("")

        # Statistics
        if "statistics" in context:
            stats = context["statistics"]
            lines.append("## Quick Statistics")
            for key, value in stats.items():
                formatted_key = key.replace("_", " ").title()
                lines.append(f"- {formatted_key}: {value}")

        return "\n".join(lines)
