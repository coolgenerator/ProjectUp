import React, { useState, useEffect, useCallback } from 'react';
import { Subtask, SubtaskStatus, CreateSubtaskRequest } from '../../../types/task';
import fetchWithAuth from '../../../hooks/fetchWithAuth';
import { parseChecklist } from '../../../utils/checklistParser';

interface SubtaskListProps {
  taskId: string;
  onSubtasksChanged: () => void;
  taskDescription?: string;
  onDescriptionChange?: (newDescription: string) => void;
}

const SubtaskList: React.FC<SubtaskListProps> = ({
  taskId,
  onSubtasksChanged,
  taskDescription = '',
  onDescriptionChange
}) => {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [quickAddText, setQuickAddText] = useState('');

  // Add form state (for detailed mode)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Check if there are checklist items in description
  const checklistData = parseChecklist(taskDescription);
  const hasChecklistInDescription = checklistData.items.length > 0;

  const fetchSubtasks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth(`/api/tasks/${taskId}/subtasks`);

      if (response.ok) {
        const data = await response.json();
        setSubtasks(data.subtasks || []);
      }
    } catch (error) {
      console.error('Error fetching subtasks:', error);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchSubtasks();
  }, [fetchSubtasks]);

  // Quick add - single line input
  const handleQuickAdd = async () => {
    if (!quickAddText.trim()) return;

    try {
      const subtaskData: CreateSubtaskRequest = {
        title: quickAddText.trim()
      };

      console.log('Creating subtask:', subtaskData);

      const response = await fetchWithAuth(`/api/tasks/${taskId}/subtasks`, {
        method: 'POST',
        body: JSON.stringify(subtaskData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Subtask creation failed:', errorData);
        alert(`Failed to create subtask: ${errorData.error || 'Unknown error'}`);
        return;
      }

      setQuickAddText('');
      await fetchSubtasks();
      onSubtasksChanged();
    } catch (error) {
      console.error('Error adding subtask:', error);
      alert('Failed to create subtask. Please try again.');
    }
  };

  // Detailed add - full form
  const handleAddSubtask = async () => {
    if (!title.trim()) return;

    try {
      const subtaskData: any = {
        title: title.trim()
      };

      if (description && description.trim()) {
        subtaskData.description = description.trim();
      }
      if (assignedTo && assignedTo.trim()) {
        // Split by comma to support multiple assignees in a single string input
        subtaskData.assigned_to = assignedTo.split(',').map(a => a.trim()).filter(a => a.length > 0);
      }
      if (dueDate) {
        // Convert YYYY-MM-DD to ISO 8601 timestamp
        subtaskData.due_date = new Date(dueDate).toISOString();
      }

      console.log('Creating subtask (detailed):', subtaskData);

      const response = await fetchWithAuth(`/api/tasks/${taskId}/subtasks`, {
        method: 'POST',
        body: JSON.stringify(subtaskData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Subtask creation failed:', errorData);
        alert(`Failed to create subtask: ${errorData.error || 'Unknown error'}`);
        return;
      }

      setTitle('');
      setDescription('');
      setAssignedTo('');
      setDueDate('');
      setShowAddForm(false);
      await fetchSubtasks();
      onSubtasksChanged();
    } catch (error) {
      console.error('Error adding subtask:', error);
      alert('Failed to create subtask. Please try again.');
    }
  };

  // Import checklist items from description
  const handleImportFromDescription = async () => {
    if (checklistData.items.length === 0) return;

    if (!window.confirm(`Import ${checklistData.items.length} items from description as subtasks?`)) {
      return;
    }

    try {
      // Create subtasks for each checklist item
      const promises = checklistData.items.map(item => {
        const subtaskData: any = {
          title: item.text.trim()
        };

        if (item.checked) {
          subtaskData.status = 'done';
        }

        return fetchWithAuth(`/api/tasks/${taskId}/subtasks`, {
          method: 'POST',
          body: JSON.stringify(subtaskData)
        });
      });

      await Promise.all(promises);

      // Remove checklist items from description
      if (onDescriptionChange) {
        const lines = taskDescription.split('\n');
        const checklistRegex = /^\s*[-*]?\s*\[([xX\s]?)\]\s*.+$/;
        const newDescription = lines
          .filter(line => !checklistRegex.test(line))
          .join('\n')
          .trim();

        onDescriptionChange(newDescription);
      }

      await fetchSubtasks();
      onSubtasksChanged();
    } catch (err) {
      console.error('Error importing checklist:', err);
      alert('Failed to import checklist items.');
    }
  };

  const handleUpdateStatus = async (subtaskId: string, status: SubtaskStatus) => {
    try {
      const response = await fetchWithAuth(`/api/tasks/${taskId}/subtasks/${subtaskId}`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        await fetchSubtasks();
        onSubtasksChanged();
      }
    } catch (error) {
      console.error('Error updating subtask:', error);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!window.confirm('Are you sure you want to delete this subtask?')) return;

    try {
      const response = await fetchWithAuth(`/api/tasks/${taskId}/subtasks/${subtaskId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchSubtasks();
        onSubtasksChanged();
      }
    } catch (error) {
      console.error('Error deleting subtask:', error);
    }
  };

  const todoCount = subtasks.filter(s => s.status === 'todo').length;
  const inProgressCount = subtasks.filter(s => s.status === 'in_progress').length;
  const doneCount = subtasks.filter(s => s.status === 'done').length;
  const totalCount = subtasks.length;
  const completionRate = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin text-2xl">⏳</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress Summary */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-bold text-blue-900">Subtask Progress</h4>
          <span className="text-2xl font-bold text-blue-700">{completionRate}%</span>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-3 mb-2">
          <div
            className="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full transition-all"
            style={{ width: `${completionRate}%` }}
          />
        </div>
        <div className="flex gap-4 text-sm text-blue-700">
          <span>📋 Todo: {todoCount}</span>
          <span>🔄 In Progress: {inProgressCount}</span>
          <span>✅ Done: {doneCount}</span>
        </div>
      </div>

      {/* Import from Description */}
      {hasChecklistInDescription && (
        <div className="p-3 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-yellow-600 text-lg">📝</span>
              <div>
                <p className="text-sm font-semibold text-yellow-900">
                  Found {checklistData.items.length} checklist item{checklistData.items.length > 1 ? 's' : ''} in description
                </p>
                <p className="text-xs text-yellow-700">Convert them to subtasks for better tracking</p>
              </div>
            </div>
            <button
              onClick={handleImportFromDescription}
              className="px-3 py-1.5 bg-yellow-600 text-white text-sm font-semibold rounded-lg hover:bg-yellow-700 transition-all"
            >
              Import
            </button>
          </div>
        </div>
      )}

      {/* Quick Add Input */}
      {!showAddForm && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={quickAddText}
              onChange={(e) => setQuickAddText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleQuickAdd();
                }
              }}
              placeholder="Quick add: Type subtask and press Enter..."
              className="flex-1 px-4 py-2.5 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
            <button
              onClick={handleQuickAdd}
              disabled={!quickAddText.trim()}
              className="px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Add
            </button>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Need more details? Add with full form
          </button>
        </div>
      )}

      {/* Add Subtask Form */}
      {showAddForm && (
        <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50 space-y-3">
          <h4 className="font-bold text-blue-900">New Subtask</h4>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Subtask title *"
            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            autoFocus
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
          />

          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="Assign to (optional)"
              className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />

            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAddSubtask}
              disabled={!title.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Subtask
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setTitle('');
                setDescription('');
                setAssignedTo('');
                setDueDate('');
              }}
              className="px-4 py-2 bg-white border border-blue-300 text-blue-700 font-semibold rounded-lg hover:bg-blue-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Subtask List */}
      {subtasks.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <div className="text-4xl mb-2">✅</div>
          <p>No subtasks yet. Add one to break down this task!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {subtasks.map((subtask) => {
            const isDone = subtask.status === 'done';
            const isInProgress = subtask.status === 'in_progress';

            return (
              <div
                key={subtask.id}
                className={`p-4 border-2 rounded-lg transition-all ${
                  isDone
                    ? 'bg-green-50 border-green-200'
                    : isInProgress
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => {
                      const newStatus = isDone ? 'todo' : 'done';
                      handleUpdateStatus(subtask.id, newStatus);
                    }}
                    className={`mt-1 flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                      isDone
                        ? 'bg-green-600 border-green-600'
                        : 'border-slate-400 hover:border-green-500'
                    }`}
                  >
                    {isDone && (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1">
                    <h5 className={`font-semibold ${isDone ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                      {subtask.title}
                    </h5>

                    {subtask.description && (
                      <p className="text-sm text-slate-600 mt-1">{subtask.description}</p>
                    )}

                    <div className="flex gap-3 mt-2 text-xs text-slate-500">
                      {subtask.assigned_to && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {Array.isArray(subtask.assigned_to) ? subtask.assigned_to.join(', ') : subtask.assigned_to}
                        </span>
                      )}
                      {subtask.due_date && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {new Date(subtask.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1">
                    {!isDone && (
                      <button
                        onClick={() => {
                          const newStatus = isInProgress ? 'todo' : 'in_progress';
                          handleUpdateStatus(subtask.id, newStatus);
                        }}
                        className={`px-3 py-1 text-xs font-semibold rounded transition-all ${
                          isInProgress
                            ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                      >
                        {isInProgress ? 'Pause' : 'Start'}
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteSubtask(subtask.id)}
                      className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded hover:bg-red-200 transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SubtaskList;
