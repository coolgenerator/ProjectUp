import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

interface BookmarkNode {
  id: string;
  name: string;
  type: 'bookmark' | 'tag' | 'author' | 'trend';
  platform?: string;
  importance: number;
  thumbnail?: string;
  author?: string;
  url?: string;
  color?: string;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface BookmarkLink {
  source: string;
  target: string;
  strength: number;
  type: 'tag' | 'author' | 'related' | 'trending';
}

interface BookmarkGraphData {
  nodes: BookmarkNode[];
  links: BookmarkLink[];
}

interface BookmarkGraphProps {
  bookmarks: any[];
  onNodeClick?: (node: BookmarkNode) => void;
}

const BookmarkGraph: React.FC<BookmarkGraphProps> = ({ bookmarks, onNodeClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [graphData, setGraphData] = useState<BookmarkGraphData>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<BookmarkNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNode, setDraggedNode] = useState<BookmarkNode | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Platform colors
  const platformColors: { [key: string]: string } = {
    youtube: '#FF0000',
    bilibili: '#00A1D6',
    xiaohongshu: '#FF2442',
    instagram: '#E4405F'
  };

  // Generate graph data from bookmarks
  const generateGraphData = useCallback(() => {
    const nodes: BookmarkNode[] = [];
    const links: BookmarkLink[] = [];
    const tagNodes: { [key: string]: BookmarkNode } = {};
    const authorNodes: { [key: string]: BookmarkNode } = {};

    // Create bookmark nodes
    bookmarks.forEach((bookmark, index) => {
      const angle = (index / bookmarks.length) * Math.PI * 2;
      const radius = 200;
      
      nodes.push({
        id: bookmark.id,
        name: bookmark.title,
        type: 'bookmark',
        platform: bookmark.platform,
        importance: Math.min(bookmark.stats?.views || 0, 1000000) / 100000 + 3,
        thumbnail: bookmark.thumbnail,
        author: bookmark.author?.name,
        url: bookmark.url,
        color: platformColors[bookmark.platform] || '#999',
        x: 400 + Math.cos(angle) * radius,
        y: 300 + Math.sin(angle) * radius
      });

      // Create tag nodes and links
      bookmark.tags?.forEach((tag: string) => {
        if (!tagNodes[tag]) {
          tagNodes[tag] = {
            id: `tag-${tag}`,
            name: `#${tag}`,
            type: 'tag',
            importance: 5,
            color: '#9b59b6',
            x: 400 + (Math.random() - 0.5) * 600,
            y: 300 + (Math.random() - 0.5) * 400
          };
          nodes.push(tagNodes[tag]);
        }

        links.push({
          source: bookmark.id,
          target: `tag-${tag}`,
          strength: 0.5,
          type: 'tag'
        });
      });

      // Create author nodes and links
      if (bookmark.author?.name && !authorNodes[bookmark.author.name]) {
        authorNodes[bookmark.author.name] = {
          id: `author-${bookmark.author.name}`,
          name: bookmark.author.name,
          type: 'author',
          importance: 6,
          color: '#3498db',
          x: 400 + (Math.random() - 0.5) * 600,
          y: 300 + (Math.random() - 0.5) * 400
        };
        nodes.push(authorNodes[bookmark.author.name]);
      }

      if (bookmark.author?.name) {
        links.push({
          source: bookmark.id,
          target: `author-${bookmark.author.name}`,
          strength: 0.7,
          type: 'author'
        });
      }

      // Create trending connections
      if (bookmark.trending) {
        const trendNode = nodes.find(n => n.id === 'trend-node');
        if (!trendNode) {
          nodes.push({
            id: 'trend-node',
            name: '🔥 Trending',
            type: 'trend',
            importance: 10,
            color: '#e74c3c',
            x: 400,
            y: 100
          });
        }

        links.push({
          source: bookmark.id,
          target: 'trend-node',
          strength: 0.8,
          type: 'trending'
        });
      }
    });

    setGraphData({ nodes, links });
  }, [bookmarks]);

  // Initialize graph data
  useEffect(() => {
    if (bookmarks.length > 0) {
      generateGraphData();
    }
  }, [bookmarks, generateGraphData]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        const height = containerRef.current.offsetHeight;
        setDimensions({ width, height });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Force simulation
  useEffect(() => {
    let animationId: number;
    
    const simulate = () => {
      const { nodes, links } = graphData;
      const alpha = 0.1;
      const centerX = dimensions.width / 2;
      const centerY = dimensions.height / 2;

      // Apply forces
      nodes.forEach((node, i) => {
        if (node.fx !== null && node.fx !== undefined) {
          node.x = node.fx;
        }
        if (node.fy !== null && node.fy !== undefined) {
          node.y = node.fy;
        }

        // Center force
        node.vx = (node.vx || 0) + (centerX - node.x) * alpha * 0.01;
        node.vy = (node.vy || 0) + (centerY - node.y) * alpha * 0.01;

        // Repulsion between nodes
        nodes.forEach((other, j) => {
          if (i !== j) {
            const dx = node.x - other.x;
            const dy = node.y - other.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 150) {
              const force = (150 - distance) / distance * 2;
              node.vx += dx * force * alpha;
              node.vy += dy * force * alpha;
            }
          }
        });

        // Apply velocity
        if (node.fx === null || node.fx === undefined) {
          node.x += (node.vx || 0) * alpha;
          node.vx *= 0.95;
        }
        if (node.fy === null || node.fy === undefined) {
          node.y += (node.vy || 0) * alpha;
          node.vy *= 0.95;
        }
      });

      // Apply link forces
      links.forEach(link => {
        const source = nodes.find(n => n.id === link.source);
        const target = nodes.find(n => n.id === link.target);
        
        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const idealDistance = 100;
          
          if (distance > 0) {
            const force = (distance - idealDistance) / distance * link.strength * alpha;
            const fx = dx * force;
            const fy = dy * force;
            
            if (!source.fx) {
              source.vx = (source.vx || 0) + fx;
              source.x += fx;
            }
            if (!source.fy) {
              source.vy = (source.vy || 0) + fy;
              source.y += fy;
            }
            if (!target.fx) {
              target.vx = (target.vx || 0) - fx;
              target.x -= fx;
            }
            if (!target.fy) {
              target.vy = (target.vy || 0) - fy;
              target.y -= fy;
            }
          }
        }
      });

      render();
      animationId = requestAnimationFrame(simulate);
    };

    if (graphData.nodes.length > 0) {
      simulate();
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [graphData, dimensions, zoom, offset]);

  // Render the graph
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    // Save context state
    ctx.save();

    // Apply zoom and offset
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);

    // Draw links
    graphData.links.forEach(link => {
      const source = graphData.nodes.find(n => n.id === link.source);
      const target = graphData.nodes.find(n => n.id === link.target);
      
      if (source && target) {
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        
        // Different styles for different link types
        if (link.type === 'trending') {
          ctx.strokeStyle = 'rgba(231, 76, 60, 0.5)';
          ctx.lineWidth = 3;
        } else if (link.type === 'author') {
          ctx.strokeStyle = 'rgba(52, 152, 219, 0.4)';
          ctx.lineWidth = 2;
        } else {
          ctx.strokeStyle = `rgba(100, 100, 100, ${link.strength * 0.3})`;
          ctx.lineWidth = link.strength * 2;
        }
        
        ctx.stroke();
      }
    });

    // Draw nodes
    graphData.nodes.forEach(node => {
      const radius = node.importance * 5;
      
      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = node.color || '#999';
      ctx.fill();
      
      // Border for selected node
      if (selectedNode?.id === node.id) {
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      
      // Icons for different node types
      ctx.save();
      ctx.font = `${radius}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      if (node.type === 'bookmark') {
        // Platform icon
        ctx.fillStyle = 'white';
        if (node.platform === 'youtube') ctx.fillText('▶', node.x, node.y);
        else if (node.platform === 'bilibili') ctx.fillText('B', node.x, node.y);
        else if (node.platform === 'xiaohongshu') ctx.fillText('书', node.x, node.y);
        else if (node.platform === 'instagram') ctx.fillText('📷', node.x, node.y);
      } else if (node.type === 'tag') {
        ctx.fillStyle = 'white';
        ctx.fillText('#', node.x, node.y);
      } else if (node.type === 'author') {
        ctx.fillStyle = 'white';
        ctx.fillText('👤', node.x, node.y);
      } else if (node.type === 'trend') {
        ctx.fillText('🔥', node.x, node.y);
      }
      ctx.restore();
      
      // Node label
      ctx.fillStyle = '#333';
      ctx.font = `${10 + node.importance}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Truncate long names
      const maxLength = 20;
      const displayName = node.name.length > maxLength 
        ? node.name.substring(0, maxLength) + '...' 
        : node.name;
      
      ctx.fillText(displayName, node.x, node.y + radius + 15);
    });

    // Restore context state
    ctx.restore();
  }, [graphData, dimensions, zoom, offset, selectedNode]);

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = (e.clientX - rect.left - offset.x) / zoom;
    const y = (e.clientY - rect.top - offset.y) / zoom;

