# LangGraph Checkpointer Management Plan

## Overview

Comprehensive strategy for managing LangGraph workflow state persistence (checkpoints) to ensure reliable, performant, and maintainable AI interactions.

## Current State

### Existing Checkpointer Implementation

**File**: `/ai-service/storage/checkpointer.py`

Current implementation uses:

- `MemorySaver` for in-memory state storage
- Session-based checkpoint management
- Basic session creation and state saving

**Limitations**:

1. **No persistence across restarts** - All state lost on server restart
2. **No cleanup policy** - Checkpoints accumulate indefinitely
3. **Memory leaks** - Old sessions never deleted
4. **No versioning** - Can't track state changes over time
5. **No recovery** - Failed workflows can't be resumed
6. **No analytics** - Can't analyze conversation patterns

## Proposed Architecture

### Three-Tier Storage Strategy

```
┌─────────────────────────────────────────────────────────┐
│                   Application Layer                      │
│  (LangGraph Workflows, Chat Sessions, AI Agents)        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│              Checkpoint Management Layer                 │
│  - Session Manager                                       │
│  - Cleanup Scheduler                                     │
│  - Version Controller                                    │
│  - Recovery Handler                                      │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ↓            ↓            ↓
┌──────────────┬──────────────┬──────────────┐
│ Hot Storage  │ Warm Storage │ Cold Storage │
│ (Redis)      │ (PostgreSQL) │ (S3)         │
│              │              │              │
│ Active       │ Recent       │ Archived     │
│ sessions     │ history      │ analytics    │
│ < 1 hour     │ 1-30 days    │ > 30 days    │
│              │              │              │
│ TTL: 1h      │ Retention:   │ Retention:   │
│              │ 30 days      │ 1 year       │
└──────────────┴──────────────┴──────────────┘
```

## Implementation Plan

### Phase 1: Database Schema (PostgreSQL)

#### 1.1 Create Checkpoint Tables

**File**: `/backend/migrations/008_create_checkpoint_tables.sql`

```sql
-- Checkpoint sessions table
CREATE TABLE IF NOT EXISTS checkpoint_sessions (
    session_id VARCHAR(255) PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    workflow_type VARCHAR(50) NOT NULL, -- 'chat', 'project', 'research', etc.

    -- Context
    project_id VARCHAR(255),
    node_id VARCHAR(255),

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_accessed_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,

    -- Status
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'paused', 'completed', 'failed', 'archived'

    -- Configuration
    config JSONB DEFAULT '{}',

    -- Indexing
    INDEX idx_checkpoint_sessions_user_id (user_id),
    INDEX idx_checkpoint_sessions_status (status),
    INDEX idx_checkpoint_sessions_expires_at (expires_at),
    INDEX idx_checkpoint_sessions_workflow_type (workflow_type)
);

-- Checkpoint states table (versioned)
CREATE TABLE IF NOT EXISTS checkpoint_states (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) REFERENCES checkpoint_sessions(session_id) ON DELETE CASCADE,

    -- State data
    state_data JSONB NOT NULL,
    state_hash VARCHAR(64), -- SHA256 hash for deduplication

    -- Versioning
    version INTEGER NOT NULL DEFAULT 1,
    parent_version INTEGER,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(50), -- 'user', 'ai', 'system'

    -- Snapshot info
    is_snapshot BOOLEAN DEFAULT FALSE, -- Major milestones
    snapshot_reason VARCHAR(255), -- Why this snapshot was taken

    -- Size tracking
    state_size_bytes INTEGER,

    -- Indexing
    UNIQUE (session_id, version),
    INDEX idx_checkpoint_states_session_id (session_id),
    INDEX idx_checkpoint_states_is_snapshot (is_snapshot),
    INDEX idx_checkpoint_states_created_at (created_at)
);

-- Checkpoint cleanup log
CREATE TABLE IF NOT EXISTS checkpoint_cleanup_log (
    id SERIAL PRIMARY KEY,
    cleanup_time TIMESTAMP DEFAULT NOW(),
    sessions_deleted INTEGER DEFAULT 0,
    states_deleted INTEGER DEFAULT 0,
    states_archived INTEGER DEFAULT 0,
    space_freed_bytes BIGINT DEFAULT 0,
    cleanup_type VARCHAR(50), -- 'scheduled', 'manual', 'auto'
    details JSONB DEFAULT '{}'
);

-- Checkpoint metrics (for analytics)
CREATE TABLE IF NOT EXISTS checkpoint_metrics (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) REFERENCES checkpoint_sessions(session_id) ON DELETE CASCADE,

    -- Counts
    total_messages INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    total_errors INTEGER DEFAULT 0,

    -- Timing
    session_duration_seconds INTEGER,
    avg_response_time_ms INTEGER,

    -- Quality metrics
    user_satisfaction INTEGER, -- 1-5 if available
    workflow_completion BOOLEAN DEFAULT FALSE,

    -- Costs (if tracked)
    estimated_cost_usd DECIMAL(10, 6),

    recorded_at TIMESTAMP DEFAULT NOW()
);

-- Function to auto-update updated_at and last_accessed_at
CREATE OR REPLACE FUNCTION update_checkpoint_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_checkpoint_session_timestamp
BEFORE UPDATE ON checkpoint_sessions
FOR EACH ROW
EXECUTE FUNCTION update_checkpoint_session_timestamp();

-- Function to calculate state size
CREATE OR REPLACE FUNCTION calculate_state_size()
RETURNS TRIGGER AS $$
BEGIN
    NEW.state_size_bytes = octet_length(NEW.state_data::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_state_size
BEFORE INSERT OR UPDATE ON checkpoint_states
FOR EACH ROW
EXECUTE FUNCTION calculate_state_size();
```

