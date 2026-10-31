import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import NodeChatPanel from './NodeChatPanel';
import TaskReviewModal from './TaskReviewModal';
import MilestoneReviewModal from './MilestoneReviewModal';
import ResourceExtractionModal from './ResourceExtractionModal';
import { NodeMarkdown } from '../../common/NodeMarkdown';
import config from '../../../config';
import fetchWithAuth from '../../../hooks/fetchWithAuth';
import { FileText, MessageSquare, History, Maximize2, X, Edit2, Trash2, CheckCircle, Sparkles, Target, BarChart3, Tag, Calendar, AlertCircle, CheckSquare, Milestone as MilestoneIcon, Link, MoreVertical } from 'lucide-react';
import { FaLightbulb, FaBolt, FaBook, FaBullseye } from 'react-icons/fa';
import { IdeaNode } from '../../../types/project/ideaForest';
import ConfirmDialog from '../../common/ConfirmDialog';
import { VersionTimeline } from '../../versions/VersionTimeline';
import ConversationBranchTree from './NodeChatPanel/ConversationBranchTree';

const { AI_AGENT_URL, API_BASE_URL } = config;

interface IdeaForestSidebarProps {
  node: IdeaNode | null;
  open: boolean;
  onClose: () => void;
  projectId: string;
  userId?: number;
  onNodeUpdate?: (metadata?: { title?: string; summary?: string; description?: string; tree_updated?: boolean }) => void;
  onNodeDelete?: (nodeId: string) => void;
  allNodes?: IdeaNode[];  // All nodes for @ mentions in chat
  activeTab?: 'details' | 'chat' | 'versions';  // Controlled tab state from parent
  onTabChange?: (tab: 'details' | 'chat' | 'versions') => void;  // Tab change callback
  initialChatPrompt?: string;  // Initial prompt to send automatically when chat opens
  onChatPromptSent?: () => void;  // Callback when initial prompt is sent
  searchParams?: URLSearchParams;  // For reading/updating URL params (like chatSessionId)
  setSearchParams?: (params: URLSearchParams, options?: { replace?: boolean }) => void;  // For updating URL
}

// Unified mentionable material interface (must match NodeChatPanel)
interface MentionableMaterial {
  id: string;
  title: string;
  description?: string;
  type: 'node' | 'paper' | 'resource';
  subType?: string;
  metadata?: any;
}

