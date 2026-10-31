"""
Memory and persistence for workflow state
"""

from typing import Dict, Any, Optional, List
from langgraph.checkpoint.memory import MemorySaver
from langgraph.store.memory import InMemoryStore
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

# Direct import to avoid circular dependency
from models.database.checkpoint_models import WorkflowCheckpoint, WorkflowSession
from database.session import get_session


class WorkflowCheckpointer:
    """Enhanced checkpointer for workflow state management with database persistence"""

    def __init__(self, db: Optional[Session] = None):
        self.memory_saver = MemorySaver()
        self.store = InMemoryStore()
        self.db = db  # Database session for persistence
    
    def save_checkpoint(self, workflow_id: str, state: Dict[str, Any]) -> str:
        """Save a checkpoint for a workflow"""
        checkpoint_id = str(uuid.uuid4())

        checkpoint_data = {
            "id": checkpoint_id,
            "workflow_id": workflow_id,
            "timestamp": datetime.utcnow().isoformat(),
            "state": state
        }

        # Save to memory for fast access
        namespace = ("checkpoints", workflow_id)
        self.store.put(namespace, checkpoint_id, checkpoint_data)

        # Persist to database if db session available
        if self.db:
            db_checkpoint = WorkflowCheckpoint(
                workflow_id=workflow_id,
                checkpoint_id=checkpoint_id,
                state=state
            )
            self.db.add(db_checkpoint)
            self.db.commit()

        return checkpoint_id
    
    def load_checkpoint(self, workflow_id: str, checkpoint_id: str) -> Optional[Dict[str, Any]]:
        """Load a checkpoint for a workflow"""
        # Try memory first for fast access
        namespace = ("checkpoints", workflow_id)
        result = self.store.get(namespace, checkpoint_id)

        if result and result.value:
            return result.value['state']

        # Try database
        if self.db:
            checkpoint = self.db.query(WorkflowCheckpoint).filter(
                WorkflowCheckpoint.workflow_id == workflow_id,
                WorkflowCheckpoint.checkpoint_id == checkpoint_id
            ).first()

            if checkpoint:
                # Cache in memory for future access
                checkpoint_data = {
                    "id": checkpoint.checkpoint_id,
                    "workflow_id": checkpoint.workflow_id,
                    "timestamp": checkpoint.created_at.isoformat(),
                    "state": checkpoint.state
                }
                self.store.put(namespace, checkpoint_id, checkpoint_data)
                return checkpoint.state

        return None
    
    def list_checkpoints(self, workflow_id: str) -> List[Dict[str, Any]]:
        """List all checkpoints for a workflow"""
        checkpoints = []

        # List from database
        if self.db:
            db_checkpoints = self.db.query(WorkflowCheckpoint).filter(
                WorkflowCheckpoint.workflow_id == workflow_id
            ).order_by(WorkflowCheckpoint.created_at.desc()).all()

            for cp in db_checkpoints:
                checkpoints.append({
                    "id": cp.checkpoint_id,
                    "timestamp": cp.created_at.isoformat()
                })

        return checkpoints
    
    def delete_checkpoint(self, workflow_id: str, checkpoint_id: str) -> bool:
        """Delete a checkpoint"""
        # Delete from memory
        namespace = ("checkpoints", workflow_id)
        try:
            self.store.delete(namespace, checkpoint_id)
        except:
            pass

        # Delete from database
        if self.db:
            checkpoint = self.db.query(WorkflowCheckpoint).filter(
                WorkflowCheckpoint.workflow_id == workflow_id,
                WorkflowCheckpoint.checkpoint_id == checkpoint_id
            ).first()

            if checkpoint:
                self.db.delete(checkpoint)
                self.db.commit()
                return True

        return False
    
    def get_latest_checkpoint(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        """Get the most recent checkpoint for a workflow"""
        checkpoints = self.list_checkpoints(workflow_id)
        
        if checkpoints:
            latest = checkpoints[0]
            return self.load_checkpoint(workflow_id, latest['id'])
        
        return None


class SessionManager:
    """Manage workflow sessions with database persistence"""

    def __init__(self, db: Optional[Session] = None):
        self.sessions = {}  # In-memory cache
        self.db = db
        self.checkpointer = WorkflowCheckpointer(db)

    def create_session(self, user_id: str, workflow_type: str) -> str:
        """Create a new workflow session"""
        session_id = str(uuid.uuid4())

        # Create in-memory session
        self.sessions[session_id] = {
            "user_id": user_id,
            "workflow_type": workflow_type,
            "created_at": datetime.utcnow().isoformat(),
            "status": "active",
            "checkpoints": []
        }

        # Persist to database
        if self.db:
            db_session = WorkflowSession(
                session_id=session_id,
                user_id=user_id,
                workflow_type=workflow_type,
                status="active"
            )
            self.db.add(db_session)
            self.db.commit()

        return session_id
    
    def save_session_state(self, session_id: str, state: Dict[str, Any]) -> str:
        """Save state for a session"""
        if session_id not in self.sessions:
            raise ValueError(f"Session {session_id} not found")
        
        session = self.sessions[session_id]
        checkpoint_id = self.checkpointer.save_checkpoint(session_id, state)
        
        session['checkpoints'].append(checkpoint_id)
        session['last_updated'] = datetime.now().isoformat()
        
        return checkpoint_id
    
    def load_session_state(self, session_id: str, checkpoint_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Load state for a session"""
        if session_id not in self.sessions:
            raise ValueError(f"Session {session_id} not found")
        
        if checkpoint_id:
            return self.checkpointer.load_checkpoint(session_id, checkpoint_id)
        else:
            return self.checkpointer.get_latest_checkpoint(session_id)
    
    def end_session(self, session_id: str):
        """End a workflow session"""
        if session_id in self.sessions:
            self.sessions[session_id]['status'] = 'completed'
            self.sessions[session_id]['ended_at'] = datetime.utcnow().isoformat()

        # Update database
        if self.db:
            db_session = self.db.query(WorkflowSession).filter(
                WorkflowSession.session_id == session_id
            ).first()

            if db_session:
                db_session.status = 'completed'
                db_session.ended_at = datetime.utcnow()
                self.db.commit()
    
    def get_active_sessions(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all active sessions, optionally filtered by user"""
        active_sessions = []
        
        for session_id, session in self.sessions.items():
            if session['status'] == 'active':
                if user_id is None or session['user_id'] == user_id:
                    active_sessions.append({
                        "session_id": session_id,
                        **session
                    })
        
        return active_sessions