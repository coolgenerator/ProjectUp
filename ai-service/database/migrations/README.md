# Database Migrations

This directory contains database migration scripts for the AI Agent service.

## Overview

The AI Agent uses PostgreSQL for data persistence. Migration scripts follow a general approach using SQLAlchemy models to create and manage database tables.

## Available Migrations

1. **create_paper_tables.py** - Creates paper-related tables (chat sessions, messages, notes, outlines, references)
2. **002_update_paper_ids_to_uuid.py** - Updates paper tables to use UUID primary keys
3. **003_create_tree_tables.py** - Creates tree-related tables (sessions, nodes, connections)

## Usage

Each migration script can be run independently using Python:

```bash
# Create tables
python database/migrations/003_create_tree_tables.py create

# Drop tables (with confirmation)
python database/migrations/003_create_tree_tables.py drop
```

## Environment Variables

Migrations use the following environment variables (with defaults):

- `DB_HOST` - Database host (default: localhost)
- `DB_PORT` - Database port (default: 5432)
- `DB_USER` - Database user (default: postgres)
- `DB_PASSWORD` - Database password (default: postgres)
- `DB_NAME` - Database name (default: projectup)

## Migration Pattern

All migrations follow this general approach:

1. Import SQLAlchemy models from the models directory
2. Use SQLAlchemy's `Base.metadata.create_all()` to create tables
3. Verify table creation using SQLAlchemy inspector
4. Provide both create and drop operations

This approach ensures:
- Tables are created consistently with the model definitions
- No duplication of table schemas between migrations and models
- Automatic detection of existing tables to avoid errors
- Type safety and validation through Pydantic/SQLAlchemy models

## Tree Tables Schema

The tree migration creates three tables:

### tree_sessions
- Stores brainstorming/ideation sessions
- UUID primary key
- Includes metadata like name, description, color, icon
- Tracks metrics (nodes_count, connections_count, completion_rate)
- Supports AI context (JSONB)
- Soft delete support (deleted_at)

### idea_nodes
- Stores individual nodes in the idea tree
- UUID primary key
- Foreign keys to sessions and parent nodes
- Rich properties (type, title, description, position)
- Visual customization (color, icon, expanded state)
- Progress tracking (status, progress, priority)
- AI integration (ai_generated, ai_suggestions)
- Soft delete support

### node_connections
- Stores connections between nodes
- UUID primary key
- Foreign keys to from/to nodes
- Connection metadata (type, label, style)

## Prerequisites

Before running migrations:

1. Ensure PostgreSQL is running:
   ```bash
   brew services start postgresql@17
   ```

2. Create the postgres role and database if needed:
   ```bash
   psql -U $(whoami) -d postgres -c "CREATE ROLE postgres WITH LOGIN SUPERUSER PASSWORD 'postgres';"
   psql -U $(whoami) -d postgres -c "CREATE DATABASE projectup OWNER postgres;"
   ```

3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Verifying Migrations

After running a migration, you can verify the tables were created:

```bash
psql -U postgres -d projectup -c "\dt"
```

To see the schema of a specific table:

```bash
psql -U postgres -d projectup -c "\d tree_sessions"
```

## Troubleshooting

**Connection refused error:**
- Make sure PostgreSQL is running: `brew services list | grep postgresql`
- Start PostgreSQL if needed: `brew services start postgresql@17`

**Role does not exist error:**
- Create the postgres role as shown in Prerequisites

**Database does not exist error:**
- Create the projectup database as shown in Prerequisites

## Best Practices

1. Always test migrations on a development database first
2. Back up production data before running migrations
3. Use the drop operation cautiously - it will delete all data
4. Check for existing tables before running create operations
5. Keep migrations idempotent where possible
