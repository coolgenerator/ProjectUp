"""
Paper Persistence API Routes
Handles storage and retrieval of paper-related data (outlines, references, sessions, messages)
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Body
from typing import List
from datetime import datetime
import uuid
import logging

from database.session import get_session
from models.requests.paper_requests import (
    Section,
    Outline,
    OutlineSave,
    ReferencesSave,
    PaperReference as Reference,
    ChatSessionCreate,
)
from models.responses.paper_responses import (
    ChatSession,
    ChatMessage,
)
from services.paper.persistence_service import PaperPersistenceService
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)
router = APIRouter()

# Outline endpoints
@router.get("/outlines/{paper_id}")
async def get_outline(paper_id: str, db: Session = Depends(get_session)):
    """Get paper outline - returns empty sections if not found"""
    service = PaperPersistenceService(db)
    outline = service.get_outline(paper_id)

    if outline:
        return {"sections": outline.sections}
    return {"sections": []}

@router.post("/outlines")
async def save_outline(request: OutlineSave, db: Session = Depends(get_session)):
    """Save paper outline"""
    service = PaperPersistenceService(db)

    # Generate outline_id if not provided
    outline_id = str(uuid.uuid4())

    outline = service.save_outline(
        outline_id=outline_id,
        paper_id=request.paper_id,
        sections=request.sections
    )

    return {"sections": outline.sections}

# References endpoints
@router.get("/references/{paper_id}")
async def get_references(paper_id: str, db: Session = Depends(get_session)):
    """Get paper references - returns empty array if not found"""
    service = PaperPersistenceService(db)
    references = service.get_references(paper_id)

    # Convert to response format
    return [
        {
            "id": ref.ref_id,
            "title": ref.title,
            "authors": ref.authors,
            "year": ref.year,
            "venue": ref.venue,
            "doi": ref.doi,
            "url": ref.url
        }
        for ref in references
    ]

@router.post("/references")
async def save_references(request: ReferencesSave, db: Session = Depends(get_session)):
    """Save paper references"""
    service = PaperPersistenceService(db)

    references = service.save_references(
        paper_id=request.paper_id,
        references=request.references
    )

    # Convert to response format
    return [
        {
            "id": ref.ref_id,
            "title": ref.title,
            "authors": ref.authors,
            "year": ref.year,
            "venue": ref.venue,
            "doi": ref.doi,
            "url": ref.url
        }
        for ref in references
    ]

@router.delete("/references/{paper_id}")
async def delete_references(paper_id: str, db: Session = Depends(get_session)):
    """Delete paper references"""
    service = PaperPersistenceService(db)
    success = service.delete_references(paper_id)
    return {"success": success}

# Sessions endpoints
# IMPORTANT: More specific routes MUST come before less specific ones!
# /sessions/{session_id}/messages must come before /sessions/{paper_id}/{user_id}

@router.get("/sessions/{session_id}/messages")
async def get_messages(session_id: str, db: Session = Depends(get_session)):
    """Get all messages for a session"""
    logger.info(f"[GET messages] session_id={session_id}")
    service = PaperPersistenceService(db)
    messages = service.get_session_messages(session_id)
    logger.info(f"[GET messages] Service returned {len(messages)} messages")

    result = [
        {
            "id": msg.id,
            "role": msg.role,
            "content": msg.content,
            "context": msg.context,
            "created_at": msg.created_at.isoformat() if msg.created_at else None
        }
        for msg in messages
    ]

    logger.info(f"[GET messages] Returning {len(result)} messages in response")
    return result

@router.put("/sessions/{session_id}/title")
async def update_session_title(
    session_id: str,
    title: str = Body(..., embed=True),
    db: Session = Depends(get_session)
):
    """Update chat session title"""
    logger.info(f"[UPDATE session title] session_id={session_id}, title={title}")
    service = PaperPersistenceService(db)
    session = service.update_session_title(session_id, title)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return {
        "id": session.id,
        "title": session.title,
        "updated_at": session.updated_at.isoformat() if session.updated_at else None
    }

@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, db: Session = Depends(get_session)):
    """Delete a chat session and all its messages"""
    service = PaperPersistenceService(db)
    success = service.delete_session(session_id)
    return {"success": success}

@router.get("/sessions/{session_id}")
async def get_session_by_id(session_id: str, db: Session = Depends(get_session)):
    """Get a specific chat session"""
    service = PaperPersistenceService(db)
    session = service.get_session(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return {
        "id": session.id,
        "paper_id": session.paper_id,
        "user_id": session.user_id,
        "title": session.title,
        "created_at": session.created_at.isoformat() if session.created_at else None,
        "updated_at": session.updated_at.isoformat() if session.updated_at else None,
        "message_count": len(session.messages)
    }

@router.get("/chat-sessions/{paper_id}/{user_id}")
async def get_sessions(
    paper_id: str,
    user_id: str,
    db: Session = Depends(get_session)
):
    """Get all chat sessions for a paper and user"""
    logger.info(f"[GET sessions] paper_id={paper_id}, user_id={user_id}")
    service = PaperPersistenceService(db)
    sessions = service.get_sessions(paper_id, user_id)
    logger.info(f"[GET sessions] Found {len(sessions)} sessions")

    return [
        {
            "id": session.id,
            "paper_id": session.paper_id,
            "user_id": session.user_id,
            "title": session.title,
            "created_at": session.created_at.isoformat() if session.created_at else None,
            "updated_at": session.updated_at.isoformat() if session.updated_at else None,
            "message_count": len(session.messages)
        }
        for session in sessions
    ]

@router.post("/sessions")
async def create_session(request: ChatSessionCreate, db: Session = Depends(get_session)):
    """Create a new chat session"""
    service = PaperPersistenceService(db)

    session = service.create_session(
        session_id=request.session_id,
        paper_id=request.paper_id,
        user_id=request.user_id,
        title=request.title
    )

    return ChatSession(
        id=session.id,
        paper_id=session.paper_id,
        user_id=session.user_id,
        title=session.title,
        created_at=session.created_at.isoformat() if session.created_at else None,
        updated_at=session.updated_at.isoformat() if session.updated_at else None,
        message_count=0
    )

@router.post("/messages")
async def add_message(
    session_id: str = Query(...),
    message: ChatMessage = Body(...),
    db: Session = Depends(get_session)
):
    """Add a message to a session"""
    logger.info(f"[add_message] db type: {type(db)}, has add: {hasattr(db, 'add')}")
    logger.info(f"[add_message] message type: {type(message)}, message: {message}")
    service = PaperPersistenceService(db)

    msg = service.add_message(
        message_id=message.id,
        session_id=session_id,
        role=message.role,
        content=message.content,
        context=message.context
    )

    return ChatMessage(
        id=msg.id,
        role=msg.role,
        content=msg.content,
        context=msg.context,
        created_at=msg.created_at.isoformat() if msg.created_at else None
    )
