import React, { useState, useEffect } from 'react';
import { Task } from '../../../types/task';
import fetchWithAuth from '../../../hooks/fetchWithAuth';
import DependencySelector from './DependencySelector';

interface TaskDependency {
  id: number;
  task_id: string;
  depends_on_task_id: string;
  created_at: string;
}

interface DependencyWithTask extends TaskDependency {
  task?: Task;
}

interface DependencyListProps {
  taskId: string;
  projectId: string;
  onTaskClick?: (taskId: string) => void;
}

const DependencyList: React.FC<DependencyListProps> = ({
  taskId,
  projectId,
  onTaskClick
}) => {
  const [dependencies, setDependencies] = useState<DependencyWithTask[]>([]);
  const [dependentTasks, setDependentTasks] = useState<DependencyWithTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedDeps, setExpandedDeps] = useState(true);
  const [expandedBlocks, setExpandedBlocks] = useState(true);

  const fetchDependencies = async () => {
    setLoading(true);
    try {
      // Fetch tasks this task depends on
      const depsResponse = await fetchWithAuth(`/api/tasks/${taskId}/dependencies`);
      if (depsResponse.ok) {
        const depsData = await depsResponse.json();
        const deps = depsData.dependencies || [];

        // Fetch full task details for each dependency
        const depsWithTasks = await Promise.all(
          deps.map(async (dep: TaskDependency) => {
            try {
              const taskResponse = await fetchWithAuth(`/api/tasks/${dep.depends_on_task_id}`);
              if (taskResponse.ok) {
                const taskData = await taskResponse.json();
                return { ...dep, task: taskData.task };
              }
            } catch (err) {
              console.error('Error fetching dependency task:', err);
            }
            return dep;
          })
        );
        setDependencies(depsWithTasks);
      }

      // Fetch tasks that depend on this task
      const dependentResponse = await fetchWithAuth(`/api/tasks/${taskId}/dependent-tasks`);
      if (dependentResponse.ok) {
        const dependentData = await dependentResponse.json();
        const dependent = dependentData.dependent_tasks || [];

        // Fetch full task details for each dependent task
        const dependentWithTasks = await Promise.all(
          dependent.map(async (dep: TaskDependency) => {
            try {
              const taskResponse = await fetchWithAuth(`/api/tasks/${dep.task_id}`);
              if (taskResponse.ok) {
                const taskData = await taskResponse.json();
                return { ...dep, task: taskData.task };
              }
            } catch (err) {
              console.error('Error fetching dependent task:', err);
            }
            return dep;
          })
        );
        setDependentTasks(dependentWithTasks);
      }
    } catch (err) {
      console.error('Error fetching dependencies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (taskId) {
      fetchDependencies();
    }
  }, [taskId]);

  const handleRemoveDependency = async (dependencyId: number) => {
    if (!window.confirm('Remove this dependency?')) return;

    try {
      const response = await fetchWithAuth(`/api/tasks/dependencies/${dependencyId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchDependencies();
      }
    } catch (err) {
      console.error('Error removing dependency:', err);
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'done':
        return '✅';
      case 'in_progress':
        return '⏳';
      case 'review':
        return '👀';
      case 'blocked':
        return '🚫';
      default:
        return '📋';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'done':
        return { bg: '#d1fae5', text: '#10b981' };
      case 'in_progress':
        return { bg: '#fef3c7', text: '#f59e0b' };
      case 'review':
        return { bg: '#dbeafe', text: '#3b82f6' };
      case 'blocked':
        return { bg: '#fee2e2', text: '#ef4444' };
      default:
        return { bg: '#f1f5f9', text: '#64748b' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin text-2xl mb-2">⏳</div>
          <p className="text-sm text-slate-600">Loading dependencies...</p>
        </div>
      </div>
    );
  }

  const hasBlockers = dependencies.some(dep => dep.task?.status !== 'done');

  return (
    <div className="space-y-6">
      {/* Summary Banner */}
      {hasBlockers && (
        <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-lg flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h4 className="font-bold text-orange-900 mb-1">Blocked by Dependencies</h4>
            <p className="text-sm text-orange-700">
              This task has {dependencies.filter(d => d.task?.status !== 'done').length} incomplete
              {dependencies.filter(d => d.task?.status !== 'done').length === 1 ? ' dependency' : ' dependencies'}.
              Complete them first before starting this task.
            </p>
          </div>
        </div>
      )}

      {/* Dependencies Section */}
      <div className="border-2 border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b-2 border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setExpandedDeps(!expandedDeps)}
              className="flex items-center gap-2 hover:bg-white/50 rounded-lg px-2 py-1 transition-all flex-1"
            >
              <svg
                className={`w-5 h-5 text-orange-600 transition-transform ${expandedDeps ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-xl">🔗</span>
              <h3 className="font-bold text-slate-800">
                Depends On
                <span className="ml-2 text-sm font-normal text-slate-600">
                  (Must complete before starting this task)
                </span>
              </h3>
              {dependencies.length > 0 && (
                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-bold ml-2">
                  {dependencies.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1.5 text-sm font-medium text-orange-600 hover:bg-orange-100 rounded-lg transition-all flex items-center gap-1 flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add
            </button>
          </div>
        </div>

        {expandedDeps && (
          <div className="p-4">
            {showAddForm && (
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <DependencySelector
                  projectId={projectId}
                  currentTaskId={taskId}
                  onDependencyAdded={() => {
                    setShowAddForm(false);
                    fetchDependencies();
                  }}
                />
              </div>
            )}

        <div className="space-y-2">
          {dependencies.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-sm">
              <div className="text-3xl mb-2">🎯</div>
              <p>No dependencies yet. This task can be started anytime!</p>
            </div>
          ) : (
            dependencies.map((dep) => {
              const task = dep.task;
              const statusColors = getStatusColor(task?.status);
              const isComplete = task?.status === 'done';

              return (
                <div
                  key={dep.id}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    isComplete
                      ? 'bg-green-50 border-green-200'
                      : 'bg-white border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <span className="text-lg flex-shrink-0 mt-0.5">
                        {getStatusIcon(task?.status)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {onTaskClick ? (
                            <button
                              onClick={() => task && onTaskClick(task.id)}
                              className="font-medium text-slate-800 hover:text-blue-600 transition-colors text-left truncate"
                            >
                              {task?.title || 'Unknown Task'}
                            </button>
                          ) : (
                            <span className="font-medium text-slate-800 truncate">
                              {task?.title || 'Unknown Task'}
                            </span>
                          )}
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                            style={{
                              backgroundColor: statusColors.bg,
                              color: statusColors.text
                            }}
                          >
                            {task?.status || 'unknown'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          ID: {dep.depends_on_task_id.slice(0, 8)}
                          {task?.progress !== undefined && ` • Progress: ${task.progress}%`}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveDependency(dep.id)}
                      className="p-1.5 hover:bg-red-100 rounded transition-colors flex-shrink-0"
                      title="Remove dependency"
                    >
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
          </div>
        )}
      </div>

      {/* Blocks Section */}
      <div className="border-2 border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-slate-200 p-4">
          <button
            onClick={() => setExpandedBlocks(!expandedBlocks)}
            className="flex items-center gap-2 hover:bg-white/50 rounded-lg px-2 py-1 transition-all w-full"
          >
            <svg
              className={`w-5 h-5 text-blue-600 transition-transform ${expandedBlocks ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-xl">🔒</span>
            <h3 className="font-bold text-slate-800">
              Blocks
              <span className="ml-2 text-sm font-normal text-slate-600">
                (Tasks waiting for this to complete)
              </span>
            </h3>
            {dependentTasks.length > 0 && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold ml-2">
                {dependentTasks.length}
              </span>
            )}
          </button>
        </div>

        {expandedBlocks && (
          <div className="p-4">

        <div className="space-y-2">
          {dependentTasks.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-sm">
              <div className="text-3xl mb-2">🚀</div>
              <p>No tasks are blocked by this one.</p>
            </div>
          ) : (
            dependentTasks.map((dep) => {
              const task = dep.task;
              const statusColors = getStatusColor(task?.status);

              return (
                <div
                  key={dep.id}
                  className="p-3 bg-white rounded-lg border-2 border-slate-200 hover:border-blue-300 transition-all"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg flex-shrink-0 mt-0.5">
                      {getStatusIcon(task?.status)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {onTaskClick ? (
                          <button
                            onClick={() => task && onTaskClick(task.id)}
                            className="font-medium text-slate-800 hover:text-blue-600 transition-colors text-left truncate"
                          >
                            {task?.title || 'Unknown Task'}
                          </button>
                        ) : (
                          <span className="font-medium text-slate-800 truncate">
                            {task?.title || 'Unknown Task'}
                          </span>
                        )}
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                          style={{
                            backgroundColor: statusColors.bg,
                            color: statusColors.text
                          }}
                        >
                          {task?.status || 'unknown'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        ID: {dep.task_id.slice(0, 8)}
                        {task?.progress !== undefined && ` • Progress: ${task.progress}%`}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DependencyList;