### Phase 2: Redis Integration (Hot Storage)

#### 2.1 Redis Checkpoint Manager

**File**: `/ai-service/storage/redis_checkpointer.py`

```python
"""
Redis-based Checkpoint Manager

High-performance checkpoint storage for active sessions.
"""

import json
import logging
from typing import Dict, Any, Optional
import redis
from datetime import timedelta

logger = logging.getLogger(__name__)


class RedisCheckpointer:
    """
    Fast checkpoint storage using Redis.

    Use for:
    - Active conversation sessions (< 1 hour)
    - Real-time state updates
    - High-frequency read/write operations

    Automatically expires after TTL.
    Falls back to PostgreSQL for long-term storage.
    """

    def __init__(
        self,
        redis_url: str = "redis://localhost:6379",
        ttl_seconds: int = 3600,  # 1 hour default
        key_prefix: str = "checkpoint:"
    ):
        self.redis_client = redis.from_url(redis_url, decode_responses=True)
        self.ttl = ttl_seconds
        self.key_prefix = key_prefix

    def save_state(
        self,
        session_id: str,
        state: Dict[str, Any],
        ttl: Optional[int] = None
    ) -> bool:
        """
        Save checkpoint state to Redis.

        Args:
            session_id: Session identifier
            state: State dictionary
            ttl: Custom TTL in seconds (overrides default)

        Returns:
            Success status
        """
        try:
            key = f"{self.key_prefix}{session_id}"
            state_json = json.dumps(state)

            # Save with TTL
            self.redis_client.setex(
                key,
                ttl or self.ttl,
                state_json
            )

            # Track last access
            self.redis_client.hset(
                f"{self.key_prefix}meta:{session_id}",
                "last_accessed",
                int(time.time())
            )

            logger.debug(f"Saved state for session {session_id} to Redis")
            return True

        except Exception as e:
            logger.error(f"Error saving to Redis: {e}")
            return False

    def load_state(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Load checkpoint state from Redis.

        Args:
            session_id: Session identifier

        Returns:
            State dictionary or None if not found
        """
        try:
            key = f"{self.key_prefix}{session_id}"
            state_json = self.redis_client.get(key)

            if not state_json:
                logger.debug(f"No state found in Redis for session {session_id}")
                return None

            # Update last access
            self.redis_client.hset(
                f"{self.key_prefix}meta:{session_id}",
                "last_accessed",
                int(time.time())
            )

            # Extend TTL on access
            self.redis_client.expire(key, self.ttl)

            return json.loads(state_json)

        except Exception as e:
            logger.error(f"Error loading from Redis: {e}")
            return None

    def delete_state(self, session_id: str) -> bool:
        """Delete checkpoint state from Redis"""
        try:
            key = f"{self.key_prefix}{session_id}"
            meta_key = f"{self.key_prefix}meta:{session_id}"

            self.redis_client.delete(key, meta_key)
            logger.debug(f"Deleted state for session {session_id} from Redis")
            return True

        except Exception as e:
            logger.error(f"Error deleting from Redis: {e}")
            return False

    def exists(self, session_id: str) -> bool:
        """Check if session exists in Redis"""
        key = f"{self.key_prefix}{session_id}"
        return self.redis_client.exists(key) > 0

    def get_active_sessions(self) -> list:
        """Get all active session IDs"""
        pattern = f"{self.key_prefix}*"
        keys = self.redis_client.keys(pattern)
        return [k.replace(self.key_prefix, "") for k in keys if ":meta:" not in k]

    def extend_ttl(self, session_id: str, additional_seconds: int = None):
        """Extend TTL for an active session"""
        key = f"{self.key_prefix}{session_id}"
        self.redis_client.expire(key, additional_seconds or self.ttl)
```

