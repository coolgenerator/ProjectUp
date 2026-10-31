# Template System Setup Guide

## Quick Start

Follow these steps to set up the template system with semantic search:

### Step 1: Check pgvector Extension

```bash
cd ai-service
python scripts/check_pgvector.py
```

If pgvector is not installed, try:
```bash
python scripts/check_pgvector.py --install
```

If automatic installation fails, you'll need to install pgvector manually:
```bash
# On macOS with Homebrew
brew install pgvector

# Then connect to your database
psql -d projectup -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### Step 2: Run Database Migration

```bash
python scripts/migrate_templates.py upgrade
```

Expected output:
```
🚀 Starting template tables migration...
✓ Created node_templates tables
✅ Template tables migration completed successfully!
```

### Step 3: Seed Template Data

```bash
python scripts/seed_templates.py
```

Expected output:
```
Starting template seeding... (50 templates)
✓ Successfully created 50 templates

📚 Template Library Summary:
  📚 All Templates: 50 templates
  💼 Business: 8 templates
  📢 Marketing: 7 templates
  🎓 Academy: 5 templates
  ⚙️ Product: 5 templates
  🎯 Personal: 5 templates
  💻 Development: 7 templates
  🔬 Research: 6 templates
```

### Step 4: Start the AI Service

```bash
python main.py
```

The server should start without errors. Look for:
```
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Step 5: Test the API

```bash
# Test health endpoint
curl http://localhost:8000/ai-api/templates/health

# Get categories
curl http://localhost:8000/ai-api/templates/categories

# Search templates
curl -X POST http://localhost:8000/ai-api/templates/search \
  -H "Content-Type: application/json" \
  -d '{"query": "I need help with marketing", "limit": 5}'
```

## Troubleshooting

### Error: "pgvector extension not found"

**Solution**: Install pgvector extension:
```bash
# For macOS
brew install pgvector

# For Ubuntu/Debian
sudo apt-get install postgresql-14-pgvector

# Then enable in database
psql -d projectup -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### Error: "Table already exists"

**Solution**: Drop and recreate tables:
```bash
python scripts/migrate_templates.py downgrade
python scripts/migrate_templates.py upgrade
```

### Error: "Cannot import name 'Base'"

**Solution**: This is now fixed. Make sure you pulled the latest changes.

### Error: "Embedding service not initialized"

**Solution**: Check Google Cloud credentials:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-key.json"
export GOOGLE_CLOUD_PROJECT="your-project-id"
```

## Verify Installation

Run this Python script to verify everything is working:

```python
import asyncio
from database.connection import SessionLocal
from services.template_service import TemplateService

async def test():
    db = SessionLocal()
    service = TemplateService(db)

    # Test 1: Get categories
    categories = service.get_all_categories()
    print(f"✅ Found {len(categories)} categories")

    # Test 2: Get templates by category
    templates = service.get_templates_by_category(category='business', limit=5)
    print(f"✅ Found {len(templates)} business templates")

    # Test 3: Semantic search
    results = service.semantic_search(query="marketing strategy", limit=5)
    print(f"✅ Semantic search returned {len(results)} results")

    db.close()
    print("\n🎉 All tests passed!")

asyncio.run(test())
```

## Next Steps

1. **Frontend Integration**: The frontend already has the template UI integrated in QuickNodeCreator
2. **Usage Analytics**: Monitor template usage in the `template_usage_log` table
3. **Add More Templates**: Use `scripts/seed_templates.py` as a reference to add more

## Database Schema

### Tables Created

- `node_templates` - Template definitions with embeddings
- `template_categories` - Category hierarchy (optional)
- `template_usage_log` - Usage tracking for analytics

### Key Indexes

- Vector index on `embedding` column for fast semantic search
- Category and subcategory indexes for filtering
- GIN index on `tags` array

## API Endpoints

- `GET /ai-api/templates/health` - Health check
- `GET /ai-api/templates/categories` - Get all categories
- `GET /ai-api/templates/category/{category}` - Get templates by category
- `POST /ai-api/templates/search` - Semantic search
- `GET /ai-api/templates/{template_id}` - Get specific template
- `POST /ai-api/templates/usage` - Log template usage

See API docs at: http://localhost:8000/docs
