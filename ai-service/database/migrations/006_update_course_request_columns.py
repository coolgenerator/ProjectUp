"""
Migration: Update course_requests columns to increase length

This migration increases the difficulty and preferred_learning_style columns
from VARCHAR(50) to VARCHAR(255) to accommodate longer values.
"""

import sys
from pathlib import Path

# Add parent directory to path to import modules
sys.path.append(str(Path(__file__).parent.parent.parent))

from sqlalchemy import text
from database.database import DatabaseManager

def upgrade():
    """Increase course_requests column lengths"""
    db = DatabaseManager()

    with db.engine.connect() as conn:
        # Start transaction
        trans = conn.begin()

        try:
            print("🔄 Updating course_requests column lengths...")

            # Alter the difficulty column to VARCHAR(255)
            conn.execute(text("""
                ALTER TABLE course_requests
                ALTER COLUMN difficulty TYPE VARCHAR(255)
            """))
            print("✅ Updated difficulty column to VARCHAR(255)")

            # Alter the preferred_learning_style column to VARCHAR(255)
            conn.execute(text("""
                ALTER TABLE course_requests
                ALTER COLUMN preferred_learning_style TYPE VARCHAR(255)
            """))
            print("✅ Updated preferred_learning_style column to VARCHAR(255)")

            # Commit transaction
            trans.commit()
            print("✅ Migration completed successfully")

        except Exception as e:
            print(f"❌ Migration failed: {e}")
            trans.rollback()
            raise

def downgrade():
    """Revert course_requests columns back to VARCHAR(50)"""
    db = DatabaseManager()

    with db.engine.connect() as conn:
        trans = conn.begin()

        try:
            print("🔄 Reverting course_requests column lengths...")

            # Check if any values exceed 50 characters
            result = conn.execute(text("""
                SELECT COUNT(*) FROM course_requests
                WHERE LENGTH(difficulty) > 50 OR LENGTH(preferred_learning_style) > 50
            """))
            count = result.scalar()

            if count > 0:
                print(f"⚠️ Cannot downgrade: {count} records have values longer than 50 characters")
                print("   Please clean up data before downgrading")
                trans.rollback()
                return

            # Alter back to VARCHAR(50)
            conn.execute(text("""
                ALTER TABLE course_requests
                ALTER COLUMN difficulty TYPE VARCHAR(50)
            """))
            print("✅ Reverted difficulty column to VARCHAR(50)")

            conn.execute(text("""
                ALTER TABLE course_requests
                ALTER COLUMN preferred_learning_style TYPE VARCHAR(50)
            """))
            print("✅ Reverted preferred_learning_style column to VARCHAR(50)")

            trans.commit()
            print("✅ Downgrade completed successfully")

        except Exception as e:
            print(f"❌ Downgrade failed: {e}")
            trans.rollback()
            raise

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python 006_update_course_request_columns.py [upgrade|downgrade]")
        sys.exit(1)

    command = sys.argv[1]

    if command == "upgrade":
        upgrade()
    elif command == "downgrade":
        downgrade()
    else:
        print(f"Unknown command: {command}")
        print("Usage: python 006_update_course_request_columns.py [upgrade|downgrade]")
        sys.exit(1)
