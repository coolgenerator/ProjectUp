import React from 'react';
import {
  ListTodo,
  BookOpen,
  CheckSquare,
  Milestone,
  FileText,
  Lightbulb,
  Sparkles
} from 'lucide-react';
import { Suggestion } from '../../../../types/chat';

interface SuggestionBubblesProps {
  suggestions: Suggestion[];
  onSuggestionClick: (suggestion: Suggestion) => void;
}

const ACTION_ICONS: Record<string, React.ElementType> = {
  breakdown_task: ListTodo,
  generate_learning_plan: BookOpen,
  extract_tasks: CheckSquare,
  create_milestones: Milestone,
  extract_resources: FileText,
  brainstorm_ideas: Lightbulb,
};

const ACTION_COLORS: Record<string, string> = {
  breakdown_task: 'from-blue-500 to-blue-600',
  generate_learning_plan: 'from-green-500 to-green-600',
  extract_tasks: 'from-emerald-500 to-emerald-600',
  create_milestones: 'from-cyan-500 to-cyan-600',
  extract_resources: 'from-amber-500 to-amber-600',
  brainstorm_ideas: 'from-orange-500 to-orange-600',
};

export const SuggestionBubbles: React.FC<SuggestionBubblesProps> = ({
  suggestions,
  onSuggestionClick,
}) => {
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  const actionSuggestions = suggestions.filter(s => s.type === 'action');
  const questionSuggestions = suggestions.filter(s => s.type === 'question');

  return (
    <div className="mt-3 space-y-2">
      {/* Action Suggestions */}
      {actionSuggestions.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-purple-600 font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Suggested Actions</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {actionSuggestions.map((suggestion) => {
              const Icon = suggestion.actionType
                ? ACTION_ICONS[suggestion.actionType] || Sparkles
                : Sparkles;
              const colorGradient = suggestion.actionType
                ? ACTION_COLORS[suggestion.actionType] || 'from-purple-500 to-purple-600'
                : 'from-purple-500 to-purple-600';

              return (
                <button
                  key={suggestion.id}
                  onClick={() => onSuggestionClick(suggestion)}
                  className={`
                    group relative flex items-center gap-1.5 px-3 py-1.5 rounded-full
                    bg-gradient-to-r ${colorGradient}
                    text-white text-sm font-medium
                    hover:shadow-lg hover:scale-105
                    transition-all duration-200
                    cursor-pointer
                  `}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{suggestion.text}</span>
                  {suggestion.confidence && suggestion.confidence >= 0.8 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Question Suggestions */}
      {questionSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {questionSuggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              onClick={() => onSuggestionClick(suggestion)}
              className="
                px-3 py-1.5 rounded-full
                bg-slate-100 hover:bg-slate-200
                text-slate-700 text-sm
                border border-slate-200
                hover:border-slate-300
                transition-all duration-200
                cursor-pointer
              "
            >
              {suggestion.text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SuggestionBubbles;
