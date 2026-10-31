#!/usr/bin/env python3
"""
Check if pgvector extension is installed and install it if needed
"""
from sqlalchemy import text
from database.connection import engine

def check_and_install_pgvector():
    """Check if pgvector is installed and install if not"""

    with engine.connect() as conn:
        # Check if pgvector extension exists
        result = conn.execute(text("""
            SELECT EXISTS (
                SELECT 1 FROM pg_extension WHERE extname = 'vector'
            ) AS extension_exists;
        """))

        extension_exists = result.fetchone()[0]

        if extension_exists:
            print("✓ pgvector extension is already installed")

            # Get version
            version_result = conn.execute(text("""
                SELECT extversion FROM pg_extension WHERE extname = 'vector';
            """))
            version = version_result.fetchone()[0]
            print(f"  Version: {version}")
        else:
            print("✗ pgvector extension is NOT installed")
            print("\nAttempting to install pgvector extension...")

            try:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
                conn.commit()
                print("✓ pgvector extension installed successfully!")
            except Exception as e:
                print(f"✗ Failed to install pgvector extension: {e}")
                print("\nTo install pgvector manually:")
                print("1. Install pgvector on your system:")
                print("   - Mac: brew install pgvector")
                print("   - Ubuntu: apt install postgresql-15-pgvector")
                print("2. Then run: CREATE EXTENSION vector; in your database")
                return False

        return True

if __name__ == "__main__":
    print("Checking pgvector installation...\n")
    check_and_install_pgvector()