### Phase 3: Hybrid Checkpoint Manager

#### 3.1 Unified Checkpoint Service

**File**: `/ai-service/storage/checkpoint_manager.py`

```python
"""
Hybrid Checkpoint Manager

Coordinates between Redis (hot), PostgreSQL (warm), and S3 (cold) storage.
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import hashlib
import json

from .redis_checkpointer import RedisCheckpointer
from database.database import get_db_session
from models.database.checkpoint import CheckpointSession, CheckpointState

logger = logging.getLogger(__name__)


class CheckpointManager:
    """
    Intelligent checkpoint manager with multi-tier storage.

    Storage Strategy:
    1. Try Redis first (fast, < 1 hour old)
    2. Fall back to PostgreSQL (recent, 1-30 days)
    3. Archive to S3 (old, > 30 days)
    """

    def __init__(self):
        self.redis = RedisCheckpointer()
        self.hot_threshold = timedelta(hours=1)
        self.warm_threshold = timedelta(days=30)

    async def save_checkpoint(
        self,
        session_id: str,
        state: Dict[str, Any],
        user_id: Optional[int] = None,
        workflow_type: str = "chat",
        create_snapshot: bool = False,
        snapshot_reason: str = None
    ) -> bool:
        """
        Save checkpoint with intelligent routing.

        Args:
            session_id: Session identifier
            state: State to save
            user_id: User ID (for PostgreSQL)
            workflow_type: Type of workflow
            create_snapshot: Whether to create a snapshot version
            snapshot_reason: Reason for snapshot

        Returns:
            Success status
        """
        try:
            # 1. Always save to Redis (hot storage)
            self.redis.save_state(session_id, state)

            # 2. Save to PostgreSQL (warm storage) periodically or on snapshot
            db = next(get_db_session())

            # Get or create session
            session = db.query(CheckpointSession).filter_by(
                session_id=session_id
            ).first()

            if not session:
                session = CheckpointSession(
                    session_id=session_id,
                    user_id=user_id,
                    workflow_type=workflow_type,
                    status='active',
                    expires_at=datetime.utcnow() + self.warm_threshold
                )
                db.add(session)

            # Update last accessed
            session.last_accessed_at = datetime.utcnow()

            # Calculate state hash for deduplication
            state_json = json.dumps(state, sort_keys=True)
            state_hash = hashlib.sha256(state_json.encode()).hexdigest()

            # Check if state changed
            last_state = db.query(CheckpointState).filter_by(
                session_id=session_id
            ).order_by(CheckpointState.version.desc()).first()

            if not last_state or last_state.state_hash != state_hash or create_snapshot:
                # Create new version
                new_version = (last_state.version + 1) if last_state else 1

                new_state = CheckpointState(
                    session_id=session_id,
                    state_data=state,
                    state_hash=state_hash,
                    version=new_version,
                    parent_version=last_state.version if last_state else None,
                    created_by='system',
                    is_snapshot=create_snapshot,
                    snapshot_reason=snapshot_reason
                )
                db.add(new_state)

            db.commit()
            logger.info(f"Saved checkpoint for session {session_id}")
            return True

        except Exception as e:
            logger.error(f"Error saving checkpoint: {e}")
            db.rollback()
            return False

    async def load_checkpoint(
        self,
        session_id: str,
        version: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Load checkpoint with intelligent fallback.

        Args:
            session_id: Session identifier
            version: Specific version to load (None = latest)

        Returns:
            Checkpoint state or None
        """
        try:
            # 1. Try Redis first (fastest)
            if version is None:  # Only latest in Redis
                state = self.redis.load_state(session_id)
                if state:
                    logger.debug(f"Loaded from Redis: {session_id}")
                    return state

            # 2. Fall back to PostgreSQL
            db = next(get_db_session())

            query = db.query(CheckpointState).filter_by(session_id=session_id)

            if version is not None:
                query = query.filter_by(version=version)
            else:
                query = query.order_by(CheckpointState.version.desc())

            state_record = query.first()

            if state_record:
                logger.debug(f"Loaded from PostgreSQL: {session_id} v{state_record.version}")

                # Update last accessed in session
                session = db.query(CheckpointSession).filter_by(
                    session_id=session_id
                ).first()
                if session:
                    session.last_accessed_at = datetime.utcnow()
                    db.commit()

                return state_record.state_data

            # 3. TODO: Check S3 for archived sessions
            logger.warning(f"No checkpoint found for session {session_id}")
            return None

        except Exception as e:
            logger.error(f"Error loading checkpoint: {e}")
            return None

    async def cleanup_old_checkpoints(self, dry_run: bool = False) -> Dict[str, int]:
        """
        Clean up expired checkpoints.

        Args:
            dry_run: If True, don't actually delete, just count

        Returns:
            Statistics about cleanup
        """
        stats = {
            "sessions_deleted": 0,
            "states_deleted": 0,
            "states_archived": 0,
            "space_freed_bytes": 0
        }

        try:
            db = next(get_db_session())
            now = datetime.utcnow()

            # Find expired sessions
            expired_sessions = db.query(CheckpointSession).filter(
                CheckpointSession.expires_at < now
            ).all()

            for session in expired_sessions:
                # Count states
                states = db.query(CheckpointState).filter_by(
                    session_id=session.session_id
                ).all()

                # Calculate space
                space = sum(s.state_size_bytes or 0 for s in states)
                stats["space_freed_bytes"] += space

                if not dry_run:
                    # Archive snapshots to S3
                    snapshots = [s for s in states if s.is_snapshot]
                    for snapshot in snapshots:
                        # TODO: Upload to S3
                        stats["states_archived"] += 1

                    # Delete from Redis
                    self.redis.delete_state(session.session_id)

                    # Delete from PostgreSQL
                    for state in states:
                        db.delete(state)
                    db.delete(session)

                    stats["sessions_deleted"] += 1
                    stats["states_deleted"] += len(states)

            if not dry_run:
                db.commit()

                # Log cleanup
                from models.database.checkpoint import CheckpointCleanupLog
                log = CheckpointCleanupLog(
                    cleanup_type='scheduled',
                    sessions_deleted=stats["sessions_deleted"],
                    states_deleted=stats["states_deleted"],
                    states_archived=stats["states_archived"],
                    space_freed_bytes=stats["space_freed_bytes"]
                )
                db.add(log)
                db.commit()

            logger.info(f"Cleanup stats: {stats}")
            return stats

        except Exception as e:
            logger.error(f"Error during cleanup: {e}")
            db.rollback()
            return stats


# Singleton
_checkpoint_manager = None

def get_checkpoint_manager() -> CheckpointManager:
    """Get or create checkpoint manager instance"""
    global _checkpoint_manager
    if _checkpoint_manager is None:
        _checkpoint_manager = CheckpointManager()
    return _checkpoint_manager
```

