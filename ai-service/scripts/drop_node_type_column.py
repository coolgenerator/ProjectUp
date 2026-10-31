#!/usr/bin/env python3
"""
Migration script to drop node_type column from idea_nodes table
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.database import get_db
from sqlalchemy import text

def drop_node_type_column():
    """Drop the node_type column from idea_nodes table"""
    db_manager = get_db()
    db = db_manager.SessionLocal()

    try:
        print("Dropping node_type column from idea_nodes table...")

        # Drop the column
        db.execute(text("""
            ALTER TABLE idea_nodes
            DROP COLUMN IF EXISTS node_type;
        """))

        db.commit()
        print("✓ Successfully dropped node_type column")

    except Exception as e:
        print(f"✗ Error dropping column: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    drop_node_type_column()
