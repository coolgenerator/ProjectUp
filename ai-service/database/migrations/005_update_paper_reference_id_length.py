"""
Migration: Update paper_references.id column from VARCHAR(36) to VARCHAR(100)

This migration increases the id column length to accommodate composite IDs
in the format {paper_id}_{ref_id} which can exceed 36 characters.
"""

import sys
from pathlib import Path

# Add parent directory to path to import modules
sys.path.append(str(Path(__file__).parent.parent.parent))

from sqlalchemy import text
from database.database import DatabaseManager

def upgrade():
    """Increase paper_references.id column length"""
    db = DatabaseManager()

    with db.engine.connect() as conn:
        # Start transaction
        trans = conn.begin()

        try:
            print("🔄 Updating paper_references.id column length...")

            # Alter the id column to VARCHAR(100)
            conn.execute(text("""
                ALTER TABLE paper_references
                ALTER COLUMN id TYPE VARCHAR(100)
            """))

            print("✅ Successfully updated paper_references.id to VARCHAR(100)")

            # Commit transaction
            trans.commit()

        except Exception as e:
            print(f"❌ Migration failed: {e}")
            trans.rollback()
            raise

def downgrade():
    """Revert paper_references.id column back to VARCHAR(36)"""
    db = DatabaseManager()

    with db.engine.connect() as conn:
        trans = conn.begin()

        try:
            print("🔄 Reverting paper_references.id column length...")

            # Check if any IDs exceed 36 characters
            result = conn.execute(text("""
                SELECT COUNT(*) FROM paper_references
                WHERE LENGTH(id) > 36
            """))
            count = result.scalar()

            if count > 0:
                print(f"⚠️ Cannot downgrade: {count} references have IDs longer than 36 characters")
                print("   Please clean up data before downgrading")
                trans.rollback()
                return

            # Alter back to VARCHAR(36)
            conn.execute(text("""
                ALTER TABLE paper_references
                ALTER COLUMN id TYPE VARCHAR(36)
            """))

            print("✅ Successfully reverted paper_references.id to VARCHAR(36)")
            trans.commit()

        except Exception as e:
            print(f"❌ Downgrade failed: {e}")
            trans.rollback()
            raise

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python 005_update_paper_reference_id_length.py [upgrade|downgrade]")
        sys.exit(1)

    command = sys.argv[1]

    if command == "upgrade":
        upgrade()
    elif command == "downgrade":
        downgrade()
    else:
        print(f"Unknown command: {command}")
        print("Usage: python 005_update_paper_reference_id_length.py [upgrade|downgrade]")
        sys.exit(1)
