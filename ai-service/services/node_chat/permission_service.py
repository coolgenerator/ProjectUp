"""
Node Chat Permission Service

Handles multi-user access control for collaborative node chat sessions.
Integrates with the backend's project member permission system.
"""

import logging
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_
from fastapi import HTTPException, status

from models.database.node_chat_models import NodeChatSession
from models.database.node_chat_message_models import NodeChatMessage
from services.backend_client import backend_client

logger = logging.getLogger(__name__)


# Role constants (must match backend/models/groupModel.go)
ROLE_OWNER = "owner"
ROLE_ADMIN = "admin"
ROLE_EDITOR = "editor"
ROLE_VIEWER = "viewer"


class NodeChatPermissionService:
    """
    Manages permissions for multi-user node chat sessions.

    Permission Rules:
    - VIEWER: Can read messages only
    - EDITOR: Can read and send messages
    - ADMIN: Can read, send, and delete any message
    - OWNER: Can read, send, delete, and manage participants
    """

    def __init__(self, db: Session):
        self.db = db

    async def get_user_project_role(self, user_id: int, project_id: str) -> Optional[str]:
        """
        Get user's role in a project from the backend.

        Args:
            user_id: User ID
            project_id: Project short ID or UUID

        Returns:
            User's role ('owner', 'admin', 'editor', 'viewer') or None if not a member
        """
        try:
            # Call backend API to get user's project membership
            endpoint = f"/projects/{project_id}/members/{user_id}"
            response = await backend_client.get(endpoint)

            if response and 'role' in response:
                return response['role']

            return None

        except Exception as e:
            logger.warning(f"Could not fetch user role: {e}")
            # If backend is unavailable, fall back to session creator check
            return None

    async def check_project_membership(
        self,
        user_id: int,
        project_id: str,
        required_role: Optional[str] = None
    ) -> bool:
        """
        Check if user is a member of the project with optional role requirement.

        Args:
            user_id: User ID
            project_id: Project short ID or UUID
            required_role: Optional minimum role requirement

        Returns:
            True if user has access, False otherwise
        """
        role = await self.get_user_project_role(user_id, project_id)

        if role is None:
            return False

        # If no specific role required, any membership is sufficient
        if required_role is None:
            return True

        # Check role hierarchy
        role_hierarchy = {
            ROLE_OWNER: 4,
            ROLE_ADMIN: 3,
            ROLE_EDITOR: 2,
            ROLE_VIEWER: 1
        }

        user_role_level = role_hierarchy.get(role, 0)
        required_role_level = role_hierarchy.get(required_role, 0)

        return user_role_level >= required_role_level

    async def can_access_chat(
        self,
        user_id: int,
        session: NodeChatSession
    ) -> bool:
        """
        Check if user can access a chat session.

        Rules:
        - User must be a project member
        - If collaborative: Must be in participant list or project member
        - If not collaborative: Must be the creator

        Args:
            user_id: User ID
            session: NodeChatSession instance

        Returns:
            True if user can access the chat
        """
        # Check if user is project member
        is_member = await self.check_project_membership(user_id, session.project_id)

        if not is_member:
            return False

        # If not collaborative, only creator can access
        if not session.is_collaborative:
            return user_id == session.created_by

        # If collaborative and has participants list, check if user is in it
        if session.participant_user_ids:
            return user_id in session.participant_user_ids

        # If collaborative but no participant list, all project members can access
        return True

    async def can_send_message(
        self,
        user_id: int,
        session: NodeChatSession
    ) -> bool:
        """
        Check if user can send messages in a chat session.

        Rules:
        - Must have chat access
        - Must be at least EDITOR role (owner, admin, editor can send)
        - VIEWER role cannot send messages

        Args:
            user_id: User ID
            session: NodeChatSession instance

        Returns:
            True if user can send messages
        """
        # First check if user can access the chat
        if not await self.can_access_chat(user_id, session):
            return False

        # Check role - viewers cannot send messages
        return await self.check_project_membership(
            user_id,
            session.project_id,
            required_role=ROLE_EDITOR
        )

    async def can_delete_message(
        self,
        user_id: int,
        message: NodeChatMessage,
        session: NodeChatSession
    ) -> bool:
        """
        Check if user can delete a message.

        Rules:
        - User can delete their own messages
        - ADMIN and OWNER can delete any message

        Args:
            user_id: User ID
            message: NodeChatMessage instance
            session: NodeChatSession instance

        Returns:
            True if user can delete the message
        """
        # Users can always delete their own messages
        if message.user_id == user_id:
            return True

        # Admins and owners can delete any message
        role = await self.get_user_project_role(user_id, session.project_id)
        return role in [ROLE_OWNER, ROLE_ADMIN]

    async def can_manage_participants(
        self,
        user_id: int,
        session: NodeChatSession
    ) -> bool:
        """
        Check if user can manage chat participants (add/remove).

        Only OWNER and ADMIN can manage participants.

        Args:
            user_id: User ID
            session: NodeChatSession instance

        Returns:
            True if user can manage participants
        """
        return await self.check_project_membership(
            user_id,
            session.project_id,
            required_role=ROLE_ADMIN
        )

    def get_session_by_id(self, session_id: str) -> Optional[NodeChatSession]:
        """
        Get chat session by ID.

        Args:
            session_id: Session UUID

        Returns:
            NodeChatSession or None
        """
        return self.db.query(NodeChatSession).filter(
            NodeChatSession.id == session_id
        ).first()

    def get_message_by_id(self, message_id: str) -> Optional[NodeChatMessage]:
        """
        Get message by ID.

        Args:
            message_id: Message UUID

        Returns:
            NodeChatMessage or None
        """
        return self.db.query(NodeChatMessage).filter(
            NodeChatMessage.id == message_id
        ).first()

    async def add_participant(
        self,
        user_id: int,
        session: NodeChatSession,
        new_participant_id: int
    ) -> bool:
        """
        Add a new participant to a chat session.

        Args:
            user_id: User requesting the change
            session: NodeChatSession instance
            new_participant_id: User ID to add

        Returns:
            True if participant was added

        Raises:
            HTTPException: If user doesn't have permission
        """
        # Check if requester can manage participants
        if not await self.can_manage_participants(user_id, session):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to manage participants"
            )

        # Check if new participant is a project member
        is_member = await self.check_project_membership(
            new_participant_id,
            session.project_id
        )

        if not is_member:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is not a member of this project"
            )

        # Initialize participant list if None
        if session.participant_user_ids is None:
            session.participant_user_ids = []

        # Add participant if not already in list
        if new_participant_id not in session.participant_user_ids:
            session.participant_user_ids.append(new_participant_id)
            self.db.commit()
            logger.info(f"Added participant {new_participant_id} to session {session.id}")
            return True

        return False

    async def remove_participant(
        self,
        user_id: int,
        session: NodeChatSession,
        participant_id: int
    ) -> bool:
        """
        Remove a participant from a chat session.

        Args:
            user_id: User requesting the change
            session: NodeChatSession instance
            participant_id: User ID to remove

        Returns:
            True if participant was removed

        Raises:
            HTTPException: If user doesn't have permission
        """
        # Check if requester can manage participants
        if not await self.can_manage_participants(user_id, session):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to manage participants"
            )

        # Cannot remove the creator
        if participant_id == session.created_by:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove the chat creator"
            )

        # Remove participant if in list
        if session.participant_user_ids and participant_id in session.participant_user_ids:
            session.participant_user_ids.remove(participant_id)
            self.db.commit()
            logger.info(f"Removed participant {participant_id} from session {session.id}")
            return True

        return False

    async def initialize_participants(self, session: NodeChatSession) -> None:
        """
        Initialize participant list for a session if not set.
        Sets to all project members by default.

        Args:
            session: NodeChatSession instance
        """
        if session.participant_user_ids is None or len(session.participant_user_ids) == 0:
            # Start with creator
            session.participant_user_ids = [session.created_by]
            self.db.commit()
            logger.info(f"Initialized participants for session {session.id}")