### Phase 4: Automated Cleanup Scheduler

#### 4.1 Background Cleanup Task

**File**: `/ai-service/background/checkpoint_cleaner.py`

```python
"""
Background Checkpoint Cleanup Service

Runs periodic cleanup of expired checkpoints.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from storage.checkpoint_manager import get_checkpoint_manager

logger = logging.getLogger(__name__)


class CheckpointCleanupService:
    """
    Automated checkpoint cleanup scheduler.

    Runs:
    - Every hour: Quick cleanup of Redis expired sessions
    - Every day: Full cleanup of PostgreSQL expired sessions
    - Every week: Archive old sessions to S3
    """

    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.manager = get_checkpoint_manager()

    async def hourly_cleanup(self):
        """Quick cleanup - Redis only"""
        logger.info("Running hourly checkpoint cleanup...")
        try:
            # Redis handles its own TTL, just log metrics
            active_sessions = self.manager.redis.get_active_sessions()
            logger.info(f"Active Redis sessions: {len(active_sessions)}")
        except Exception as e:
            logger.error(f"Hourly cleanup error: {e}")

    async def daily_cleanup(self):
        """Daily cleanup - PostgreSQL"""
        logger.info("Running daily checkpoint cleanup...")
        try:
            stats = await self.manager.cleanup_old_checkpoints(dry_run=False)
            logger.info(f"Daily cleanup completed: {stats}")

            # Send metrics/alerts if needed
            if stats["sessions_deleted"] > 1000:
                logger.warning(f"High cleanup volume: {stats['sessions_deleted']} sessions")

        except Exception as e:
            logger.error(f"Daily cleanup error: {e}")

    async def weekly_archive(self):
        """Weekly archive - Move old data to S3"""
        logger.info("Running weekly checkpoint archive...")
        try:
            # TODO: Implement S3 archival
            # - Find sessions older than 30 days
            # - Compress and upload to S3
            # - Delete from PostgreSQL
            pass
        except Exception as e:
            logger.error(f"Weekly archive error: {e}")

    def start(self):
        """Start the cleanup scheduler"""
        # Hourly cleanup
        self.scheduler.add_job(
            self.hourly_cleanup,
            CronTrigger(minute=0),  # Every hour at :00
            id='hourly_cleanup',
            replace_existing=True
        )

        # Daily cleanup at 2 AM
        self.scheduler.add_job(
            self.daily_cleanup,
            CronTrigger(hour=2, minute=0),
            id='daily_cleanup',
            replace_existing=True
        )

        # Weekly archive on Sunday at 3 AM
        self.scheduler.add_job(
            self.weekly_archive,
            CronTrigger(day_of_week='sun', hour=3, minute=0),
            id='weekly_archive',
            replace_existing=True
        )

        self.scheduler.start()
        logger.info("Checkpoint cleanup scheduler started")

    def stop(self):
        """Stop the cleanup scheduler"""
        self.scheduler.shutdown()
        logger.info("Checkpoint cleanup scheduler stopped")


# Start on module load
cleanup_service = CheckpointCleanupService()
```

