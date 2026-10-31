import React from 'react';
import { X, MessageCircle, Plus, ListTodo, Link as LinkIcon, FileSearch } from 'lucide-react';
import { Suggestion, SuggestionType } from '../../../../types/project/chatSuggestions';

interface SuggestionBubblesAboveInputProps {
  suggestedQuestions: Suggestion[];
  suggestedActions: Suggestion[];
  onSelectSuggestion: (suggestion: Suggestion) => void;
  onDismissSuggestion: (suggestionId: string) => void;
}

/**
 * Component to display suggested questions and actions as dismissible bubbles above the chat input
 */
const SuggestionBubblesAboveInput: React.FC<SuggestionBubblesAboveInputProps> = ({
  suggestedQuestions,
  suggestedActions,
  onSelectSuggestion,
  onDismissSuggestion,
}) => {
  const getIcon = (type: SuggestionType) => {
    switch (type) {
      case 'question':
        return <MessageCircle className="w-3.5 h-3.5" />;
      case 'create_child_node':
      case 'create_node':
        return <Plus className="w-3.5 h-3.5" />;
      case 'add_resource':
        return <LinkIcon className="w-3.5 h-3.5" />;
      case 'extract_tasks':
        return <FileSearch className="w-3.5 h-3.5" />;
      default:
        return <MessageCircle className="w-3.5 h-3.5" />;
    }
  };

  const getColorClasses = (type: SuggestionType) => {
    switch (type) {
      case 'question':
        return 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 hover:border-blue-300';
      case 'create_child_node':
      case 'create_node':
        return 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200 hover:border-green-300';
      case 'add_resource':
        return 'bg-teal-50 hover:bg-teal-100 text-teal-700 border-teal-200 hover:border-teal-300';
      case 'extract_tasks':
        return 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 hover:border-indigo-300';
      default:
        return 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300';
    }
  };

  if (suggestedQuestions.length === 0 && suggestedActions.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/30 px-4 py-3 space-y-3">
      {/* Suggested Questions */}
      {suggestedQuestions.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5 text-blue-600" />
            <span>Suggested Questions:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((suggestion) => (
              <button
                key={suggestion.id}
                onClick={() => onSelectSuggestion(suggestion)}
                className={`group relative inline-flex items-center gap-1.5 pl-2.5 pr-8 py-1.5 rounded-full border transition-all text-xs font-medium ${getColorClasses(suggestion.type)} shadow-sm hover:shadow-md`}
                title={suggestion.description}
              >
                {getIcon(suggestion.type)}
                <span className="max-w-[200px] truncate">{suggestion.text}</span>

                {/* Dismiss button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDismissSuggestion(suggestion.id);
                  }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-blue-200 transition-colors opacity-60 hover:opacity-100"
                  aria-label="Dismiss suggestion"
                >
                  <X className="w-3 h-3" />
                </button>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Actions */}
      {suggestedActions.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-green-600" />
            <span>Suggested Actions:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedActions.map((suggestion) => (
              <button
                key={suggestion.id}
                onClick={() => onSelectSuggestion(suggestion)}
                className={`group relative inline-flex items-center gap-1.5 pl-2.5 pr-8 py-1.5 rounded-full border transition-all text-xs font-medium ${getColorClasses(suggestion.type)} shadow-sm hover:shadow-md`}
                title={suggestion.description}
              >
                {getIcon(suggestion.type)}
                <span className="max-w-[200px] truncate">{suggestion.text}</span>

                {/* Dismiss button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDismissSuggestion(suggestion.id);
                  }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-green-200 transition-colors opacity-60 hover:opacity-100"
                  aria-label="Dismiss suggestion"
                >
                  <X className="w-3 h-3" />
                </button>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SuggestionBubblesAboveInput;
