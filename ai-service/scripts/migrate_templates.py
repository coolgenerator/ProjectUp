"""
Run Template Tables Migration

Creates the node templates tables with pgvector support.
"""

import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import engine
import logging
import importlib.util
import sys
from pathlib import Path

# Import migration module dynamically (can't use normal import due to numeric prefix)
migration_file = Path(__file__).parent.parent / "database" / "migrations" / "010_create_node_templates.py"
spec = importlib.util.spec_from_file_location("migration_010", migration_file)
migration_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(migration_module)

upgrade = migration_module.upgrade
downgrade = migration_module.downgrade

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def run_migration():
    """Run the template tables migration"""
    try:
        logger.info("🚀 Starting template tables migration...")

        with engine.connect() as conn:
            # Run the upgrade
            upgrade(conn)
            conn.commit()

        logger.info("✅ Template tables migration completed successfully!")
        return True

    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def rollback_migration():
    """Rollback the template tables migration"""
    try:
        logger.info("🔄 Rolling back template tables migration...")

        with engine.connect() as conn:
            # Run the downgrade
            downgrade(conn)
            conn.commit()

        logger.info("✅ Migration rolled back successfully!")
        return True

    except Exception as e:
        logger.error(f"❌ Rollback failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='Template Tables Migration')
    parser.add_argument(
        'action',
        choices=['upgrade', 'downgrade'],
        help='Migration action to perform'
    )

    args = parser.parse_args()

    if args.action == 'upgrade':
        success = run_migration()
    else:
        confirm = input("⚠️ This will DROP template tables. Type 'yes' to confirm: ")
        if confirm.lower() == 'yes':
            success = rollback_migration()
        else:
            logger.info("❌ Rollback cancelled")
            success = False

    sys.exit(0 if success else 1)
