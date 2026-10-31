import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { HiPlus, HiMinus } from 'react-icons/hi2';
import { IoChatbubbleEllipsesOutline } from 'react-icons/io5';
import { MdModeEdit } from 'react-icons/md';
import { FaLeaf } from 'react-icons/fa';
import { IoSparkles } from 'react-icons/io5';
import { IdeaNode } from '../../../types/project/ideaForest';

interface CustomNodeData extends IdeaNode {
  onSelect: () => void;
  onAction: (action: string) => void;
  isSelected: boolean;
  isConnecting?: boolean;
}

const CustomForestNode: React.FC<NodeProps<CustomNodeData>> = ({ data, selected }) => {
  const {
    title,
    summary,
    description,
    is_root,
    icon,
    expanded,
    sub_ideas_count,
    actions_count,
    threads_count,
    ai_generated,
    tags,
    metadata,
    onSelect,
    onAction,
    isSelected,
    isConnecting,
  } = data;

  // Check if AI is currently generating content for this node
  // Don't show loading if summary OR description already exists (even if flag is set)
  // Summary might be in either field depending on how it was saved
  const hasContent = !!(summary || description);
  const isGenerating = metadata?.chat_prompt_pending === true && !hasContent;

  // Debug logging for this specific node
  if (metadata?.chat_prompt_pending) {
    console.log('[CustomForestNode] Loading state:', {
      title,
      hasMetadataFlag: metadata?.chat_prompt_pending,
      hasSummary: !!summary,
      hasDescription: !!description,
      hasContent,
      summaryPreview: summary?.substring(0, 50),
      descriptionPreview: description?.substring(0, 50),
      isGenerating,
      metadata
    });
  }

  // Default node color scheme
  const getNodeColor = () => {
    if (is_root) {
      return {
        bg: 'from-indigo-500 to-purple-600',
        border: 'border-indigo-600',
        text: 'text-indigo-700',
        lightBg: 'bg-indigo-50',
      };
    }
    return {
      bg: 'from-blue-500 to-blue-600',
      border: 'border-blue-600',
      text: 'text-blue-700',
      lightBg: 'bg-blue-50',
    };
  };

  const colors = getNodeColor();

  return (
    <div
      className={`
        relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border
        ${isConnecting ? 'cursor-pointer animate-pulse' : ''}
        ${isGenerating ? 'animate-pulse border-blue-400/50 ring-2 ring-blue-200/50' : ''}
        ${selected || isSelected ? 'border-purple-500/70 ring-4 ring-purple-200/50 shadow-purple-300/50' : 'border-white/30'}
        ${isConnecting && !isSelected ? 'border-pink-400/70 ring-2 ring-pink-200/50' : ''}
        transition-all duration-200 hover:shadow-2xl hover:shadow-blue-200/50
        min-w-[240px] max-w-[280px]
      `}
      onClick={onSelect}
    >
      {/* Connection Handles - Standard React Flow */}
      <Handle
        type="target"
        position={Position.Top}
        className="opacity-0"
        style={{ top: -4 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="opacity-0"
        style={{ bottom: -4 }}
      />
      <Handle
        type="source"
        position={Position.Left}
        className="opacity-0"
        style={{ left: -4 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="opacity-0"
        style={{ right: -4 }}
      />

      {/* Node Header */}
      <div className={`px-2 py-1.5 bg-gradient-to-r ${colors.bg} text-white rounded-t-2xl backdrop-blur-sm`}>
        <div className="flex items-start justify-between gap-1.5">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <h3 className="font-semibold text-xs leading-tight line-clamp-2">
              {title || 'Untitled'}
            </h3>
          </div>
          {is_root && (
            <span className="px-2 py-0.5 bg-white/20 text-xs rounded-full font-medium flex-shrink-0">
              ROOT
            </span>
          )}
        </div>

        {/* AI Generated Badge */}
        {ai_generated && !isGenerating && (
          <div className="mt-1.5 flex items-center gap-1">
            <span className="px-2 py-0.5 bg-white/20 text-xs rounded flex items-center gap-1">
              <span>✨</span>
              <span className="font-medium">AI</span>
            </span>
          </div>
        )}

        {/* AI Generating Badge */}
        {isGenerating && (
          <div className="mt-1.5 flex items-center gap-1">
            <span className="px-2 py-0.5 bg-white/30 text-xs rounded flex items-center gap-1 animate-pulse">
              <IoSparkles className="w-3 h-3 animate-spin" />
              <span className="font-medium">AI Generating...</span>
            </span>
          </div>
        )}
      </div>

      {/* Node Body */}
      <div className="p-2 space-y-1.5">
        {/* Summary Preview or Loading Skeleton */}
        {isGenerating && !hasContent ? (
          <div className="space-y-1.5 animate-pulse">
            <div className="h-3 bg-gray-200 rounded w-full"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        ) : (summary || description) ? (
          <p className="text-xs text-gray-600 line-clamp-3 leading-tight" title={description || summary}>
            {summary || description?.substring(0, 150)}
          </p>
        ) : null}


        {/* Stats Row */}
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          {sub_ideas_count > 0 && (
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-green-50 rounded" title={`${sub_ideas_count} sub-ideas`}>
              <FaLeaf className="text-sm text-green-600" />
              <span className="font-medium text-green-700">{sub_ideas_count}</span>
            </div>
          )}
          {actions_count > 0 && (
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 rounded" title={`${actions_count} actions`}>
              <span className="text-sm">✅</span>
              <span className="font-medium text-blue-700">{actions_count}</span>
            </div>
          )}
          {threads_count > 0 && (
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-50 rounded" title={`${threads_count} threads`}>
              <span className="text-sm">💬</span>
              <span className="font-medium text-purple-700">{threads_count}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-0.5">
            {tags.slice(0, 2).map((tag, index) => (
              <span
                key={index}
                className="px-1.5 py-0.5 bg-gray-100 text-gray-700 text-xs rounded font-medium"
              >
                #{tag}
              </span>
            ))}
            {tags.length > 2 && (
              <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
                +{tags.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-0.5 pt-1 border-t border-gray-200">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAction('add-child');
            }}
            className="flex-1 px-2 py-1.5 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded transition-colors flex items-center justify-center gap-1"
            title="Add Child Node"
          >
            <HiPlus className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAction('edit-properties');
            }}
            className="flex-1 px-2 py-1.5 text-sm font-medium text-purple-600 hover:bg-purple-50 rounded transition-colors flex items-center justify-center gap-1"
            title="Edit Properties"
          >
            <MdModeEdit className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAction('chat');
            }}
            className="flex-1 px-2 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors flex items-center justify-center gap-1"
            title="Open Chat Sidebar"
          >
            <IoChatbubbleEllipsesOutline className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Collapse/Expand Circle Button - positioned fully outside below node */}
      {sub_ideas_count > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAction('toggle-expand');
          }}
          className={`
            absolute top-full left-1/2 -translate-x-1/2 mt-2 z-10
            w-6 h-6 rounded-full shadow-lg
            flex items-center justify-center
            transition-all duration-200
            backdrop-blur-md
            ${expanded
              ? 'bg-blue-500/90 hover:bg-blue-600/90 text-white border border-white/30'
              : 'bg-white/90 dark:bg-slate-800/90 hover:bg-blue-50/90 text-blue-600 border border-blue-500/70'
            }
          `}
          title={expanded ? `Collapse ${sub_ideas_count} children` : `Expand ${sub_ideas_count} children`}
        >
          {expanded ? (
            <HiMinus className="w-3.5 h-3.5" />
          ) : (
            <HiPlus className="w-3.5 h-3.5" />
          )}
        </button>
      )}
    </div>
  );
};

export default memo(CustomForestNode);