    // Check if clicking on a node
    const clickedNode = graphData.nodes.find(node => {
      const dx = x - node.x;
      const dy = y - node.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < node.importance * 5;
    });

    if (clickedNode) {
      setSelectedNode(clickedNode);
      setDraggedNode(clickedNode);
      clickedNode.fx = clickedNode.x;
      clickedNode.fy = clickedNode.y;
      
      if (onNodeClick && clickedNode.type === 'bookmark') {
        onNodeClick(clickedNode);
      }
    } else {
      setIsDragging(true);
      setMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggedNode) {
      const rect = canvasRef.current!.getBoundingClientRect();
      const x = (e.clientX - rect.left - offset.x) / zoom;
      const y = (e.clientY - rect.top - offset.y) / zoom;
      
      draggedNode.fx = x;
      draggedNode.fy = y;
      draggedNode.x = x;
      draggedNode.y = y;
    } else if (isDragging) {
      const dx = e.clientX - mousePos.x;
      const dy = e.clientY - mousePos.y;
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    if (draggedNode) {
      draggedNode.fx = draggedNode.x;
      draggedNode.fy = draggedNode.y;
      setDraggedNode(null);
    }
    setIsDragging(false);
  };

  // Zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.5));
  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    graphData.nodes.forEach(node => {
      node.fx = null;
      node.fy = null;
    });
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative rounded-lg overflow-hidden bg-gray-50"
    >
      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-lg p-2 flex gap-2"
      >
        <button
          onClick={handleZoomIn}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors group"
          title="Zoom In"
        >
          <svg className="w-5 h-5 text-gray-600 group-hover:text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
          </svg>
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors group"
          title="Zoom Out"
        >
          <svg className="w-5 h-5 text-gray-600 group-hover:text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
          </svg>
        </button>
        <button
          onClick={handleReset}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors group"
          title="Reset View"
        >
          <svg className="w-5 h-5 text-gray-600 group-hover:text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </motion.div>

