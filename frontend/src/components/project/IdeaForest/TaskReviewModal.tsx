import React, { useState } from 'react';
import { X, Plus, Trash2, CheckSquare, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import config from '../../../config';
import { Task, TaskType, TaskPriority } from '../../../types/task';
import { TaskGuidance } from '../TaskGuidance';

const { AI_AGENT_URL } = config;

interface TaskReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTasks: Partial<Task>[];
  projectId: string;
  nodeId: string;
  userId: string;
  onTasksCreated?: () => void;
}

// Define a type for draft tasks (tasks being edited before creation)
type DraftTask = {
  id: string;
  title: string;
  description?: string;
  task_type: TaskType;
  priority: TaskPriority;
  estimated_hours?: number;
  tags?: string[];
  guidance?: {
    overview?: string;
    quick_start?: string[];
    prerequisites?: {
      skills?: string[];
      tools?: string[];
      dependencies?: string[];
    };
    resources?: Array<{
      title: string;
      url: string;
      type: 'documentation' | 'tutorial' | 'video' | 'article';
    }>;
    common_pitfalls?: Array<{
      issue: string;
      solution: string;
    }>;
    success_criteria?: string[];
    estimated_time?: string;
    complexity?: 'simple' | 'moderate' | 'complex';
  };
};

const TaskReviewModal: React.FC<TaskReviewModalProps> = ({
  isOpen,
  onClose,
  initialTasks,
  projectId,
  nodeId,
  userId,
  onTasksCreated,
}) => {
  const [tasks, setTasks] = useState<DraftTask[]>(
    initialTasks.map((task, index) => ({
      id: `temp-${index}`,
      title: task.title || '',
      description: task.description || '',
      task_type: task.task_type || 'action',
      priority: task.priority || 3,
      estimated_hours: task.estimated_hours,
      tags: task.tags || [],
      guidance: (task as any).guidance, // Preserve guidance from AI extraction
    }))
  );
  const [loading, setLoading] = useState(false);
  const [expandedGuidance, setExpandedGuidance] = useState<Set<string>>(new Set());

  const handleTaskChange = (id: string, field: keyof DraftTask, value: any) => {
    setTasks(tasks.map(task =>
      task.id === id ? { ...task, [field]: value } : task
    ));
  };

  const handleAddTask = () => {
    setTasks([
      ...tasks,
      {
        id: `temp-${Date.now()}`,
        title: '',
        description: '',
        task_type: 'action' as TaskType,
        priority: 3 as TaskPriority,
        tags: [],
      },
    ]);
  };

  const handleRemoveTask = (id: string) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const toggleGuidance = (id: string) => {
    const newExpanded = new Set(expandedGuidance);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedGuidance(newExpanded);
  };

  const handleSubmit = async () => {
    if (tasks.length === 0 || tasks.some(t => !t.title.trim())) {
      alert('Please fill in all task titles');
      return;
    }

    setLoading(true);
    try {
      const createPromises = tasks.map(task =>
        fetch(`${AI_AGENT_URL}/ai-api/tasks/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: projectId,
            title: task.title,
            description: task.description || null,
            task_type: task.task_type,
            priority: task.priority,
            estimated_hours: task.estimated_hours || null,
            idea_node_id: nodeId,
            tags: task.tags,
            created_by: userId,
            guidance: task.guidance || null, // Include AI-generated guidance
          }),
        })
      );

      const results = await Promise.all(createPromises);
      const allSuccessful = results.every(r => r.ok);

      if (allSuccessful) {
        alert(`Successfully created ${tasks.length} task(s)!`);
        if (onTasksCreated) onTasksCreated();
        onClose();
      } else {
        throw new Error('Some tasks failed to create');
      }
    } catch (error) {
      console.error('Error creating tasks:', error);
      alert('Failed to create tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg">
              <CheckSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Review Tasks</h2>
              <p className="text-sm text-gray-600">
                Review and edit {tasks.length} task{tasks.length !== 1 ? 's' : ''} before creating
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tasks List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {tasks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <CheckSquare className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">
                No Related Content Detected
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
                The current node content doesn't appear to contain actionable tasks. Try adding task-related content to this node first, or create tasks manually.
              </p>
              <button
                onClick={handleAddTask}
                className="mt-6 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg font-medium hover:from-emerald-700 hover:to-emerald-800 shadow-lg transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Task Manually
              </button>
            </div>
          )}

          {tasks.map((task, index) => (
            <div
              key={task.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-emerald-300 transition-colors bg-white"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 text-gray-400 mt-2">
                  <GripVertical className="w-5 h-5" />
                </div>

                <div className="flex-1 space-y-3">
                  {/* Title */}
                  <input
                    type="text"
                    value={task.title}
                    onChange={(e) => handleTaskChange(task.id, 'title', e.target.value)}
                    placeholder="Task title *"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />

                  {/* Description */}
                  <textarea
                    value={task.description}
                    onChange={(e) => handleTaskChange(task.id, 'description', e.target.value)}
                    placeholder="Task description (optional)"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                  />

                  {/* Type, Priority, Hours */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Type
                      </label>
                      <input
                        type="text"
                        list={`task-types-${task.id}`}
                        value={task.task_type}
                        onChange={(e) => handleTaskChange(task.id, 'task_type', e.target.value)}
                        placeholder="action, research..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                      <datalist id={`task-types-${task.id}`}>
                        <option value="action" />
                        <option value="learning" />
                        <option value="research" />
                        <option value="development" />
                        <option value="bug-fix" />
                        <option value="documentation" />
                        <option value="testing" />
                        <option value="design" />
                      </datalist>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Priority
                      </label>
                      <select
                        value={task.priority}
                        onChange={(e) => handleTaskChange(task.id, 'priority', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option value={1}>1 - Highest</option>
                        <option value={2}>2 - High</option>
                        <option value={3}>3 - Medium</option>
                        <option value={4}>4 - Low</option>
                        <option value={5}>5 - Lowest</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Est. Hours
                      </label>
                      <input
                        type="number"
                        value={task.estimated_hours || ''}
                        onChange={(e) => handleTaskChange(task.id, 'estimated_hours', e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="Hours"
                        min="0"
                        step="0.5"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Guidance Preview */}
                  {task.guidance && (
                    <div className="mt-3 border-t border-gray-200 pt-3">
                      <button
                        onClick={() => toggleGuidance(task.id)}
                        className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        {expandedGuidance.has(task.id) ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                        📋 {expandedGuidance.has(task.id) ? 'Hide' : 'View'} Execution Guide
                        {task.guidance.complexity && (
                          <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                            task.guidance.complexity === 'simple' ? 'bg-green-100 text-green-700' :
                            task.guidance.complexity === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {task.guidance.complexity}
                          </span>
                        )}
                        {task.guidance.estimated_time && (
                          <span className="text-xs text-gray-500">• ⏱️ {task.guidance.estimated_time}</span>
                        )}
                      </button>

                      {expandedGuidance.has(task.id) && (
                        <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <TaskGuidance
                            taskId={task.id}
                            projectId={projectId}
                            guidance={task.guidance}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => handleRemoveTask(task.id)}
                  className="flex-shrink-0 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}

          {/* Add Task Button */}
          <button
            onClick={handleAddTask}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Another Task
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''} to create
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || tasks.length === 0}
              className={`
                px-6 py-2 rounded-lg font-medium text-white transition-all
                ${loading || tasks.length === 0
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-lg hover:shadow-xl'
                }
              `}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </span>
              ) : (
                `Create ${tasks.length} Task${tasks.length !== 1 ? 's' : ''}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskReviewModal;
