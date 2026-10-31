"""
Hybrid Checkpoint Manager

Coordinates between Redis (hot), PostgreSQL (warm), and S3 (cold) storage.
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import hashlib
import json

from storage.redis_checkpointer import get_redis_checkpointer
from database.database import get_db_session
from models.database.checkpoint import (
    CheckpointSession,
    CheckpointState,
    CheckpointCleanupLog,
    CheckpointMetrics
)

logger = logging.getLogger(__name__)


class CheckpointManager:
    """
    Intelligent checkpoint manager with multi-tier storage.

    Storage Strategy:
    1. Try Redis first (fast, < 1 hour old)
    2. Fall back to PostgreSQL (recent, 1-30 days)
    3. Archive to S3 (old, > 30 days) [TODO]
    """

    def __init__(self):
        self.redis = get_redis_checkpointer()
        self.hot_threshold = timedelta(hours=1)
        self.warm_threshold = timedelta(days=30)

    async def save_checkpoint(
        self,
        session_id: str,
        state: Dict[str, Any],
        user_id: Optional[int] = None,
        workflow_type: str = "chat",
        project_id: Optional[str] = None,
        node_id: Optional[str] = None,
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
            project_id: Project ID (if applicable)
            node_id: Node ID (if applicable)
            create_snapshot: Whether to create a snapshot version
            snapshot_reason: Reason for snapshot

        Returns:
            Success status
        """
        try:
            # 1. Always try to save to Redis (hot storage)
            if self.redis.is_available():
                self.redis.save_state(session_id, state)
                logger.debug(f"Saved to Redis: {session_id}")

            # 2. Save to PostgreSQL (warm storage)
            db = next(get_db_session())

            try:
                # Get or create session
                session = db.query(CheckpointSession).filter_by(
                    session_id=session_id
                ).first()

                if not session:
                    session = CheckpointSession(
                        session_id=session_id,
                        user_id=user_id,
                        workflow_type=workflow_type,
                        project_id=project_id,
                        node_id=node_id,
                        status='active',
                        expires_at=datetime.utcnow() + self.warm_threshold
                    )
                    db.add(session)
                    logger.info(f"Created new checkpoint session: {session_id}")

                # Update last accessed
                session.last_accessed_at = datetime.utcnow()

                # Calculate state hash for deduplication
                state_json = json.dumps(state, sort_keys=True)
                state_hash = hashlib.sha256(state_json.encode()).hexdigest()

                # Check if state changed
                last_state = db.query(CheckpointState).filter_by(
                    session_id=session_id
                ).order_by(CheckpointState.version.desc()).first()

                # Create new version if state changed or snapshot requested
                if not last_state or last_state.state_hash != state_hash or create_snapshot:
                    new_version = (last_state.version + 1) if last_state else 1

                    new_state = CheckpointState(
                        session_id=session_id,
                        state_data=state,
                        state_hash=state_hash,
                        version=new_version,
                        parent_version=last_state.version if last_state else None,
                        created_by='system',
                        is_snapshot=create_snapshot,
                        snapshot_reason=snapshot_reason,
                        state_size_bytes=len(state_json)
                    )
                    db.add(new_state)
                    logger.debug(f"Created version {new_version} for session {session_id}")

                db.commit()
                logger.info(f"Saved checkpoint for session {session_id}")
                return True

            except Exception as e:
                db.rollback()
                raise e
            finally:
                db.close()

        except Exception as e:
            logger.error(f"Error saving checkpoint: {e}")
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
            # 1. Try Redis first (fastest) - only for latest version
            if version is None and self.redis.is_available():
                state = self.redis.load_state(session_id)
                if state:
                    logger.debug(f"Loaded from Redis: {session_id}")
                    return state

            # 2. Fall back to PostgreSQL
            db = next(get_db_session())

            try:
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

                    # Update Redis cache with latest state
                    if version is None and self.redis.is_available():
                        self.redis.save_state(session_id, state_record.state_data)

                    return state_record.state_data

                logger.warning(f"No checkpoint found for session {session_id}")
                return None

            finally:
                db.close()

        except Exception as e:
            logger.error(f"Error loading checkpoint: {e}")
            return None

    async def delete_checkpoint(self, session_id: str) -> bool:
        """
        Delete checkpoint from all storage tiers.

        Args:
            session_id: Session to delete

        Returns:
            Success status
        """
        try:
            # Delete from Redis
            if self.redis.is_available():
                self.redis.delete_state(session_id)

            # Delete from PostgreSQL
            db = next(get_db_session())

            try:
                # Delete states
                db.query(CheckpointState).filter_by(
                    session_id=session_id
                ).delete()

                # Delete session
                db.query(CheckpointSession).filter_by(
                    session_id=session_id
                ).delete()

                db.commit()
                logger.info(f"Deleted checkpoint: {session_id}")
                return True

            except Exception as e:
                db.rollback()
                raise e
            finally:
                db.close()

        except Exception as e:
            logger.error(f"Error deleting checkpoint: {e}")
            return False

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

            try:
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
                        # Archive snapshots to S3 (TODO)
                        snapshots = [s for s in states if s.is_snapshot]
                        stats["states_archived"] += len(snapshots)

                        # Delete from Redis
                        if self.redis.is_available():
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
                db.rollback()
                raise e
            finally:
                db.close()

        except Exception as e:
            logger.error(f"Error during cleanup: {e}")
            return stats


# Singleton
_checkpoint_manager = None


def get_checkpoint_manager() -> CheckpointManager:
    """Get or create checkpoint manager instance"""
    global _checkpoint_manager
    if _checkpoint_manager is None:
        _checkpoint_manager = CheckpointManager()
    return _checkpoint_manager
