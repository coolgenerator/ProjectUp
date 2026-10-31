"""
Service layer for session management.
"""

from typing import Dict, Any, Optional, List
import uuid
from datetime import datetime, timedelta

from .base_service import BaseService
from storage.checkpointer import SessionManager


class SessionService(BaseService):
    """Service for managing user sessions and state."""
    
    def __init__(self):
        """Initialize session service."""
        super().__init__()
        self.session_manager = SessionManager()
        self.sessions: Dict[str, Dict[str, Any]] = {}
        self.session_timeout = timedelta(hours=24)
    
    def _initialize(self):
        """Initialize session service resources."""
        self.log_info("Session service initialized")
    
    async def create_session(
        self,
        user_id: Optional[str] = None,
        workflow_type: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """Create a new session."""
        try:
            session_id = str(uuid.uuid4())
            user_id = user_id or "anonymous"
            
            session_data = {
                'session_id': session_id,
                'user_id': user_id,
                'workflow_type': workflow_type,
                'created_at': datetime.utcnow(),
                'last_activity': datetime.utcnow(),
                'metadata': metadata or {},
                'state': {},
                'history': []
            }
            
            self.sessions[session_id] = session_data
            
            self.log_info(
                f"Created session: {session_id}",
                user_id=user_id,
                workflow_type=workflow_type
            )
            
            return session_id
            
        except Exception as e:
            self.log_error("Failed to create session", error=e)
            raise
    
    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session data."""
        session = self.sessions.get(session_id)
        
        if session:
            # Check if session has expired
            if self._is_session_expired(session):
                await self.delete_session(session_id)
                return None
            
            # Update last activity
            session['last_activity'] = datetime.utcnow()
        
        return session
    
    async def update_session(
        self,
        session_id: str,
        state_update: Optional[Dict[str, Any]] = None,
        add_to_history: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Update session state and/or history."""
        try:
            session = await self.get_session(session_id)
            if not session:
                return False
            
            # Update state
            if state_update:
                session['state'].update(state_update)
            
            # Add to history
            if add_to_history:
                history_entry = {
                    'timestamp': datetime.utcnow().isoformat(),
                    **add_to_history
                }
                session['history'].append(history_entry)
                
                # Limit history size
                max_history = 100
                if len(session['history']) > max_history:
                    session['history'] = session['history'][-max_history:]
            
            session['last_activity'] = datetime.utcnow()
            
            self.log_debug(
                f"Updated session: {session_id}",
                state_keys=list(state_update.keys()) if state_update else None
            )
            
            return True
            
        except Exception as e:
            self.log_error(f"Failed to update session: {session_id}", error=e)
            return False
    
    async def get_session_history(
        self,
        session_id: str,
        limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Get session history."""
        session = await self.get_session(session_id)
        if not session:
            return []
        
        history = session.get('history', [])
        
        if limit:
            history = history[-limit:]
        
        return history
    
    async def get_session_state(self, session_id: str) -> Dict[str, Any]:
        """Get current session state."""
        session = await self.get_session(session_id)
        if not session:
            return {}
        
        return session.get('state', {})
    
    async def list_user_sessions(
        self,
        user_id: str,
        active_only: bool = True
    ) -> List[Dict[str, Any]]:
        """List all sessions for a user."""
        user_sessions = []
        
        for session_id, session in self.sessions.items():
            if session['user_id'] == user_id:
                if active_only and self._is_session_expired(session):
                    continue
                
                user_sessions.append({
                    'session_id': session_id,
                    'workflow_type': session['workflow_type'],
                    'created_at': session['created_at'].isoformat(),
                    'last_activity': session['last_activity'].isoformat(),
                    'is_active': not self._is_session_expired(session)
                })
        
        return sorted(
            user_sessions,
            key=lambda x: x['last_activity'],
            reverse=True
        )
    
    async def delete_session(self, session_id: str) -> bool:
        """Delete a session."""
        if session_id in self.sessions:
            del self.sessions[session_id]
            self.log_info(f"Deleted session: {session_id}")
            return True
        return False
    
    async def cleanup_expired_sessions(self) -> int:
        """Clean up expired sessions."""
        expired_sessions = []
        
        for session_id, session in self.sessions.items():
            if self._is_session_expired(session):
                expired_sessions.append(session_id)
        
        for session_id in expired_sessions:
            await self.delete_session(session_id)
        
        if expired_sessions:
            self.log_info(f"Cleaned up {len(expired_sessions)} expired sessions")
        
        return len(expired_sessions)
    
    async def save_checkpoint(
        self,
        session_id: str,
        checkpoint_data: Dict[str, Any]
    ) -> bool:
        """Save a checkpoint for a session."""
        try:
            session = await self.get_session(session_id)
            if not session:
                return False
            
            # Save checkpoint
            checkpoint_id = str(uuid.uuid4())
            
            if 'checkpoints' not in session:
                session['checkpoints'] = []
            
            checkpoint = {
                'id': checkpoint_id,
                'timestamp': datetime.utcnow().isoformat(),
                'data': checkpoint_data
            }
            
            session['checkpoints'].append(checkpoint)
            
            # Limit checkpoint count
            max_checkpoints = 10
            if len(session['checkpoints']) > max_checkpoints:
                session['checkpoints'] = session['checkpoints'][-max_checkpoints:]
            
            self.log_info(
                f"Saved checkpoint for session: {session_id}",
                checkpoint_id=checkpoint_id
            )
            
            return True
            
        except Exception as e:
            self.log_error(f"Failed to save checkpoint: {session_id}", error=e)
            return False
    
    async def restore_checkpoint(
        self,
        session_id: str,
        checkpoint_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Restore a checkpoint for a session."""
        session = await self.get_session(session_id)
        if not session or 'checkpoints' not in session:
            return None
        
        checkpoints = session['checkpoints']
        
        if not checkpoints:
            return None
        
        if checkpoint_id:
            # Find specific checkpoint
            for checkpoint in checkpoints:
                if checkpoint['id'] == checkpoint_id:
                    return checkpoint['data']
        else:
            # Return latest checkpoint
            return checkpoints[-1]['data']
        
        return None
    
    async def get_session_metrics(self, session_id: str) -> Dict[str, Any]:
        """Get metrics for a session."""
        session = await self.get_session(session_id)
        if not session:
            return {}
        
        created_at = session['created_at']
        last_activity = session['last_activity']
        duration = (last_activity - created_at).total_seconds()
        
        metrics = {
            'session_id': session_id,
            'user_id': session['user_id'],
            'workflow_type': session['workflow_type'],
            'duration_seconds': duration,
            'duration_formatted': self._format_duration(duration),
            'history_count': len(session.get('history', [])),
            'checkpoint_count': len(session.get('checkpoints', [])),
            'state_keys': list(session.get('state', {}).keys()),
            'created_at': created_at.isoformat(),
            'last_activity': last_activity.isoformat()
        }
        
        return metrics
    
    def _is_session_expired(self, session: Dict[str, Any]) -> bool:
        """Check if a session has expired."""
        last_activity = session.get('last_activity')
        if not last_activity:
            return True
        
        expiry_time = last_activity + self.session_timeout
        return datetime.utcnow() > expiry_time
    
    def _format_duration(self, seconds: float) -> str:
        """Format duration in seconds to human-readable string."""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        seconds = int(seconds % 60)
        
        parts = []
        if hours:
            parts.append(f"{hours}h")
        if minutes:
            parts.append(f"{minutes}m")
        if seconds or not parts:
            parts.append(f"{seconds}s")
        
        return " ".join(parts)