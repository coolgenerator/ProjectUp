"""
Redis-based Checkpoint Manager

High-performance checkpoint storage for active sessions.
"""

import json
import logging
import time
from typing import Dict, Any, Optional, List

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
        redis_client=None,
        ttl_seconds: int = 3600,  # 1 hour default
        key_prefix: str = "checkpoint:"
    ):
        """
        Initialize Redis checkpointer.

        Args:
            redis_client: Redis client instance (optional, will create if None)
            ttl_seconds: Time-to-live for checkpoints (default: 1 hour)
            key_prefix: Prefix for Redis keys
        """
        self.redis_client = redis_client
        self.ttl = ttl_seconds
        self.key_prefix = key_prefix
        self._redis_available = False

        # Try to initialize Redis
        if redis_client is None:
            try:
                import redis
                self.redis_client = redis.from_url(
                    "redis://localhost:6379",
                    decode_responses=True,
                    socket_connect_timeout=1,
                    socket_timeout=1
                )
                # Test connection
                self.redis_client.ping()
                self._redis_available = True
                logger.info("Redis checkpointer initialized successfully")
            except Exception as e:
                logger.warning(f"Redis not available, will use PostgreSQL only: {e}")
                self.redis_client = None
                self._redis_available = False
        else:
            self._redis_available = True

    def is_available(self) -> bool:
        """Check if Redis is available"""
        return self._redis_available and self.redis_client is not None

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
        if not self.is_available():
            return False

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
            meta_key = f"{self.key_prefix}meta:{session_id}"
            self.redis_client.hset(
                meta_key,
                "last_accessed",
                int(time.time())
            )
            self.redis_client.expire(meta_key, ttl or self.ttl)

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
        if not self.is_available():
            return None

        try:
            key = f"{self.key_prefix}{session_id}"
            state_json = self.redis_client.get(key)

            if not state_json:
                logger.debug(f"No state found in Redis for session {session_id}")
                return None

            # Update last access
            meta_key = f"{self.key_prefix}meta:{session_id}"
            self.redis_client.hset(
                meta_key,
                "last_accessed",
                int(time.time())
            )

            # Extend TTL on access
            self.redis_client.expire(key, self.ttl)
            self.redis_client.expire(meta_key, self.ttl)

            return json.loads(state_json)

        except Exception as e:
            logger.error(f"Error loading from Redis: {e}")
            return None

    def delete_state(self, session_id: str) -> bool:
        """Delete checkpoint state from Redis"""
        if not self.is_available():
            return False

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
        if not self.is_available():
            return False

        try:
            key = f"{self.key_prefix}{session_id}"
            return self.redis_client.exists(key) > 0
        except Exception as e:
            logger.error(f"Error checking existence in Redis: {e}")
            return False

    def get_active_sessions(self) -> List[str]:
        """Get all active session IDs"""
        if not self.is_available():
            return []

        try:
            pattern = f"{self.key_prefix}*"
            keys = self.redis_client.keys(pattern)
            # Filter out meta keys and extract session IDs
            session_ids = []
            for k in keys:
                if ":meta:" not in k:
                    session_id = k.replace(self.key_prefix, "")
                    session_ids.append(session_id)
            return session_ids
        except Exception as e:
            logger.error(f"Error getting active sessions from Redis: {e}")
            return []

    def extend_ttl(self, session_id: str, additional_seconds: int = None):
        """Extend TTL for an active session"""
        if not self.is_available():
            return False

        try:
            key = f"{self.key_prefix}{session_id}"
            meta_key = f"{self.key_prefix}meta:{session_id}"

            ttl = additional_seconds or self.ttl
            self.redis_client.expire(key, ttl)
            self.redis_client.expire(meta_key, ttl)
            return True
        except Exception as e:
            logger.error(f"Error extending TTL in Redis: {e}")
            return False

    def clear_all(self) -> int:
        """
        Clear all checkpoint data from Redis.

        WARNING: This deletes all checkpoints. Use with caution!

        Returns:
            Number of keys deleted
        """
        if not self.is_available():
            return 0

        try:
            pattern = f"{self.key_prefix}*"
            keys = self.redis_client.keys(pattern)
            if keys:
                count = self.redis_client.delete(*keys)
                logger.info(f"Cleared {count} checkpoint keys from Redis")
                return count
            return 0
        except Exception as e:
            logger.error(f"Error clearing Redis: {e}")
            return 0


# Singleton instance
_redis_checkpointer = None


def get_redis_checkpointer() -> RedisCheckpointer:
    """Get or create Redis checkpointer instance"""
    global _redis_checkpointer
    if _redis_checkpointer is None:
        _redis_checkpointer = RedisCheckpointer()
    return _redis_checkpointer
