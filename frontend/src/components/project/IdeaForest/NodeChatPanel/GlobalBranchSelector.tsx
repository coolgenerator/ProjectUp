import React, { useState } from 'react';
import { GitBranch, Clock, Edit2, Check, X, ChevronDown } from 'lucide-react';

export interface ChatSession {
  id: string;
  version_number: string;
  parent_version_number: string | null;
  parent_session_id: string | null;
  branch_name: string;
  branch_display_name: string | null;
  branch_point_index: number | null;
  message_count: number;
  created_at: string;
  last_message_at: string | null;
}

interface GlobalBranchSelectorProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSessionSwitch: (sessionId: string) => void;
  onRenameSession?: (sessionId: string, newName: string) => Promise<void>;
  disabled?: boolean;
}

/**
 * Global branch selector for top of chat panel
 * Allows switching between all chat sessions for a node
 */
const GlobalBranchSelector: React.FC<GlobalBranchSelectorProps> = ({
  sessions,
  activeSessionId,
  onSessionSwitch,
  onRenameSession,
  disabled = false
}) => {
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');
  const [renaming, setRenaming] = useState(false);

  if (sessions.length === 0) {
    return null;
  }

  // Sort sessions: main first, then by created date
  const sortedSessions = [...sessions].sort((a, b) => {
    if (!a.parent_session_id) return -1;
    if (!b.parent_session_id) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const activeSession = sessions.find(s => s.id === activeSessionId) || sortedSessions[0];

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getDisplayName = (session: ChatSession) => {
    return session.branch_display_name || `Branch ${session.version_number}`;
  };

  const handleStartEdit = (session: ChatSession) => {
    setEditingSessionId(session.id);
    setEditedName(session.branch_display_name || '');
  };

  const handleCancelEdit = () => {
    setEditingSessionId(null);
    setEditedName('');
  };

  const handleSaveEdit = async (sessionId: string) => {
    if (!editedName.trim() || !onRenameSession) {
      handleCancelEdit();
      return;
    }

    setRenaming(true);
    try {
      await onRenameSession(sessionId, editedName.trim());
      setEditingSessionId(null);
      setEditedName('');
    } catch (error) {
      console.error('Error renaming session:', error);
      alert('Failed to rename session');
    } finally {
      setRenaming(false);
    }
  };

  // Only show if there are multiple sessions
  if (sortedSessions.length <= 1) {
    return null;
  }

  return (
    <div className="border-b border-slate-200 bg-gradient-to-r from-purple-50 to-blue-50 px-4 py-3 flex-shrink-0">
      <div className="flex items-center gap-3">
        <GitBranch className="w-5 h-5 text-purple-600 flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
              Conversation Branch
            </span>
            {activeSession && (
              <span className="text-xs text-slate-500">
                ({sessions.length} {sessions.length === 1 ? 'branch' : 'branches'})
              </span>
            )}
          </div>

          <select
            value={activeSessionId || ''}
            onChange={(e) => onSessionSwitch(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 text-sm font-medium border border-purple-300 rounded-lg bg-white hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all appearance-none pr-8"
            style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%239333ea\' d=\'M6 9L1 4h10z\'/%3E%3C/svg%3E")',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.75rem center'
            }}
          >
            {sortedSessions.map((session) => (
              <option key={session.id} value={session.id}>
                {getDisplayName(session)} • {session.message_count} msg{session.message_count !== 1 ? 's' : ''} • {formatTime(session.last_message_at || session.created_at)}
              </option>
            ))}
          </select>

          {activeSession && (
            <div className="mt-2 flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-slate-600">
                <Clock className="w-3 h-3" />
                <span>
                  {formatTime(activeSession.last_message_at || activeSession.created_at)}
                </span>
              </div>

              {!activeSession.parent_session_id && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-semibold">
                  Main
                </span>
              )}

              {onRenameSession && activeSession.parent_session_id && (
                <button
                  onClick={() => handleStartEdit(activeSession)}
                  className="flex items-center gap-1 text-purple-600 hover:text-purple-700 font-medium"
                  title="Rename branch"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Rename</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Rename Modal */}
      {editingSessionId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Rename Branch</h3>

            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              placeholder="Enter branch name..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveEdit(editingSessionId);
                } else if (e.key === 'Escape') {
                  handleCancelEdit();
                }
              }}
            />

            <div className="flex gap-2 justify-end">
              <button
                onClick={handleCancelEdit}
                disabled={renaming}
                className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleSaveEdit(editingSessionId)}
                disabled={!editedName.trim() || renaming}
                className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {renaming ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalBranchSelector;
