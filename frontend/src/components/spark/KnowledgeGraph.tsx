import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Box, Paper, Typography, Chip, IconButton, Drawer, Card, CardContent, Avatar, Tooltip, Button, Zoom } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import InfoIcon from '@mui/icons-material/Info';
import LinkIcon from '@mui/icons-material/Link';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';

interface GraphNode {
  id: string;
  name: string;
  type: 'video' | 'article' | 'social' | 'project';
  importance: number; // 1-10 scale
  thumbnail?: string;
  author?: string;
  tags?: string[];
  color?: string;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink {
  source: string;
  target: string;
  strength: number; // 0-1 scale
  type: 'similar' | 'reference' | 'author' | 'tag';
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface KnowledgeGraphProps {
  userId?: string;
}

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ userId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNode, setDraggedNode] = useState<GraphNode | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const animationRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Color scheme for different content types
  const typeColors = {
    video: '#e74c3c',
    article: '#3498db',
    social: '#2ecc71',
    project: '#f39c12'
  };

  // Generate mock data
  const generateMockData = (): GraphData => {
    const types: ('video' | 'article' | 'social' | 'project')[] = ['video', 'article', 'social', 'project'];
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];

    // Create nodes with initial positions
    const centerX = 400;
    const centerY = 300;
    
    for (let i = 0; i < 30; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const angle = (i / 30) * Math.PI * 2;
      const radius = 150 + Math.random() * 200;
      
      nodes.push({
        id: `node-${i}`,
        name: `${type === 'video' ? '🎥' : type === 'article' ? '📄' : type === 'social' ? '📱' : '🚀'} ${type.charAt(0).toUpperCase() + type.slice(1)} ${i}`,
        type,
        importance: Math.floor(Math.random() * 10) + 1,
        thumbnail: `https://picsum.photos/200/200?random=${i}`,
        author: `Creator ${Math.floor(Math.random() * 20)}`,
        tags: ['ai', 'web', 'mobile', 'design', 'startup'].slice(0, Math.floor(Math.random() * 3) + 1),
        color: typeColors[type],
        x: centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * 50,
        y: centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * 50,
        vx: 0,
        vy: 0
      });
    }

    // Create links with clustering
    for (let i = 0; i < 40; i++) {
      const source = Math.floor(Math.random() * nodes.length);
      let target = Math.floor(Math.random() * nodes.length);
      
      // Avoid self-links
      while (target === source) {
        target = Math.floor(Math.random() * nodes.length);
      }

      const linkTypes: ('similar' | 'reference' | 'author' | 'tag')[] = ['similar', 'reference', 'author', 'tag'];
      const linkType = linkTypes[Math.floor(Math.random() * linkTypes.length)];
      
      links.push({
        source: nodes[source].id,
        target: nodes[target].id,
        strength: Math.random() * 0.8 + 0.2,
        type: linkType
      });
    }

