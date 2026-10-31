#!/usr/bin/env python3
"""
Database Migration: Add Conversation Branching Support to node_chat_sessions

This migration adds branching capabilities to NodeChatSession:
- Adds parent_session_id for tracking branch relationships
- Adds branch_name for identifying branches ('main', 'branch-1', etc.)
- Adds branch_point_index for tracking where branch diverged
- Adds branch_display_name for user-friendly branch names
- Drops the unique constraint that prevented multiple active sessions per node
- Adds new indexes for efficient branching queries
"""

from sqlalchemy import text
from database.connection import engine

def migrate_chat_session_branching():
    """Add branching support to node_chat_sessions table"""

    with engine.begin() as conn:
        print("=" * 70)
        print("ADDING CONVERSATION BRANCHING SUPPORT TO node_chat_sessions")
        print("=" * 70)

        # Step 1: Drop the old unique constraint that prevented branching
        print("\n[1/6] Dropping old unique constraint...")
        try:
            # Try to drop the unique index if it exists
            conn.execute(text("""
                DROP INDEX IF EXISTS uq_node_active_session;
            """))
            print("  ✓ Dropped unique constraint 'uq_node_active_session'")
        except Exception as e:
            print(f"  ⚠ Constraint might not exist: {e}")

        # Step 2: Add new columns for branching
        print("\n[2/6] Adding branching columns...")

        # Add parent_session_id
        try:
            conn.execute(text("""
                ALTER TABLE node_chat_sessions
                ADD COLUMN IF NOT EXISTS parent_session_id UUID REFERENCES node_chat_sessions(id);
            """))
            print("  ✓ Added column 'parent_session_id'")
        except Exception as e:
            print(f"  ⚠ Column might already exist: {e}")

        # Add branch_name with default 'main'
        try:
            conn.execute(text("""
                ALTER TABLE node_chat_sessions
                ADD COLUMN IF NOT EXISTS branch_name VARCHAR(100) DEFAULT 'main' NOT NULL;
            """))
            print("  ✓ Added column 'branch_name' (default: 'main')")
        except Exception as e:
            print(f"  ⚠ Column might already exist: {e}")

        # Add branch_point_index
        try:
            conn.execute(text("""
                ALTER TABLE node_chat_sessions
                ADD COLUMN IF NOT EXISTS branch_point_index INTEGER;
            """))
            print("  ✓ Added column 'branch_point_index'")
        except Exception as e:
            print(f"  ⚠ Column might already exist: {e}")

        # Add branch_display_name
        try:
            conn.execute(text("""
                ALTER TABLE node_chat_sessions
                ADD COLUMN IF NOT EXISTS branch_display_name VARCHAR(255);
            """))
            print("  ✓ Added column 'branch_display_name'")
        except Exception as e:
            print(f"  ⚠ Column might already exist: {e}")

        # Step 3: Update existing sessions to have branch_name = 'main'
        print("\n[3/6] Setting existing sessions to 'main' branch...")
        result = conn.execute(text("""
            UPDATE node_chat_sessions
            SET branch_name = 'main'
            WHERE branch_name IS NULL OR branch_name = '';
        """))
        print(f"  ✓ Updated {result.rowcount} sessions")

        # Step 4: Create indexes for efficient branching queries
        print("\n[4/6] Creating indexes...")

        try:
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_node_chat_sessions_node_active
                ON node_chat_sessions(node_id, is_active);
            """))
            print("  ✓ Created index 'idx_node_chat_sessions_node_active'")
        except Exception as e:
            print(f"  ⚠ Index might already exist: {e}")

        try:
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_node_chat_sessions_parent
                ON node_chat_sessions(parent_session_id);
            """))
            print("  ✓ Created index 'idx_node_chat_sessions_parent'")
        except Exception as e:
            print(f"  ⚠ Index might already exist: {e}")

        # Step 5: Verify the changes
        print("\n[5/6] Verifying migration...")
        result = conn.execute(text("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'node_chat_sessions'
            AND column_name IN ('parent_session_id', 'branch_name', 'branch_point_index', 'branch_display_name')
            ORDER BY column_name;
        """))

        columns = result.fetchall()
        if columns:
            print("  ✓ New columns verified:")
            for col in columns:
                print(f"    - {col[0]}: {col[1]} (nullable: {col[2]}, default: {col[3]})")
        else:
            print("  ⚠ Could not verify columns")

        # Step 6: Show summary
        print("\n[6/6] Migration summary...")
        result = conn.execute(text("""
            SELECT
                COUNT(*) as total_sessions,
                COUNT(DISTINCT node_id) as unique_nodes,
                COUNT(DISTINCT branch_name) as unique_branches,
                SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active_sessions
            FROM node_chat_sessions;
        """))
        stats = result.fetchone()
        if stats:
            print(f"  Total sessions: {stats[0]}")
            print(f"  Unique nodes: {stats[1]}")
            print(f"  Unique branches: {stats[2]}")
            print(f"  Active sessions: {stats[3]}")

        print("\n" + "=" * 70)
        print("✅ MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 70)
        print("\nConversation branching is now enabled!")
        print("Each node can now have multiple active chat sessions (branches).")
        print("\nBranch structure:")
        print("  - Main session: parent_session_id = NULL, branch_name = 'main'")
        print("  - Branch sessions: parent_session_id = <UUID>, branch_name = 'branch-1', etc.")
        print("=" * 70)

if __name__ == "__main__":
    try:
        migrate_chat_session_branching()
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        print("Please check the error and try again.")
        import traceback
        traceback.print_exc()