const IdeaForestSidebar: React.FC<IdeaForestSidebarProps> = ({
  node,
  open,
  onClose,
  projectId,
  userId = 1,
  onNodeUpdate,
  onNodeDelete,
  allNodes = [],
  activeTab: controlledActiveTab = 'details',
  onTabChange,
  initialChatPrompt = '',
  onChatPromptSent,
  searchParams,
  setSearchParams
}) => {
  // console.log('[IdeaTreeSidebar] Rendering with initialChatPrompt:', initialChatPrompt ? initialChatPrompt.substring(0, 50) : '(empty)');

  // Use controlled tab if provided, otherwise manage internally
  const [internalActiveTab, setInternalActiveTab] = useState<'details' | 'chat' | 'versions'>('details');
  const activeTab = controlledActiveTab;

  const handleTabChange = (tab: 'details' | 'chat' | 'versions') => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalActiveTab(tab);
    }
  };
  const [isEditing, setIsEditing] = useState(false);
  const [editedNode, setEditedNode] = useState(node);

  // Local node state to handle immediate updates from auto-update metadata
  const [localNodeData, setLocalNodeData] = useState<{
    title?: string;
    description?: string;
    summary?: string;
  }>({});
  const [isChatFullscreen, setIsChatFullscreen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(420);
  const [isResizing, setIsResizing] = useState(false);
  const [mentionableMaterials, setMentionableMaterials] = useState<MentionableMaterial[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  // Modal states for action buttons
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);

  // Version switch notification
  const [versionSwitchNotification, setVersionSwitchNotification] = useState<string | null>(null);

  // AI extraction states
  const [extractingTasks, setExtractingTasks] = useState(false);
  const [extractingMilestones, setExtractingMilestones] = useState(false);
  const [extractingResources, setExtractingResources] = useState(false);

  // AI-extracted data
  const [extractedTasks, setExtractedTasks] = useState<any[]>([]);
  const [extractedMilestones, setExtractedMilestones] = useState<any[]>([]);
  const [extractedResources, setExtractedResources] = useState<any[]>([]);

  // Delete confirmation and options menu
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  useEffect(() => {
    setEditedNode(node);
    // Reset local node data when node prop changes
    setLocalNodeData({});
  }, [node]);

  // Fetch mentionable materials (nodes, papers, resources)
  useEffect(() => {
    const fetchMaterials = async () => {
      if (!projectId || !open) return;

      setLoadingMaterials(true);
      try {
        const materials: MentionableMaterial[] = [];

        // 1. Fetch ALL nodes from ALL trees in the project (not just current tree)
        try {
          const nodesResponse = await fetch(`${AI_AGENT_URL}/ai-api/projects/${projectId}/idea-tree`);
          if (nodesResponse.ok) {
            const nodesData = await nodesResponse.json();
            const allProjectNodes = nodesData.nodes || [];

            // Group nodes by tree session to show context
            const nodesBySession = new Map<string, any[]>();
            allProjectNodes.forEach((node: any) => {
              if (!nodesBySession.has(node.session_id)) {
                nodesBySession.set(node.session_id, []);
              }
              nodesBySession.get(node.session_id)!.push(node);
            });

            // Fetch tree session names for context
            const sessionsResponse = await fetch(`${AI_AGENT_URL}/ai-api/projects/${projectId}/tree-sessions/summary`);
            const sessionNames = new Map<string, string>();
            if (sessionsResponse.ok) {
              const sessionsData = await sessionsResponse.json();
              const sessions = sessionsData.sessions || [];
              sessions.forEach((session: any) => {
                sessionNames.set(session.id, session.name);
              });
            }

            // Add all nodes with tree context
            allProjectNodes.forEach((node: any) => {
              const treeName = sessionNames.get(node.session_id) || 'Unknown Tree';
              materials.push({
                id: node.id,
                title: node.title,
                description: node.description,
                type: 'node',
                metadata: {
                  ...node,
                  treeName: treeName, // Add tree name for context
                  sessionId: node.session_id,
                },
              });
            });
          }
        } catch (error) {
          // console.error('Error fetching all nodes:', error);
          // Fallback: use allNodes prop if API fails
          allNodes.forEach(node => {
            materials.push({
              id: node.id,
              title: node.title,
              description: node.description,
              type: 'node',
              metadata: node,
            });
          });
        }

        // 2. Fetch research papers
        try {
          const papersResponse = await fetchWithAuth(`${API_BASE_URL}/api/papers?project_id=${projectId}`);
          if (papersResponse.ok) {
            const papersData = await papersResponse.json();
            const papers = papersData.data || [];
            papers.forEach((paper: any) => {
              materials.push({
                id: paper.id.toString(),
                title: paper.title,
                description: paper.abstract,
                type: 'paper',
                metadata: {
                  authors: paper.authors,
                  year: paper.year,
                  venue: paper.venue,
                  doi: paper.doi,
                  arxiv_id: paper.arxiv_id,
                },
              });
            });
          }
        } catch (error) {
          // console.error('Error fetching papers:', error);
        }

        // 3. Fetch resources (links and files)
        try {
          const resourcesResponse = await fetchWithAuth(`${API_BASE_URL}/api/resources?project_id=${projectId}`);
          if (resourcesResponse.ok) {
            const resourcesData = await resourcesResponse.json();
            const resources = resourcesData.data || [];
            resources.forEach((resource: any) => {
              materials.push({
                id: resource.id.toString(),
                title: resource.title,
                description: resource.description,
                type: 'resource',
                subType: resource.type, // 'link' or 'file'
                metadata: {
                  url: resource.url,
                  file_name: resource.file_name,
                  tags: resource.tags,
                },
              });
            });
          }
        } catch (error) {
          // console.error('Error fetching resources:', error);
        }

        setMentionableMaterials(materials);
      } catch (error) {
        // console.error('Error fetching mentionable materials:', error);
      } finally {
        setLoadingMaterials(false);
      }
    };

    fetchMaterials();
  }, [projectId, allNodes, open]);

  // Resize handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = window.innerWidth - e.clientX;
      // Constrain width between 320px and 800px
      const constrainedWidth = Math.min(Math.max(newWidth, 320), 800);
      setSidebarWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const handleSave = async () => {
    if (!editedNode || !node) return;

    try {
      const response = await fetch(`${AI_AGENT_URL}/ai-api/idea-tree/nodes/${node.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editedNode.title,
          summary: editedNode.summary || '',
          description: editedNode.description,
          tags: editedNode.tags || [],
          metadata: editedNode.metadata
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save node');
      }

      // console.log('Node saved successfully:', editedNode);
      setIsEditing(false);

      if (onNodeUpdate) {
        onNodeUpdate({
          title: editedNode.title,
          summary: editedNode.summary,
          description: editedNode.description
        });
      }
    } catch (error) {
      // console.error('Error saving node:', error);
      alert('Failed to save changes. Please try again.');
    }
  };

  const handleDelete = () => {
    if (node && onNodeDelete) {
      onNodeDelete(node.id);
      onClose();
    }
    setShowDeleteConfirm(false);
    setShowOptionsMenu(false);
  };

  const handleUpdateNodeContent = async (newContent: string) => {
    if (!node) return;

    try {
      const response = await fetch(`${AI_AGENT_URL}/ai-api/idea-tree/nodes/${node.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: newContent
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update node content');
      }

      // Refresh the node data
      if (onNodeUpdate) {
        onNodeUpdate();
      }
    } catch (error) {
      // console.error('Error updating node content:', error);
      throw error; // Re-throw to let NodeChatPanel handle the error
    }
  };

  // Handle metadata updates from auto-update
  const handleMetadataUpdate = (metadata?: { title?: string; summary?: string; description?: string; tree_updated?: boolean }) => {
    // console.log('[IdeaForestSidebar] Received metadata update:', metadata);

    if (metadata) {
      // Update local state immediately for instant UI feedback
      setLocalNodeData({
        title: metadata.title,
        description: metadata.description,
        summary: metadata.summary
      });

      // Log if tree was also updated
      if (metadata.tree_updated) {
        // console.log('[IdeaForestSidebar] ✅ Tree title/description also auto-updated from first node');
      }
    }

    // Also notify parent for full refresh
    if (onNodeUpdate) {
      onNodeUpdate(metadata);
    }
  };

  // Get current node data (merge props with local updates)
  const currentNodeTitle = localNodeData.title || node?.title || '';
  const currentNodeDescription = localNodeData.description || node?.description || '';
  const currentNodeSummary = localNodeData.summary || node?.summary || '';

  // AI extraction handlers
  const handleExtractTasks = async () => {
    if (!node) return;

    setExtractingTasks(true);
    try {
      const response = await fetch(`${AI_AGENT_URL}/ai-api/intents/extract-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node_id: node.id,
          node_content: {
            title: node.title,
            description: node.description,
            conclusion: node.metadata?.conclusion,
          },
          chat_session_id: node.metadata?.chat_session_id // Include chat session for context
        })
      });

      if (response.ok) {
        const data = await response.json();
        // console.log('[IdeaTreeSidebar] Task extraction response:', data);
        // console.log('[IdeaTreeSidebar] Extracted tasks count:', data.tasks?.length || 0);
        if (data.tasks && data.tasks.length > 0) {
          // console.log('[IdeaTreeSidebar] First task sample:', data.tasks[0]);
        }
        setExtractedTasks(data.tasks || []);
      } else {
        // console.error('[IdeaTreeSidebar] Task extraction failed:', response.status, response.statusText);
        const errorData = await response.json().catch(() => ({}));
        // console.error('[IdeaTreeSidebar] Error details:', errorData);
        setExtractedTasks([]);
      }
    } catch (error) {
      // console.error('[IdeaTreeSidebar] Error extracting tasks:', error);
      setExtractedTasks([]);
    } finally {
      setExtractingTasks(false);
      setShowTaskModal(true);
    }
  };

  const handleExtractMilestones = async () => {
    if (!node) return;

    setExtractingMilestones(true);
    try {
      const response = await fetch(`${AI_AGENT_URL}/ai-api/intents/extract-milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node_id: node.id,
          node_content: {
            title: node.title,
            description: node.description,
            conclusion: node.metadata?.conclusion,
          },
          chat_session_id: node.metadata?.chat_session_id // Include chat session for context
        })
      });

      if (response.ok) {
        const data = await response.json();
        setExtractedMilestones(data.milestones || []);
      } else {
        setExtractedMilestones([]);
      }
    } catch (error) {
      // console.error('Error extracting milestones:', error);
      setExtractedMilestones([]);
    } finally {
      setExtractingMilestones(false);
      setShowMilestoneModal(true);
    }
  };

  const handleExtractResources = async () => {
    if (!node) return;

    setExtractingResources(true);
    try {
      const response = await fetch(`${AI_AGENT_URL}/ai-api/intents/extract-resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node_id: node.id,
          node_content: {
            title: node.title,
            description: node.description,
            conclusion: node.metadata?.conclusion,
          },
          chat_session_id: node.metadata?.chat_session_id // Include chat session for context
        })
      });

      if (response.ok) {
        const data = await response.json();
        setExtractedResources(data.resources || []);
      } else {
        setExtractedResources([]);
      }
    } catch (error) {
      // console.error('Error extracting resources:', error);
      setExtractedResources([]);
    } finally {
      setExtractingResources(false);
      setShowResourceModal(true);
    }
  };

  if (!node) return null;

  // When chat is in fullscreen mode, render it over the entire canvas
  if (isChatFullscreen && activeTab === 'chat') {
    return (
      <div className="absolute inset-0 z-[70] bg-white">
        <NodeChatPanel
          nodeId={node.id}
          nodeTitle={currentNodeTitle}
          nodeDescription={currentNodeDescription}
          projectId={projectId}
          userId={userId}
          isRootNode={node.is_root}
          treeSessionId={node.session_id}
          nodeMetadata={{
            ...node.metadata,
            summary: currentNodeSummary
          }}
          isFullscreen={true}
          onToggleFullscreen={() => setIsChatFullscreen(false)}
          onConclusionUpdate={(conclusion) => {
            // console.log('Conclusion updated:', conclusion);
            if (onNodeUpdate) {
              onNodeUpdate();
            }
          }}
          onUpdateNodeContent={handleUpdateNodeContent}
          onNodeUpdate={handleMetadataUpdate}
          allNodes={allNodes}
          mentionableMaterials={mentionableMaterials}
          initialChatPrompt={initialChatPrompt}
          onChatPromptSent={onChatPromptSent}
          searchParams={searchParams}
          setSearchParams={setSearchParams}
        />
      </div>
    );
  }

  return (
    <div
      className={`absolute right-0 top-0 bottom-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border-l border-white/20 transform ${isResizing ? '' : 'transition-transform duration-300'} z-[100] shadow-2xl flex flex-col ${open ? 'translate-x-0' : 'translate-x-full'
        }`}
      style={{ width: `${sidebarWidth}px` }}
    >
      {/* Resize Handle */}
      <div
        onMouseDown={(e) => {
          e.preventDefault();
          setIsResizing(true);
        }}
        className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:w-1.5 bg-transparent hover:bg-teal-400 dark:hover:bg-teal-500 transition-all z-50 group"
      >
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-12 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-1 h-8 bg-teal-500 dark:bg-teal-400 rounded-full" />
        </div>
      </div>
      {/* Header */}
      <div className="flex-shrink-0 p-5 border-b border-white/20 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            {currentNodeTitle}
          </h2>
          <div className="flex items-center gap-2">
            {/* Fullscreen button - show for all tabs */}
            <button
              onClick={() => setIsChatFullscreen(true)}
              className="px-3 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white rounded-xl transition-all flex items-center gap-2 text-xs font-bold shadow-lg hover:shadow-xl hover:scale-105"
              title="Open in fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Fullscreen</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-white hover:bg-red-500 dark:hover:bg-red-600 transition-all duration-200 rounded-lg font-bold shadow-sm hover:shadow-md"
              title="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto">
          {(['details', 'chat', 'versions'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`px-4 py-2 text-xs uppercase font-bold rounded-xl transition-all duration-200 whitespace-nowrap shadow-sm hover:shadow-md flex items-center gap-2 ${activeTab === tab
                  ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-lg'
                  : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-slate-600'
                }`}
            >
              {tab === 'chat' ? (
                <>
                  <MessageSquare className="w-4 h-4" />
                  <span>Chat</span>
                </>
              ) : tab === 'versions' ? (
                <>
                  <History className="w-4 h-4" />
                  <span>Versions</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>{tab}</span>
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className={`flex-1 flex flex-col min-h-0 ${activeTab === 'chat' ? '' : 'overflow-y-auto p-5'}`}>
        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="space-y-5">
            {isEditing ? (
              <>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-md border-2 border-teal-300 dark:border-teal-700">
                  <label className="block text-xs text-slate-600 dark:text-slate-400 uppercase mb-2 font-black tracking-wide flex items-center gap-2">
                    <Edit2 className="w-4 h-4" />
                    Title
                  </label>
                  <input
                    type="text"
                    value={editedNode?.title || ''}
                    onChange={(e) => setEditedNode({ ...editedNode!, title: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:border-teal-500 dark:focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-400/20 shadow-sm hover:border-teal-400 dark:hover:border-teal-500 transition-all duration-200 font-medium"
                  />
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-md border-2 border-teal-300 dark:border-teal-700">
                  <label className="block text-xs text-slate-600 dark:text-slate-400 uppercase mb-2 font-black tracking-wide flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Summary
                  </label>
                  <textarea
                    value={editedNode?.summary || ''}
                    onChange={(e) => setEditedNode({
                      ...editedNode!,
                      summary: e.target.value
                    })}
                    rows={3}
                    placeholder="A brief one-sentence summary of this node..."
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:border-teal-500 dark:focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-400/20 resize-none shadow-sm hover:border-teal-400 dark:hover:border-teal-500 transition-all duration-200"
                  />
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-md border-2 border-teal-300 dark:border-teal-700">
                  <label className="block text-xs text-slate-600 dark:text-slate-400 uppercase mb-2 font-black tracking-wide flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Description
                  </label>
                  <textarea
                    value={editedNode?.description || ''}
                    onChange={(e) => setEditedNode({ ...editedNode!, description: e.target.value })}
                    rows={5}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:border-teal-500 dark:focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-400/20 resize-none shadow-sm hover:border-teal-400 dark:hover:border-teal-500 transition-all duration-200"
                  />
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-md border-2 border-teal-300 dark:border-teal-700">
                  <label className="block text-xs text-slate-600 dark:text-slate-400 uppercase mb-2 font-black tracking-wide flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Tags
                  </label>
                  <div className="space-y-2">
                    {/* Display existing tags */}
                    {editedNode?.tags && editedNode.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {editedNode.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-3 py-1.5 bg-gradient-to-r from-teal-100 to-emerald-100 dark:from-teal-900/40 dark:to-emerald-900/40 text-teal-700 dark:text-teal-300 rounded-lg text-xs font-bold shadow-sm border border-teal-300 dark:border-teal-600 flex items-center gap-1.5"
                          >
                            {tag}
                            <button
                              onClick={() => {
                                const newTags = editedNode.tags?.filter((_, i) => i !== index) || [];
                                setEditedNode({ ...editedNode!, tags: newTags });
                              }}
                              className="hover:bg-red-200 dark:hover:bg-red-800 rounded-full p-0.5 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Input for new tags */}
                    <input
                      type="text"
                      placeholder="Add tags (press Enter or comma to add)"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:border-teal-500 dark:focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-400/20 shadow-sm hover:border-teal-400 dark:hover:border-teal-500 transition-all duration-200"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          const input = e.currentTarget;
                          const newTag = input.value.trim().replace(/,/g, '');
                          if (newTag && !editedNode?.tags?.includes(newTag)) {
                            const updatedTags = [...(editedNode?.tags || []), newTag];
                            setEditedNode({ ...editedNode!, tags: updatedTags });
                            input.value = '';
                          }
                        }
                      }}
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                      Press Enter or comma to add a tag
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSave}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-xl hover:from-teal-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 font-bold flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Save Changes
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditedNode(node);
                    }}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-slate-400 to-slate-500 text-white rounded-xl hover:from-slate-500 hover:to-slate-600 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 font-bold flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Summary - One sentence condensed version */}
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg rounded-2xl p-4 shadow-lg border border-white/30">
                  <h3 className="text-xs text-slate-600 dark:text-slate-400 uppercase mb-3 font-black tracking-wide flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Summary
                  </h3>
                  {currentNodeSummary ? (
                    <NodeMarkdown
                      content={currentNodeSummary}
                      className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed"
                    />
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic leading-relaxed">
                      No summary available. Chat with AI to generate a condensed summary.
                    </p>
                  )}
                </div>

                {/* Details - Full description */}
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg rounded-2xl p-4 shadow-lg border border-emerald-300/50 dark:border-emerald-700/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-6 h-6 text-emerald-600" />
                    <h3 className="text-xs text-emerald-700 dark:text-emerald-300 uppercase font-black tracking-wide">Details</h3>
                  </div>
                  <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed prose prose-sm max-w-none dark:prose-invert">
                    {currentNodeDescription ? (
                      <NodeMarkdown
                        content={currentNodeDescription}
                        className="text-sm"
                      />
                    ) : (
                      <p className="text-emerald-700 dark:text-emerald-300 italic font-medium">
                        No refined details yet. Use the chat to discuss and refine this node's content.
                      </p>
                    )}
                  </div>
                  {currentNodeDescription && node.metadata?.last_ai_update && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium border-t border-emerald-200 dark:border-emerald-800 pt-3">
                      <MessageSquare className="w-4 h-4" />
                      <span>Refined from AI chat session</span>
                      <span>•</span>
                      <span>See "Versions" for history</span>
                    </div>
                  )}
                </div>

                {node.tags && node.tags.length > 0 && (
                  <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg rounded-2xl p-4 shadow-lg border border-white/30">
                    <h3 className="text-xs text-slate-600 dark:text-slate-400 uppercase mb-3 font-black tracking-wide flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      Tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {node.tags.map(tag => (
                        <span key={tag} className="px-3 py-1.5 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold shadow-sm hover:shadow-md hover:from-teal-100 hover:to-emerald-100 dark:hover:from-teal-900/40 dark:hover:to-emerald-900/40 hover:text-teal-700 dark:hover:text-teal-300 transition-all duration-200 border border-slate-300 dark:border-slate-600">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions Section */}
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg rounded-2xl p-4 shadow-lg border border-purple-300/50 dark:border-purple-700/50">
                  <h3 className="text-xs text-purple-700 dark:text-purple-300 uppercase mb-3 font-black tracking-wide flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Quick Actions
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleExtractTasks}
                      disabled={extractingTasks}
                      className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 border-2 border-emerald-300 dark:border-emerald-700 rounded-lg transition-all shadow-sm hover:shadow-md group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {extractingTasks ? (
                        <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                      )}
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {extractingTasks ? 'Analyzing...' : 'Create Tasks'}
                      </span>
                    </button>


                    <button
                      onClick={handleExtractMilestones}
                      disabled={extractingMilestones}
                      className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 border-2 border-cyan-300 dark:border-cyan-700 rounded-lg transition-all shadow-sm hover:shadow-md group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {extractingMilestones ? (
                        <div className="w-4 h-4 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <MilestoneIcon className="w-4 h-4 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform" />
                      )}
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {extractingMilestones ? 'Analyzing...' : 'Create Milestones'}
                      </span>
                    </button>

                    <button
                      onClick={handleExtractResources}
                      disabled={extractingResources}
                      className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-900/30 border-2 border-amber-300 dark:border-amber-700 rounded-lg transition-all shadow-sm hover:shadow-md group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {extractingResources ? (
                        <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Link className="w-4 h-4 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
                      )}
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {extractingResources ? 'Analyzing...' : 'Extract Resources'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-xl transition-all duration-200 font-bold shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                      className="px-4 py-3 bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 text-white rounded-xl transition-all duration-200 font-bold shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center gap-2"
                      title="More options"
                    >
                      <MoreVertical className="w-4 h-4" />
                      Options
                    </button>

                    {/* Dropdown Menu */}
                    {showOptionsMenu && (
                      <>
                        {/* Backdrop to close menu */}
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowOptionsMenu(false)}
                        />
                        <div className="absolute right-0 bottom-full mb-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden z-20">
                          <button
                            onClick={() => {
                              setShowOptionsMenu(false);
                              setShowDeleteConfirm(true);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center gap-3 text-red-600 dark:text-red-400 font-medium"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete Node</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && node && (
          <NodeChatPanel
            nodeId={node.id}
            nodeTitle={currentNodeTitle}
            nodeDescription={currentNodeDescription}
            projectId={projectId}
            userId={userId}
            isRootNode={node.is_root}
            treeSessionId={node.session_id}
            nodeMetadata={{
              ...node.metadata,
              summary: currentNodeSummary
            }}
            isFullscreen={false}
            onToggleFullscreen={() => setIsChatFullscreen(true)}
            onConclusionUpdate={(conclusion) => {
              // Update node metadata with conclusion
              // console.log('Conclusion updated:', conclusion);
              if (onNodeUpdate) {
                onNodeUpdate();
              }
            }}
            onUpdateNodeContent={handleUpdateNodeContent}
            onNodeUpdate={handleMetadataUpdate}
            allNodes={allNodes}
            mentionableMaterials={mentionableMaterials}
            initialChatPrompt={initialChatPrompt}
            onChatPromptSent={onChatPromptSent}
            searchParams={searchParams}
            setSearchParams={setSearchParams}
          />
        )}

        {/* Versions Tab */}
        {activeTab === 'versions' && (
          <div className="space-y-4">
            <div className="p-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border border-cyan-300/50 dark:border-cyan-700/50 rounded-2xl shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <History className="w-6 h-6 text-cyan-600" />
                <div className="text-xs font-black text-cyan-700 dark:text-cyan-300 uppercase tracking-wide">Conversation Branches</div>
              </div>
              <div className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                View all conversation branches as a tree. Double-click any version to switch to that conversation path.
              </div>
            </div>

            {/* Version Switch Notification */}
            {versionSwitchNotification && (
              <div className="p-3 bg-teal-50 border-2 border-teal-300 rounded-lg shadow-md animate-fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-teal-600" />
                  <span className="text-sm font-semibold text-teal-700">{versionSwitchNotification}</span>
                </div>
              </div>
            )}

            {node && (
              <ConversationBranchTree
                nodeId={node.id}
                currentSessionId={searchParams?.get('chatSessionId') ?? null}
                onBranchClick={(sessionId, versionNumber) => {
                  // Switch to chat tab with the selected branch
                  if (onTabChange) {
                    onTabChange('chat');
                  }

                  // Update URL with the selected session
                  if (setSearchParams && searchParams) {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.set('chatSessionId', sessionId);
                    setSearchParams(newParams, { replace: true });
                  }

                  // Show notification
                  setVersionSwitchNotification(`Switched to Version ${versionNumber}`);

                  // Auto-hide notification after 3 seconds
                  setTimeout(() => {
                    setVersionSwitchNotification(null);
                  }, 3000);
                }}
              />
            )}
          </div>
        )}

      </div>

      {/* Action Modals */}
      <TaskReviewModal
        isOpen={showTaskModal}
        onClose={() => {
          setShowTaskModal(false);
          setExtractedTasks([]);
        }}
        initialTasks={extractedTasks}
        projectId={projectId}
        nodeId={node.id}
        userId={String(userId)}
        onTasksCreated={() => {
          setShowTaskModal(false);
          setExtractedTasks([]);
          if (onNodeUpdate) onNodeUpdate();
        }}
      />

      <MilestoneReviewModal
        isOpen={showMilestoneModal}
        onClose={() => {
          setShowMilestoneModal(false);
          setExtractedMilestones([]);
        }}
        initialMilestones={extractedMilestones}
        projectId={projectId}
        nodeId={node.id}
        userId={String(userId)}
        onMilestonesCreated={() => {
          setShowMilestoneModal(false);
          setExtractedMilestones([]);
          if (onNodeUpdate) onNodeUpdate();
        }}
      />

      <ResourceExtractionModal
        isOpen={showResourceModal}
        onClose={() => {
          setShowResourceModal(false);
          setExtractedResources([]);
        }}
        initialResources={extractedResources}
        projectId={projectId}
        nodeId={node.id}
        onResourcesCreated={() => {
          setShowResourceModal(false);
          setExtractedResources([]);
          if (onNodeUpdate) onNodeUpdate();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Node"
        message={`Are you sure you want to delete "${node?.title}"? This will permanently delete this node and all its children nodes. This action cannot be undone.`}
        confirmText="Delete Forever"
        cancelText="Cancel"
        danger={true}
        requiresTyping={true}
        typingConfirmText="DELETE"
      />
    </div>
  );
};

export default IdeaForestSidebar;