"""
Checkpoint models for workflow state persistence
"""

from sqlalchemy import Column, String, DateTime, JSON, Text
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

from database.connection import Base


class WorkflowCheckpoint(Base):
    """Store workflow checkpoints in database"""
    __tablename__ = 'workflow_checkpoints'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_id = Column(String(255), nullable=False, index=True)
    checkpoint_id = Column(String(255), nullable=False, unique=True, index=True)
    state = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'workflow_id': self.workflow_id,
            'checkpoint_id': self.checkpoint_id,
            'state': self.state,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class WorkflowSession(Base):
    """Store workflow sessions in database"""
    __tablename__ = 'workflow_sessions'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(String(255), nullable=False, unique=True, index=True)
    user_id = Column(String(255), nullable=False, index=True)
    workflow_type = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False, default='active')
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    session_metadata = Column(JSON, nullable=True)

    def to_dict(self):
        return {
            'id': str(self.id),
            'session_id': self.session_id,
            'user_id': self.user_id,
            'workflow_type': self.workflow_type,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'ended_at': self.ended_at.isoformat() if self.ended_at else None,
            'metadata': self.session_metadata
        }
