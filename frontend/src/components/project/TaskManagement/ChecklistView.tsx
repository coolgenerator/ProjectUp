import React from 'react';
import { ChecklistItem } from '../../../utils/checklistParser';

interface ChecklistViewProps {
  items: ChecklistItem[];
  onToggle: (itemId: string) => void;
  readOnly?: boolean;
  onConvertToSubtasks?: () => void;
  showConvertButton?: boolean;
}

const ChecklistView: React.FC<ChecklistViewProps> = ({
  items,
  onToggle,
  readOnly = false,
  onConvertToSubtasks,
  showConvertButton = false
}) => {
  if (items.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700">📋 Checklist</span>
          <span className="text-xs text-slate-500">
            {items.filter(item => item.checked).length} / {items.length} completed
          </span>
        </div>

        {showConvertButton && onConvertToSubtasks && (
          <button
            onClick={onConvertToSubtasks}
            className="px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all flex items-center gap-1"
            title="Convert checklist items to subtasks"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Convert to Subtasks
          </button>
        )}
      </div>

      <div className="space-y-2 bg-slate-50 rounded-lg p-3 border border-slate-200">
        {items.map((item) => (
          <label
            key={item.id}
            className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-all hover:bg-white ${
              readOnly ? 'cursor-default' : ''
            }`}
          >
            <input
              type="checkbox"
              checked={item.checked}
              onChange={() => !readOnly && onToggle(item.id)}
              disabled={readOnly}
              className="mt-1 h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-2 focus:ring-blue-500 cursor-pointer"
            />
            <span
              className={`flex-1 text-sm ${
                item.checked
                  ? 'line-through text-slate-400'
                  : 'text-slate-700'
              }`}
            >
              {item.text}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default ChecklistView;
