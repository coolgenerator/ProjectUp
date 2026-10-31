"""
Migration: Update course_requests.user_experience column to TEXT

This migration changes the user_experience column from VARCHAR(50) to TEXT
to accommodate longer user experience descriptions.
"""

import sys
from pathlib import Path

# Add parent directory to path to import modules
sys.path.append(str(Path(__file__).parent.parent.parent))

from sqlalchemy import text
from database.database import DatabaseManager

def upgrade():
    """Change user_experience column to TEXT"""
    db = DatabaseManager()

    with db.engine.connect() as conn:
        # Start transaction
        trans = conn.begin()

        try:
            print("🔄 Updating course_requests.user_experience column to TEXT...")

            # Alter the user_experience column to TEXT
            conn.execute(text("""
                ALTER TABLE course_requests
                ALTER COLUMN user_experience TYPE TEXT
            """))
            print("✅ Updated user_experience column to TEXT")

            # Also update topic to VARCHAR(500) to match model
            conn.execute(text("""
                ALTER TABLE course_requests
                ALTER COLUMN topic TYPE VARCHAR(500)
            """))
            print("✅ Updated topic column to VARCHAR(500)")

            # Commit transaction
            trans.commit()
            print("✅ Migration completed successfully")

        except Exception as e:
            print(f"❌ Migration failed: {e}")
            trans.rollback()
            raise

def downgrade():
    """Revert user_experience column back to VARCHAR(50)"""
    db = DatabaseManager()

    with db.engine.connect() as conn:
        trans = conn.begin()

        try:
            print("🔄 Reverting course_requests columns...")

            # Check if any values exceed limits
            result = conn.execute(text("""
                SELECT COUNT(*) FROM course_requests
                WHERE LENGTH(user_experience) > 50 OR LENGTH(topic) > 255
            """))
            count = result.scalar()

            if count > 0:
                print(f"⚠️ Cannot downgrade: {count} records have values exceeding limits")
                print("   Please clean up data before downgrading")
                trans.rollback()
                return

            # Alter back
            conn.execute(text("""
                ALTER TABLE course_requests
                ALTER COLUMN user_experience TYPE VARCHAR(50)
            """))
            print("✅ Reverted user_experience column to VARCHAR(50)")

            conn.execute(text("""
                ALTER TABLE course_requests
                ALTER COLUMN topic TYPE VARCHAR(255)
            """))
            print("✅ Reverted topic column to VARCHAR(255)")

            trans.commit()
            print("✅ Downgrade completed successfully")

        except Exception as e:
            print(f"❌ Downgrade failed: {e}")
            trans.rollback()
            raise

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python 007_update_course_request_user_experience.py [upgrade|downgrade]")
        sys.exit(1)

    command = sys.argv[1]

    if command == "upgrade":
        upgrade()
    elif command == "downgrade":
        downgrade()
    else:
        print(f"Unknown command: {command}")
        print("Usage: python 007_update_course_request_user_experience.py [upgrade|downgrade]")
        sys.exit(1)
