"""
Migration: Create tree-related tables
Creates tables for tree sessions, idea nodes, and node connections
"""

import sys
import os
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import create_engine, inspect
from dotenv import load_dotenv
import logging

from database.connection import Base
from models.database.tree_models import TreeSession, IdeaNode, NodeConnection

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
    db_password = os.getenv('DB_PASSWORD', 'postgres')
    db_name = os.getenv('DB_NAME', 'projectup')

    return f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"


def check_tables_exist(engine):
    """Check if tree tables already exist"""
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()

    expected_tables = ['tree_sessions', 'idea_nodes', 'node_connections']
    existing = [table for table in expected_tables if table in existing_tables]

    return existing


def create_tables():
    """Create all tree-related tables"""
    database_url = get_database_url()
    logger.info(f"Connecting to database: {database_url.split('@')[1] if '@' in database_url else database_url}")

    engine = create_engine(database_url)

    try:
        # Check if tables already exist
        existing = check_tables_exist(engine)
        if existing:
            logger.info(f"Tables already exist: {', '.join(existing)}")
            logger.info("Skipping creation of existing tables")

        # Create tables
        logger.info("Creating tree tables...")
        Base.metadata.create_all(
            bind=engine,
            tables=[
                TreeSession.__table__,
                IdeaNode.__table__,
                NodeConnection.__table__,
            ]
        )
        logger.info("✅ Tree tables created successfully!")

        # Verify tables were created
        inspector = inspect(engine)
        tables = inspector.get_table_names()

        expected_tables = [
            'tree_sessions',
            'idea_nodes',
            'node_connections'
        ]

        for table in expected_tables:
            if table in tables:
                logger.info(f"  ✓ {table}")
                # Show column info
                columns = inspector.get_columns(table)
                logger.info(f"    Columns: {len(columns)}")
                for col in columns:
                    logger.info(f"      - {col['name']} ({col['type']})")
            else:
                logger.warning(f"  ✗ {table} not found")

    except Exception as e:
        logger.error(f"Error creating tables: {e}")
        raise
    finally:
        engine.dispose()


def drop_tables():
    """Drop all tree-related tables (use with caution!)"""
    database_url = get_database_url()
    engine = create_engine(database_url)

    try:
        logger.warning("Dropping tree tables...")
        Base.metadata.drop_all(
            bind=engine,
            tables=[
                NodeConnection.__table__,
                IdeaNode.__table__,
                TreeSession.__table__,
            ]
        )
        logger.info("✅ Tree tables dropped successfully!")
    except Exception as e:
        logger.error(f"Error dropping tables: {e}")
        raise
    finally:
        engine.dispose()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='Manage tree-related database tables')
    parser.add_argument('action', choices=['create', 'drop'], help='Action to perform')
    args = parser.parse_args()

    if args.action == 'create':
        create_tables()
    elif args.action == 'drop':
        confirm = input("Are you sure you want to drop all tree tables? This will delete all data. (yes/no): ")
        if confirm.lower() == 'yes':
            drop_tables()
        else:
            logger.info("Operation cancelled")
