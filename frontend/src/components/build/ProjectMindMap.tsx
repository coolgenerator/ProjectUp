import React, { useCallback, useState, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  NodeProps,
  Connection,
  ConnectionMode,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion } from 'framer-motion';

interface MindMapNode extends Node {
  data: {
    label: string;
    description?: string;
    type?: 'root' | 'category' | 'feature' | 'task';
    completed?: boolean;
    editable?: boolean;
  };
}

// Custom node component
const CustomNode: React.FC<NodeProps> = ({ data, selected }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label);

  const nodeColors = {
    root: 'from-purple-500 to-pink-500',
    category: 'from-blue-500 to-cyan-500',
    feature: 'from-green-500 to-emerald-500',
    task: 'from-yellow-500 to-orange-500',
  };

  const handleDoubleClick = () => {
    if (data.editable !== false) {
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    data.label = label;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
  };

  return (
    <div
      className={`px-4 py-2 shadow-lg rounded-lg border-2 ${
        selected ? 'border-purple-500' : 'border-gray-300'
      } bg-white min-w-[150px]`}
      onDoubleClick={handleDoubleClick}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-gray-400"
      />
      <div className="flex flex-col">
        <div className={`absolute -top-1 -left-1 w-3 h-3 rounded-full bg-gradient-to-r ${nodeColors[data.type || 'task']}`} />
        {isEditing ? (
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={handleBlur}
            onKeyPress={handleKeyPress}
            className="border-b border-gray-400 outline-none bg-transparent"
            autoFocus
          />
        ) : (
          <div className="font-semibold text-gray-800">{data.label}</div>
        )}
        {data.description && (
          <div className="text-xs text-gray-600 mt-1">{data.description}</div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-gray-400"
      />
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

interface ProjectMindMapProps {
  templateTitle: string;
  templateFeatures: string[];
  onComplete: (mindmapData: any) => void;
}

const ProjectMindMap: React.FC<ProjectMindMapProps> = ({
  templateTitle,
  templateFeatures,
  onComplete,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<MindMapNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Initialize mindmap with template data
  useEffect(() => {
    const initialNodes: MindMapNode[] = [
      {
        id: '1',
        type: 'custom',
        position: { x: 400, y: 50 },
        data: {
          label: templateTitle,
          type: 'root',
          description: 'Project Root',
          editable: false,
        },
      },
    ];

    const initialEdges: Edge[] = [];
    
    // Add main categories
    const categories = [
      { id: '2', label: 'Core Features', x: 100, y: 200 },
      { id: '3', label: 'Technical Stack', x: 400, y: 200 },
      { id: '4', label: 'Timeline & Milestones', x: 700, y: 200 },
    ];

    categories.forEach((cat) => {
      initialNodes.push({
        id: cat.id,
        type: 'custom',
        position: { x: cat.x, y: cat.y },
        data: {
          label: cat.label,
          type: 'category',
          editable: true,
        },
      });
      initialEdges.push({
        id: `e1-${cat.id}`,
        source: '1',
        target: cat.id,
        animated: true,
      });
    });

    // Add template features under Core Features
    templateFeatures.forEach((feature, index) => {
      const nodeId = `feature-${index}`;
      initialNodes.push({
        id: nodeId,
        type: 'custom',
        position: { x: 50 + (index % 2) * 100, y: 350 + Math.floor(index / 2) * 80 },
        data: {
          label: feature,
          type: 'feature',
          editable: true,
        },
      });
      initialEdges.push({
        id: `e2-${nodeId}`,
        source: '2',
        target: nodeId,
      });
    });

    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [templateTitle, templateFeatures, setNodes, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, animated: true }, eds));
    },
    [setEdges]
  );

  const addNode = (type: 'category' | 'feature' | 'task') => {
    const newNode: MindMapNode = {
      id: `node-${Date.now()}`,
      type: 'custom',
      position: { x: Math.random() * 500 + 100, y: Math.random() * 300 + 100 },
      data: {
        label: `New ${type}`,
        type,
        editable: true,
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const deleteNode = () => {
    if (selectedNode && selectedNode !== '1') {
      setNodes((nds) => nds.filter((node) => node.id !== selectedNode));
      setEdges((eds) => eds.filter((edge) => edge.source !== selectedNode && edge.target !== selectedNode));
      setSelectedNode(null);
    }
  };

  const onNodeClick = (event: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id);
  };

  const exportMindmap = () => {
    const mindmapData = {
      nodes: nodes.map((node) => ({
        id: node.id,
        label: node.data.label,
        type: node.data.type,
        description: node.data.description,
        position: node.position,
      })),
      edges: edges.map((edge) => ({
        source: edge.source,
        target: edge.target,
      })),
    };
    onComplete(mindmapData);
  };

  return (
    <div className="h-[600px] w-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden">
      <div className="flex justify-between items-center bg-white p-4 shadow-sm">
        <div className="flex gap-2">
          <button
            onClick={() => addNode('category')}
            className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
          >
            + Category
          </button>
          <button
            onClick={() => addNode('feature')}
            className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
          >
            + Feature
          </button>
          <button
            onClick={() => addNode('task')}
            className="px-3 py-1.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm"
          >
            + Task
          </button>
          {selectedNode && selectedNode !== '1' && (
            <button
              onClick={deleteNode}
              className="px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
            >
              Delete Selected
            </button>
          )}
        </div>
        <div className="text-sm text-gray-600">
          Double-click nodes to edit • Drag to connect
        </div>
      </div>
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
      >
        <Background variant="dots" gap={12} size={1} />
        <Controls />
        <MiniMap 
          nodeColor={(node) => {
            const colors: Record<string, string> = {
              root: '#9333ea',
              category: '#3b82f6',
              feature: '#10b981',
              task: '#f59e0b',
            };
            return colors[node.data?.type || 'task'];
          }}
        />
      </ReactFlow>
      
      <div className="flex justify-end p-4 bg-white border-t">
        <button
          onClick={exportMindmap}
          className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
        >
          Continue with this Plan
        </button>
      </div>
    </div>
  );
};

export default ProjectMindMap;