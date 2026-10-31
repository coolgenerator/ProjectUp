"""
Node Version Control Service with Branching Support

Handles Git-like branching version control for IdeaNode refinement through chat.
"""

from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session

from models.database.node_version_models import NodeVersion, ChatBranch
from models.database.node_chat_models import NodeChatSession
from models.database.tree_models import IdeaNode


class NodeVersionService:
    """Service for managing branching version control"""

    def __init__(self, db: Session):
        self.db = db

    # ==================== BRANCHING OPERATIONS ====================

    def create_branch_from_chat(
        self,
        node_id: UUID,
        branch_name: str,
        display_name: str,
        prompt: str,
        chat_session_id: UUID,
        user_id: int,
        parent_version_id: Optional[UUID] = None
    ) -> ChatBranch:
        """
        Create a new exploration branch from a chat session.

        Example:
        User asks: "Show me two approaches: microservices vs monolithic"
        Creates:
        - Branch 'option_a_microservices'
        - Branch 'option_b_monolithic'
        """
        # Get parent version (defaults to current main version if not specified)
        if not parent_version_id:
            parent_version = self.get_current_version(node_id, branch='main')
            parent_version_id = parent_version.id if parent_version else None

        # Create branch record
        branch = ChatBranch(
            node_id=node_id,
            branch_name=branch_name,
            display_name=display_name,
            prompt=prompt,
            parent_version_id=parent_version_id,
            chat_session_id=chat_session_id,
            created_by=user_id
        )
        self.db.add(branch)
        self.db.commit()

        return branch

    def create_version_in_branch(
        self,
        node_id: UUID,
        branch_name: str,
        title: str,
        summary: str,
        content: str,
        user_id: int,
        chat_session_id: Optional[UUID] = None,
        change_description: Optional[str] = None,
        parent_version_id: Optional[UUID] = None,
        changed_fields: Optional[List[str]] = None
    ) -> NodeVersion:
        """
        Create a new version within a branch.

        Example:
        - Branch 'option_a' already has version 1
        - Refining Option A creates version 2 in same branch
        - Result: 'option_a.2'
        """
        # Get next version number for this branch
        last_version = (
            self.db.query(NodeVersion)
            .filter(
                NodeVersion.node_id == node_id,
                NodeVersion.branch_name == branch_name
            )
            .order_by(NodeVersion.version_number.desc())
            .first()
        )
        version_number = (last_version.version_number + 1) if last_version else 1
        full_version = f"{branch_name}.{version_number}"

        # Mark previous version in this branch as not current
        if last_version:
            last_version.is_current = False

        # Create new version
        version = NodeVersion(
            node_id=node_id,
            version_number=version_number,
            branch_name=branch_name,
            full_version=full_version,
            parent_version_id=parent_version_id,
            is_current=True,
            title=title,
            summary=summary,
            content=content,
            change_description=change_description,
            change_type='chat_conclusion' if chat_session_id else 'manual_edit',
            changed_fields=changed_fields or ['summary', 'content'],
            chat_session_id=chat_session_id,
            created_by=user_id
        )
        self.db.add(version)

        # Update branch version count
        branch = self.db.query(ChatBranch).filter(
            ChatBranch.node_id == node_id,
            ChatBranch.branch_name == branch_name
        ).first()
        if branch:
            branch.version_count = version_number

        self.db.commit()
        return version

    def create_multi_option_branches(
        self,
        node_id: UUID,
        chat_session_id: UUID,
        options: List[Dict[str, str]],
        user_id: int
    ) -> List[NodeVersion]:
        """
        Create multiple option branches from a single chat prompt.

        Example:
        options = [
            {
                'branch_name': 'option_a',
                'display_name': 'Microservices Architecture',
                'title': 'AI Integration - Microservices',
                'summary': 'Use microservices...',
                'content': 'Detailed microservices approach...'
            },
            {
                'branch_name': 'option_b',
                'display_name': 'Monolithic Architecture',
                'title': 'AI Integration - Monolithic',
                'summary': 'Use monolithic...',
                'content': 'Detailed monolithic approach...'
            }
        ]
        """
        # Get current main version as parent
        parent_version = self.get_current_version(node_id, branch='main')
        parent_version_id = parent_version.id if parent_version else None

        # Get chat session
        chat_session = self.db.query(NodeChatSession).get(chat_session_id)

        created_versions = []
        for option in options:
            # Create branch
            branch = self.create_branch_from_chat(
                node_id=node_id,
                branch_name=option['branch_name'],
                display_name=option['display_name'],
                prompt=option.get('prompt', chat_session.messages[-1] if chat_session else ''),
                chat_session_id=chat_session_id,
                user_id=user_id,
                parent_version_id=parent_version_id
            )

            # Create first version in branch
            version = self.create_version_in_branch(
                node_id=node_id,
                branch_name=option['branch_name'],
                title=option['title'],
                summary=option['summary'],
                content=option['content'],
                user_id=user_id,
                chat_session_id=chat_session_id,
                change_description=f"Created option: {option['display_name']}",
                parent_version_id=parent_version_id,
                changed_fields=['title', 'summary', 'content']
            )
            created_versions.append(version)

        return created_versions

    # ==================== QUERY OPERATIONS ====================

    def get_current_version(self, node_id: UUID, branch: str = 'main') -> Optional[NodeVersion]:
        """Get current version of a specific branch"""
        return (
            self.db.query(NodeVersion)
            .filter(
                NodeVersion.node_id == node_id,
                NodeVersion.branch_name == branch,
                NodeVersion.is_current == True
            )
            .first()
        )

    def get_version_tree(self, node_id: UUID) -> Dict[str, Any]:
        """
        Get complete version tree for a node.

        Returns:
        {
            'main': [v1, v2, v3],
            'option_a': [v1, v2],
            'option_b': [v1],
            'tree': {
                'v1 (main)': {
                    'children': ['v2 (main)', 'option_a.1']
                },
                ...
            }
        }
        """
        versions = (
            self.db.query(NodeVersion)
            .filter(NodeVersion.node_id == node_id)
            .order_by(NodeVersion.created_at)
            .all()
        )

        # Group by branch
        branches = {}
        for version in versions:
            if version.branch_name not in branches:
                branches[version.branch_name] = []
            branches[version.branch_name].append(version)

        # Build tree structure
        tree = {}
        for version in versions:
            tree[version.full_version] = {
                'version': version.to_dict(),
                'children': [
                    v.full_version for v in versions
                    if v.parent_version_id == version.id
                ]
            }

        return {
            'branches': {k: [v.to_dict() for v in vs] for k, vs in branches.items()},
            'tree': tree
        }

    def get_branches(self, node_id: UUID, active_only: bool = True) -> List[ChatBranch]:
        """Get all branches for a node"""
        query = self.db.query(ChatBranch).filter(ChatBranch.node_id == node_id)
        if active_only:
            query = query.filter(ChatBranch.is_active == True)
        return query.all()

    # ==================== COMPARISON & MERGE ====================

    def compare_versions(
        self,
        version_a_id: UUID,
        version_b_id: UUID
    ) -> Dict[str, Any]:
        """
        Compare two versions and return diff information.

        Returns:
        {
            'title_changed': True,
            'summary_diff': {
                'added': 120,
                'removed': 50,
                'similarity': 0.85
            },
            'content_diff': {...},
            'side_by_side': {...}
        }
        """
        version_a = self.db.query(NodeVersion).get(version_a_id)
        version_b = self.db.query(NodeVersion).get(version_b_id)

        if not version_a or not version_b:
            return {}

        def text_diff_stats(text_a: str, text_b: str) -> dict:
            """Simple diff statistics"""
            len_a, len_b = len(text_a or ''), len(text_b or '')
            added = max(0, len_b - len_a)
            removed = max(0, len_a - len_b)

            # Simple similarity (would use difflib in production)
            if len_a == 0 and len_b == 0:
                similarity = 1.0
            elif len_a == 0 or len_b == 0:
                similarity = 0.0
            else:
                # Simplified - use proper diff algorithm in production
                similarity = 1 - (abs(len_a - len_b) / max(len_a, len_b))

            return {'added': added, 'removed': removed, 'similarity': similarity}

        return {
            'version_a': version_a.to_dict(),
            'version_b': version_b.to_dict(),
            'title_changed': version_a.title != version_b.title,
            'summary_diff': text_diff_stats(version_a.summary, version_b.summary),
            'content_diff': text_diff_stats(version_a.content, version_b.content),
            'tags_changed': set(version_a.tags or []) != set(version_b.tags or [])
        }

    def adopt_version(
        self,
        node_id: UUID,
        version_id: UUID,
        target_branch: str = 'main',
        user_id: int = None
    ) -> NodeVersion:
        """
        Adopt a version from one branch into another (like git merge).

        Example:
        - Option A looks good
        - Adopt option_a.2 into main
        - Creates main.4 with content from option_a.2
        """
        source_version = self.db.query(NodeVersion).get(version_id)
        if not source_version:
            raise ValueError(f"Version {version_id} not found")

        # Create new version in target branch
        new_version = self.create_version_in_branch(
            node_id=node_id,
            branch_name=target_branch,
            title=source_version.title,
            summary=source_version.summary,
            content=source_version.content,
            user_id=user_id or source_version.created_by,
            change_description=f"Adopted from {source_version.full_version}",
            parent_version_id=source_version.id,
            changed_fields=source_version.changed_fields
        )

        # Mark source branch as merged if adopting into main
        if target_branch == 'main':
            branch = self.db.query(ChatBranch).filter(
                ChatBranch.node_id == node_id,
                ChatBranch.branch_name == source_version.branch_name
            ).first()
            if branch:
                branch.is_merged = True
                branch.merged_at = datetime.utcnow()
                branch.merged_by = user_id

        # Update node's current content
        node = self.db.query(IdeaNode).get(node_id)
        if node and target_branch == 'main':
            node.title = new_version.title
            node.summary = new_version.summary
            node.content = new_version.content
            node.tags = new_version.tags
            node.node_metadata = new_version.node_metadata

        self.db.commit()
        return new_version

    # ==================== CLEANUP ====================

    def archive_branch(self, node_id: UUID, branch_name: str):
        """Archive a branch and its versions"""
        # Mark branch as inactive
        branch = self.db.query(ChatBranch).filter(
            ChatBranch.node_id == node_id,
            ChatBranch.branch_name == branch_name
        ).first()
        if branch:
            branch.is_active = False

        # Mark versions as archived
        self.db.query(NodeVersion).filter(
            NodeVersion.node_id == node_id,
            NodeVersion.branch_name == branch_name
        ).update({'is_archived': True})

        self.db.commit()
