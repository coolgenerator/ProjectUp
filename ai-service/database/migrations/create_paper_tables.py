"""
Migration: Create paper-related tables
Creates tables for chat sessions, notes, outlines, and references
"""

import sys
import os
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from dotenv import load_dotenv
import logging

from database.connection import Base
from models.database.paper_models import (
    PaperChatSession,
    PaperChatMessage,
    PaperNote,
    PaperOutline,
    PaperReference
)

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def get_database_url():
    """Get database URL from environment"""
    db_host = os.getenv('DB_HOST', 'localhost')
    db_port = os.getenv('DB_PORT', '5432')
    db_user = os.getenv('DB_USER', 'postgres')
    db_password = os.getenv('DB_PASSWORD', '')
    db_name = os.getenv('DB_NAME', 'projectup')

    return f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"


def create_tables():
    """Create all paper-related tables"""
    database_url = get_database_url()
    logger.info(f"Connecting to database: {database_url.split('@')[1] if '@' in database_url else database_url}")

    engine = create_engine(database_url)

    try:
        # Create tables
        logger.info("Creating paper tables...")
        Base.metadata.create_all(
            bind=engine,
            tables=[
                PaperChatSession.__table__,
                PaperChatMessage.__table__,
                PaperNote.__table__,
                PaperOutline.__table__,
                PaperReference.__table__,
            ]
        )
        logger.info("✅ Paper tables created successfully!")

        # Verify tables were created
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()

        expected_tables = [
            'paper_chat_sessions',
            'paper_chat_messages',
            'paper_notes',
            'paper_outlines',
            'paper_references'
        ]

        for table in expected_tables:
            if table in tables:
                logger.info(f"  ✓ {table}")
            else:
                logger.warning(f"  ✗ {table} not found")

    except Exception as e:
        logger.error(f"Error creating tables: {e}")
        raise
    finally:
        engine.dispose()


def drop_tables():
    """Drop all paper-related tables (use with caution!)"""
    database_url = get_database_url()
    engine = create_engine(database_url)

    try:
        logger.warning("Dropping paper tables...")
        Base.metadata.drop_all(
            bind=engine,
            tables=[
                PaperReference.__table__,
                PaperOutline.__table__,
                PaperNote.__table__,
                PaperChatMessage.__table__,
                PaperChatSession.__table__,
            ]
        )
        logger.info("✅ Paper tables dropped successfully!")
    except Exception as e:
        logger.error(f"Error dropping tables: {e}")
        raise
    finally:
        engine.dispose()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='Manage paper-related database tables')
    parser.add_argument('action', choices=['create', 'drop'], help='Action to perform')
    args = parser.parse_args()

    if args.action == 'create':
        create_tables()
    elif args.action == 'drop':
        confirm = input("Are you sure you want to drop all paper tables? This will delete all data. (yes/no): ")
        if confirm.lower() == 'yes':
            drop_tables()
        else:
            logger.info("Operation cancelled")
