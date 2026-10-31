import React, { useState, useEffect, useRef, useCallback } from 'react';
import fetchWithAuth from '../hooks/fetchWithAuth';
import config from '../config';

interface Domain {
  id: number;
  name: string;
  description: string;
}

interface Topic {
  id: number;
  name: string;
  description: string;
  domainId: number;
  parentTopicId?: number;
  children?: Topic[];
  concepts?: Concept[];
}

interface Concept {
  id: number;
  name: string;
  description: string;
  summary?: string;
  topicId: number;
  isAtomic?: boolean;
  resourceCount?: number;
  keywords?: string[];
  prerequisites?: string[];
  learningOutcomes?: string[];
  verified?: boolean;
  resources?: Resource[];
}

interface Resource {
  id: string;
  title: string;
  description: string;
  url?: string;
  resourceType: string;
  contentFormat?: string;
  mediaType?: string;
  language?: string;
  isFree?: boolean;
  requiresRegistration?: boolean;
  difficultyLevel?: string;
  estimatedMinutes?: number;
  targetAudience?: string;
  qualityScore?: number;
  relevanceScore?: number;
  popularityScore?: number;
  sourcePlatform?: string;
  author?: string;
  learningOutcomes?: string[];
  prerequisites?: string[];
}

interface TreeNode {
  id: string;
  label: string;
  description?: string;
  type: 'domain' | 'topic' | 'concept' | 'resource';
  data: Domain | Topic | Concept | Resource;
  children?: TreeNode[];
  isExpanded: boolean;
  hasChildren: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  isDragging?: boolean;
  depth?: number;
  parentId?: string;
}

