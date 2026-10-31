import React, { useState } from 'react';
import { motion } from 'framer-motion';

export interface GeneratedPhase {
  phase_id?: number;
  name: string;
  status: string;
  duration: string;
  tasks: GeneratedTask[];
  gates?: PhaseGate;
  sort_order: number;
}

export interface GeneratedTask {
  task_id?: number;
  title: string;
  description: string;
  type: string;
  estimated_hours?: number;
  dependencies?: number[];
  acceptance_criteria?: string[];
  assigned_to?: string;
  due_date?: string;
  priority: string;
  phase_id: number;
}

export interface GeneratedMilestone {
  name: string;
  timing: string;
  deliverables: string[];
  due_date?: string;
  weight?: number;
}

export interface PhaseGate {
  type: string;
  approver?: string;
  checklist_before_submit?: string[];
}

export interface GeneratedBoard {
  phases: GeneratedPhase[];
  tasks: GeneratedTask[];
  milestones: GeneratedMilestone[];
  assignments?: Record<string, string>;
}

interface AIBoardPreviewProps {
  board: GeneratedBoard;
  isGenerating: boolean;
  onConfirm: () => void;
  onRegenerate: () => void;
  onCancel: () => void;
}

const AIBoardPreview: React.FC<AIBoardPreviewProps> = ({
  board,
  isGenerating,
  onConfirm,
  onRegenerate,
  onCancel,
}) => {
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set([0]));

  const togglePhase = (index: number) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedPhases(newExpanded);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'milestone':
        return '🎯';
      case 'deliverable':
        return '📦';
      case 'quality_gate':
        return '✅';
      case 'document':
        return '📄';
      default:
        return '📌';
    }
  };

  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="relative">
          <div className="w-24 h-24 border-8 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="w-12 h-12 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mt-6">AI is Generating Your Project Board...</h3>
        <p className="text-gray-600 mt-2">This may take 10-30 seconds</p>
        <div className="mt-4 flex flex-col items-center space-y-2 text-sm text-gray-500">
          <p>✨ Analyzing your requirements</p>
          <p>🎯 Creating milestones and phases</p>
          <p>📋 Generating detailed tasks</p>
        </div>
      </div>
    );
  }

  const totalTasks = board.phases.reduce((sum, phase) => sum + phase.tasks.length, 0);
  const totalEstimatedHours = board.tasks.reduce(
    (sum, task) => sum + (task.estimated_hours || 0),
    0
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-t-2xl p-6 text-white">
        <div className="flex items-center space-x-3 mb-2">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="text-2xl font-bold">AI-Generated Project Board</h2>
        </div>
        <p className="text-purple-100">Review and customize your project plan</p>
      </div>

      {/* Stats */}
      <div className="bg-white border-x border-gray-200 p-6 grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600">{board.phases.length}</div>
          <div className="text-sm text-gray-600">Phases</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-green-600">{totalTasks}</div>
          <div className="text-sm text-gray-600">Tasks</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-purple-600">{totalEstimatedHours}h</div>
          <div className="text-sm text-gray-600">Est. Time</div>
        </div>
      </div>

      {/* Milestones */}
      {board.milestones && board.milestones.length > 0 && (
        <div className="bg-white border-x border-b border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="text-2xl mr-2">🎯</span>
            Key Milestones
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {board.milestones.map((milestone, index) => (
              <div key={index} className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="font-semibold text-gray-900">{milestone.name}</div>
                <div className="text-sm text-gray-600 mt-1">{milestone.timing}</div>
                {milestone.deliverables && milestone.deliverables.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {milestone.deliverables.map((deliverable, i) => (
                      <li key={i} className="text-xs text-gray-600 flex items-start">
                        <span className="mr-1">•</span>
                        {deliverable}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phases and Tasks */}
      <div className="bg-white border-x border-b border-gray-200 rounded-b-2xl overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="text-2xl mr-2">📋</span>
            Project Phases & Tasks
          </h3>

          <div className="space-y-4">
            {board.phases.map((phase, phaseIndex) => (
              <div key={phaseIndex} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Phase Header */}
                <button
                  onClick={() => togglePhase(phaseIndex)}
                  className="w-full bg-gray-50 hover:bg-gray-100 transition-colors p-4 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <svg
                      className={`w-5 h-5 text-gray-600 transition-transform ${
                        expandedPhases.has(phaseIndex) ? 'rotate-90' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                    <div className="text-left">
                      <div className="font-semibold text-gray-900">{phase.name}</div>
                      <div className="text-sm text-gray-600">
                        {phase.duration} • {phase.tasks.length} tasks
                      </div>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    phase.status === 'active' ? 'bg-green-100 text-green-700' :
                    phase.status === 'generated' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {phase.status}
                  </span>
                </button>

                {/* Phase Tasks */}
                {expandedPhases.has(phaseIndex) && (
                  <div className="p-4 bg-white space-y-3">
                    {phase.gates && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                        <div className="flex items-start space-x-2">
                          <svg
                            className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                          </svg>
                          <div>
                            <div className="font-medium text-yellow-900">
                              Gate: {phase.gates.type.replace('_', ' ')}
                            </div>
                            {phase.gates.approver && (
                              <div className="text-sm text-yellow-800 mt-1">
                                Approver: {phase.gates.approver}
                              </div>
                            )}
                            {phase.gates.checklist_before_submit && (
                              <ul className="mt-2 space-y-1">
                                {phase.gates.checklist_before_submit.map((item, i) => (
                                  <li key={i} className="text-sm text-yellow-800">
                                    ✓ {item}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {phase.tasks.map((task, taskIndex) => (
                      <div
                        key={taskIndex}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="text-xl">{getTypeIcon(task.type)}</span>
                              <h4 className="font-semibold text-gray-900">{task.title}</h4>
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(
                                  task.priority
                                )}`}
                              >
                                {task.priority}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">{task.description}</p>

                            {task.acceptance_criteria && task.acceptance_criteria.length > 0 && (
                              <div className="mb-3">
                                <div className="text-xs font-medium text-gray-700 mb-1">
                                  Acceptance Criteria:
                                </div>
                                <ul className="space-y-1">
                                  {task.acceptance_criteria.map((criteria, i) => (
                                    <li key={i} className="text-xs text-gray-600 flex items-start">
                                      <span className="text-green-600 mr-1">✓</span>
                                      {criteria}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              {task.estimated_hours && (
                                <span className="flex items-center">
                                  <svg
                                    className="w-4 h-4 mr-1"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                  </svg>
                                  {task.estimated_hours}h
                                </span>
                              )}
                              <span className="px-2 py-0.5 bg-gray-200 rounded">
                                {task.type}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="bg-gray-50 border-t border-gray-200 p-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            💡 You can edit tasks and milestones after creating the project
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onRegenerate}
              className="px-6 py-3 text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
            >
              🔄 Regenerate
            </button>
            <button
              onClick={onConfirm}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium"
            >
              ✨ Create Project with This Board
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AIBoardPreview;
