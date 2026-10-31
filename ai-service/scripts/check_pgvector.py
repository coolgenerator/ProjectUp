"""
Check if pgvector extension is installed in PostgreSQL
"""

import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import engine
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def check_pgvector():
    """Check if pgvector extension is installed"""
    try:
        with engine.connect() as conn:
            # Check if pgvector extension exists
            result = conn.execute(text("""
                SELECT * FROM pg_extension WHERE extname = 'vector';
            """))

            row = result.fetchone()

            if row:
                logger.info("✅ pgvector extension is installed!")
                logger.info(f"   Version: {row[1] if len(row) > 1 else 'unknown'}")
                return True
            else:
                logger.warning("⚠️ pgvector extension is NOT installed")
                logger.info("\n📝 To install pgvector, run this SQL command:")
                logger.info("   CREATE EXTENSION IF NOT EXISTS vector;")
                logger.info("\n   Or connect to your database and run:")
                logger.info("   psql -d projectup -c 'CREATE EXTENSION IF NOT EXISTS vector;'")
                return False

    except Exception as e:
        logger.error(f"❌ Error checking pgvector: {e}")
        return False


def install_pgvector():
    """Attempt to install pgvector extension"""
    try:
        logger.info("🚀 Attempting to install pgvector extension...")

        with engine.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            conn.commit()

        logger.info("✅ pgvector extension installed successfully!")
        return True

    except Exception as e:
        logger.error(f"❌ Failed to install pgvector: {e}")
        logger.info("\n💡 You may need to:")
        logger.info("   1. Install pgvector on your system: https://github.com/pgvector/pgvector")
        logger.info("   2. Connect as a superuser to install the extension")
        return False


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='pgvector Extension Checker')
    parser.add_argument(
        '--install',
        action='store_true',
        help='Attempt to install pgvector extension'
    )

    args = parser.parse_args()

    if args.install:
        install_pgvector()
    else:
        check_pgvector()
