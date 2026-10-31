#!/usr/bin/env python3
"""
Unified Database Management System

Combines database initialization, migration, and management functionality.
"""

import os
import sys
import logging
import importlib
import inspect
from pathlib import Path
from typing import List, Dict, Any, Type, Optional
from datetime import datetime
from contextlib import contextmanager

from sqlalchemy import create_engine, text, inspect as sql_inspect, MetaData
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from sqlalchemy.ext.declarative import DeclarativeMeta
from sqlalchemy.pool import NullPool
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DatabaseManager:
    """Unified database manager for initialization, migration, and operations"""
    
    def __init__(self, database_url: Optional[str] = None):
        """Initialize the database manager"""
        self.database_url = database_url or self._get_database_url()
        self.engine = self._create_engine()
        self.inspector = sql_inspect(self.engine)
        self.SessionLocal = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=self.engine
        )
        self.discovered_models = {}
        self.migration_history = []
        
        logger.info(f"Database initialized with URL: {self._mask_password(self.database_url)}")
    
    def _get_database_url(self) -> str:
        """Get database URL from environment variables"""
        load_dotenv()
        
        # Try DATABASE_URL first
        database_url = os.getenv('DATABASE_URL')
        
        if not database_url:
            # Build from individual components
            pg_user = os.getenv('PG_USER', 'postgres')
            pg_password = os.getenv('PG_PASSWORD', 'postgres')
            pg_host = os.getenv('PG_HOST', 'localhost')
            pg_port = os.getenv('PG_PORT', '5432')
            pg_database = os.getenv('PG_DATABASE', 'projectup')
            
            database_url = f"postgresql://{pg_user}:{pg_password}@{pg_host}:{pg_port}/{pg_database}"
        
        return database_url
    
    def _create_engine(self):
        """Create SQLAlchemy engine with appropriate settings"""
        return create_engine(
            self.database_url,
            poolclass=NullPool,  # Use NullPool for better connection management
            pool_pre_ping=True,
            echo=False  # Set to True for SQL query debugging
        )
    
    def _mask_password(self, url: str) -> str:
        """Mask password in connection URL for logging"""
        if '@' in url:
            parts = url.split('@')
            if ':' in parts[0]:
                auth_parts = parts[0].split(':')
                if len(auth_parts) > 2:
                    auth_parts[-1] = '****'
                    parts[0] = ':'.join(auth_parts)
            return '@'.join(parts)
        return url
    
    @contextmanager
    def get_session(self) -> Session:
        """Get database session context manager"""
        session = self.SessionLocal()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Database session error: {e}")
            raise
        finally:
            session.close()
    
    # === Initialization Methods ===
    
    def init_database(self, force: bool = False):
        """Initialize database tables"""
        try:
            from .models import Base
            
            if force:
                logger.warning("Force mode enabled - dropping existing tables")
                Base.metadata.drop_all(bind=self.engine)
            
            # Create all tables
            Base.metadata.create_all(bind=self.engine)
            logger.info("✅ Database tables initialized successfully")
            
            # Verify connection
            if self.test_connection():
                logger.info("✅ Database connection verified")
            
            # Log created tables
            tables = self.get_table_list()
            if tables:
                logger.info(f"📋 Created {len(tables)} tables:")
                for table in tables:
                    logger.info(f"   - {table}")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize database: {e}")
            raise
    
    def test_connection(self) -> bool:
        """Test database connection"""
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text("SELECT 1"))
                return result.scalar() == 1
        except Exception as e:
            logger.error(f"Database connection test failed: {e}")
            return False
    
    def get_table_list(self) -> List[str]:
        """Get list of tables in the database"""
        try:
            return self.inspector.get_table_names()
        except Exception as e:
            logger.error(f"Failed to get table list: {e}")
            return []
    
    # === Migration Methods ===
    
    def discover_models(self, schema_dirs: List[str] = None) -> Dict[str, Any]:
        """
        Automatically discover all SQLAlchemy models from schema files
        
        Args:
            schema_dirs: List of directories to search for schema files
        
        Returns:
            Dictionary of discovered models
        """
        if schema_dirs is None:
            schema_dirs = ['database/models']
        
        logger.info("🔍 Discovering SQLAlchemy models...")
        
        project_root = Path(__file__).parent.parent
        
        for schema_dir in schema_dirs:
            schema_path = project_root / schema_dir
            
            if not schema_path.exists():
                logger.debug(f"Directory {schema_dir} not found, skipping...")
                continue
            
            logger.info(f"Searching in {schema_dir}/...")
            
            # Find all Python files in the schema directory
            for py_file in schema_path.glob("**/*.py"):
                if py_file.name.startswith('__'):
                    continue
                
                # Import the module
                module_name = py_file.stem
                try:
                    spec = importlib.util.spec_from_file_location(module_name, py_file)
                    module = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(module)
                    
                    # Find all SQLAlchemy models in the module
                    for name, obj in inspect.getmembers(module):
                        if (inspect.isclass(obj) and 
                            hasattr(obj, '__tablename__') and 
                            not name.startswith('_')):
                            
                            table_name = obj.__tablename__
                            self.discovered_models[table_name] = obj
                            logger.debug(f"  Found model: {name} -> table: {table_name}")
                            
                except Exception as e:
                    logger.debug(f"Could not import {py_file}: {e}")
        
        logger.info(f"📦 Discovered {len(self.discovered_models)} models")
        return self.discovered_models
    
    def migrate_all(self, force: bool = False):
        """Run all database migrations"""
        try:
            logger.info("🚀 Starting database migration...")
            
            # Discover models
            self.discover_models()
            
            if not self.discovered_models:
                logger.warning("⚠️ No models found to migrate")
                return False
            
            # Initialize database
            self.init_database(force=force)
            
            # Record migration
            self._record_migration(
                version="1.0.0",
                description="Initial migration",
                details=f"Created {len(self.discovered_models)} tables"
            )
            
            logger.info("✅ Migration completed successfully!")
            return True
            
        except Exception as e:
            logger.error(f"❌ Migration failed: {e}")
            raise
    
    def check_existing_tables(self) -> Dict[str, bool]:
        """Check which tables exist in the database"""
        existing_tables = set(self.get_table_list())
        table_status = {}
        
        for table_name in self.discovered_models.keys():
            exists = table_name in existing_tables
            table_status[table_name] = exists
            status = "✓" if exists else "✗"
            logger.info(f"  [{status}] {table_name}")
        
        return table_status
    
    def verify_schema(self) -> bool:
        """Verify that database schema matches model definitions"""
        try:
            from .models import Base
            
            # Get metadata from models
            model_metadata = Base.metadata
            
            # Create a test metadata from the database
            db_metadata = MetaData()
            db_metadata.reflect(bind=self.engine)
            
            # Compare tables
            model_tables = set(model_metadata.tables.keys())
            db_tables = set(db_metadata.tables.keys())
            
            missing_tables = model_tables - db_tables
            extra_tables = db_tables - model_tables
            
            is_valid = True
            
            if missing_tables:
                logger.warning(f"⚠️ Missing tables: {missing_tables}")
                is_valid = False
            
            if extra_tables:
                logger.info(f"ℹ️ Extra tables in database: {extra_tables}")
            
            return is_valid
            
        except Exception as e:
            logger.error(f"Schema verification failed: {e}")
            return False
    
    def _record_migration(self, version: str, description: str, details: str = None):
        """Record migration in history"""
        migration_entry = {
            'version': version,
            'description': description,
            'details': details,
            'applied_at': datetime.utcnow().isoformat()
        }
        self.migration_history.append(migration_entry)
        logger.info(f"📝 Recorded migration: {version} - {description}")
    
    def get_migration_history(self) -> List[Dict[str, Any]]:
        """Get migration history"""
        return self.migration_history
    
    # === Data Management Methods ===
    
    def get_statistics(self) -> dict:
        """Get database statistics"""
        stats = {}
        try:
            from .models import Source, Roadmap, RoadmapNode, Resource, CrawlJob, DocumentChunk

            with self.get_session() as session:
                stats['sources'] = session.query(Source).count()
                stats['roadmaps'] = session.query(Roadmap).count()
                stats['nodes'] = session.query(RoadmapNode).count()
                stats['resources'] = session.query(Resource).count()
                stats['crawl_jobs'] = session.query(CrawlJob).count()
                stats['document_chunks'] = session.query(DocumentChunk).count()
                
            logger.info(f"📊 Database statistics: {stats}")
        except Exception as e:
            logger.error(f"Failed to get statistics: {e}")
        return stats
    
    def cleanup_orphaned_resources(self):
        """Clean up orphaned resources"""
        try:
            from .models import Resource, RoadmapNode
            
            with self.get_session() as session:
                # Find resources without nodes
                orphaned = session.query(Resource).filter(
                    ~Resource.node_id.in_(
                        session.query(RoadmapNode.id)
                    )
                ).all()
                
                if orphaned:
                    for resource in orphaned:
                        session.delete(resource)
                    logger.info(f"🧹 Cleaned up {len(orphaned)} orphaned resources")
                else:
                    logger.info("✅ No orphaned resources found")
                
        except Exception as e:
            logger.error(f"Failed to cleanup orphaned resources: {e}")
    
    def drop_all_tables(self):
        """Drop all database tables - USE WITH CAUTION"""
        try:
            from .models import Base
            
            confirm = input("⚠️ This will DELETE ALL DATA. Type 'yes' to confirm: ")
            if confirm.lower() != 'yes':
                logger.info("❌ Drop operation cancelled")
                return
            
            Base.metadata.drop_all(bind=self.engine)
            logger.warning("🗑️ All database tables dropped")
        except Exception as e:
            logger.error(f"Failed to drop tables: {e}")
            raise


