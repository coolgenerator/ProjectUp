import React from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, X, ExternalLink } from 'lucide-react';

export interface CreatedItem {
  type: 'task' | 'milestone' | 'resource' | 'node' | 'plan';
  id: string | number;
  title: string;
  url?: string;
}

interface ActionSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  createdItems: CreatedItem[];
  projectId: string;
}

const ActionSuccessModal: React.FC<ActionSuccessModalProps> = ({
  isOpen,
  onClose,
  createdItems,
  projectId,
}) => {
  if (!isOpen || createdItems.length === 0) return null;

  const getItemUrl = (item: CreatedItem): string => {
    if (item.url) return item.url;

    const baseUrl = `/project/${projectId}/dashboard`;

    switch (item.type) {
      case 'task':
        return `${baseUrl}?section=tasks`;
      case 'milestone':
        return `${baseUrl}?section=milestones`;
      case 'resource':
        return `${baseUrl}?section=resources`;
      case 'node':
        return `${baseUrl}?section=idea-forest`;
      case 'plan':
        return `${baseUrl}?section=plans`;
      default:
        return baseUrl;
    }
  };

  const getItemIcon = (type: CreatedItem['type']): string => {
    switch (type) {
      case 'task': return '✓';
      case 'milestone': return '🎯';
      case 'resource': return '📚';
      case 'node': return '🌳';
      case 'plan': return '📋';
      default: return '✨';
    }
  };

  const getItemLabel = (type: CreatedItem['type']): string => {
    switch (type) {
      case 'task': return 'Task';
      case 'milestone': return 'Milestone';
      case 'resource': return 'Resource';
      case 'node': return 'Node';
      case 'plan': return 'Plan';
      default: return 'Item';
    }
  };

  // Group items by type
  const groupedItems = createdItems.reduce((acc, item) => {
    if (!acc[item.type]) {
      acc[item.type] = [];
    }
    acc[item.type].push(item);
    return acc;
  }, {} as Record<CreatedItem['type'], CreatedItem[]>);

  const totalCount = createdItems.length;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-white" />
            <div>
              <h2 className="text-2xl font-bold text-white">Success!</h2>
              <p className="text-green-100 text-sm">
                Created {totalCount} {totalCount === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
          <p className="text-slate-600 mb-4">
            Your items have been created successfully. Click on any item below to view it.
          </p>

          {/* Grouped Items */}
          <div className="space-y-4">
            {Object.entries(groupedItems).map(([type, items]) => (
              <div key={type} className="bg-slate-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <span className="text-lg">{getItemIcon(type as CreatedItem['type'])}</span>
                  {getItemLabel(type as CreatedItem['type'])}s ({items.length})
                </h3>
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <a
                      key={idx}
                      href={getItemUrl(item)}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 hover:border-green-500 hover:bg-green-50 transition-all group"
                    >
                      <span className="text-slate-800 font-medium">{item.title}</span>
                      <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-green-600" />
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-sm hover:shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ActionSuccessModal;
