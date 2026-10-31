import React, { useState } from 'react';
import TaskCard from './TaskCard';
import { Task, TaskStatus, STATUS_CONFIG } from '../../../types/task';
import { Milestone } from '../../../types/project/milestone';
import { useTaskDependencies } from '../../../hooks/useTaskDependencies';

interface TaskBoardViewProps {
  tasks: Task[];
  projectId?: string;
  onTaskClick: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
  loading?: boolean;
  milestones?: Milestone[];
  selectionMode?: boolean;
  selectedTaskIds?: Set<string>;
  onToggleSelection?: (taskId: string, selected: boolean) => void;
  projectMembers?: Array<{ user_id: number; username: string; name: string; avatar?: string }>;
}

const COLUMNS: TaskStatus[] = ['todo', 'in_progress', 'review', 'blocked', 'done'];

const TaskBoardView: React.FC<TaskBoardViewProps> = ({
  tasks,
  projectId,
  onTaskClick,
  onEditTask,
  onDeleteTask,
  onUpdateStatus,
  loading = false,
  milestones = [],
  selectionMode = false,
  selectedTaskIds = new Set(),
  onToggleSelection,
  projectMembers = []
}) => {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  // Fetch dependency information
  const { getDependencyInfo} = useTaskDependencies(projectId || '', tasks);

  // Group tasks by status
  const tasksByStatus: Record<TaskStatus, Task[]> = {
    todo: [],
    in_progress: [],
    review: [],
    blocked: [],
    done: []
  };

  tasks.forEach(task => {
    // Safety check: only add task if status is valid
    if (task.status && tasksByStatus[task.status]) {
      tasksByStatus[task.status].push(task);
    } else {
      // Default to 'todo' if status is invalid or missing
      console.warn(`Task ${task.id} has invalid status: ${task.status}, defaulting to 'todo'`);
      tasksByStatus.todo.push(task);
    }
  });

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (status: TaskStatus) => {
    if (draggedTask && draggedTask.status !== status) {
      onUpdateStatus(draggedTask.id, status);
    }
    setDraggedTask(null);
  };

  const handleQuickStatusChange = (taskId: string, newStatus: TaskStatus) => {
    if (window.confirm(`Move task to "${STATUS_CONFIG[newStatus].label}"?`)) {
      onUpdateStatus(taskId, newStatus);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-2">⏳</div>
          <p className="text-slate-600">Loading board...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map(status => {
        const statusConfig = STATUS_CONFIG[status];
        const columnTasks = tasksByStatus[status];
        const completionRate = columnTasks.length > 0
          ? Math.round((columnTasks.reduce((sum, t) => sum + t.progress, 0) / columnTasks.length))
          : 0;

        return (
          <div
            key={status}
            className="flex-shrink-0 w-80"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(status)}
          >
            {/* Column Header */}
            <div
              className="rounded-t-lg p-4 border-2 border-b-0"
              style={{
                backgroundColor: statusConfig.bgColor,
                borderColor: statusConfig.color + '40'
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-lg" style={{ color: statusConfig.color }}>
                  {statusConfig.label}
                </h3>
                <span
                  className="px-2 py-1 rounded-full text-xs font-bold"
                  style={{
                    backgroundColor: statusConfig.color + '20',
                    color: statusConfig.color
                  }}
                >
                  {columnTasks.length}
                </span>
              </div>

              {/* Column Stats */}
              {columnTasks.length > 0 && (
                <div className="text-xs" style={{ color: statusConfig.color }}>
                  <div className="flex justify-between mb-1">
                    <span>Avg Progress</span>
                    <span className="font-semibold">{completionRate}%</span>
                  </div>
                  <div className="w-full bg-white/50 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${completionRate}%`,
                        backgroundColor: statusConfig.color
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Column Content */}
            <div
              className="border-2 rounded-b-lg p-3 min-h-[500px] space-y-3 bg-slate-50"
              style={{ borderColor: statusConfig.color + '40' }}
            >
              {columnTasks.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
                  <div className="text-center">
                    <div className="text-3xl mb-2">📭</div>
                    <p>No tasks</p>
                  </div>
                </div>
              ) : (
                columnTasks.map(task => {
                  const depInfo = getDependencyInfo(task.id);
                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task)}
                      onDragEnd={handleDragEnd}
                      className="cursor-move"
                    >
                      <TaskCard
                        task={task}
                        view="board"
                        onClick={onTaskClick}
                        onEdit={selectionMode ? undefined : onEditTask}
                        onDelete={selectionMode ? undefined : onDeleteTask}
                        showDetails={true}
                        isDragging={draggedTask?.id === task.id}
                        milestones={milestones}
                        dependencyCount={depInfo.dependencyCount}
                        blockedByCount={depInfo.blockedByCount}
                        selectionMode={selectionMode}
                        isSelected={selectedTaskIds.has(task.id)}
                        onSelect={onToggleSelection}
                        projectMembers={projectMembers}
                      />

                      {/* Quick Status Change on Right Click */}
                      <div className="mt-2 flex gap-1 opacity-0 hover:opacity-100 transition-opacity">
                        {COLUMNS.filter(s => s !== status).map(newStatus => (
                          <button
                            key={newStatus}
                            onClick={() => handleQuickStatusChange(task.id, newStatus)}
                            className="flex-1 px-2 py-1 text-xs rounded hover:bg-white transition-colors"
                            style={{
                              color: STATUS_CONFIG[newStatus].color,
                              backgroundColor: STATUS_CONFIG[newStatus].bgColor
                            }}
                            title={`Move to ${STATUS_CONFIG[newStatus].label}`}
                          >
                            →
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TaskBoardView;
