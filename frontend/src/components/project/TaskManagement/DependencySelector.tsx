import React, { useState, useEffect } from 'react';
import { Task } from '../../../types/task';
import fetchWithAuth from '../../../hooks/fetchWithAuth';

interface DependencySelectorProps {
  projectId: string;
  currentTaskId: string;
  onDependencyAdded: () => void;
}

const DependencySelector: React.FC<DependencySelectorProps> = ({
  projectId,
  currentTaskId,
  onDependencyAdded
}) => {
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch available tasks from the project
  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      try {
        const response = await fetchWithAuth(`/api/tasks/project/${projectId}`);
        if (response.ok) {
          const data = await response.json();
          // Filter out the current task
          const tasks = (data.tasks || []).filter((t: Task) => t.id !== currentTaskId);
          setAvailableTasks(tasks);
        }
      } catch (err) {
        console.error('Error fetching tasks:', err);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchTasks();
    }
  }, [projectId, currentTaskId]);

  const handleAddDependency = async () => {
    if (!selectedTaskId) return;

    setAdding(true);
    setError(null);

    try {
      const response = await fetchWithAuth(`/api/tasks/${currentTaskId}/dependencies`, {
        method: 'POST',
        body: JSON.stringify({ depends_on_task_id: selectedTaskId })
      });

      if (response.ok) {
        setSelectedTaskId('');
        setSearchTerm('');
        onDependencyAdded();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to add dependency');
      }
    } catch (err) {
      setError('Error adding dependency');
    } finally {
      setAdding(false);
    }
  };

  // Filter tasks based on search term
  const filteredTasks = availableTasks.filter(task =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-3">
      {/* Search and Select */}
      <div className="flex gap-2">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search tasks by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
          />
        </div>
      </div>

      {/* Task Selection List */}
      {searchTerm && (
        <div className="max-h-64 overflow-y-auto border-2 border-slate-200 rounded-lg">
          {loading ? (
            <div className="p-4 text-center text-slate-500 text-sm">Loading tasks...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-4 text-center text-slate-500 text-sm">No tasks found</div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className={`w-full p-3 text-left hover:bg-slate-50 transition-colors ${
                    selectedTaskId === task.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 truncate">{task.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">ID: {task.id.slice(0, 8)}</div>
                    </div>
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                      style={{
                        color: task.status === 'done' ? '#10b981' : task.status === 'in_progress' ? '#f59e0b' : '#64748b',
                        backgroundColor: task.status === 'done' ? '#d1fae5' : task.status === 'in_progress' ? '#fef3c7' : '#f1f5f9'
                      }}
                    >
                      {task.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Button */}
      {selectedTaskId && (
        <div className="flex items-center gap-2">
          <button
            onClick={handleAddDependency}
            disabled={adding}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
          >
            {adding ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Adding...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Dependency</span>
              </>
            )}
          </button>
          <button
            onClick={() => {
              setSelectedTaskId('');
              setSearchTerm('');
            }}
            className="px-4 py-2 border-2 border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-all text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

export default DependencySelector;