      {/* Legend */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute bottom-4 left-4 z-10 bg-white rounded-lg shadow-lg p-4"
      >
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Node Types</h3>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-gradient-to-r from-red-400 to-pink-400"></span>
            <span className="text-xs text-gray-600">Bookmarks</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-purple-500"></span>
            <span className="text-xs text-gray-600">Tags</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-blue-500"></span>
            <span className="text-xs text-gray-600">Authors</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-gradient-to-r from-orange-400 to-red-500"></span>
            <span className="text-xs text-gray-600">Trending</span>
          </div>
        </div>
      </motion.div>

      {/* Hover Info Panel */}
      {selectedNode && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg p-4 max-w-xs"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-800 mb-1">
                {selectedNode.name}
              </h4>
              <p className="text-sm text-gray-500 capitalize">
                {selectedNode.type}
              </p>
              {selectedNode.platform && (
                <span className="inline-block mt-2 px-2 py-1 bg-gray-100 rounded-md text-xs text-gray-600">
                  {selectedNode.platform}
                </span>
              )}
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {selectedNode.type === 'bookmark' && selectedNode.url && (
            <button
              onClick={() => window.open(selectedNode.url, '_blank')}
              className="mt-3 w-full py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm rounded-lg hover:shadow-md transition-all"
            >
              View Content
            </button>
          )}
        </motion.div>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className={`${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
};

export default BookmarkGraph;