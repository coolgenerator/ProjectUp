#!/usr/bin/env python3
"""
Migration: Update paper model IDs from String(50) to String(36) for UUID format
"""

import os
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

def get_database_url():
    """Get database URL from environment"""
    database_url = os.getenv('DATABASE_URL')

    if not database_url:
        pg_user = os.getenv('PG_USER', 'postgres')
        pg_password = os.getenv('PG_PASSWORD', 'postgres')
        pg_host = os.getenv('PG_HOST', 'localhost')
        pg_port = os.getenv('PG_PORT', '5432')
        pg_database = os.getenv('PG_DATABASE', 'projectup')

        database_url = f"postgresql://{pg_user}:{pg_password}@{pg_host}:{pg_port}/{pg_database}"

    return database_url


def run_migration():
    """Run the migration to update column sizes"""
    database_url = get_database_url()
    engine = create_engine(database_url)

    logger.info("🚀 Starting migration: Update paper model IDs to UUID format (String 36)")

    try:
        with engine.connect() as conn:
            # Check if tables exist
            result = conn.execute(text("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name IN ('paper_chat_sessions', 'paper_chat_messages', 'paper_notes', 'paper_outlines', 'paper_references')
            """))
            existing_tables = [row[0] for row in result]

            if not existing_tables:
                logger.info("⚠️ No paper tables exist yet. Skipping migration.")
                logger.info("   Tables will be created with correct schema on first init.")
                return

            logger.info(f"📋 Found existing tables: {', '.join(existing_tables)}")

            # Update paper_chat_sessions
            if 'paper_chat_sessions' in existing_tables:
                logger.info("Updating paper_chat_sessions...")
                conn.execute(text("""
                    ALTER TABLE paper_chat_sessions
                    ALTER COLUMN id TYPE VARCHAR(36),
                    ALTER COLUMN paper_id TYPE VARCHAR(36),
                    ALTER COLUMN user_id TYPE VARCHAR(36)
                """))
                conn.commit()
                logger.info("✓ Updated paper_chat_sessions")

            # Update paper_chat_messages
            if 'paper_chat_messages' in existing_tables:
                logger.info("Updating paper_chat_messages...")
                conn.execute(text("""
                    ALTER TABLE paper_chat_messages
                    ALTER COLUMN id TYPE VARCHAR(36),
                    ALTER COLUMN session_id TYPE VARCHAR(36)
                """))
                conn.commit()
                logger.info("✓ Updated paper_chat_messages")

            # Update paper_notes
            if 'paper_notes' in existing_tables:
                logger.info("Updating paper_notes...")
                conn.execute(text("""
                    ALTER TABLE paper_notes
                    ALTER COLUMN id TYPE VARCHAR(36),
                    ALTER COLUMN paper_id TYPE VARCHAR(36),
                    ALTER COLUMN user_id TYPE VARCHAR(36)
                """))
                conn.commit()
                logger.info("✓ Updated paper_notes")

            # Update paper_outlines
            if 'paper_outlines' in existing_tables:
                logger.info("Updating paper_outlines...")
                conn.execute(text("""
                    ALTER TABLE paper_outlines
                    ALTER COLUMN id TYPE VARCHAR(36),
                    ALTER COLUMN paper_id TYPE VARCHAR(36)
                """))
                conn.commit()
                logger.info("✓ Updated paper_outlines")

            # Update paper_references
            if 'paper_references' in existing_tables:
                logger.info("Updating paper_references...")
                conn.execute(text("""
                    ALTER TABLE paper_references
                    ALTER COLUMN id TYPE VARCHAR(36),
                    ALTER COLUMN paper_id TYPE VARCHAR(36)
                """))
                conn.commit()
                logger.info("✓ Updated paper_references")

        logger.info("✅ Migration completed successfully!")

    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        raise


if __name__ == "__main__":
    try:
        run_migration()
    except KeyboardInterrupt:
        logger.info("\n❌ Migration cancelled")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        sys.exit(1)
