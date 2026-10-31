"""
Migration: Create Node Chat and Version tables

Creates tables for:
- node_chat_sessions: Chat sessions for refining nodes
- node_versions: Version history for nodes

Run with: python database/migrations/004_create_node_chat_tables.py
"""

from sqlalchemy import create_engine, text
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_database_url():
    """Get database URL from environment"""
    db_host = os.getenv('DB_HOST', 'localhost')
    db_port = os.getenv('DB_PORT', '5432')
    db_user = os.getenv('DB_USER', 'postgres')
    db_password = os.getenv('DB_PASSWORD', 'postgres')
    db_name = os.getenv('DB_NAME', 'projectup')

    return f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"

def run_migration():
    """Run the migration to create node chat tables"""
    database_url = get_database_url()
    print(f"Connecting to database: {database_url.split('@')[1] if '@' in database_url else database_url}")
    engine = create_engine(database_url)

    with engine.connect() as conn:
        # Start transaction
        trans = conn.begin()

        try:
            print("Creating node_chat_sessions table...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS node_chat_sessions (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    node_id UUID NOT NULL,
                    project_id VARCHAR(50) NOT NULL,
                    title VARCHAR(255) DEFAULT 'Refine Node Content',
                    is_active BOOLEAN DEFAULT true,
                    messages JSONB DEFAULT '[]'::jsonb NOT NULL,
                    context JSONB DEFAULT '{}'::jsonb NOT NULL,
                    message_count INTEGER DEFAULT 0,
                    last_message_at TIMESTAMP,
                    conclusion TEXT,
                    conclusion_updated_at TIMESTAMP,
                    created_by INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
                );
            """))

            print("Creating indexes on node_chat_sessions...")
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_node_chat_sessions_node_id
                ON node_chat_sessions(node_id);
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_node_chat_sessions_project_id
                ON node_chat_sessions(project_id);
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_node_chat_sessions_is_active
                ON node_chat_sessions(is_active);
            """))

            print("Creating node_versions table...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS node_versions (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    node_id UUID NOT NULL,
                    chat_session_id UUID,
                    version_number INTEGER NOT NULL,
                    is_current BOOLEAN DEFAULT false,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    tags TEXT[],
                    node_metadata JSONB DEFAULT '{}'::jsonb,
                    change_description TEXT,
                    change_type VARCHAR(50),
                    created_by INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    CONSTRAINT uq_node_version UNIQUE (node_id, version_number)
                );
            """))

            print("Creating indexes on node_versions...")
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_node_versions_node_id
                ON node_versions(node_id);
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_node_versions_chat_session_id
                ON node_versions(chat_session_id);
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_node_versions_is_current
                ON node_versions(is_current);
            """))

            print("Adding foreign key constraint...")
            conn.execute(text("""
                ALTER TABLE node_versions
                DROP CONSTRAINT IF EXISTS fk_node_versions_chat_session;

                ALTER TABLE node_versions
                ADD CONSTRAINT fk_node_versions_chat_session
                FOREIGN KEY (chat_session_id)
                REFERENCES node_chat_sessions(id)
                ON DELETE SET NULL;
            """))

            # Commit transaction
            trans.commit()
            print("✅ Migration completed successfully!")

        except Exception as e:
            # Rollback on error
            trans.rollback()
            print(f"❌ Migration failed: {e}")
            raise

def rollback_migration():
    """Rollback the migration (drop tables)"""
    database_url = get_database_url()
    engine = create_engine(database_url)

    with engine.connect() as conn:
        trans = conn.begin()

        try:
            print("Dropping node_versions table...")
            conn.execute(text("DROP TABLE IF EXISTS node_versions CASCADE;"))

            print("Dropping node_chat_sessions table...")
            conn.execute(text("DROP TABLE IF EXISTS node_chat_sessions CASCADE;"))

            trans.commit()
            print("✅ Rollback completed successfully!")

        except Exception as e:
            trans.rollback()
            print(f"❌ Rollback failed: {e}")
            raise

if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "rollback":
        rollback_migration()
    else:
        run_migration()
