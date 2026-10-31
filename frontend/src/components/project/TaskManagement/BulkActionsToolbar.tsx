import React, { useState } from 'react';
import { TaskStatus, TaskPriority, STATUS_CONFIG } from '../../../types/task';

interface BulkActionsToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkStatusUpdate: (status: TaskStatus) => Promise<void>;
  onBulkPriorityUpdate: (priority: TaskPriority) => Promise<void>;
  onBulkAssign: (userId: string) => Promise<void>;
  onBulkDelete: () => Promise<void>;
  projectMembers?: Array<{ user_id: number; username: string; name: string }>;
}

const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({
  selectedCount,
  onClearSelection,
  onBulkStatusUpdate,
  onBulkPriorityUpdate,
  onBulkAssign,
  onBulkDelete,
  projectMembers = []
}) => {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showAssignMenu, setShowAssignMenu] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleStatusUpdate = async (status: TaskStatus) => {
    setProcessing(true);
    try {
      await onBulkStatusUpdate(status);
      setShowStatusMenu(false);
    } finally {
      setProcessing(false);
    }
  };

  const handlePriorityUpdate = async (priority: TaskPriority) => {
    setProcessing(true);
    try {
      await onBulkPriorityUpdate(priority);
      setShowPriorityMenu(false);
    } finally {
      setProcessing(false);
    }
  };

  const handleAssign = async (username: string) => {
    setProcessing(true);
    try {
      await onBulkAssign(username);
      setShowAssignMenu(false);
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete ${selectedCount} selected task${selectedCount > 1 ? 's' : ''}? This action cannot be undone.`)) {
      return;
    }

    setProcessing(true);
    try {
      await onBulkDelete();
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up">
      <div className="bg-gradient-to-r from-blue-600 to-sky-600 rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-4 border-2 border-blue-400">
        {/* Selected Count */}
        <div className="flex items-center gap-2 pr-4 border-r border-blue-400">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-white font-bold">
            {selectedCount} task{selectedCount > 1 ? 's' : ''} selected
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Update Status */}
          <div className="relative">
            <button
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              disabled={processing}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Status
            </button>

            {showStatusMenu && (
              <div className="absolute bottom-full mb-2 left-0 bg-white rounded-lg shadow-xl border-2 border-slate-200 py-1 min-w-[160px]">
                {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusUpdate(status)}
                    className="w-full px-4 py-2 text-left hover:bg-slate-50 transition-colors flex items-center gap-2"
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: STATUS_CONFIG[status].color }}
                    />
                    <span className="text-sm font-medium text-slate-700">
                      {STATUS_CONFIG[status].label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Update Priority */}
          <div className="relative">
            <button
              onClick={() => setShowPriorityMenu(!showPriorityMenu)}
              disabled={processing}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Priority
            </button>

            {showPriorityMenu && (
              <div className="absolute bottom-full mb-2 left-0 bg-white rounded-lg shadow-xl border-2 border-slate-200 py-1 min-w-[120px]">
                {([1, 2, 3, 4, 5] as TaskPriority[]).map((priority) => (
                  <button
                    key={priority}
                    onClick={() => handlePriorityUpdate(priority)}
                    className="w-full px-4 py-2 text-left hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-sm font-bold text-slate-700">
                      P{priority} {priority === 1 ? '(Highest)' : priority === 5 ? '(Lowest)' : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Assign */}
          {projectMembers.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowAssignMenu(!showAssignMenu)}
                disabled={processing}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Assign
              </button>

              {showAssignMenu && (
                <div className="absolute bottom-full mb-2 left-0 bg-white rounded-lg shadow-xl border-2 border-slate-200 py-1 min-w-[200px] max-h-60 overflow-y-auto">
                  <button
                    onClick={() => handleAssign('')}
                    className="w-full px-4 py-2 text-left hover:bg-slate-50 transition-colors text-sm text-slate-600"
                  >
                    Unassign
                  </button>
                  {projectMembers.map((member) => (
                    <button
                      key={member.user_id}
                      onClick={() => handleAssign(member.username)}
                      className="w-full px-4 py-2 text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="text-sm font-medium text-slate-700">{member.name}</div>
                      <div className="text-xs text-slate-500">@{member.username}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Delete */}
          <button
            onClick={handleDelete}
            disabled={processing}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-white font-medium transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>

        {/* Clear Selection */}
        <button
          onClick={onClearSelection}
          className="ml-2 p-2 hover:bg-white/10 rounded-lg transition-all"
          title="Clear selection"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {processing && (
          <div className="absolute inset-0 bg-blue-600/50 backdrop-blur-sm rounded-2xl flex items-center justify-center">
            <div className="text-white font-medium flex items-center gap-2">
              <div className="animate-spin text-2xl">⏳</div>
              Processing...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkActionsToolbar;
