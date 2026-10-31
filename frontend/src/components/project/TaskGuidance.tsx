/**
 * Task Guidance Component
 * Beautiful, interactive display of AI-generated task execution guidance
 */

import React, { useState, useEffect } from 'react';
import { useAnalytics } from '../../hooks/useAnalytics';

interface TaskGuidanceProps {
  taskId: string;
  projectId: string;
  guidance: {
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
  onAskAI?: () => void;
}

export const TaskGuidance: React.FC<TaskGuidanceProps> = ({
  taskId,
  projectId,
  guidance,
  onAskAI,
}) => {
  const {
    trackGuidanceViewed,
    trackGuidanceStepCompleted,
  } = useAnalytics();

  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [showFullResources, setShowFullResources] = useState(false);
  const [hasTrackedView, setHasTrackedView] = useState(false);

  // Track guidance view on mount
  useEffect(() => {
    if (!hasTrackedView) {
      trackGuidanceViewed(projectId, taskId, guidance.quick_start?.length);
      setHasTrackedView(true);
    }
  }, [hasTrackedView, projectId, taskId, guidance.quick_start?.length, trackGuidanceViewed]);

  const handleStepToggle = (stepIndex: number) => {
    const newCompleted = new Set(completedSteps);

    if (newCompleted.has(stepIndex)) {
      newCompleted.delete(stepIndex);
    } else {
      newCompleted.add(stepIndex);
      // Track step completion
      trackGuidanceStepCompleted(projectId, taskId, stepIndex + 1);
    }

    setCompletedSteps(newCompleted);
  };

  const getComplexityColor = (complexity?: string) => {
    switch (complexity) {
      case 'simple':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'moderate':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'complex':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'documentation':
        return '📚';
      case 'tutorial':
        return '📖';
      case 'video':
        return '🎥';
      case 'article':
        return '📄';
      default:
        return '🔗';
    }
  };

  const progressPercent = guidance.quick_start
    ? (completedSteps.size / guidance.quick_start.length) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Header with complexity and time estimate */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">📋 Execution Guide</h3>
        <div className="flex items-center gap-2">
          {guidance.complexity && (
            <span
              className={`px-3 py-1 text-sm font-medium rounded-full border ${getComplexityColor(
                guidance.complexity
              )}`}
            >
              {guidance.complexity}
            </span>
          )}
          {guidance.estimated_time && (
            <span className="px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 rounded-full border border-blue-200">
              ⏱️ {guidance.estimated_time}
            </span>
          )}
        </div>
      </div>

      {/* Overview */}
      {guidance.overview && (
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">🎯 What You'll Accomplish</h4>
          <p className="text-sm text-blue-800">{guidance.overview}</p>
        </div>
      )}

      {/* Progress bar */}
      {guidance.quick_start && guidance.quick_start.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">Your Progress</span>
            <span className="text-gray-600">
              {completedSteps.size} / {guidance.quick_start.length} steps
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Quick Start Steps */}
      {guidance.quick_start && guidance.quick_start.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-900">✨ Quick Start</h4>
          <div className="space-y-2">
            {guidance.quick_start.map((step, index) => (
              <label
                key={index}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:shadow-sm ${
                  completedSteps.has(index)
                    ? 'bg-green-50 border-green-300'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={completedSteps.has(index)}
                  onChange={() => handleStepToggle(index)}
                  className="mt-0.5 h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <div className="flex-1">
                  <span
                    className={`text-sm ${
                      completedSteps.has(index)
                        ? 'text-gray-600 line-through'
                        : 'text-gray-800'
                    }`}
                  >
                    <span className="font-medium text-gray-500 mr-2">Step {index + 1}:</span>
                    {step}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Prerequisites */}
      {guidance.prerequisites &&
        (guidance.prerequisites.skills?.length ||
          guidance.prerequisites.tools?.length ||
          guidance.prerequisites.dependencies?.length) && (
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-3">
            <h4 className="text-sm font-semibold text-purple-900">🔧 Prerequisites</h4>

            {guidance.prerequisites.skills && guidance.prerequisites.skills.length > 0 && (
              <div>
                <p className="text-xs font-medium text-purple-700 mb-1">Skills Needed:</p>
                <div className="flex flex-wrap gap-1">
                  {guidance.prerequisites.skills.map((skill, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {guidance.prerequisites.tools && guidance.prerequisites.tools.length > 0 && (
              <div>
                <p className="text-xs font-medium text-purple-700 mb-1">Tools Required:</p>
                <div className="flex flex-wrap gap-1">
                  {guidance.prerequisites.tools.map((tool, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {guidance.prerequisites.dependencies &&
              guidance.prerequisites.dependencies.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-purple-700 mb-1">Dependencies:</p>
                  <ul className="text-xs text-purple-800 space-y-1">
                    {guidance.prerequisites.dependencies.map((dep, i) => (
                      <li key={i}>• {dep}</li>
                    ))}
                  </ul>
                </div>
              )}
          </div>
        )}

      {/* Resources */}
      {guidance.resources && guidance.resources.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-900">📚 Helpful Resources</h4>
          <div className="space-y-2">
            {(showFullResources ? guidance.resources : guidance.resources.slice(0, 3)).map(
              (resource, i) => (
                <a
                  key={i}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all group"
                >
                  <span className="text-2xl">{getResourceIcon(resource.type)}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                      {resource.title}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">{resource.type}</p>
                  </div>
                  <svg
                    className="w-4 h-4 text-gray-400 group-hover:text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              )
            )}

            {guidance.resources.length > 3 && !showFullResources && (
              <button
                onClick={() => setShowFullResources(true)}
                className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Show {guidance.resources.length - 3} more resources →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Common Pitfalls */}
      {guidance.common_pitfalls && guidance.common_pitfalls.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-900">⚠️ Common Pitfalls</h4>
          <div className="space-y-3">
            {guidance.common_pitfalls.map((pitfall, i) => (
              <div
                key={i}
                className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg space-y-2"
              >
                <p className="text-sm font-medium text-yellow-900">❌ {pitfall.issue}</p>
                <p className="text-sm text-yellow-800">✅ {pitfall.solution}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success Criteria */}
      {guidance.success_criteria && guidance.success_criteria.length > 0 && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-2">
          <h4 className="text-sm font-semibold text-green-900">✅ Success Criteria</h4>
          <ul className="space-y-1">
            {guidance.success_criteria.map((criteria, i) => (
              <li key={i} className="text-sm text-green-800 flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>{criteria}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Ask AI Button */}
      {onAskAI && (
        <button
          onClick={onAskAI}
          className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
          💬 Need Help? Ask AI
        </button>
      )}
    </div>
  );
};
