import React from 'react';
import { X, Calendar, Clock, Tag, Flag, User, CheckCircle2, Circle } from 'lucide-react';
import { Task, STATUS_CONFIG, PRIORITY_CONFIG } from '../../types/task';

interface TaskDetailModalProps {
    task: Task;
    onClose: () => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, onClose }) => {
    const statusConfig = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG];
    const priorityConfig = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG];

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Not set';
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-start">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            {task.status === 'done' ? (
                                <CheckCircle2 className="w-6 h-6 text-green-600" />
                            ) : (
                                <Circle className="w-6 h-6 text-gray-400" />
                            )}
                            <h2 className="text-2xl font-bold text-gray-900">{task.title}</h2>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span
                                className={`px-3 py-1 rounded-full text-xs font-medium`}
                                style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.color }}
                            >
                                {statusConfig.label}
                            </span>
                            <span
                                className="px-3 py-1 rounded-full text-xs font-medium"
                                style={{ color: priorityConfig.color, backgroundColor: `${priorityConfig.color}15` }}
                            >
                                {priorityConfig.label}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Description */}
                    {task.description && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
                            <p className="text-gray-600 whitespace-pre-wrap">{task.description}</p>
                        </div>
                    )}

                    {/* Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {task.start_date && (
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Calendar className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-gray-700">Start Date</div>
                                    <div className="text-sm text-gray-600">{formatDate(task.start_date)}</div>
                                </div>
                            </div>
                        )}
                        {task.due_date && (
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-red-100 rounded-lg">
                                    <Calendar className="w-5 h-5 text-red-600" />
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-gray-700">Due Date</div>
                                    <div className="text-sm text-gray-600">{formatDate(task.due_date)}</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Time Estimates */}
                    {(task.estimated_hours || task.actual_hours) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {task.estimated_hours && (
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-purple-100 rounded-lg">
                                        <Clock className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-gray-700">Estimated Hours</div>
                                        <div className="text-sm text-gray-600">{task.estimated_hours}h</div>
                                    </div>
                                </div>
                            )}
                            {task.actual_hours && (
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-green-100 rounded-lg">
                                        <Clock className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-gray-700">Actual Hours</div>
                                        <div className="text-sm text-gray-600">{task.actual_hours}h</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Progress */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-700">Progress</span>
                            <span className="text-sm text-gray-600">{task.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-indigo-600 h-2 rounded-full transition-all"
                                style={{ width: `${task.progress}%` }}
                            />
                        </div>
                    </div>

                    {/* Assigned To */}
                    {task.assigned_to && (
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                                <User className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <div className="text-sm font-medium text-gray-700">Assigned To</div>
                                <div className="text-sm text-gray-600">
                                    {Array.isArray(task.assigned_to) ? task.assigned_to.join(', ') : task.assigned_to}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tags */}
                    {task.tags && task.tags.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Tag className="w-4 h-4 text-gray-500" />
                                <span className="text-sm font-medium text-gray-700">Tags</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {task.tags.map((tag, index) => (
                                    <span
                                        key={index}
                                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Subtasks */}
                    {task.subtasks && task.subtasks.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">
                                Subtasks ({task.subtasks.filter(s => s.status === 'done').length}/{task.subtasks.length})
                            </h3>
                            <div className="space-y-2">
                                {task.subtasks.map(subtask => (
                                    <div
                                        key={subtask.id}
                                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                                    >
                                        {subtask.status === 'done' ? (
                                            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                                        ) : (
                                            <Circle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                        )}
                                        <span className={`text-sm flex-1 ${
                                            subtask.status === 'done' ? 'line-through text-gray-500' : 'text-gray-700'
                                        }`}>
                                            {subtask.title}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Timestamps */}
                    <div className="pt-4 border-t border-gray-200">
                        <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                            <div>
                                <div className="font-medium">Created</div>
                                <div>{new Date(task.created_at).toLocaleString()}</div>
                            </div>
                            <div>
                                <div className="font-medium">Updated</div>
                                <div>{new Date(task.updated_at).toLocaleString()}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaskDetailModal;
