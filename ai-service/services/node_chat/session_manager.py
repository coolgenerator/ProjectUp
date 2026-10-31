"""
Session Manager Service
Handles session retrieval and management for node chat
"""

import logging
import uuid
from typing import Optional
from sqlalchemy.orm import Session
from datetime import datetime

from models.database.node_chat_models import NodeChatSession
from models.database.node_chat_message_models import NodeChatMessage

logger = logging.getLogger(__name__)


class SessionManager:
    """Manages chat session retrieval and lifecycle"""

    def __init__(self, db: Session):
        self.db = db

    def get_or_create_session(
        self,
        node_id: str,
        project_id: str,
        user_id: int,
        context: dict,
        session_id: Optional[str] = None
    ) -> NodeChatSession:
        """
        Get or create a chat session for a node

        Args:
            node_id: Node UUID string
            project_id: Project ID
            user_id: User ID
            context: Session context dictionary
            session_id: Optional specific session ID (for branching)

        Returns:
            NodeChatSession instance

        Raises:
            ValueError: If session_id is provided but not found
        """
        node_uuid = uuid.UUID(node_id)

        # Use specific session if provided (for branching)
        if session_id:
            logger.info(f"Using specific session: {session_id}")
            session = self.db.query(NodeChatSession).filter(
                NodeChatSession.id == uuid.UUID(session_id)
            ).first()

            if not session:
                raise ValueError(f"Session {session_id} not found")

            return session

        # Get or create active session (for main conversation)
        logger.info(f"Finding active session for node: {node_id}")
        session = self.db.query(NodeChatSession).filter(
            NodeChatSession.node_id == node_uuid,
            NodeChatSession.is_active == True
        ).first()

        if not session:
            # Deactivate any existing active sessions for this node
            self.db.query(NodeChatSession).filter(
                NodeChatSession.node_id == node_uuid,
                NodeChatSession.is_active == True
            ).update({"is_active": False}, synchronize_session=False)

            # Create new session
            session = NodeChatSession(
                node_id=node_uuid,
                project_id=project_id,
                created_by=user_id,
                messages=[],
                context=context
            )
            self.db.add(session)
            self.db.flush()

        logger.info(f"Using session {session.id} for node {node_id}")
        return session

    def get_active_session(self, node_id: str) -> Optional[NodeChatSession]:
        """Get the active session for a node"""
        node_uuid = uuid.UUID(node_id)

        return self.db.query(NodeChatSession).filter(
            NodeChatSession.node_id == node_uuid,
            NodeChatSession.is_active == True
        ).first()

    def get_session_by_id(self, session_id: str) -> Optional[NodeChatSession]:
        """Get a session by its ID"""
        session_uuid = uuid.UUID(session_id)

        return self.db.query(NodeChatSession).filter(
            NodeChatSession.id == session_uuid
        ).first()

    def add_messages_to_session(
        self,
        session: NodeChatSession,
        user_message: str,
        ai_response: str,
        user_id: Optional[int] = None,
        tool_use: Optional[dict] = None,
        attachments: Optional[list] = None
    ) -> None:
        """
        Add user and AI messages to session using new message table (MULTI-USER SUPPORT)

        Args:
            session: The chat session
            user_message: User's message content
            ai_response: AI's response content
            user_id: User ID who sent the message (for multi-user attribution)
            tool_use: Optional tool use information for AI response
            attachments: Optional list of attachments for user message
        """
        # Get current message count for indexing
        current_index = session.message_count

        # MULTI-USER: Create user message record with user_id attribution
        user_msg = NodeChatMessage(
            session_id=session.id,
            message_index=current_index,
            role="user",
            content=user_message,
            user_id=user_id,  # Track who sent this message
            attachments=attachments or [],
            created_at=datetime.utcnow()
        )
        self.db.add(user_msg)

        # Create AI response message record
        ai_msg = NodeChatMessage(
            session_id=session.id,
            message_index=current_index + 1,
            role="assistant",
            content=ai_response,
            tool_use=tool_use,
            created_at=datetime.utcnow()
        )
        self.db.add(ai_msg)

        # Also update the legacy messages JSON array for backward compatibility
        # TODO: Remove this after confirming migration works
        messages = session.messages or []
        messages.append({
            "role": "user",
            "content": user_message,
            "timestamp": datetime.utcnow().isoformat()
        })
        messages.append({
            "role": "assistant",
            "content": ai_response,
            "timestamp": datetime.utcnow().isoformat()
        })
        session.messages = messages

        # Update session metadata
        session.message_count = current_index + 2  # User + AI messages
        session.last_message_at = datetime.utcnow()

        logger.info(f"Added 2 messages to session {session.id} (now {session.message_count} total)")

    def update_session_conclusion(
        self,
        session: NodeChatSession,
        conclusion: Optional[str] = None,
        summary: Optional[str] = None
    ) -> None:
        """Update session conclusion and summary"""
        if conclusion:
            session.conclusion = conclusion
            session.conclusion_updated_at = datetime.utcnow()

        if summary:
            # Store summary in session context
            if not session.context:
                session.context = {}
            session.context["summary"] = summary

    def get_session_messages(
        self,
        session_id: str,
        limit: int = 50,
        offset: int = 0,
        order_desc: bool = True
    ) -> list[NodeChatMessage]:
        """
        Get paginated messages for a session

        Args:
            session_id: Session UUID string
            limit: Maximum number of messages to return (default 50)
            offset: Number of messages to skip (default 0)
            order_desc: If True, returns newest first; if False, oldest first

        Returns:
            List of NodeChatMessage objects
        """
        session_uuid = uuid.UUID(session_id)

        query = self.db.query(NodeChatMessage).filter(
            NodeChatMessage.session_id == session_uuid
        )

        if order_desc:
            query = query.order_by(NodeChatMessage.message_index.desc())
        else:
            query = query.order_by(NodeChatMessage.message_index.asc())

        return query.limit(limit).offset(offset).all()

    def get_session_messages_count(self, session_id: str) -> int:
        """Get total message count for a session"""
        session_uuid = uuid.UUID(session_id)

        return self.db.query(NodeChatMessage).filter(
            NodeChatMessage.session_id == session_uuid
        ).count()

    def get_recent_messages_for_context(
        self,
        session_id: str,
        max_messages: int = 20
    ) -> list[dict]:
        """
        Get recent messages formatted for AI context

        Args:
            session_id: Session UUID string
            max_messages: Maximum number of recent messages to return

        Returns:
            List of message dicts in format: {"role": "user|assistant", "content": "..."}
        """
        messages = self.get_session_messages(
            session_id=session_id,
            limit=max_messages,
            offset=0,
            order_desc=False  # Oldest first for context
        )

        return [msg.to_chat_format() for msg in messages]

    def close_session(self, session_id: str) -> None:
        """Close/deactivate a chat session"""
        session_uuid = uuid.UUID(session_id)

        session = self.db.query(NodeChatSession).filter(
            NodeChatSession.id == session_uuid
        ).first()

        if session:
            session.is_active = False
            self.db.commit()
