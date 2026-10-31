"""
Checkpoint Database Models

SQLAlchemy models for checkpoint management tables.
"""

from sqlalchemy import Column, String, Integer, Boolean, DateTime, JSON, BigInteger, DECIMAL, Text
from sqlalchemy.sql import func
from database.database import Base


class CheckpointSession(Base):
    """Checkpoint session metadata"""
    __tablename__ = "checkpoint_sessions"

    session_id = Column(String(255), primary_key=True)
    user_id = Column(Integer, nullable=True)
    workflow_type = Column(String(50), nullable=False)

    # Context
    project_id = Column(String(255), nullable=True)
    node_id = Column(String(255), nullable=True)

    # Metadata
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    last_accessed_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime, nullable=True)

    # Status
    status = Column(String(20), default='active')

    # Configuration
    config = Column(JSON, default={})


class CheckpointState(Base):
    """Versioned checkpoint state"""
    __tablename__ = "checkpoint_states"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(255), nullable=False)

    # State data
    state_data = Column(JSON, nullable=False)
    state_hash = Column(String(64), nullable=True)

    # Versioning
    version = Column(Integer, nullable=False, default=1)
    parent_version = Column(Integer, nullable=True)

    # Metadata
    created_at = Column(DateTime, server_default=func.now())
    created_by = Column(String(50), default='system')

    # Snapshot info
    is_snapshot = Column(Boolean, default=False)
    snapshot_reason = Column(String(255), nullable=True)

    # Size tracking
    state_size_bytes = Column(Integer, nullable=True)


class CheckpointCleanupLog(Base):
    """Cleanup audit log"""
    __tablename__ = "checkpoint_cleanup_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    cleanup_time = Column(DateTime, server_default=func.now())
    sessions_deleted = Column(Integer, default=0)
    states_deleted = Column(Integer, default=0)
    states_archived = Column(Integer, default=0)
    space_freed_bytes = Column(BigInteger, default=0)
    cleanup_type = Column(String(50))
    details = Column(JSON, default={})


class CheckpointMetrics(Base):
    """Session metrics and analytics"""
    __tablename__ = "checkpoint_metrics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(255), nullable=True)

    # Counts
    total_messages = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    total_errors = Column(Integer, default=0)

    # Timing
    session_duration_seconds = Column(Integer, nullable=True)
    avg_response_time_ms = Column(Integer, nullable=True)

    # Quality metrics
    user_satisfaction = Column(Integer, nullable=True)
    workflow_completion = Column(Boolean, default=False)

    # Costs
    estimated_cost_usd = Column(DECIMAL(10, 6), nullable=True)

    recorded_at = Column(DateTime, server_default=func.now())
