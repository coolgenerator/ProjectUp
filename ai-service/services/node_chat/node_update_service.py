"""
Node Update Service
Handles auto-updating node metadata from AI conversations
"""

import logging
import uuid
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from models.database.tree_models import IdeaNode, IdeaTree

logger = logging.getLogger(__name__)


class NodeUpdateService:
    """Service for updating node metadata from AI interactions"""

    def __init__(self, db: Session):
        self.db = db

    def auto_update_from_first_message(
        self,
        node_id: str,
        metadata: Dict[str, Any]
    ) -> bool:
        """
        Auto-update node from first message metadata

        Args:
            node_id: Node UUID string
            metadata: Dictionary with title, description, and summary

        Returns:
            True if update succeeded, False otherwise
        """
        try:
            node_uuid = uuid.UUID(node_id)
            node = self.db.query(IdeaNode).filter(IdeaNode.id == node_uuid).first()

            if not node:
                logger.warning(f"Node {node_id} not found for auto-update")
                return False

            # Update title, description, and metadata.summary
            if metadata.get("title"):
                node.title = metadata["title"]

            if metadata.get("description"):
                node.description = metadata["description"]

            # Store summary in node metadata
            if metadata.get("summary"):
                if not node.node_metadata:
                    node.node_metadata = {}
                node.node_metadata["summary"] = metadata["summary"]

            # Store tags in node metadata
            if metadata.get("tags"):
                if not node.node_metadata:
                    node.node_metadata = {}
                node.node_metadata["tags"] = metadata["tags"]

            self.db.commit()
            logger.info(f"Auto-updated node {node_id} from first message")
            return True

        except Exception as e:
            logger.error(f"Error auto-updating node: {e}")
            self.db.rollback()
            return False

    def auto_update_tree_from_first_node(
        self,
        node_id: str,
        metadata: Dict[str, Any]
    ) -> bool:
        """
        Auto-update tree title/description when first node's first message is generated

        This should be called after auto_update_from_first_message() to ensure the tree
        is updated when the first node in the tree receives its first AI response.

        Args:
            node_id: Node UUID string
            metadata: Dictionary with title, description, and summary

        Returns:
            True if tree update succeeded, False otherwise
        """
        try:
            node_uuid = uuid.UUID(node_id)
            node = self.db.query(IdeaNode).filter(IdeaNode.id == node_uuid).first()

            if not node:
                logger.warning(f"Node {node_id} not found for tree auto-update")
                return False

            # Check if this is the first node in the tree (is_root or no parent)
            if not node.is_root and node.parent_id is not None:
                logger.info(f"Node {node_id} is not the first node, skipping tree update")
                return False

            # Get the tree
            if not node.session_id:
                logger.warning(f"Node {node_id} has no session_id, cannot update tree")
                return False

            tree = self.db.query(IdeaTree).filter(
                IdeaTree.id == node.session_id
            ).first()

            if not tree:
                logger.warning(f"Tree {node.session_id} not found for auto-update")
                return False

            # Update tree title and description based on first node
            if metadata.get("title"):
                tree.name = metadata["title"]
                logger.info(f"Updated tree name to: {metadata['title']}")

            if metadata.get("description"):
                tree.description = metadata["description"]
                logger.info(f"Updated tree description")

            self.db.commit()
            logger.info(f"Auto-updated tree {tree.id} from first node {node_id}")
            return True

        except Exception as e:
            logger.error(f"Error auto-updating tree: {e}", exc_info=True)
            self.db.rollback()
            return False

    def update_node_summary(
        self,
        node_id: str,
        summary: Optional[str] = None,
        description: Optional[str] = None,
        tags: Optional[list] = None
    ) -> bool:
        """
        Update node summary, description, and tags

        Args:
            node_id: Node UUID string
            summary: New summary text
            description: New description text
            tags: List of tags

        Returns:
            True if update succeeded, False otherwise
        """
        try:
            node_uuid = uuid.UUID(node_id)
            node = self.db.query(IdeaNode).filter(IdeaNode.id == node_uuid).first()

            if not node:
                logger.warning(f"Node {node_id} not found for update")
                return False

            if description:
                node.description = description

            if summary:
                if not node.node_metadata:
                    node.node_metadata = {}
                node.node_metadata["summary"] = summary

            if tags is not None:
                if not node.node_metadata:
                    node.node_metadata = {}
                node.node_metadata["tags"] = tags

            self.db.commit()
            logger.info(f"Updated node {node_id} with summary/description/tags")
            return True

        except Exception as e:
            logger.error(f"Error updating node summary: {e}")
            self.db.rollback()
            return False

    def get_node_metadata(self, node_id: str) -> Optional[Dict[str, Any]]:
        """
        Get node metadata including title, description, and summary

        Args:
            node_id: Node UUID string

        Returns:
            Dictionary with node metadata or None if not found
        """
        try:
            node_uuid = uuid.UUID(node_id)
            node = self.db.query(IdeaNode).filter(IdeaNode.id == node_uuid).first()

            if not node:
                return None

            return {
                "title": node.title,
                "description": node.description or "",
                "summary": node.node_metadata.get("summary", "") if node.node_metadata else "",
                "tags": node.node_metadata.get("tags", []) if node.node_metadata else []
            }

        except Exception as e:
            logger.error(f"Error getting node metadata: {e}")
            return None
