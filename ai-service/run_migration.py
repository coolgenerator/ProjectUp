#!/usr/bin/env python3
"""
Quick script to run SQL migrations on the AI service database
"""
import os
import sys
from sqlalchemy import text
from database.connection import engine

def run_migration(sql_file_path):
    """Run a SQL migration file"""
    print(f"Running migration: {sql_file_path}")

    # Read the SQL file
    with open(sql_file_path, 'r') as f:
        sql_content = f.read()

    # Execute the migration
    with engine.begin() as conn:
        # Execute as a raw SQL transaction
        conn.execute(text(sql_content))

    print("✓ Migration completed successfully!")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python run_migration.py <path_to_sql_file>")
        sys.exit(1)

    sql_file = sys.argv[1]

    if not os.path.exists(sql_file):
        print(f"Error: File not found: {sql_file}")
        sys.exit(1)

    run_migration(sql_file)
