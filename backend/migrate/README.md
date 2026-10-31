# Database Migrations

This directory contains the database migration tools for ProjectUp. The migration process is organized to make it easy to add new models and maintain existing ones.

## Migration Structure

The migrations are organized by category:

1. **User Models**: User accounts, profiles, skills, interests, etc.
2. **Project Models**: Projects, members, resources, applications, etc.
3. **Communication Models**: Chats, messages, contacts, notifications, etc.
4. **Partner Models**: Partner/buddy finding posts and related models.

## Running Migrations

To run all migrations:

```bash
cd backend
go run migrate/migrate.go
```

## Adding a New Model

When adding a new model to the system:

1. Define your model in the appropriate file in the `models` package
2. Add the model to the appropriate migration function in `migrate.go`
3. Run the migrations

## Migration Best Practices

- Always add new models to the appropriate category function
- Keep model dependencies in mind when ordering migrations
- Use the Debug mode to see the generated SQL during development
- Run migrations in a test environment before deploying to production
- Back up the database before running migrations in production

## Troubleshooting

If you encounter issues with migrations:

- Check the log output for specific error messages
- Verify that your model definitions are valid
- Ensure that all required model dependencies are migrated first
- Check for any constraint violations or naming conflicts

---

## User Preferences Migration (Special Migration)

### Overview

A complete migration toolkit for transitioning user preferences from string-based to integer-based enums.

### Quick Start

```bash
# 1. Backup your database first!
pg_dump -U your_username -d projectup > backup_$(date +%Y%m%d).sql

# 2. Run the migration
go run migrate/migrate_preferences_complete.go

# 3. Verify success
go run migrate/verify_preferences_consistency.go
```

### Migration Scripts

| Script | Purpose |
|--------|---------|
| **migrate_preferences_complete.go** | Main migration: converts string preferences to integers |
| **verify_preferences_consistency.go** | Verification: runs 8 comprehensive checks |
| **rollback_preferences_migration.go** | Rollback: undoes migration if needed |

### Documentation

| Document | Description |
|----------|-------------|
| **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** | **START HERE** - Complete step-by-step guide |
| **[MIGRATION_QUICK_REFERENCE.md](./MIGRATION_QUICK_REFERENCE.md)** | Quick reference for common tasks |

### What's Being Migrated?

- **display_name_preference**: `VARCHAR` → `INTEGER` (0, 1, 2)
- **language**: Full names → ISO 639-1 codes (`"en"`, `"zh"`)
- **profile_visibility**: `VARCHAR` → `INTEGER` (0, 1, 2)

### Safety Features

✅ Idempotent - can run multiple times safely
✅ Creates defaults for users without preferences
✅ Comprehensive verification checks
✅ Rollback script available
✅ No data loss - converts existing data

### More Information

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for complete documentation including:
- Pre-migration checklist
- Step-by-step instructions
- Post-migration testing
- Troubleshooting guide
- Rollback procedures