    return { nodes, links };
  };

  // Initialize graph data
  useEffect(() => {
    setGraphData(generateMockData());
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        const height = fullscreen ? window.innerHeight - 100 : 600;
        setDimensions({ width, height });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fullscreen]);

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
            
            if (distance < 100) {
              const force = (100 - distance) / distance * 2;
              node.vx += dx * force * alpha;
              node.vy += dy * force * alpha;
            }
          }
        });

        // Apply velocity
        if (node.fx === null || node.fx === undefined) {
          node.x += (node.vx || 0) * alpha;
          node.vx *= 0.95; // Damping
        }
        if (node.fy === null || node.fy === undefined) {
          node.y += (node.vy || 0) * alpha;
          node.vy *= 0.95; // Damping
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
          const idealDistance = 150;
          
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
        ctx.strokeStyle = `rgba(100, 100, 100, ${link.strength * 0.3})`;
        ctx.lineWidth = link.strength * 3;
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
      
      // Node label
      ctx.fillStyle = '#333';
      ctx.font = `${12 + node.importance}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.name.split(' ').slice(0, 2).join(' '), node.x, node.y + radius + 15);
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
      setDrawerOpen(true);
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
      // Keep the node fixed at its new position
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
    // Unfix all nodes
    graphData.nodes.forEach(node => {
      node.fx = null;
      node.fy = null;
    });
  };

  // Get related nodes
  const getRelatedNodes = (nodeId: string): GraphNode[] => {
    const relatedIds = new Set<string>();
    
    graphData.links.forEach(link => {
      if (link.source === nodeId) {
        relatedIds.add(link.target);
      }
      if (link.target === nodeId) {
        relatedIds.add(link.source);
      }
    });

    return graphData.nodes.filter(node => relatedIds.has(node.id));
  };

  return (
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        height: fullscreen ? '100vh' : 600,
        position: fullscreen ? 'fixed' : 'relative',
        top: fullscreen ? 0 : 'auto',
        left: fullscreen ? 0 : 'auto',
        zIndex: fullscreen ? 1300 : 1,
        bgcolor: 'background.paper',
        borderRadius: fullscreen ? 0 : 2,
        overflow: 'hidden'
      }}
    >
      {/* Controls */}
      <Paper
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 10,
          p: 1,
          display: 'flex',
          gap: 1
        }}
        elevation={3}
      >
        <Tooltip title="Zoom In">
          <IconButton size="small" onClick={handleZoomIn}>
            <ZoomInIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Zoom Out">
          <IconButton size="small" onClick={handleZoomOut}>
            <ZoomOutIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Reset View">
          <IconButton size="small" onClick={handleReset}>
            <RestartAltIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title={fullscreen ? "Exit Fullscreen" : "Fullscreen"}>
          <IconButton size="small" onClick={() => setFullscreen(!fullscreen)}>
            {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>
        </Tooltip>
      </Paper>

      {/* Legend */}
      <Paper
        sx={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          zIndex: 10,
          p: 2
        }}
        elevation={3}
      >
        <Typography variant="subtitle2" gutterBottom>
          Content Types
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: typeColors.video }} />
            <Typography variant="caption">Video</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: typeColors.article }} />
            <Typography variant="caption">Article</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: typeColors.social }} />
            <Typography variant="caption">Social</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: typeColors.project }} />
            <Typography variant="caption">Project</Typography>
          </Box>
        </Box>
      </Paper>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* Node Details Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: { width: 400, p: 3 }
        }}
      >
        {selectedNode && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Node Details</Typography>
              <IconButton onClick={() => setDrawerOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                {selectedNode.thumbnail && (
                  <Box
                    component="img"
                    src={selectedNode.thumbnail}
                    alt={selectedNode.name}
                    sx={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 1, mb: 2 }}
                  />
                )}
                
                <Typography variant="h5" gutterBottom>
                  {selectedNode.name}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Chip
                    label={selectedNode.type}
                    size="small"
                    color="primary"
                  />
                  <Chip
                    label={`Importance: ${selectedNode.importance}`}
                    size="small"
                    variant="outlined"
                  />
                </Box>

                {selectedNode.author && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Avatar sx={{ width: 24, height: 24 }}>
                      {selectedNode.author[0]}
                    </Avatar>
                    <Typography variant="body2" color="text.secondary">
                      {selectedNode.author}
                    </Typography>
                  </Box>
                )}

                {selectedNode.tags && (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {selectedNode.tags.map((tag, idx) => (
                      <Chip key={idx} label={tag} size="small" variant="outlined" />
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Related Nodes */}
            <Typography variant="h6" gutterBottom>
              Related Content
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {getRelatedNodes(selectedNode.id).map(node => (
                <Card
                  key={node.id}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  onClick={() => {
                    setSelectedNode(node);
                    // Center view on selected node
                    const centerX = dimensions.width / 2;
                    const centerY = dimensions.height / 2;
                    setOffset({
                      x: centerX - node.x * zoom,
                      y: centerY - node.y * zoom
                    });
                  }}
                >
                  <CardContent sx={{ py: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinkIcon fontSize="small" color="action" />
                      <Typography variant="body2">{node.name}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>

            <Button
              variant="contained"
              fullWidth
              sx={{ mt: 3 }}
              onClick={() => {
                // Navigate to content details
                console.log('Navigate to:', selectedNode.id);
              }}
            >
              View Full Content
            </Button>
          </>
        )}
      </Drawer>
    </Box>
  );
};

export default KnowledgeGraph;