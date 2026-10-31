"""API routes for trending news and papers"""

from fastapi import APIRouter, Query, HTTPException, BackgroundTasks
from typing import List, Dict, Any, Optional
from datetime import datetime
import asyncio

from crawler.database import TrendingDatabase
from crawler.source_manager import SourceManager
from crawler.scheduler import CrawlerScheduler

router = APIRouter(prefix="/ai-api/trending", tags=["trending"])

# Initialize components
database = TrendingDatabase()
source_manager = SourceManager()
scheduler = CrawlerScheduler()


@router.get("/items")
async def get_trending_items(
    field: Optional[str] = Query(None, description="Filter by field (ai, quant, blockchain, etc.)"),
    source: Optional[str] = Query(None, description="Filter by source"),
    limit: int = Query(50, ge=1, le=200, description="Maximum number of items to return"),
    days: int = Query(7, ge=1, le=30, description="Number of days to look back")
) -> List[Dict[str, Any]]:
    """Get trending items from the database"""
    try:
        items = database.get_trending(
            field=field,
            source=source,
            limit=limit,
            days=days
        )
        return items
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/fields")
async def get_fields() -> Dict[str, Any]:
    """Get list of available fields and their configuration"""
    return source_manager.list_fields()


@router.get("/sources")
async def get_sources() -> Dict[str, Any]:
    """Get list of available sources and their status"""
    return source_manager.list_sources()


@router.post("/sources/{source_name}/enable")
async def enable_source(source_name: str) -> Dict[str, str]:
    """Enable a data source"""
    source_manager.enable_source(source_name)
    return {"message": f"Source {source_name} enabled"}


@router.post("/sources/{source_name}/disable")
async def disable_source(source_name: str) -> Dict[str, str]:
    """Disable a data source"""
    source_manager.disable_source(source_name)
    return {"message": f"Source {source_name} disabled"}


@router.put("/sources/{source_name}/config")
async def update_source_config(
    source_name: str,
    config: Dict[str, Any]
) -> Dict[str, str]:
    """Update configuration for a source"""
    source_manager.update_source_config(source_name, **config)
    return {"message": f"Configuration updated for source {source_name}"}


@router.post("/crawl")
async def trigger_crawl(
    background_tasks: BackgroundTasks,
    field: Optional[str] = Query(None, description="Specific field to crawl"),
    source: Optional[str] = Query(None, description="Specific source to crawl")
) -> Dict[str, Any]:
    """Trigger a crawl on demand"""
    
    async def run_crawl():
        await scheduler.crawl_on_demand(field=field, source=source)
    
    background_tasks.add_task(run_crawl)
    
    return {
        "message": "Crawl triggered",
        "field": field,
        "source": source,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/statistics")
async def get_statistics() -> Dict[str, Any]:
    """Get crawling statistics"""
    return database.get_statistics()


@router.get("/search")
async def search_items(
    query: str = Query(..., description="Search query"),
    limit: int = Query(50, ge=1, le=200, description="Maximum number of results")
) -> List[Dict[str, Any]]:
    """Search for items by title or description"""
    try:
        items = database.search_items(query, limit)
        return items
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/scheduler/status")
async def get_scheduler_status() -> Dict[str, Any]:
    """Get scheduler status"""
    return scheduler.get_status()


@router.post("/cleanup")
async def cleanup_old_data(
    days: int = Query(30, ge=7, le=90, description="Remove items older than this many days")
) -> Dict[str, Any]:
    """Clean up old data from the database"""
    deleted_count = database.cleanup_old_items(days)
    return {
        "message": f"Cleaned up {deleted_count} items older than {days} days",
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/fields/{field_name}/trending")
async def get_field_trending(
    field_name: str,
    limit: int = Query(20, ge=1, le=100)
) -> Dict[str, Any]:
    """Get trending items for a specific field with aggregated insights"""
    
    items = database.get_trending(field=field_name, limit=limit)
    
    # Group by type
    papers = [item for item in items if item.get("type") == "paper"]
    articles = [item for item in items if item.get("type") == "article"]
    discussions = [item for item in items if item.get("type") == "discussion"]
    repositories = [item for item in items if item.get("type") == "repository"]
    
    return {
        "field": field_name,
        "total_items": len(items),
        "papers": papers[:10],
        "articles": articles[:10],
        "discussions": discussions[:10],
        "repositories": repositories[:10],
        "last_updated": datetime.utcnow().isoformat()
    }


@router.get("/daily-digest")
async def get_daily_digest() -> Dict[str, Any]:
    """Get a daily digest of trending items across all fields"""
    
    digest = {}
    fields = source_manager.get_enabled_fields()
    
    for field in fields:
        items = database.get_trending(field=field, limit=5, days=1)
        if items:
            digest[field] = {
                "top_items": items,
                "count": len(items)
            }
    
    return {
        "date": datetime.utcnow().date().isoformat(),
        "fields": digest,
        "generated_at": datetime.utcnow().isoformat()
    }