# === CLI Interface ===

def main():
    """Command-line interface for database management"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Database Management Utility',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python database/database.py init          # Initialize database tables
  python database/database.py migrate       # Run all migrations
  python database/database.py status        # Check table status
  python database/database.py verify        # Verify schema consistency
  python database/database.py stats         # Show database statistics
  python database/database.py cleanup       # Clean orphaned resources
  python database/database.py reset         # Drop and recreate all tables (DANGEROUS!)
        """
    )
    
    parser.add_argument(
        'command',
        choices=['init', 'migrate', 'status', 'verify', 'stats', 'cleanup', 'reset'],
        help='Command to run'
    )
    
    parser.add_argument(
        '--force',
        action='store_true',
        help='Force operation (required for reset)'
    )
    
    args = parser.parse_args()
    
    # Initialize database manager
    db = DatabaseManager()
    
    try:
        if args.command == 'init':
            print("🚀 Initializing database...")
            db.init_database(force=False)
            
        elif args.command == 'migrate':
            print("🚀 Running database migrations...")
            db.migrate_all(force=False)
            
        elif args.command == 'status':
            print("📊 Checking database status...")
            db.discover_models()
            print("\n📋 Table Status:")
            table_status = db.check_existing_tables()
            
            existing = sum(1 for v in table_status.values() if v)
            total = len(table_status)
            print(f"\n✅ {existing}/{total} tables exist")
            
        elif args.command == 'verify':
            print("🔍 Verifying schema consistency...")
            db.discover_models()
            is_valid = db.verify_schema()
            
            if is_valid:
                print("✅ Schema is consistent!")
            else:
                print("⚠️ Schema has inconsistencies. Run 'migrate' to fix.")
            
        elif args.command == 'stats':
            print("📊 Database Statistics:")
            stats = db.get_statistics()
            for key, value in stats.items():
                print(f"  {key}: {value}")
            
        elif args.command == 'cleanup':
            print("🧹 Cleaning up orphaned resources...")
            db.cleanup_orphaned_resources()
            
        elif args.command == 'reset':
            if not args.force:
                print("❌ Reset requires --force flag for safety")
                print("   This will DROP ALL TABLES! Use with caution.")
                sys.exit(1)
            
            print("🗑️ Resetting database...")
            db.drop_all_tables()
            db.init_database(force=True)
            print("✅ Database reset complete")
    
    except KeyboardInterrupt:
        print("\n❌ Operation cancelled")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


# Singleton instance
_db_instance = None

def get_db() -> DatabaseManager:
    """Get singleton database instance"""
    global _db_instance
    if _db_instance is None:
        _db_instance = DatabaseManager()
    return _db_instance


if __name__ == "__main__":
    main()