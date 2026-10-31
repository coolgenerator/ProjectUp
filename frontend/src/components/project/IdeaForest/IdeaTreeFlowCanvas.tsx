import React, { useCallback, useMemo, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Panel,
  MarkerType,
  NodeTypes,
  EdgeTypes,
  ConnectionLineType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import CustomForestNode from './CustomForestNode';
import CollapsibleEdge from './CollapsibleEdge';
import { IdeaNode, NodeConnection } from '../../../types/project/ideaForest';
import { findNonOverlappingPosition } from './nodeOverlapUtils';

interface IdeaForestFlowCanvasProps {
  nodes: IdeaNode[];  // All nodes (some may have hidden property set to true)
  connections: NodeConnection[];
  onNodeSelect: (nodeId: string) => void;
  onNodeAction: (nodeId: string, action: string) => void;
  onNodePositionUpdate: (nodeId: string, position: { x: number; y: number }) => void;
  onConnectionCreate: (fromId: string, toId: string, type?: string) => void;
  onConnectionDelete?: (connectionId: string) => void;
  selectedNodeId: string | null;
}

const IdeaForestFlowCanvas: React.FC<IdeaForestFlowCanvasProps> = ({
  nodes: ideaNodes,
  connections: ideaConnections,
  onNodeSelect,
  onNodeAction,
  onNodePositionUpdate,
  onConnectionCreate,
  onConnectionDelete,
  selectedNodeId,
}) => {
  // Fixed to tree mode with smoothstep edges (mindmap style)
  const edgeType = 'smoothstep';
  const [isConnectModeActive, setIsConnectModeActive] = useState(false);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [showQuickTips, setShowQuickTips] = useState(true);

  // Custom node types
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      forestNode: CustomForestNode,
    }),
    []
  );

  // Custom edge types
  const edgeTypes: EdgeTypes = useMemo(
    () => ({
      collapsible: CollapsibleEdge,
    }),
    []
  );

  // Convert IdeaNodes to React Flow nodes
  const initialNodes: Node[] = useMemo(() => {
    return ideaNodes.map((node) => ({
      id: node.id,
      type: 'forestNode',
      position: node.position || { x: Math.random() * 500, y: Math.random() * 500 },
      hidden: node.hidden || false, // Use hidden property from IdeaTree
      data: {
        ...node,
        onSelect: () => {
          if (isConnectModeActive) {
            if (!connectingFrom) {
              setConnectingFrom(node.id);
            } else if (connectingFrom !== node.id) {
              onConnectionCreate(connectingFrom, node.id, 'related');
              setConnectingFrom(null);
              setIsConnectModeActive(false);
            }
          } else {
            onNodeSelect(node.id);
          }
        },
        onAction: (action: string) => onNodeAction(node.id, action),
        isSelected: selectedNodeId === node.id || connectingFrom === node.id,
        isConnecting: isConnectModeActive,
      },
      draggable: !isConnectModeActive,
    }));
  }, [ideaNodes, selectedNodeId, onNodeSelect, onNodeAction, isConnectModeActive, connectingFrom, onConnectionCreate]);

  // Convert connections to React Flow edges
  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];

    // Add hierarchical (parent-child) connections
    // No collapse buttons on edges - they're now on the parent nodes themselves
    ideaNodes.forEach((node) => {
      if (node.parent_id) {
        edges.push({
          id: `parent-${node.parent_id}-${node.id}`,
          source: node.parent_id,
          target: node.id,
          type: edgeType, // All edges are regular edges now
          animated: false,
          style: { stroke: '#94a3b8', strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#94a3b8',
          },
        });
      }
    });

    // Add graph connections (non-hierarchical)
    ideaConnections.forEach((conn) => {
      // Skip if this is a parent-child relationship (already added above)
      const targetNode = ideaNodes.find(n => n.id === conn.to_node_id);
      if (targetNode?.parent_id === conn.from_node_id) {
        return;
      }

      const color = getConnectionColor(conn.connection_type);
      edges.push({
        id: conn.id,
        source: conn.from_node_id,
        target: conn.to_node_id,
        type: edgeType,
        animated: conn.connection_type === 'dependency' || conn.connection_type === 'related',
        style: {
          stroke: color,
          strokeWidth: 2,
          strokeDasharray: conn.connection_type === 'reference' ? '5 5' : undefined,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color,
        },
        label: conn.label || conn.connection_type,
        labelStyle: { fontSize: 11, fill: color, fontWeight: 500 },
        labelBgStyle: { fill: '#ffffff', fillOpacity: 0.9 },
      });
    });

    return edges;
  }, [ideaNodes, ideaConnections, edgeType, onNodeAction]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync nodes when ideaNodes change
  React.useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  // Sync edges when connections or edgeType change
  React.useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // Get connection color based on type
  const getConnectionColor = (type: string): string => {
    switch (type) {
      case 'dependency':
        return '#ef4444'; // red
      case 'related':
        return '#3b82f6'; // blue
      case 'blocks':
        return '#f59e0b'; // amber
      case 'reference':
        return '#8b5cf6'; // purple
      case 'implements':
        return '#10b981'; // emerald
      default:
        return '#6b7280'; // gray
    }
  };

  // Handle connection creation
  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        // Check if this is a parent-child relationship
        const targetNode = ideaNodes.find(n => n.id === connection.target);
        const isParentChild = targetNode?.parent_id === connection.source;

        if (!isParentChild) {
          // This is a graph connection, not a tree connection
          onConnectionCreate(connection.source, connection.target, 'related');
        }

        // Update the visual edges
        setEdges((eds) => addEdge({
          ...connection,
          type: edgeType,
          animated: true,
          style: { stroke: '#3b82f6', strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#3b82f6',
          },
        }, eds));
      }
    },
    [edgeType, ideaNodes, onConnectionCreate, setEdges]
  );

  // Handle node drag end - prevent overlaps
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      // Check if this position would overlap with any other visible nodes
      const adjustedPosition = findNonOverlappingPosition(
        node.position,
        ideaNodes,
        node.id // Exclude the node being moved from overlap check
      );

      // Update the node position in React Flow state if it was adjusted
      if (adjustedPosition.x !== node.position.x || adjustedPosition.y !== node.position.y) {
        console.log('[Canvas] Node dragged to overlapping position, adjusted:', {
          nodeId: node.id,
          original: node.position,
          adjusted: adjustedPosition
        });

        // Update React Flow node position
        setNodes((nds) =>
          nds.map((n) =>
            n.id === node.id
              ? { ...n, position: adjustedPosition }
              : n
          )
        );
      }

      // Save the final position (either original or adjusted)
      onNodePositionUpdate(node.id, adjustedPosition);
    },
    [onNodePositionUpdate, ideaNodes, setNodes]
  );

  // Handle edge deletion
  const onEdgeDelete = useCallback(
    (edges: Edge[]) => {
      edges.forEach((edge) => {
        // Only delete graph connections, not parent-child relationships
        if (!edge.id.startsWith('parent-') && onConnectionDelete) {
          onConnectionDelete(edge.id);
        }
      });
    },
    [onConnectionDelete]
  );

  // Auto-layout function for tree mode
  const autoLayoutTree = useCallback(() => {
    const nodeMap = new Map(ideaNodes.map(n => [n.id, n]));
    const rootNodes = ideaNodes.filter(n => n.is_root || !n.parent_id);
    const positioned = new Set<string>();
    const newNodes: Node[] = [];

    const positionNode = (node: IdeaNode, x: number, y: number, level: number) => {
      if (positioned.has(node.id)) return x;

      positioned.add(node.id);
      newNodes.push({
        ...nodes.find(n => n.id === node.id)!,
        position: { x, y },
      });

      const children = ideaNodes.filter(n => n.parent_id === node.id);
      const totalWidth = children.length * 300;
      let childX = x - totalWidth / 2 + 150;

      children.forEach((child) => {
        childX = positionNode(child, childX, y + 200, level + 1);
        childX += 300;
      });

      return x + 300;
    };

    let rootX = 500;
    rootNodes.forEach((root) => {
      positionNode(root, rootX, 100, 0);
      rootX += 600;
    });

    setNodes(newNodes);

    // Update backend positions
    newNodes.forEach(node => {
      onNodePositionUpdate(node.id, node.position);
    });
  }, [ideaNodes, nodes, setNodes, onNodePositionUpdate]);

  // Stats panel
  const stats = useMemo(() => {
    return {
      total: ideaNodes.length,
      connections: ideaConnections.length,
    };
  }, [ideaNodes, ideaConnections]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onEdgesDelete={onEdgeDelete}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.1}
        maxZoom={4}
        defaultEdgeOptions={{
          type: edgeType,
          animated: false,
        }}
        connectionLineStyle={{ stroke: '#3b82f6', strokeWidth: 2 }}
        connectionLineType={ConnectionLineType.SmoothStep}
        deleteKeyCode={['Backspace', 'Delete']}
        multiSelectionKeyCode={['Shift']}
        selectionKeyCode={null}
        snapToGrid={true}
        snapGrid={[15, 15]}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#cbd5e1" />

        <Controls
          showInteractive={false}
          position="bottom-right"
        />

        <MiniMap
          nodeColor={(node) => {
            const ideaNode = ideaNodes.find(n => n.id === node.id);
            if (!ideaNode) return '#cbd5e1';

            // Use node's custom color if available, otherwise default
            return ideaNode.color || '#3b82f6';
          }}
          position="bottom-left"
          style={{
            backgroundColor: '#f8fafc',
            border: '2px solid #e2e8f0',
            borderRadius: '8px',
          }}
        />

        <Panel position="top-right" className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 overflow-hidden">
          <div className="text-xs">
            <button
              onClick={() => setShowQuickTips(!showQuickTips)}
              className="w-full px-3 py-2 text-xs font-semibold text-blue-800 dark:text-blue-200 hover:bg-white/30 dark:hover:bg-slate-800/30 transition-colors flex items-center justify-between gap-2"
            >
              <span>💡 Quick Tips</span>
              <svg
                className={`w-4 h-4 transition-transform ${showQuickTips ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showQuickTips && (
              <div className="border-t border-white/20 p-3 space-y-1.5">
                <div className="text-blue-700 dark:text-blue-300"><strong>Move:</strong> Drag node to reposition</div>
                <div className="text-blue-700 dark:text-blue-300"><strong>Zoom:</strong> Scroll to zoom in/out</div>
                <div className="text-blue-700 dark:text-blue-300"><strong>Pan:</strong> Drag background to move canvas</div>
                <div className="text-blue-700 dark:text-blue-300"><strong>Select:</strong> Click node or Shift+Click for multi-select</div>
                <div className="text-blue-700 dark:text-blue-300"><strong>Delete:</strong> Select connection + Del key</div>
              </div>
            )}
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default IdeaForestFlowCanvas;
