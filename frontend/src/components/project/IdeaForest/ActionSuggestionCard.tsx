import React, { useState } from 'react';
import {
  Sparkles,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Target,
  ListTodo,
  BookOpen,
  Lightbulb,
  GitBranch,
  Calendar,
  Zap,
  Info,
  CheckSquare,
  Milestone,
  FileText
} from 'lucide-react';
import { ActionType, DetectedIntent } from '../../../types/project/intentDetection';

interface ActionSuggestionCardProps {
  suggestions: DetectedIntent[];
  onAccept: (intentIds: string[]) => void;
  onCustomize?: (intent: DetectedIntent) => void;
  onDismiss: () => void;
  loading?: boolean;
}

// Icon mapping for different action types
const ActionTypeIcons: Record<ActionType, React.ElementType> = {
  create_milestone: Target,
  breakdown_task: ListTodo,
  generate_learning_plan: BookOpen,
  extract_action_items: Zap,
  create_dependency: GitBranch,
  brainstorm_ideas: Lightbulb,
  save_version: Check,
  schedule_reminder: Calendar,
  extract_tasks: CheckSquare,
  create_milestones: Milestone,
  extract_resources: FileText,
};

// Color mapping for different action types
const ActionTypeColors: Record<ActionType, string> = {
  create_milestone: 'from-purple-500 to-purple-600',
  breakdown_task: 'from-blue-500 to-blue-600',
  generate_learning_plan: 'from-green-500 to-green-600',
  extract_action_items: 'from-yellow-500 to-yellow-600',
  create_dependency: 'from-pink-500 to-pink-600',
  brainstorm_ideas: 'from-orange-500 to-orange-600',
  save_version: 'from-gray-500 to-gray-600',
  schedule_reminder: 'from-indigo-500 to-indigo-600',
  extract_tasks: 'from-emerald-500 to-emerald-600',
  create_milestones: 'from-cyan-500 to-cyan-600',
  extract_resources: 'from-amber-500 to-amber-600',
};

// Readable names for action types
const ActionTypeNames: Record<ActionType, string> = {
  create_milestone: 'Milestone',
  breakdown_task: 'Task Breakdown',
  generate_learning_plan: 'Learning Plan',
  extract_action_items: 'Action Items',
  create_dependency: 'Dependency',
  brainstorm_ideas: 'Ideas',
  save_version: 'Save Version',
  schedule_reminder: 'Reminder',
  extract_tasks: 'Extract Tasks',
  create_milestones: 'Create Milestones',
  extract_resources: 'Extract Resources',
};

