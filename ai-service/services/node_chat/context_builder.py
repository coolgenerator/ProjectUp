"""
Context Builder for Node Chat
Builds rich context by recursively traversing the tree and fetching project information
"""

import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import UUID as SQLUUID
import uuid

from models.database.tree_models import IdeaNode, IdeaTree

logger = logging.getLogger(__name__)


class NodeChatContextBuilder:
    """Builds enhanced context for node chat sessions"""

    def __init__(self, db: Session):
        self.db = db

    def build_context(
        self,
        node_id: str,
        project_id: str,
        fallback_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Build enhanced context for a node chat session

        Args:
            node_id: UUID of the node
            project_id: UUID of the project
            fallback_context: Fallback context from frontend (used if DB fetch fails)

        Returns:
            Enhanced context dictionary with:
            - node info (title, description)
            - parent chain (up to root)
            - tree session info
            - project info (if available)
            - children info
        """
        try:
            node_uuid = uuid.UUID(node_id)

            # Fetch the node
            node = self.db.query(IdeaNode).filter(
                IdeaNode.id == node_uuid
            ).first()

            if not node:
                logger.warning(f"Node {node_id} not found, using fallback context")
                return fallback_context or {}

            # Build context
            context = {
                # Current node
                "node_title": node.title or "",
                "node_description": node.description or "",
                "node_is_root": node.is_root,
                "node_metadata": node.metadata,

                # IDs for reference
                "node_id": str(node.id),
                "project_id": project_id,
                "session_id": str(node.session_id) if node.session_id else None,
            }

            # Fetch parent chain (up to root)
            parent_chain = self._get_parent_chain(node)
            if parent_chain:
                context["parent_chain"] = parent_chain
                context["tree_depth"] = len(parent_chain)

            # Fetch children info
            children = self._get_children_info(node)
            if children:
                context["children"] = children
                context["children_count"] = len(children)

            # Fetch idea tree info
            if node.session_id:
                idea_tree_info = self._get_idea_tree_info(node.session_id)
                if idea_tree_info:
                    context["idea_tree"] = idea_tree_info

            # TODO: Fetch project info from main backend
            # For now, we'll leave this as a placeholder
            # You could make an HTTP request to the Go backend's /api/projects/{id} endpoint
            context["project_info"] = {
                "project_id": project_id,
                # "name": "...",  # Fetch from backend API
                # "goal": "...",  # Fetch from backend API
            }

            return context

        except Exception as e:
            logger.error(f"Error building context: {e}", exc_info=True)
            return fallback_context or {}

    def _get_parent_chain(self, node: IdeaNode) -> List[Dict[str, Any]]:
        """
        Recursively traverse up to the root node

        Args:
            node: Current node

        Returns:
            List of parent nodes from immediate parent to root
        """
        chain = []
        current_node = node
        max_depth = 20  # Safety limit to prevent infinite loops

        while current_node.parent_id and len(chain) < max_depth:
            parent = self.db.query(IdeaNode).filter(
                IdeaNode.id == current_node.parent_id
            ).first()

            if not parent:
                break

            chain.append({
                "id": str(parent.id),
                "title": parent.title or "Untitled",
                "description": parent.description or "",
                "is_root": parent.is_root,
                "metadata": parent.metadata,
            })

            current_node = parent

            # Stop if we reached the root
            if parent.is_root:
                break

        return chain

    def _get_children_info(self, node: IdeaNode) -> List[Dict[str, Any]]:
        """
        Get information about child nodes

        Args:
            node: Parent node

        Returns:
            List of child node information (limited to 10)
        """
        children = self.db.query(IdeaNode).filter(
            IdeaNode.parent_id == node.id
        ).limit(10).all()

        return [
            {
                "id": str(child.id),
                "title": child.title or "Untitled",
                "description": (child.description or "")[:150],  # Truncate long descriptions
            }
            for child in children
        ]

    def _get_idea_tree_info(self, idea_tree_id: uuid.UUID) -> Optional[Dict[str, Any]]:
        """
        Get idea tree information

        Args:
            idea_tree_id: UUID of the idea tree

        Returns:
            Idea tree information or None
        """
        try:
            idea_tree = self.db.query(IdeaTree).filter(
                IdeaTree.id == idea_tree_id
            ).first()

            if not idea_tree:
                return None

            return {
                "id": str(idea_tree.id),
                "name": idea_tree.name,
                "description": idea_tree.description,
                "purpose": idea_tree.purpose,
                "icon": idea_tree.icon,
            }

        except Exception as e:
            logger.error(f"Error fetching idea tree info: {e}")
            return None

    def format_context_for_prompt(self, context: Dict[str, Any]) -> str:
        """
        Format the context into a readable string for the AI prompt

        Args:
            context: Enhanced context dictionary

        Returns:
            Formatted context string
        """
        parts = []

        # Current node
        node_title = context.get("node_title", "Untitled")
        node_description = context.get("node_description", "")

        parts.append(f"**Current Node:**")
        parts.append(f"- Title: {node_title}")
        if node_description:
            parts.append(f"- Description: {node_description}")
        else:
            parts.append(f"- Description: (Empty - help the user define this)")

        # Tree context
        if context.get("idea_tree"):
            idea_tree = context["idea_tree"]
            parts.append(f"\n**Tree Context:**")
            parts.append(f"- Tree Name: {idea_tree.get('name', 'Unknown')}")
            if idea_tree.get("purpose"):
                parts.append(f"- Tree Purpose: {idea_tree['purpose']}")

        # Parent chain (path from root)
        if context.get("parent_chain"):
            chain = context["parent_chain"]
            parts.append(f"\n**Context Path (from root):**")

            # Reverse to show root -> current
            for i, parent in enumerate(reversed(chain)):
                indent = "  " * i
                parts.append(f"{indent}↳ {parent['title']}")
                if parent.get("description"):
                    desc_preview = parent['description'][:100]
                    parts.append(f"{indent}  └ {desc_preview}")

        # Children
        if context.get("children"):
            children = context["children"]
            parts.append(f"\n**Child Nodes ({len(children)}):**")
            for child in children[:5]:  # Show max 5
                parts.append(f"  - {child['title']}")

        # Project info (if available)
        if context.get("project_info", {}).get("name"):
            parts.append(f"\n**Project:**")
            parts.append(f"- Name: {context['project_info']['name']}")
            if context["project_info"].get("goal"):
                parts.append(f"- Goal: {context['project_info']['goal']}")

        return "\n".join(parts)
