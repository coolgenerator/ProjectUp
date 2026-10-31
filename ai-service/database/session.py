"""
Database Session Dependency

Provides FastAPI dependency for database sessions.
"""

from typing import Generator
from sqlalchemy.orm import Session
from .database import get_db


def get_db_session() -> Generator[Session, None, None]:
    """
    FastAPI dependency that provides database session.

    Usage:
        @router.get("/example")
        async def example(db: Session = Depends(get_db_session)):
            # Use db session here
            pass

    Yields:
        Session: SQLAlchemy database session
    """
    db_manager = get_db()
    with db_manager.get_session() as session:
        yield session

# Backward compatibility alias
get_session = get_db_session