const SuggestionItem: React.FC<{
  suggestion: DetectedIntent;
  selected: boolean;
  onToggle: () => void;
  onCustomize?: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
}> = ({ suggestion, selected, onToggle, onCustomize, expanded, onToggleExpand }) => {
  const Icon = ActionTypeIcons[suggestion.type];
  const colorGradient = ActionTypeColors[suggestion.type];
  const typeName = ActionTypeNames[suggestion.type];

  // Priority indicator
  const priorityColors = {
    1: 'text-red-500',
    2: 'text-yellow-500',
    3: 'text-gray-400',
  };

  const confidencePercent = Math.round(suggestion.confidence * 100);

  return (
    <div
      className={`
        border rounded-lg p-3 mb-2 transition-all cursor-pointer
        ${selected ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300 bg-white'}
      `}
      onClick={onToggle}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <div className="flex-shrink-0 mt-0.5">
          <div
            className={`
              w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
              ${selected ? 'bg-purple-600 border-purple-600' : 'border-gray-300 hover:border-purple-400'}
            `}
          >
            {selected && <Check className="w-3 h-3 text-white" />}
          </div>
        </div>

        {/* Icon */}
        <div className={`flex-shrink-0 p-2 rounded-lg bg-gradient-to-br ${colorGradient}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{suggestion.title}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {typeName}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Confidence indicator */}
              <span className="text-xs text-gray-500">{confidencePercent}%</span>

              {/* Priority indicator */}
              {suggestion.priority === 1 && (
                <div className="w-2 h-2 rounded-full bg-red-500" title="High priority" />
              )}

              {/* Expand/collapse button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                {expanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Preview */}
          <p className="text-sm text-gray-600 mb-2">{suggestion.preview}</p>

          {/* Expanded details */}
          {expanded && (
            <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
              <p className="text-sm text-gray-700">{suggestion.description}</p>

              {suggestion.reasoning && (
                <div className="flex items-start gap-2 text-xs text-gray-500">
                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{suggestion.reasoning}</span>
                </div>
              )}

              {/* Parameters preview */}
              {Object.keys(suggestion.parameters).length > 0 && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                  <div className="font-medium text-gray-700 mb-1">Details:</div>
                  {Object.entries(suggestion.parameters).slice(0, 3).map(([key, value]) => (
                    <div key={key} className="text-gray-600">
                      <span className="font-medium">{key}:</span>{' '}
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </div>
                  ))}
                </div>
              )}

              {/* Customize button */}
              {onCustomize && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCustomize();
                  }}
                  className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                >
                  Customize parameters →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ActionSuggestionCard: React.FC<ActionSuggestionCardProps> = ({
  suggestions,
  onAccept,
  onCustomize,
  onDismiss,
  loading = false,
}) => {
  const [selectedIntents, setSelectedIntents] = useState<Set<string>>(
    new Set(suggestions.map((s) => s.id)) // All selected by default
  );
  const [expandedIntents, setExpandedIntents] = useState<Set<string>>(new Set());

  const toggleSelection = (intentId: string) => {
    setSelectedIntents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(intentId)) {
        newSet.delete(intentId);
      } else {
        newSet.add(intentId);
      }
      return newSet;
    });
  };

  const toggleExpand = (intentId: string) => {
    setExpandedIntents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(intentId)) {
        newSet.delete(intentId);
      } else {
        newSet.add(intentId);
      }
      return newSet;
    });
  };

  const handleAccept = () => {
    if (selectedIntents.size > 0) {
      onAccept(Array.from(selectedIntents));
    }
  };

  const handleSelectAll = () => {
    if (selectedIntents.size === suggestions.length) {
      setSelectedIntents(new Set());
    } else {
      setSelectedIntents(new Set(suggestions.map((s) => s.id)));
    }
  };

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200 shadow-lg p-4 mb-4 animate-in fade-in slide-in-from-bottom duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">AI Suggestions</h3>
            <p className="text-xs text-gray-600">
              {suggestions.length} action{suggestions.length !== 1 ? 's' : ''} detected
            </p>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="p-1 rounded hover:bg-white/50 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Dismiss suggestions"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Suggestions list */}
      <div className="space-y-2 mb-3 max-h-96 overflow-y-auto">
        {suggestions.map((suggestion) => (
          <SuggestionItem
            key={suggestion.id}
            suggestion={suggestion}
            selected={selectedIntents.has(suggestion.id)}
            onToggle={() => toggleSelection(suggestion.id)}
            onCustomize={onCustomize ? () => onCustomize(suggestion) : undefined}
            expanded={expandedIntents.has(suggestion.id)}
            onToggleExpand={() => toggleExpand(suggestion.id)}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-purple-200">
        <button
          onClick={handleAccept}
          disabled={selectedIntents.size === 0 || loading}
          className={`
            flex-1 px-4 py-2 rounded-lg font-medium text-white transition-all
            ${
              selectedIntents.size === 0 || loading
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-md hover:shadow-lg'
            }
          `}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Creating...
            </span>
          ) : (
            <>
              Create {selectedIntents.size > 0 ? selectedIntents.size : ''} selected
            </>
          )}
        </button>

        <button
          onClick={handleSelectAll}
          className="px-4 py-2 rounded-lg font-medium text-purple-700 hover:bg-white/50 transition-colors"
        >
          {selectedIntents.size === suggestions.length ? 'Deselect all' : 'Select all'}
        </button>

        <button
          onClick={onDismiss}
          className="px-4 py-2 rounded-lg font-medium text-gray-600 hover:bg-white/50 transition-colors"
        >
          Not now
        </button>
      </div>
    </div>
  );
};

export default ActionSuggestionCard;
