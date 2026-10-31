import React, { useEffect, useState } from 'react';
import { GitBranch, Clock, CheckCircle2, ChevronRight, ChevronDown } from 'lucide-react';
import config from '../../../../config';

const AI_AGENT_URL = config.AI_AGENT_URL;

interface ConversationSession {
  id: string;
  version_number: string;
  parent_version_number: string | null;
  branch_display_name: string;
  branch_name: string;
  parent_session_id: string | null;
  branch_point_index: number | null;
  message_count: number;
  created_at: string;
  is_active: boolean;
}

interface TreeNode {
  session: ConversationSession;
  children: TreeNode[];
  isExpanded: boolean;
}

interface ConversationBranchTreeProps {
  nodeId: string;
  currentSessionId: string | null;
  onBranchClick: (sessionId: string, versionNumber: string) => void;
}

/**
 * Component to display conversation branches as a tree structure
 */
const ConversationBranchTree: React.FC<ConversationBranchTreeProps> = ({
  nodeId,
  currentSessionId,
  onBranchClick,
}) => {
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // Fetch all sessions for this node
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${AI_AGENT_URL}/ai-api/node-chat/node/${nodeId}/sessions`);

        if (!response.ok) {
          throw new Error('Failed to load conversation branches');
        }

        const data = await response.json();
        const allSessions = data.sessions || [];

        console.log('[ConversationBranchTree] 📥 Fetched sessions:', {
          count: allSessions.length,
          sessions: allSessions.map((s: any) => ({
            id: s.id.substring(0, 8),
            version: s.version_number,
            parent: s.parent_version_number,
            parent_id: s.parent_session_id ? s.parent_session_id.substring(0, 8) : null
          }))
        });

        setSessions(allSessions);

        // Build tree structure
        const tree = buildTree(allSessions);
        setTreeNodes(tree);

        setLoading(false);
      } catch (err) {
        console.error('[ConversationBranchTree] Error fetching sessions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load branches');
        setLoading(false);
      }
    };

    if (nodeId) {
      fetchSessions();
    }
  }, [nodeId]);

  // Build tree structure from flat sessions array
  const buildTree = (sessions: ConversationSession[]): TreeNode[] => {
    // Create a map of session ID to tree node
    const nodeMap = new Map<string, TreeNode>();

    // Initialize all nodes
    sessions.forEach(session => {
      nodeMap.set(session.id, {
        session,
        children: [],
        isExpanded: false, // Collapse by default - will expand current path below
      });
    });

    // Build parent-child relationships
    const rootNodes: TreeNode[] = [];

    sessions.forEach(session => {
      const node = nodeMap.get(session.id)!;

      if (!session.parent_session_id) {
        // No parent - this is a root node
        console.log(`[ConversationBranchTree] ${session.version_number} is a root node`);
        rootNodes.push(node);
      } else if (session.branch_point_index === 0) {
        // Branches at index 0 are root siblings, even if they have a parent
        // This flattens the tree so branches from the first message appear at root level
        console.log(`[ConversationBranchTree] ${session.version_number} is a root sibling (branch_point_index=0)`);
        rootNodes.push(node);
      } else {
        // This is a child session - add to parent's children
        const parentNode = nodeMap.get(session.parent_session_id);
        if (parentNode) {
          parentNode.children.push(node);
          console.log(`[ConversationBranchTree] Added ${session.version_number} as child of ${parentNode.session.version_number}`);
        } else {
          // Parent not found (orphaned) - treat as root
          console.warn(`[ConversationBranchTree] Parent not found for ${session.version_number} (parent_id: ${session.parent_session_id})`);
          rootNodes.push(node);
        }
      }
    });

    console.log('[ConversationBranchTree] Tree structure:', {
      rootCount: rootNodes.length,
      roots: rootNodes.map(n => ({
        version: n.session.version_number,
        childCount: n.children.length,
        children: n.children.map(c => c.session.version_number)
      }))
    });

    // Sort children by version number within each parent
    const sortChildren = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => {
        const versionA = a.session.version_number || '0';
        const versionB = b.session.version_number || '0';
        return versionA.localeCompare(versionB, undefined, { numeric: true });
      });

      nodes.forEach(node => {
        if (node.children.length > 0) {
          sortChildren(node.children);
        }
      });
    };

    sortChildren(rootNodes);

    // Auto-expand path to current session
    if (currentSessionId) {
      const expandPathToNode = (nodeId: string) => {
        const node = nodeMap.get(nodeId);
        if (node) {
          node.isExpanded = true;
          // Expand parent recursively
          if (node.session.parent_session_id) {
            expandPathToNode(node.session.parent_session_id);
          }
        }
      };
      expandPathToNode(currentSessionId);
    }

    return rootNodes;
  };

  // Toggle expand/collapse for a node
  const toggleExpand = (sessionId: string) => {
    const toggleNodeInTree = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.map(node => {
        if (node.session.id === sessionId) {
          return { ...node, isExpanded: !node.isExpanded };
        }
        if (node.children.length > 0) {
          return { ...node, children: toggleNodeInTree(node.children) };
        }
        return node;
      });
    };

    setTreeNodes(toggleNodeInTree(treeNodes));
  };

  // Render a single tree node
  const renderNode = (node: TreeNode, depth: number = 0): React.ReactNode => {
    const isActive = node.session.id === currentSessionId;
    const isSelected = node.session.id === selectedSessionId;
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.session.id} className="relative">
        {/* Tree connector line for child nodes */}
        {depth > 0 && (
          <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-300" style={{ left: `${(depth - 1) * 28 + 14}px` }} />
        )}

        {/* Node */}
        <div
          className={`
            relative flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer transition-all
            ${isActive
              ? 'bg-gradient-to-r from-teal-100 to-emerald-100 border-2 border-teal-400 shadow-md'
              : isSelected
              ? 'bg-blue-50 border-2 border-blue-300 shadow-sm'
              : 'hover:bg-slate-100 border-2 border-transparent'
            }
          `}
          style={{ marginLeft: `${depth * 28}px` }}
          onClick={() => setSelectedSessionId(node.session.id)}
          onDoubleClick={() => onBranchClick(node.session.id, node.session.version_number)}
          title="Double-click to switch to this version"
        >
          {/* Expand/Collapse Button */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.session.id);
              }}
              className="flex-shrink-0 p-0.5 hover:bg-slate-200 rounded transition-colors"
            >
              {node.isExpanded ? (
                <ChevronDown className="w-4 h-4 text-slate-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-600" />
              )}
            </button>
          )}

          {/* Icon - Use GitBranch for all branches */}
          <div className="flex-shrink-0">
            {isActive ? (
              <CheckCircle2 className="w-5 h-5 text-teal-600" />
            ) : (
              <GitBranch className="w-5 h-5 text-slate-500" />
            )}
          </div>

          {/* Version Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-mono text-sm font-semibold ${isActive ? 'text-teal-700' : 'text-slate-700'} whitespace-nowrap`}>
                Version {node.session.version_number}
              </span>
              {isActive && (
                <span className="px-1.5 py-0.5 bg-teal-600 text-white text-xs rounded font-medium whitespace-nowrap">
                  Current
                </span>
              )}
            </div>
            {node.session.parent_version_number && !hasChildren && depth > 0 && (
              <div className="text-xs text-slate-500 truncate mt-1">
                From: Version {node.session.parent_version_number}
              </div>
            )}
          </div>

          {/* Message Count & Timestamp */}
          <div className="flex-shrink-0 flex items-center gap-3 text-xs text-slate-500">
            <span className="whitespace-nowrap">
              {node.session.message_count} {node.session.message_count === 1 ? 'msg' : 'msgs'}
            </span>
            <span className="flex items-center gap-1 text-slate-400 whitespace-nowrap">
              <Clock className="w-3 h-3" />
              {new Date(node.session.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Render children */}
        {hasChildren && node.isExpanded && (
          <div className="mt-1.5 space-y-1.5">
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-3 text-sm text-slate-600 font-medium">Loading conversation branches...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
        <p className="text-sm text-red-700 font-medium">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  if (treeNodes.length === 0) {
    return (
      <div className="text-center py-12">
        <GitBranch className="w-12 h-12 text-slate-300 mx-auto" />
        <p className="mt-3 text-sm text-slate-500 font-medium">No conversation branches yet</p>
        <p className="text-xs text-slate-400 mt-1">Create branches by editing messages</p>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-4 py-3 border-b-2 border-slate-200">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-teal-600" />
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide">
            Conversation Branches
          </h3>
        </div>
        <p className="text-xs text-slate-600 mt-1 font-medium">
          {sessions.length} {sessions.length === 1 ? 'version' : 'versions'} •
          Double-click to switch between branches
        </p>
      </div>

      {/* Tree */}
      <div className="p-4 space-y-2 max-h-[600px] overflow-y-auto">
        {treeNodes.map(node => renderNode(node))}
      </div>
    </div>
  );
};

export default ConversationBranchTree;
