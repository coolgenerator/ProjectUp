"""
Database connection and session management for AI Agent.
Connects to the same PostgreSQL database as the backend.
"""

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, event

# Load environment variables from .env file
load_dotenv()
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import NullPool
from contextlib import contextmanager
from typing import Generator

# Database URL from environment or default
# Try DATABASE_URL first, then build from individual components
DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    # Build from individual PG_* environment variables
    pg_user = os.getenv('PG_USER', 'postgres')
    pg_password = os.getenv('PG_PASSWORD', 'postgres')
    pg_host = os.getenv('PG_HOST', 'localhost')
    pg_port = os.getenv('PG_PORT', '5432')
    pg_database = os.getenv('PG_DATABASE', 'projectup')

    DATABASE_URL = f"postgresql://{pg_user}:{pg_password}@{pg_host}:{pg_port}/{pg_database}"

# Create SQLAlchemy engine
# Note: Using NullPool to disable connection pooling entirely
# This prevents stale prepared statement cache issues after schema changes
# Each request gets a fresh database connection
engine = create_engine(
    DATABASE_URL,
    poolclass=NullPool,  # Disable connection pooling
    echo=False  # Set to True for SQL logging
)

# Create sessionmaker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    Dependency function to get database session.
    Automatically handles session lifecycle.

    Usage:
        from database import get_db

        @router.get("/items")
        def get_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_context():
    """
    Context manager for database sessions.

    Usage:
        from database import get_db_context

        with get_db_context() as db:
            items = db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize database tables.
    Creates all tables defined in models.
    """
    from models.database.tree_models import IdeaTree, IdeaNode, NodeConnection
    from models.database.node_template import NodeTemplate, TemplateCategory, TemplateUsageLog
    Base.metadata.create_all(bind=engine)


def close_db():
    """
    Close database connections.
    Call this on application shutdown.
    """
    engine.dispose()