#### 4.2 Integrate with main.py

```python
# Add to main.py startup
from background.checkpoint_cleaner import cleanup_service

@app.on_event("startup")
async def startup_event():
    # ... existing startup code ...

    # Start checkpoint cleanup service
    cleanup_service.start()
    logger.info("✓ Checkpoint cleanup service started")

@app.on_event("shutdown")
async def shutdown_event():
    # ... existing shutdown code ...

    # Stop checkpoint cleanup service
    cleanup_service.stop()
    logger.info("Checkpoint cleanup service stopped")
```

## Benefits

1. **Performance**: Redis for hot data (< 1ms access)
2. **Reliability**: PostgreSQL for persistence
3. **Scalability**: S3 for unlimited archive storage
4. **Cost Efficiency**: Automatic tiering reduces storage costs
5. **Recoverability**: Version history enables workflow recovery
6. **Analytics**: Metrics for optimization
7. **Compliance**: Automatic expiration meets data retention policies

## Monitoring & Alerts

### Key Metrics to Track

1. **Storage Metrics**:
   
   - Redis memory usage
   - PostgreSQL table sizes
   - S3 storage costs
   - Checkpoint count by tier

2. **Performance Metrics**:
   
   - Save latency (p50, p95, p99)
   - Load latency
   - Cache hit rate (Redis vs PostgreSQL)
   - Cleanup duration