const Blueprint: React.FC = () => {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [treeData, setTreeData] = useState<TreeNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [draggedNode, setDraggedNode] = useState<TreeNode | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [deleteDialog, setDeleteDialog] = useState<{ node: TreeNode | null; confirmText: string }>({ node: null, confirmText: '' });
  const [hoveredNode, setHoveredNode] = useState<TreeNode | null>(null);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [animateConnections, setAnimateConnections] = useState(true);

  const canvasRef = useRef<SVGSVGElement>(null);

  // Calculate node dimensions based on content
  const calculateNodeDimensions = (label: string, type: TreeNode['type']) => {
    // Base padding for each node type
    const padding = {
      domain: { x: 40, y: 30 },
      topic: { x: 35, y: 25 },
      concept: { x: 30, y: 20 },
      resource: { x: 25, y: 18 }
    }[type];

    // Calculate text dimensions (approximate)
    const charWidth = 8; // Average character width in pixels
    const lineHeight = 16; // Line height in pixels
    const maxWidth = 250; // Maximum node width
    const minWidth = {
      domain: 120,
      topic: 100,
      concept: 90,
      resource: 80
    }[type];

    // Calculate required width
    const textWidth = label.length * charWidth;
    const width = Math.min(maxWidth, Math.max(minWidth, textWidth + padding.x));
    
    // Calculate number of lines needed
    const charsPerLine = Math.floor((width - padding.x) / charWidth);
    const lines = Math.ceil(label.length / charsPerLine);
    const height = lines * lineHeight + padding.y;

    return { width, height };
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    try {
      const response = await fetchWithAuth(`${config.API_BASE_URL}/api/knowledge-tree/domains`);
      const data = await response.json();
      setDomains(data || []);
    } catch (error) {
      console.error('Error fetching domains:', error);
    }
  };

  const fetchTopics = async (domainId: number) => {
    try {
      const response = await fetchWithAuth(`${config.API_BASE_URL}/api/knowledge-tree/domains/${domainId}/topics`);
      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error('Error fetching topics:', error);
      return [];
    }
  };

  const fetchChildTopics = async (topicId: number) => {
    try {
      const response = await fetchWithAuth(`${config.API_BASE_URL}/api/knowledge-tree/topics/${topicId}/children`);
      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error('Error fetching child topics:', error);
      return [];
    }
  };

  const fetchConcepts = async (topicId: number) => {
    try {
      const response = await fetchWithAuth(`${config.API_BASE_URL}/api/knowledge-tree/topics/${topicId}/concepts`);
      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error('Error fetching concepts:', error);
      return [];
    }
  };

  const fetchResources = async (conceptId: number) => {
    try {
      const response = await fetchWithAuth(`${config.API_BASE_URL}/api/knowledge-tree/concepts/${conceptId}/resources`);
      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error('Error fetching resources:', error);
      return [];
    }
  };

  const handleDomainSelect = async (domain: Domain) => {
    setLoading(true);
    setSelectedDomain(domain);
    
    const topics = await fetchTopics(domain.id);
    const dimensions = calculateNodeDimensions(domain.name, 'domain');
    
    const domainNode: TreeNode = {
      id: `domain-${domain.id}`,
      label: domain.name,
      description: domain.description,
      type: 'domain',
      data: domain,
      children: topics.map((topic: Topic) => {
        const dims = calculateNodeDimensions(topic.name, 'topic');
        return {
          id: `topic-${topic.id}`,
          label: topic.name,
          description: topic.description,
          type: 'topic',
          data: topic,
          children: [],
          isExpanded: false,
          hasChildren: true,
          x: 0,
          y: 0,
          width: dims.width,
          height: dims.height
        };
      }),
      isExpanded: true,
      hasChildren: topics.length > 0,
      x: 400,
      y: 400,
      width: dimensions.width,
      height: dimensions.height,
      depth: 0,
      parentId: undefined
    };

    calculateNodePositions(domainNode);
    setTreeData(domainNode);
    setLoading(false);
  };

  const toggleNodeExpansion = async (node: TreeNode) => {
    if (!node.hasChildren) return;

    const newTreeData = { ...treeData! };
    const targetNode = findNodeById(newTreeData, node.id);
    
    if (!targetNode) return;

    targetNode.isExpanded = !targetNode.isExpanded;

    if (targetNode.isExpanded && (!targetNode.children || targetNode.children.length === 0)) {
      setLoading(true);
      
      if (targetNode.type === 'topic') {
        const topic = targetNode.data as Topic;
        const [childTopics, concepts] = await Promise.all([
          fetchChildTopics(topic.id),
          fetchConcepts(topic.id)
        ]);

        targetNode.children = [
          ...childTopics.map((childTopic: Topic) => {
            const dims = calculateNodeDimensions(childTopic.name, 'topic');
            return {
              id: `topic-${childTopic.id}`,
              label: childTopic.name,
              description: childTopic.description,
              type: 'topic' as const,
              data: childTopic,
              children: [],
              isExpanded: false,
              hasChildren: true,
              x: 0,
              y: 0,
              width: dims.width,
              height: dims.height
            };
          }),
          ...concepts.map((concept: Concept) => {
            const dims = calculateNodeDimensions(concept.name, 'concept');
            return {
              id: `concept-${concept.id}`,
              label: concept.name,
              description: concept.description,
              type: 'concept' as const,
              data: concept,
              children: [],
              isExpanded: false,
              hasChildren: true,
              x: 0,
              y: 0,
              width: dims.width,
              height: dims.height
            };
          })
        ];
      } else if (targetNode.type === 'concept') {
        const concept = targetNode.data as Concept;
        const resources = await fetchResources(concept.id);
        
        targetNode.children = resources.map((resource: Resource) => {
          const dims = calculateNodeDimensions(resource.title, 'resource');
          return {
            id: `resource-${resource.id}`,
            label: resource.title,
            description: resource.description,
            type: 'resource' as const,
            data: resource,
            children: [],
            isExpanded: false,
            hasChildren: false,
            x: 0,
            y: 0,
            width: dims.width,
            height: dims.height
          };
        });
      }
      
      setLoading(false);
    }

    calculateNodePositions(newTreeData);
    setTreeData(newTreeData);
  };

  const findNodeById = (node: TreeNode, id: string): TreeNode | null => {
    if (node.id === id) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = findNodeById(child, id);
        if (found) return found;
      }
    }
    return null;
  };

  const countAllChildren = (node: TreeNode): number => {
    let count = 0;
    if (node.children) {
      count += node.children.length;
      node.children.forEach(child => {
        count += countAllChildren(child);
      });
    }
    return count;
  };

  const deleteNode = (nodeToDelete: TreeNode) => {
    if (!treeData) return;
    
    // Can't delete root domain node
    if (nodeToDelete.id === treeData.id) {
      alert("Cannot delete the root domain node");
      return;
    }

    const deleteFromTree = (node: TreeNode): TreeNode | null => {
      if (!node.children) return node;
      
      node.children = node.children.filter(child => {
        if (child.id === nodeToDelete.id) {
          return false; // Remove this node
        }
        deleteFromTree(child); // Recursively check children
        return true;
      });
      
      return node;
    };

    const newTreeData = { ...treeData };
    deleteFromTree(newTreeData);
    setTreeData(newTreeData);
    setSelectedNode(null);
    setDeleteDialog({ node: null, confirmText: '' });
  };

  const handleDeleteClick = (node: TreeNode) => {
    setDeleteDialog({ node, confirmText: '' });
  };

  const calculateNodePositions = (node: TreeNode, x = 400, y = 400, level = 0, angle = 0, parentAngle = 0, parentId?: string) => {
    node.x = x;
    node.y = y;
    node.depth = level;
    node.parentId = parentId;

    if (node.children && node.children.length > 0 && node.isExpanded) {
      const childCount = node.children.length;
      
      // Calculate the maximum child dimensions
      const maxChildWidth = Math.max(...node.children.map(child => child.width));
      const maxChildHeight = Math.max(...node.children.map(child => child.height));
      
      // Horizontal spacing for right-side expansion
      const horizontalSpacing = Math.max(200, node.width + 100);
      
      // Vertical spacing between nodes
      const verticalSpacing = maxChildHeight + 40;
      const totalHeight = childCount * verticalSpacing;
      const startY = y - (totalHeight / 2) + (verticalSpacing / 2);
      
      node.children.forEach((child, index) => {
        const childX = x + horizontalSpacing;
        const childY = startY + (index * verticalSpacing);
        
        calculateNodePositions(
          child, 
          childX, 
          childY, 
          level + 1, 
          0,
          0,
          node.id
        );
      });
    }
  };

  const handleNodeMouseDown = (e: React.MouseEvent, node: TreeNode) => {
    e.stopPropagation();
    const svgPoint = getSVGPoint(e);
    setDraggedNode(node);
    setDragOffset({
      x: svgPoint.x - node.x,
      y: svgPoint.y - node.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedNode && treeData) {
      const svgPoint = getSVGPoint(e);
      const newTreeData = { ...treeData };
      const targetNode = findNodeById(newTreeData, draggedNode.id);
      
      if (targetNode) {
        const dx = svgPoint.x - dragOffset.x - targetNode.x;
        const dy = svgPoint.y - dragOffset.y - targetNode.y;
        
        targetNode.x = svgPoint.x - dragOffset.x;
        targetNode.y = svgPoint.y - dragOffset.y;
        
        // Move children with parent
        updateChildPositions(targetNode, dx, dy);
      }
      
      setTreeData(newTreeData);
    } else if (isDraggingCanvas) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setPanOffset({
        x: panOffset.x + dx,
        y: panOffset.y + dy
      });
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const updateChildPositions = (node: TreeNode, dx: number, dy: number) => {
    if (node.children && node.isExpanded) {
      node.children.forEach((child) => {
        child.x += dx;
        child.y += dy;
        updateChildPositions(child, dx, dy);
      });
    }
  };

  const handleMouseUp = () => {
    setDraggedNode(null);
    setIsDraggingCanvas(false);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Check if we're clicking on the background (not on a node)
    const target = e.target as SVGElement;
    const isBackgroundClick = 
      target === canvasRef.current || 
      target.classList?.contains('canvas-background') ||
      target.tagName === 'svg' ||
      (target.parentElement && target.parentElement === canvasRef.current);
    
    if (isBackgroundClick && !draggedNode) {
      setIsDraggingCanvas(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  };

  const getSVGPoint = (e: React.MouseEvent) => {
    const svg = canvasRef.current;
    if (!svg) return { x: 0, y: 0 };
    
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    return { x: svgP.x, y: svgP.y };
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    // Reduced sensitivity - smaller zoom steps
    const delta = e.deltaY > 0 ? 0.97 : 1.03;
    setZoomLevel(prev => Math.max(0.3, Math.min(2, prev * delta)));
  };

  const wrapText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return [text];
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach(word => {
      if ((currentLine + ' ' + word).length <= maxLength) {
        currentLine = currentLine ? currentLine + ' ' + word : word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  const renderNode = (node: TreeNode) => {
    // Enhanced color schemes with gradients - less purple, more blue/teal
    const nodeColors = {
      domain: { primary: '#0EA5E9', secondary: '#38BDF8', gradient: 'url(#domainGradient)' },
      topic: { primary: '#3B82F6', secondary: '#60A5FA', gradient: 'url(#topicGradient)' },
      concept: { primary: '#10B981', secondary: '#34D399', gradient: 'url(#conceptGradient)' },
      resource: { primary: '#F59E0B', secondary: '#FBBF24', gradient: 'url(#resourceGradient)' }
    }[node.type];

    const lightBg = {
      domain: '#F0F9FF',
      topic: '#EFF6FF',
      concept: '#ECFDF5',
      resource: '#FFFBEB'
    }[node.type];

    const isSelected = selectedNode?.id === node.id;
    const isDragging = draggedNode?.id === node.id;
    const hasChildrenToShow = node.hasChildren && node.children && node.children.length > 0;
    
    // Calculate text wrapping with padding
    const padding = 20; // Standard padding without icons
    const maxChars = Math.floor((node.width - padding) / 7);
    const textLines = wrapText(node.label, maxChars);

    return (
      <g key={node.id}>
        {/* Enhanced connecting lines with gradient and animation */}
        {node.children && node.isExpanded && node.children.map(child => {
          // Right-angle connection for tree-like structure
          const midX = node.x + (child.x - node.x) / 2;
          
          return (
            <g key={`line-${node.id}-${child.id}`}>
              {/* Connection line shadow */}
              <path
                d={`M ${node.x + node.width/2 + 15} ${node.y} 
                    L ${midX} ${node.y} 
                    L ${midX} ${child.y} 
                    L ${child.x - child.width/2} ${child.y}`}
                stroke="#000000"
                strokeWidth="3"
                fill="none"
                opacity="0.05"
              />
              {/* Main connection line */}
              <path
                d={`M ${node.x + node.width/2 + 15} ${node.y} 
                    L ${midX} ${node.y} 
                    L ${midX} ${child.y} 
                    L ${child.x - child.width/2} ${child.y}`}
                stroke="url(#lineGradient)"
                strokeWidth="2"
                fill="none"
                opacity="0.7"
                strokeDasharray={animateConnections ? "5,5" : "none"}
                className={animateConnections ? "connection-line" : ""}
              />
            </g>
          );
        })}

        {/* Enhanced node with hover effects */}
        <g
          onMouseDown={(e) => handleNodeMouseDown(e, node)}
          onClick={() => setSelectedNode(node)}
          onMouseEnter={(e) => {
            setHoveredNode(node);
            e.currentTarget.style.transform = 'scale(1.02)';
            e.currentTarget.style.transition = 'transform 0.2s ease';
          }}
          onMouseLeave={(e) => {
            setHoveredNode(null);
            if (!isDragging) {
              e.currentTarget.style.transform = 'scale(1)';
            }
          }}
          style={{ 
            cursor: isDragging ? 'grabbing' : 'grab',
            transform: isDragging ? 'scale(1.05)' : 'scale(1)',
            transformOrigin: `${node.x}px ${node.y}px`
          }}
          className="node-group"
        >
          {/* Enhanced shadow with blur */}
          <rect
            x={node.x - node.width / 2 + 3}
            y={node.y - node.height / 2 + 3}
            width={node.width}
            height={node.height}
            rx="16"
            ry="16"
            fill="#000000"
            opacity="0.15"
            filter="url(#shadowBlur)"
          />
          
          {/* Gradient background */}
          <rect
            x={node.x - node.width / 2}
            y={node.y - node.height / 2}
            width={node.width}
            height={node.height}
            rx="16"
            ry="16"
            fill={isSelected ? nodeColors.gradient : lightBg}
            stroke={isSelected ? nodeColors.primary : nodeColors.secondary}
            strokeWidth={isSelected ? 3 : 1.5}
            opacity={isDragging ? 0.9 : 1}
          />
          
          {/* Glass effect overlay */}
          <rect
            x={node.x - node.width / 2}
            y={node.y - node.height / 2}
            width={node.width}
            height={node.height / 2}
            rx="16"
            ry="16"
            fill="url(#glassGradient)"
            opacity="0.1"
          />
          
          {/* Node text with better typography */}
          {textLines.map((line, index) => (
            <text
              key={index}
              x={node.x}
              y={node.y - (textLines.length - 1) * 8 + index * 16}
              textAnchor="middle"
              fill={isSelected ? '#FFFFFF' : '#1F2937'}
              fontSize="14"
              fontWeight={isSelected ? '600' : '500'}
              style={{ 
                pointerEvents: 'none', 
                userSelect: 'none', 
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                letterSpacing: '0.01em'
              }}
            >
              {line}
            </text>
          ))}

          {/* Resource type badges */}
          {node.type === 'resource' && (() => {
            const resource = node.data as Resource;
            const badges = [];
            const badgeY = node.y + node.height / 2 - 25;
            
            // Media type badge
            if (resource.mediaType) {
              const mediaIcon = {
                'video': '🎥',
                'text': '📄',
                'audio': '🎧',
                'interactive': '🎮'
              }[resource.mediaType] || '📦';
              
              badges.push(
                <g key="media" transform={`translate(${node.x - 30}, ${badgeY})`}>
                  <rect x="-15" y="-8" width="30" height="16" rx="8" fill="#E0E7FF" />
                  <text x="0" y="3" textAnchor="middle" fontSize="10">{mediaIcon}</text>
                </g>
              );
            }
            
            // Difficulty badge
            if (resource.difficultyLevel) {
              const diffColor = {
                'beginner': '#10B981',
                'intermediate': '#F59E0B',
                'advanced': '#EF4444'
              }[resource.difficultyLevel] || '#6B7280';
              
              badges.push(
                <g key="diff" transform={`translate(${node.x + 30}, ${badgeY})`}>
                  <circle cx="0" cy="0" r="8" fill={diffColor} opacity="0.2" />
                  <circle cx="0" cy="0" r="4" fill={diffColor} />
                </g>
              );
            }
            
            return badges;
          })()}
          
          {/* Node metadata badge */}
          {hasChildrenToShow && (
            <g transform={`translate(${node.x}, ${node.y + node.height / 2 - 8})`}>
              <rect
                x="-20"
                y="-8"
                width="40"
                height="16"
                rx="8"
                fill={nodeColors.primary}
                opacity="0.15"
              />
              <text
                x="0"
                y="3"
                textAnchor="middle"
                fill={nodeColors.primary}
                fontSize="10"
                fontWeight="600"
              >
                {node.children?.length || 0} items
              </text>
            </g>
          )}

          {/* Expand button on the right edge of the node */}
          {node.hasChildren && (
            <g
              onClick={(e) => {
                e.stopPropagation();
                toggleNodeExpansion(node);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.2)';
                e.currentTarget.style.transition = 'transform 0.2s ease';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
              style={{ 
                cursor: 'pointer',
                transformOrigin: `${node.x + node.width / 2 + 15}px ${node.y}px`
              }}
              className="expand-button"
            >
              <circle
                cx={node.x + node.width / 2 + 15}
                cy={node.y}
                r="10"
                fill={nodeColors.gradient}
                stroke="#FFFFFF"
                strokeWidth="2"
              />
              <text
                x={node.x + node.width / 2 + 15}
                y={node.y + 5}
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize="16"
                fontWeight="bold"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {node.isExpanded ? '−' : '+'}
              </text>
            </g>
          )}

          {/* Clean Delete button */}
          {node.type !== 'domain' && (
            <g
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick(node);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.transition = 'transform 0.2s ease';
                e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.opacity = '0.7';
              }}
              style={{ 
                cursor: 'pointer',
                transformOrigin: `${node.x - node.width / 2 + 12}px ${node.y - node.height / 2 + 12}px`,
                opacity: 0.7
              }}
              className="delete-button"
            >
              <circle
                cx={node.x - node.width / 2 + 12}
                cy={node.y - node.height / 2 + 12}
                r="7"
                fill="#DC2626"
              />
              <path
                d={`M ${node.x - node.width / 2 + 8} ${node.y - node.height / 2 + 8} 
                    L ${node.x - node.width / 2 + 16} ${node.y - node.height / 2 + 16} 
                    M ${node.x - node.width / 2 + 16} ${node.y - node.height / 2 + 8} 
                    L ${node.x - node.width / 2 + 8} ${node.y - node.height / 2 + 16}`}
                stroke="#FFFFFF"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </g>
          )}
        </g>

        {/* Render children recursively */}
        {node.children && node.isExpanded && node.children.map(child => renderNode(child))}
      </g>
    );
  };

  const filteredDomains = domains.filter(domain =>
    domain.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Mini map rendering function
  const renderMiniMapNode = (node: TreeNode): JSX.Element => {
    const nodeColor = {
      domain: '#0EA5E9',
      topic: '#3B82F6',
      concept: '#10B981',
      resource: '#F59E0B'
    }[node.type];

    return (
      <g key={`minimap-${node.id}`}>
        {node.children && node.isExpanded && node.children.map(child => (
          <line
            key={`minimap-line-${node.id}-${child.id}`}
            x1={node.x}
            y1={node.y}
            x2={child.x}
            y2={child.y}
            stroke="#CBD5E1"
            strokeWidth="10"
            opacity="0.3"
          />
        ))}
        <circle
          cx={node.x}
          cy={node.y}
          r={node.type === 'domain' ? 30 : 20}
          fill={nodeColor}
          opacity="0.8"
        />
        {node.children && node.isExpanded && node.children.map(child => renderMiniMapNode(child))}
      </g>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Enhanced Sidebar with glass effect */}
      <div className="w-80 bg-white/95 backdrop-blur-lg shadow-2xl p-6 overflow-y-auto border-r border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Knowledge Domains</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowMiniMap(!showMiniMap)}
              className={`p-2 rounded-lg transition-colors ${
                showMiniMap ? 'bg-sky-100 text-sky-600' : 'bg-gray-100 text-gray-600'
              } hover:bg-sky-200`}
              title="Toggle Mini Map"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 4a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V4zm2 0v12h12V4H4z"/>
              </svg>
            </button>
            <button
              onClick={() => setAnimateConnections(!animateConnections)}
              className={`p-2 rounded-lg transition-colors ${
                animateConnections ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
              } hover:bg-blue-200`}
              title="Toggle Animations"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"/>
              </svg>
            </button>
          </div>
        </div>
        
        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search domains..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Domain List */}
        <div className="space-y-2">
          {filteredDomains.map(domain => (
            <div
              key={domain.id}
              onClick={() => handleDomainSelect(domain)}
              className={`p-4 rounded-lg cursor-pointer transition-all ${
                selectedDomain?.id === domain.id
                  ? 'bg-sky-100 border-2 border-sky-500'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <h3 className="font-semibold text-gray-800">{domain.name}</h3>
              {domain.description && (
                <p className="text-sm text-gray-600 mt-1">{domain.description}</p>
              )}
            </div>
          ))}
        </div>

        {/* Enhanced Node Info Panel */}
        {(selectedNode || hoveredNode) && (
          <div className="mt-6 p-4 bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">
                {selectedNode ? 'Selected' : 'Hovered'} Node
              </h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                {
                  domain: 'bg-sky-100 text-sky-700',
                  topic: 'bg-blue-100 text-blue-700',
                  concept: 'bg-green-100 text-green-700',
                  resource: 'bg-amber-100 text-amber-700'
                }[(selectedNode || hoveredNode)!.type]
              }`}>
                {(selectedNode || hoveredNode)!.type}
              </span>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Name:</span> {(selectedNode || hoveredNode)!.label}
              </p>
              
              {(selectedNode || hoveredNode)!.depth !== undefined && (
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Depth:</span> Level {(selectedNode || hoveredNode)!.depth}
                </p>
              )}
              
              {(selectedNode || hoveredNode)!.children && (
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Children:</span> {(selectedNode || hoveredNode)!.children.length} nodes
                </p>
              )}
              
              {(selectedNode || hoveredNode)!.description && (
                <p className="text-sm text-gray-600 mt-2 italic">
                  {(selectedNode || hoveredNode)!.description}
                </p>
              )}

              {/* Concept specific details */}
              {(selectedNode || hoveredNode)!.type === 'concept' && (() => {
                const concept = (selectedNode || hoveredNode)!.data as Concept;
                return (
                  <>
                    {concept.summary && (
                      <p className="text-sm text-gray-600 mt-2">
                        <span className="font-medium">Summary:</span> {concept.summary}
                      </p>
                    )}
                    {concept.verified && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 mt-2">
                        ✓ Verified
                      </span>
                    )}
                    {concept.keywords && concept.keywords.length > 0 && (
                      <div className="mt-2">
                        <span className="font-medium text-sm">Keywords:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {concept.keywords.map((keyword, idx) => (
                            <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs">
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Resource specific details */}
              {(selectedNode || hoveredNode)!.type === 'resource' && (() => {
                const resource = (selectedNode || hoveredNode)!.data as Resource;
                return (
                  <>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                      {resource.resourceType && (
                        <div>
                          <span className="font-medium">Type:</span> {resource.resourceType}
                        </div>
                      )}
                      {resource.mediaType && (
                        <div>
                          <span className="font-medium">Media:</span> {resource.mediaType}
                        </div>
                      )}
                      {resource.language && (
                        <div>
                          <span className="font-medium">Language:</span> {resource.language.toUpperCase()}
                        </div>
                      )}
                      {resource.difficultyLevel && (
                        <div>
                          <span className="font-medium">Level:</span> {resource.difficultyLevel}
                        </div>
                      )}
                      {resource.estimatedMinutes && (
                        <div>
                          <span className="font-medium">Duration:</span> {resource.estimatedMinutes} min
                        </div>
                      )}
                      {resource.author && (
                        <div>
                          <span className="font-medium">Author:</span> {resource.author}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2 mt-2">
                      {resource.isFree && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          Free
                        </span>
                      )}
                      {resource.requiresRegistration && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                          Registration Required
                        </span>
                      )}
                    </div>

                    {(resource.qualityScore || resource.relevanceScore || resource.popularityScore) && (
                      <div className="mt-2 space-y-1">
                        {resource.qualityScore && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">Quality:</span>
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full" 
                                style={{width: `${resource.qualityScore * 100}%`}}
                              />
                            </div>
                            <span className="text-xs">{(resource.qualityScore * 100).toFixed(0)}%</span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
              
              {(selectedNode || hoveredNode)!.type === 'resource' && ((selectedNode || hoveredNode)!.data as Resource).url && (
                <a
                  href={((selectedNode || hoveredNode)!.data as Resource).url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mt-2 font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open Resource
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative overflow-hidden bg-gray-50">
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
            <div className="text-lg font-semibold text-gray-700">Loading...</div>
          </div>
        )}

        {/* Enhanced Zoom Controls */}
        <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-md rounded-xl shadow-xl border border-gray-200 p-3">
          <button
            onClick={() => setZoomLevel(prev => Math.min(2, prev + 0.1))}
            className="block w-10 h-10 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
          <div className="px-3 py-2 text-center text-sm font-medium text-gray-700 border-y border-gray-200">
            {Math.round(zoomLevel * 100)}%
          </div>
          <button
            onClick={() => setZoomLevel(prev => Math.max(0.3, prev - 0.1))}
            className="block w-10 h-10 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <button
            onClick={() => {
              setZoomLevel(1);
              setPanOffset({ x: 0, y: 0 });
            }}
            className="block w-10 h-10 text-gray-700 hover:bg-gray-100 rounded-lg mt-2 transition-colors flex items-center justify-center"
            title="Reset View"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Mini Map */}
        {showMiniMap && treeData && (
          <div className="absolute bottom-4 right-4 z-10 bg-white/90 backdrop-blur-md rounded-xl shadow-xl border border-gray-200 p-2">
            <div className="w-48 h-32 relative overflow-hidden rounded-lg bg-gray-50">
              <svg className="w-full h-full">
                <g transform="scale(0.1)">
                  {renderMiniMapNode(treeData)}
                </g>
                {/* Viewport indicator */}
                <rect
                  x={((-panOffset.x / zoomLevel) + 400) * 0.1 - 40}
                  y={((-panOffset.y / zoomLevel) + 400) * 0.1 - 30}
                  width={80}
                  height={60}
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="2"
                  opacity="0.5"
                />
              </svg>
            </div>
          </div>
        )}

        {/* Enhanced SVG Canvas with gradients and filters */}
        <svg
          ref={canvasRef}
          className="w-full h-full"
          onWheel={handleWheel}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: isDraggingCanvas ? 'grabbing' : 'grab', background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 50%, #E2E8F0 100%)' }}
        >
          {/* Define gradients and filters */}
          <defs>
            {/* Node type gradients - updated colors */}
            <linearGradient id="domainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0EA5E9" />
              <stop offset="100%" stopColor="#38BDF8" />
            </linearGradient>
            <linearGradient id="topicGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#60A5FA" />
            </linearGradient>
            <linearGradient id="conceptGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#34D399" />
            </linearGradient>
            <linearGradient id="resourceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#FBBF24" />
            </linearGradient>
            
            {/* Connection line gradient */}
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#94A3B8" />
              <stop offset="50%" stopColor="#64748B" />
              <stop offset="100%" stopColor="#94A3B8" />
            </linearGradient>
            
            {/* Glass effect gradient */}
            <linearGradient id="glassGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
            
            {/* Shadow blur filter */}
            <filter id="shadowBlur">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
            </filter>
            
            {/* Glow effect */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Background pattern */}
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="20" r="1.5" fill="#CBD5E1" opacity="0.3" />
          </pattern>
          <pattern id="largegrid" width="200" height="200" patternUnits="userSpaceOnUse">
            <rect width="200" height="200" fill="none" stroke="#CBD5E1" strokeWidth="0.5" opacity="0.2" />
          </pattern>
          {/* Invisible background rect to capture mouse events */}
          <rect 
            width="100%" 
            height="100%" 
            fill="transparent" 
            style={{ pointerEvents: 'all' }}
            className="canvas-background"
          />
          
          <rect width="100%" height="100%" fill="url(#grid)" style={{ pointerEvents: 'none' }} />
          <rect width="100%" height="100%" fill="url(#largegrid)" style={{ pointerEvents: 'none' }} />
          
          <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoomLevel})`}>
            {treeData ? (
              renderNode(treeData)
            ) : (
              <text
                x="50%"
                y="50%"
                textAnchor="middle"
                fill="#64748B"
                fontSize="18"
                fontWeight="500"
              >
                Select a domain to view its knowledge tree
              </text>
            )}
          </g>
        </svg>
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes dashOffset {
          to {
            stroke-dashoffset: -10;
          }
        }
        
        .connection-line {
          animation: dashOffset 0.5s linear infinite;
        }
        
        .node-group {
          transition: all 0.3s ease;
        }
        
        .expand-button, .delete-button {
          transition: all 0.2s ease;
        }
        
        .expand-button:hover, .delete-button:hover {
          filter: brightness(1.2);
        }
      `}</style>

      {/* Delete Confirmation Dialog */}
      {deleteDialog.node && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Delete Node</h3>
            
            <div className="mb-4">
              <p className="text-gray-700 mb-2">
                Are you sure you want to delete <strong>{deleteDialog.node.label}</strong>?
              </p>
              
              {(() => {
                const childCount = countAllChildren(deleteDialog.node);
                if (childCount > 0) {
                  return (
                    <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                      <p className="text-red-700 text-sm">
                        ⚠️ Warning: This will also delete {childCount} child node{childCount > 1 ? 's' : ''}.
                      </p>
                    </div>
                  );
                }
                return null;
              })()}
              
              <p className="text-gray-600 text-sm mb-4">
                Please type <strong>{deleteDialog.node.label}</strong> to confirm deletion:
              </p>
              
              <input
                type="text"
                value={deleteDialog.confirmText}
                onChange={(e) => setDeleteDialog({ ...deleteDialog, confirmText: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Type node name to confirm"
                autoFocus
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteDialog({ node: null, confirmText: '' })}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (deleteDialog.confirmText === deleteDialog.node.label) {
                    deleteNode(deleteDialog.node);
                  } else {
                    alert('Node name does not match. Please type the exact name.');
                  }
                }}
                disabled={deleteDialog.confirmText !== deleteDialog.node.label}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  deleteDialog.confirmText === deleteDialog.node.label
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Blueprint;