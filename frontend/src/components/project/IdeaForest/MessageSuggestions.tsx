import React, { useState, useEffect } from 'react';
import { Lightbulb, Plus, ListTodo, MessageCircle, Sparkles, Link as LinkIcon, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import { SuggestionType, Suggestion } from '../../../types/project/chatSuggestions';

// Re-export for backward compatibility
export type { SuggestionType, Suggestion };

interface MessageSuggestionsProps {
  suggestions: Suggestion[];
  onSelectSuggestion: (suggestion: Suggestion) => void;
  loading?: boolean;
  messageId?: string; // Unique identifier for this message's suggestions
}

const MessageSuggestions: React.FC<MessageSuggestionsProps> = ({
  suggestions,
  onSelectSuggestion,
  loading = false,
  messageId = 'default',
}) => {
  // Load collapsed state from localStorage
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem(`suggestions-collapsed-${messageId}`);
    return saved ? JSON.parse(saved) : false; // Default to expanded
  });

  // Persist collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem(`suggestions-collapsed-${messageId}`, JSON.stringify(isCollapsed));
  }, [isCollapsed, messageId]);

  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
  };
  const getIcon = (type: SuggestionType) => {
    switch (type) {
      case 'question':
        return <MessageCircle className="w-4 h-4" />;
      case 'create_node':
      case 'create_child_node':
        return <Plus className="w-4 h-4" />;
      case 'add_resource':
        return <LinkIcon className="w-4 h-4" />;
      case 'connect_nodes':
        return <Sparkles className="w-4 h-4" />;
      case 'extract_tasks':
        return <ListTodo className="w-4 h-4" />;
      default:
        return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getLabel = (type: SuggestionType) => {
    switch (type) {
      case 'question':
        return 'Ask';
      case 'create_node':
      case 'create_child_node':
        return 'Create Node';
      case 'add_resource':
        return 'Add Resource';
      case 'connect_nodes':
        return 'Connect';
      case 'extract_tasks':
        return 'Extract Tasks';
      default:
        return 'Action';
    }
  };

  const getColorClasses = (type: SuggestionType) => {
    switch (type) {
      case 'question':
        return 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200';
      case 'create_node':
      case 'create_child_node':
        return 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200';
      case 'add_resource':
        return 'bg-teal-50 hover:bg-teal-100 text-teal-700 border-teal-200';
      case 'connect_nodes':
        return 'bg-pink-50 hover:bg-pink-100 text-pink-700 border-pink-200';
      case 'extract_tasks':
        return 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <div className="animate-spin rounded-full h-3 w-3 border-2 border-slate-400 border-t-transparent"></div>
        <span>Generating suggestions...</span>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 space-y-2">
      {/* Collapsible Header */}
      <button
        onClick={toggleCollapsed}
        className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-800 font-medium transition-colors w-full group"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
        <span>Suggested next steps</span>
        <span className="text-slate-400 font-normal">({suggestions.length})</span>
        <div className="ml-auto">
          {isCollapsed ? (
            <ChevronDown className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
          ) : (
            <ChevronUp className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
          )}
        </div>
      </button>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <div className="flex flex-wrap gap-2 animate-in slide-in-from-top-2 duration-200">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              onClick={() => onSelectSuggestion(suggestion)}
              className={`group relative px-3 py-2 rounded-lg border transition-all text-left ${
                suggestion.executed
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-500 border-gray-300 opacity-75'
                  : getColorClasses(suggestion.type)
              } hover:shadow-md`}
              title={suggestion.executed ? `Already executed${suggestion.executionResult ? ` - Created ${suggestion.executionResult.createdItems?.length || 0} item(s)` : ''}` : suggestion.description}
            >
              <div className="flex items-center gap-2">
                <div className="flex-shrink-0">
                  {suggestion.executed ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    getIcon(suggestion.type)
                  )}
                </div>
                <div className="flex-1">
                  <div className={`text-xs font-medium ${suggestion.executed ? 'line-through' : ''}`}>
                    {suggestion.text}
                  </div>
                  {suggestion.executed && suggestion.executionResult?.createdItems && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      ✓ Created {suggestion.executionResult.createdItems.length} item(s)
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <span className="text-xs opacity-60 font-semibold">
                    {suggestion.executed ? 'Done' : getLabel(suggestion.type)}
                  </span>
                </div>
              </div>

              {/* Tooltip on hover */}
              {suggestion.description && (
                <div className="absolute bottom-full left-0 mb-2 w-64 p-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                  {suggestion.description}
                  <div className="absolute top-full left-4 -mt-1 w-2 h-2 bg-slate-800 transform rotate-45"></div>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessageSuggestions;