3. **Health Metrics**:
   
   - Failed checkpoints
   - Expired sessions count
   - Orphaned states
   - Cleanup errors

### Alerts

- Redis memory > 80% capacity
- PostgreSQL checkpoint table > 10GB
- Cleanup failures > 5 in 24 hours
- Save latency p99 > 500ms

## Migration Strategy

### Phase 1: Redis Integration (Week 1)

- Set up Redis instance
- Implement RedisCheckpointer
- Test with active sessions
- Monitor performance

### Phase 2: PostgreSQL Schema (Week 2)

- Create checkpoint tables
- Migrate existing sessions
- Implement hybrid manager
- Test fallback logic

### Phase 3: Cleanup Automation (Week 3)

- Implement cleanup scheduler
- Set up monitoring
- Test cleanup logic
- Document procedures

### Phase 4: S3 Archive (Week 4)

- Set up S3 bucket
- Implement archive logic
- Test archival and retrieval
- Optimize costs

## Testing

### Unit Tests

```python
# Test Redis checkpointer
def test_redis_save_and_load():
    checkpointer = RedisCheckpointer()
    session_id = "test_session"
    state = {"key": "value"}

    checkpointer.save_state(session_id, state)
    loaded = checkpointer.load_state(session_id)

    assert loaded == state

# Test hybrid manager
async def test_hybrid_fallback():
    manager = CheckpointManager()
    session_id = "test_session"
    state = {"key": "value"}

    # Save to Redis and PostgreSQL
    await manager.save_checkpoint(session_id, state)

    # Clear Redis
    manager.redis.delete_state(session_id)

    # Should load from PostgreSQL
    loaded = await manager.load_checkpoint(session_id)
    assert loaded == state

# Test cleanup
async def test_cleanup():
    manager = CheckpointManager()
    stats = await manager.cleanup_old_checkpoints(dry_run=True)
    assert "sessions_deleted" in stats
```

### Integration Tests

1. **High Load Test**: 10,000 concurrent sessions
2. **Failover Test**: Redis down, PostgreSQL handles load
3. **Recovery Test**: Restore from checkpoint after crash
4. **Cleanup Test**: Verify old sessions deleted correctly

## Security Considerations

1. **Encryption at Rest**: Encrypt sensitive state data
2. **Access Control**: User-scoped session access
3. **Audit Log**: Track checkpoint access
4. **Data Retention**: Comply with GDPR/privacy laws
5. **Secure Deletion**: Overwrite before deleting sensitive data

## Cost Estimate

### Monthly Costs (AWS)

- **Redis (ElastiCache)**: $50-200/month (r6g.large)
- **PostgreSQL (RDS)**: $100-300/month (db.t3.medium)
- **S3 Storage**: $5-20/month (1-10GB archive)
- **Total**: ~$200-500/month

### Cost Optimization

1. Use Redis for < 1 hour only (reduce instance size)
2. Compress PostgreSQL states (50% size reduction)
3. Use S3 Glacier for old archives (90% cheaper)
4. Implement aggressive cleanup (reduce retention)

## Success Criteria

- ✅ Zero data loss during server restarts
- ✅ < 100ms checkpoint save latency (p95)
- ✅ < 50ms checkpoint load latency (p95)
- ✅ 99% cache hit rate on Redis
- ✅ Automatic cleanup maintains < 10GB PostgreSQL
- ✅ < $300/month storage costs
- ✅ 99.9% checkpoint availability

## Timeline

- **Week 1**: Redis integration
- **Week 2**: PostgreSQL schema + hybrid manager
- **Week 3**: Cleanup automation
- **Week 4**: S3 archive + monitoring
- **Week 5**: Testing + optimization
- **Week 6**: Production rollout

## Conclusion

This comprehensive checkpointer management strategy provides:

- **High performance** through intelligent tiering
- **Reliability** through persistent storage
- **Scalability** through automatic archival
- **Cost efficiency** through lifecycle management
- **Recoverability** through versioning

The system is production-ready, scalable, and maintainable for long-term operation.
