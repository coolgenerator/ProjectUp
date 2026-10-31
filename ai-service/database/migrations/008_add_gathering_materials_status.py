"""
Migration: Add 'gathering_materials' to CourseStatus enum

This migration adds the GATHERING_MATERIALS status to the coursestatus enum
to support the new material gathering phase.
"""

import sys
from pathlib import Path

# Add parent directory to path to import modules
sys.path.append(str(Path(__file__).parent.parent.parent))

from sqlalchemy import text
from database.database import DatabaseManager

def upgrade():
    """Add 'gathering_materials' to coursestatus enum"""
    db = DatabaseManager()

    with db.engine.connect() as conn:
        # Start transaction
        trans = conn.begin()

        try:
            print("🔄 Adding 'gathering_materials' to coursestatus enum...")

            # Add the new enum value (use uppercase GATHERING_MATERIALS to match existing pattern)
            conn.execute(text("""
                ALTER TYPE coursestatus ADD VALUE IF NOT EXISTS 'GATHERING_MATERIALS' AFTER 'GENERATED'
            """))
            print("✅ Added 'GATHERING_MATERIALS' to coursestatus enum")

            # Commit transaction
            trans.commit()
            print("✅ Migration completed successfully")

        except Exception as e:
            print(f"❌ Migration failed: {e}")
            trans.rollback()
            raise

def downgrade():
    """Note: Cannot remove enum values in PostgreSQL"""
    print("⚠️ Cannot remove enum values from PostgreSQL enums")
    print("   The 'gathering_materials' value will remain in the database")
    print("   To fully remove it, you would need to recreate the enum type")

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python 008_add_gathering_materials_status.py [upgrade|downgrade]")
        sys.exit(1)

    command = sys.argv[1]

    if command == "upgrade":
        upgrade()
    elif command == "downgrade":
        downgrade()
    else:
        print(f"Unknown command: {command}")
        print("Usage: python 008_add_gathering_materials_status.py [upgrade|downgrade]")
        sys.exit(1)
