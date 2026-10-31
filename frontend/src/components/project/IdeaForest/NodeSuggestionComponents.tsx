import React from 'react';
import { Sparkles, ChevronRight, Loader2 } from 'lucide-react';
import { NodeSuggestion } from '../../../types/project/nodeSuggestions';

// Re-export for backward compatibility
export type { NodeSuggestion };

interface NodeSuggestionCardProps {
  suggestion: NodeSuggestion;
  onSelect: () => void;
  isSelected: boolean;
}

const templateIcons: Record<string, string> = {
  expand: '🌱',
  breakdown: '📋',
  learning: '📚',
  action: '⚡',
  milestone: '🎯',
  idea: '💡'
};

const priorityColors: Record<number, string> = {
  1: 'border-l-4 border-l-purple-500 bg-purple-50/50',
  2: 'border-l-4 border-l-blue-500 bg-blue-50/50',
  3: 'border-l-4 border-l-gray-500 bg-gray-50/50'
};

export const NodeSuggestionCard: React.FC<NodeSuggestionCardProps> = ({
  suggestion,
  onSelect,
  isSelected
}) => {
  const icon = templateIcons[suggestion.template_type] || '📌';
  const colorClass = priorityColors[suggestion.priority] || priorityColors[2];

  return (
    <button
      onClick={onSelect}
      className={`
        w-full text-left p-4 rounded-lg border-2 transition-all hover:shadow-md
        ${isSelected
          ? 'border-purple-500 bg-purple-100 shadow-lg scale-[1.02]'
          : 'border-gray-200 hover:border-purple-300 bg-white'}
        ${colorClass}
      `}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl flex-shrink-0 mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="font-semibold text-gray-900 leading-tight">{suggestion.title}</h4>
            {suggestion.priority === 1 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-600 text-white flex-shrink-0">
                Recommended
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-2 leading-relaxed">{suggestion.description}</p>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Sparkles className="w-3 h-3" />
            <span className="italic">{suggestion.rationale}</span>
          </div>
        </div>
        <ChevronRight
          className={`
            w-5 h-5 flex-shrink-0 transition-transform mt-1
            ${isSelected ? 'text-purple-600 transform translate-x-1' : 'text-gray-400'}
          `}
        />
      </div>
    </button>
  );
};

interface NodeSuggestionListProps {
  suggestions: NodeSuggestion[];
  onSelectSuggestion: (suggestion: NodeSuggestion, index: number) => void;
  selectedIndex: number | null;
  loading?: boolean;
  isTemplateMode?: boolean; // NEW: Distinguish between templates and AI suggestions
}

export const NodeSuggestionList: React.FC<NodeSuggestionListProps> = ({
  suggestions,
  onSelectSuggestion,
  selectedIndex,
  loading = false,
  isTemplateMode = false
}) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-4" />
        <p className="text-gray-600 font-medium">
          {isTemplateMode ? 'Loading templates...' : 'AI is analyzing context...'}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          {isTemplateMode ? 'Fetching template library' : 'Generating smart suggestions'}
        </p>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">{isTemplateMode ? '📚' : '💭'}</div>
        <p className="text-gray-600 font-medium">
          {isTemplateMode ? 'No templates available' : 'No AI suggestions available'}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          {isTemplateMode
            ? 'Template library is empty. Switch to AI mode for smart suggestions.'
            : 'You can create a node manually below'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
        <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <h3 className="font-semibold text-gray-900">AI Suggestions</h3>
        <span className="text-sm text-gray-500 ml-auto">
          {suggestions.length} {suggestions.length === 1 ? 'idea' : 'ideas'}
        </span>
      </div>

      {/* Suggestion Cards */}
      <div className="space-y-2">
        {suggestions.map((suggestion, index) => (
          <NodeSuggestionCard
            key={suggestion.id}
            suggestion={suggestion}
            onSelect={() => onSelectSuggestion(suggestion, index)}
            isSelected={selectedIndex === index}
          />
        ))}
      </div>

      {/* Helper Text */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          💡 <strong>Tip:</strong> Click a suggestion to use it, or customize the title and description below.
        </p>
      </div>
    </div>
  );
};

export default NodeSuggestionList;
