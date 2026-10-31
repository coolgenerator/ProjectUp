from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.session import get_session
from services.paper.persistence_service import PaperPersistenceService

router = APIRouter()

@router.get("/test-sessions/{paper_id}/{user_id}")
async def test_get_sessions(paper_id: str, user_id: str):
    return {"paper_id": paper_id, "user_id": user_id, "test": "success"}

@router.get("/sessions-list/{paper_id}/{user_id}")
async def get_chat_sessions_list(
    paper_id: str,
    user_id: str,
    db: Session = Depends(get_session)
):
    """Get all chat sessions for a paper and user"""
    service = PaperPersistenceService(db)
    sessions = service.get_sessions(paper_id, user_id)

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
