"""
Paper Persistence Service
Handles database operations for paper-related data (sessions, notes, outlines, references)
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc

from models.database.paper_models import (
    PaperChatSession,
    PaperChatMessage,
    PaperNote,
    PaperOutline,
    PaperReference
)


class PaperPersistenceService:
    """Service for persisting paper-related data"""

    def __init__(self, db_session: Session):
        self.db = db_session

    # ==================== Chat Sessions ====================

    def create_session(self, session_id: str, paper_id: str, user_id: str, title: str = "New Chat") -> PaperChatSession:
        """Create a new chat session"""
        session = PaperChatSession(
            id=session_id,
            paper_id=paper_id,
            user_id=user_id,
            title=title
        )
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    def get_sessions(self, paper_id: str, user_id: str) -> List[PaperChatSession]:
        """Get all chat sessions for a paper and user"""
        return self.db.query(PaperChatSession).filter(
            PaperChatSession.paper_id == paper_id,
            PaperChatSession.user_id == user_id
        ).order_by(desc(PaperChatSession.updated_at)).all()

    def get_session(self, session_id: str) -> Optional[PaperChatSession]:
        """Get a specific chat session with messages"""
        return self.db.query(PaperChatSession).filter(
            PaperChatSession.id == session_id
        ).first()

    def update_session_title(self, session_id: str, title: str) -> Optional[PaperChatSession]:
        """Update session title"""
        session = self.get_session(session_id)
        if session:
            session.title = title
            session.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(session)
        return session

    def delete_session(self, session_id: str) -> bool:
        """Delete a chat session and all its messages"""
        session = self.get_session(session_id)
        if session:
            self.db.delete(session)
            self.db.commit()
            return True
        return False

    # ==================== Chat Messages ====================

    def add_message(self, message_id: str, session_id: str, role: str, content: str, context: Optional[str] = None) -> PaperChatMessage:
        """Add a message to a session"""
        print(f"[SERVICE add_message] self.db type: {type(self.db)}, is dict: {isinstance(self.db, dict)}")
        message = PaperChatMessage(
            id=message_id,
            session_id=session_id,
            role=role,
            content=content,
            context=context
        )
        print(f"[SERVICE add_message] About to call self.db.add(), db has add: {hasattr(self.db, 'add')}")
        self.db.add(message)

        # Update session's updated_at timestamp
        session = self.get_session(session_id)
        if session:
            session.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(message)
        return message

    def get_session_messages(self, session_id: str) -> List[PaperChatMessage]:
        """Get all messages for a session"""
        import logging
        logger = logging.getLogger(__name__)

        logger.info(f"[SERVICE get_session_messages] Querying for session_id: {session_id}")

        messages = self.db.query(PaperChatMessage).filter(
            PaperChatMessage.session_id == session_id
        ).order_by(PaperChatMessage.created_at).all()

        logger.info(f"[SERVICE get_session_messages] Found {len(messages)} messages")

        # Debug: also query without filter to see total messages
        total = self.db.query(PaperChatMessage).count()
        logger.info(f"[SERVICE get_session_messages] Total messages in DB: {total}")

        return messages

    # ==================== Notes ====================

    def create_note(self, note_id: str, paper_id: str, user_id: str, page: int, content: str, note_type: str = "note") -> PaperNote:
        """Create a new note"""
        note = PaperNote(
            id=note_id,
            paper_id=paper_id,
            user_id=user_id,
            page=page,
            content=content,
            note_type=note_type
        )
        self.db.add(note)
        self.db.commit()
        self.db.refresh(note)
        return note

    def get_notes(self, paper_id: str, user_id: str) -> List[PaperNote]:
        """Get all notes for a paper"""
        return self.db.query(PaperNote).filter(
            PaperNote.paper_id == paper_id,
            PaperNote.user_id == user_id
        ).order_by(PaperNote.page, PaperNote.created_at).all()

    def update_note(self, note_id: str, content: str) -> Optional[PaperNote]:
        """Update a note's content"""
        note = self.db.query(PaperNote).filter(PaperNote.id == note_id).first()
        if note:
            note.content = content
            note.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(note)
        return note

    def delete_note(self, note_id: str) -> bool:
        """Delete a note"""
        note = self.db.query(PaperNote).filter(PaperNote.id == note_id).first()
        if note:
            self.db.delete(note)
            self.db.commit()
            return True
        return False

    # ==================== Outlines ====================

    def save_outline(self, outline_id: str, paper_id: str, sections: List[Dict[str, Any]]) -> PaperOutline:
        """Save or update paper outline"""
        # Check if outline already exists
        outline = self.db.query(PaperOutline).filter(
            PaperOutline.paper_id == paper_id
        ).first()

        if outline:
            # Update existing outline
            outline.sections = sections
            outline.updated_at = datetime.utcnow()
        else:
            # Create new outline
            outline = PaperOutline(
                id=outline_id,
                paper_id=paper_id,
                sections=sections
            )
            self.db.add(outline)

        self.db.commit()
        self.db.refresh(outline)
        return outline

    def get_outline(self, paper_id: str) -> Optional[PaperOutline]:
        """Get paper outline"""
        return self.db.query(PaperOutline).filter(
            PaperOutline.paper_id == paper_id
        ).first()

    # ==================== References ====================

    def save_references(self, paper_id: str, references: List[Dict[str, Any]]) -> List[PaperReference]:
        """Save references for a paper (replaces existing)"""
        # Delete existing references
        self.db.query(PaperReference).filter(
            PaperReference.paper_id == paper_id
        ).delete()

        # Create new references
        ref_objects = []
        for ref in references:
            ref_obj = PaperReference(
                id=f"{paper_id}_{ref.get('id', ref.get('ref_id', ''))}",
                paper_id=paper_id,
                ref_id=ref.get('id', ref.get('ref_id', '')),
                title=ref.get('title', ''),
                authors=ref.get('authors', []),
                year=ref.get('year'),
                venue=ref.get('venue'),
                doi=ref.get('doi'),
                url=ref.get('url')
            )
            self.db.add(ref_obj)
            ref_objects.append(ref_obj)

        self.db.commit()
        for ref_obj in ref_objects:
            self.db.refresh(ref_obj)

        return ref_objects

    def get_references(self, paper_id: str) -> List[PaperReference]:
        """Get all references for a paper"""
        return self.db.query(PaperReference).filter(
            PaperReference.paper_id == paper_id
        ).order_by(PaperReference.ref_id).all()

    def delete_references(self, paper_id: str) -> bool:
        """Delete all references for a paper"""
        self.db.query(PaperReference).filter(
            PaperReference.paper_id == paper_id
        ).delete()
        self.db.commit()
        return True