# Convenience functions for common permission checks

async def require_chat_access(
    user_id: int,
    session: NodeChatSession,
    db: Session
) -> None:
    """
    Require user to have chat access or raise 403.

    Args:
        user_id: User ID
        session: NodeChatSession instance
        db: Database session

    Raises:
        HTTPException: If user doesn't have access
    """
    permission_service = NodeChatPermissionService(db)

    if not await permission_service.can_access_chat(user_id, session):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this chat session"
        )


async def require_send_permission(
    user_id: int,
    session: NodeChatSession,
    db: Session
) -> None:
    """
    Require user to have send message permission or raise 403.

    Args:
        user_id: User ID
        session: NodeChatSession instance
        db: Database session

    Raises:
        HTTPException: If user cannot send messages
    """
    permission_service = NodeChatPermissionService(db)

    if not await permission_service.can_send_message(user_id, session):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to send messages in this chat"
        )


async def require_delete_permission(
    user_id: int,
    message: NodeChatMessage,
    session: NodeChatSession,
    db: Session
) -> None:
    """
    Require user to have delete message permission or raise 403.

    Args:
        user_id: User ID
        message: NodeChatMessage instance
        session: NodeChatSession instance
        db: Database session

    Raises:
        HTTPException: If user cannot delete the message
    """
    permission_service = NodeChatPermissionService(db)

    if not await permission_service.can_delete_message(user_id, message, session):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this message"
        )
