import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HiLightBulb, HiRocketLaunch, HiSparkles } from 'react-icons/hi2';
import { GiBrain, GiTreeBranch, GiPineTree } from 'react-icons/gi';
import { FaStar, FaFire, FaChartBar, FaTree, FaBullseye } from 'react-icons/fa';
import config from '../../config';
import { IdeaTree, IdeaTreeConnection, IdeaTreeSummary } from '../../types/ideaTree';

const { AI_AGENT_URL } = config;

interface ForestCanvasProps {
  projectId: string;
  onTreeSelect: (sessionId: string) => void;
  onTreeUpdate?: () => void;
}

interface TreeCardPosition {
  sessionId: string;
  x: number;
  y: number;
}

const ForestCanvas: React.FC<ForestCanvasProps> = ({ projectId, onTreeSelect, onTreeUpdate }) => {
  const [summary, setSummary] = useState<IdeaTreeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [cardPositions, setCardPositions] = useState<TreeCardPosition[]>([]);
  const [draggingCard, setDraggingCard] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [selectedForConnection, setSelectedForConnection] = useState<string[]>([]);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingDescriptionId, setEditingDescriptionId] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState('');
  const [editingIconId, setEditingIconId] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [newConnection, setNewConnection] = useState({
    from_session_id: '',
    to_session_id: '',
    connection_type: 'relates_to',
    label: '',
    description: ''
  });

  // Connection dragging state
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [dragConnectionPosition, setDragConnectionPosition] = useState<{ x: number; y: number } | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.max(0.5, Math.min(2, prev * delta)));
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [projectId]);

  useEffect(() => {
    // Initialize card positions with smart layout when sessions load
    if (summary && summary.sessions && summary.sessions.length > 0 && cardPositions.length === 0) {
      const cardWidth = 320;
      const cardHeight = 220;
      const padding = 60;
      const centerX = 600;
      const centerY = 400;

      // Calculate optimal radius based on card dimensions and count
      const minRadius = Math.max(300, (cardWidth + padding) * summary.sessions.length / (2 * Math.PI));

      const positions = summary.sessions.map((session, index) => {
        const angleStep = (2 * Math.PI) / summary.sessions.length;
        const angle = index * angleStep;

        // Position cards in a circle with enough spacing
        return {
          sessionId: session.id,
          x: centerX + minRadius * Math.cos(angle) - cardWidth / 2,
          y: centerY + minRadius * Math.sin(angle) - cardHeight / 2
        };
      });

      setCardPositions(positions);
    }
  }, [summary]);

  // Add wheel event listener with passive: false to allow preventDefault
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false });
      return () => {
        canvas.removeEventListener('wheel', handleWheel);
      };
    }
  }, [handleWheel]);

  // Close icon picker when clicking outside
  useEffect(() => {
    if (!editingIconId) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.icon-picker-container')) {
        setEditingIconId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingIconId]);

  // Add document-level mouse event listeners for connection dragging
  useEffect(() => {
    if (!connectingFrom) return;

    const handleDocumentMouseMove = (e: MouseEvent) => {
      setDragConnectionPosition({ x: e.clientX, y: e.clientY });
    };

    const handleDocumentMouseUp = () => {
      setConnectingFrom(null);
      setDragConnectionPosition(null);
      setHoveredHandle(null);
    };

    document.addEventListener('mousemove', handleDocumentMouseMove);
    document.addEventListener('mouseup', handleDocumentMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleDocumentMouseMove);
      document.removeEventListener('mouseup', handleDocumentMouseUp);
    };
  }, [connectingFrom]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${AI_AGENT_URL}/ai-api/projects/${projectId}/tree-sessions/summary`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      // Ensure data has the expected structure
      setSummary({
        sessions: data.sessions || [],
        connections: data.connections || [],
        total_sessions: data.total_sessions || 0,
        total_connections: data.total_connections || 0
      });
    } catch (error) {
      console.error('Error fetching session summary:', error);
      // Set empty summary on error to prevent crashes
      setSummary({
        sessions: [],
        connections: [],
        total_sessions: 0,
        total_connections: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const getCardPosition = (sessionId: string) => {
    return cardPositions.find(p => p.sessionId === sessionId) || { x: 0, y: 0 };
  };

  const checkCollision = (x: number, y: number, sessionId: string, cardWidth = 320, cardHeight = 220, padding = 20) => {
    // Check if the new position collides with any other card
    return cardPositions.some(pos => {
      if (pos.sessionId === sessionId) return false; // Don't check against self

      const dx = Math.abs(pos.x - x);
      const dy = Math.abs(pos.y - y);

      return dx < (cardWidth + padding) && dy < (cardHeight + padding);
    });
  };

  const updateCardPosition = (sessionId: string, x: number, y: number) => {
    // Check for collision before updating
    if (checkCollision(x, y, sessionId)) {
      return; // Don't update position if it would cause overlap
    }

    setCardPositions(prev => {
      const existing = prev.find(p => p.sessionId === sessionId);
      if (existing) {
        return prev.map(p => p.sessionId === sessionId ? { ...p, x, y } : p);
      } else {
        return [...prev, { sessionId, x, y }];
      }
    });
  };

  const handleCardMouseDown = (sessionId: string, e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    e.stopPropagation();

    const pos = getCardPosition(sessionId);
    setDraggingCard(sessionId);
    setDragOffset({
      x: (e.clientX - canvasOffset.x) / scale - pos.x,
      y: (e.clientY - canvasOffset.y) / scale - pos.y
    });
  };

  const handleConnectionStart = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setConnectingFrom(sessionId);
    setDragConnectionPosition({ x: e.clientX, y: e.clientY });
  };

  const handleConnectionEnd = (targetSessionId: string) => {
    if (connectingFrom && connectingFrom !== targetSessionId) {
      // Auto-open connection modal with pre-filled data
      setNewConnection({
        ...newConnection,
        from_session_id: connectingFrom,
        to_session_id: targetSessionId
      });
      setShowConnectionModal(true);
    }
    setConnectingFrom(null);
    setDragConnectionPosition(null);
    setHoveredHandle(null);
  };

  const getHandlePosition = (sessionId: string) => {
    const pos = getCardPosition(sessionId);
    const cardWidth = 300;
    const cardHeight = 220;
    // Return right side center position
    return { x: pos.x + cardWidth, y: pos.y + cardHeight / 2 };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !draggingCard) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - canvasOffset.x, y: e.clientY - canvasOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (connectingFrom) {
      setDragConnectionPosition({ x: e.clientX, y: e.clientY });
    } else if (draggingCard) {
      const newX = (e.clientX - canvasOffset.x) / scale - dragOffset.x;
      const newY = (e.clientY - canvasOffset.y) / scale - dragOffset.y;
      updateCardPosition(draggingCard, newX, newY);
    } else if (isPanning) {
      setCanvasOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  };

  const handleMouseUp = () => {
    if (connectingFrom) {
      setConnectingFrom(null);
      setDragConnectionPosition(null);
      setHoveredHandle(null);
    }
    setDraggingCard(null);
    setIsPanning(false);
  };

  const createNewTree = async () => {
    try {
      // Generate random color
      const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      // Generate random icon
      const icons = ['lightbulb', 'rocket', 'brain', 'target', 'star', 'fire', 'sparkles', 'chart'];
      const randomIcon = icons[Math.floor(Math.random() * icons.length)];

      const response = await fetch(`${AI_AGENT_URL}/ai-api/tree-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Tree',
          description: '',
          color: randomColor,
          icon: randomIcon,
          purpose: '',
          project_sid: projectId
        })
      });

      if (response.ok) {
        const newSession = await response.json();
        await fetchSummary();
        // Open the new tree immediately
        onTreeSelect(newSession.id);
      }
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const createConnection = async () => {
    try {
      const response = await fetch(`${AI_AGENT_URL}/ai-api/tree-sessions/connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newConnection,
          project_id: projectId,
          is_active: true
        })
      });

      if (response.ok) {
        setShowConnectionModal(false);
        setNewConnection({
          from_session_id: '',
          to_session_id: '',
          connection_type: 'relates_to',
          label: '',
          description: ''
        });
        setSelectedForConnection([]);
        fetchSummary();
      }
    } catch (error) {
      console.error('Error creating connection:', error);
    }
  };

  const updateSessionName = async (sessionId: string, newName: string) => {
    if (!newName.trim()) return;

    try {
      await fetch(`${AI_AGENT_URL}/ai-api/tree-sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() })
      });
      fetchSummary();
      setEditingSessionId(null);
    } catch (error) {
      console.error('Error updating session name:', error);
    }
  };

  const updateSessionDescription = async (sessionId: string, newDescription: string) => {
    try {
      await fetch(`${AI_AGENT_URL}/ai-api/tree-sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: newDescription.trim() })
      });
      fetchSummary();
      setEditingDescriptionId(null);
    } catch (error) {
      console.error('Error updating session description:', error);
    }
  };

  const updateSessionIcon = async (sessionId: string, newIcon: string) => {
    try {
      // Optimistic update - update local state immediately
      setSummary(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          sessions: prev.sessions.map(s =>
            s.id === sessionId ? { ...s, icon: newIcon } : s
          )
        };
      });

      // Close the picker immediately for better UX
      setEditingIconId(null);

      // Update backend in background
      const response = await fetch(`${AI_AGENT_URL}/ai-api/tree-sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ icon: newIcon })
      });

      if (!response.ok) {
        // If update fails, revert by fetching fresh data
        console.error('Failed to update icon');
        fetchSummary();
      } else {
        // Notify parent to refresh sidebar
        onTreeUpdate?.();
      }
    } catch (error) {
      console.error('Error updating session icon:', error);
      // Revert by fetching fresh data
      fetchSummary();
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return;

    try {
      await fetch(`${AI_AGENT_URL}/ai-api/tree-sessions/${sessionId}`, { method: 'DELETE' });
      fetchSummary();
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const toggleConnectionSelection = (sessionId: string) => {
    if (selectedForConnection.includes(sessionId)) {
      setSelectedForConnection(selectedForConnection.filter(id => id !== sessionId));
    } else if (selectedForConnection.length < 2) {
      setSelectedForConnection([...selectedForConnection, sessionId]);

      // Auto-open connection modal when 2 sessions selected
      if (selectedForConnection.length === 1) {
        setNewConnection({
          ...newConnection,
          from_session_id: selectedForConnection[0],
          to_session_id: sessionId
        });
        setShowConnectionModal(true);
      }
    }
  };

  const getConnectionColor = (type: string) => {
    const colors: Record<string, string> = {
      builds_on: '#3B82F6',
      relates_to: '#8B5CF6',
      alternative_to: '#F97316',
      extends: '#10B981'
    };
    return colors[type] || '#6B7280';
  };

  const iconOptions = [
    { value: 'lightbulb', name: 'Lightbulb', icon: HiLightBulb },
    { value: 'rocket', name: 'Rocket', icon: HiRocketLaunch },
    { value: 'brain', name: 'Brain', icon: GiBrain },
    { value: 'target', name: 'Target', icon: FaBullseye },
    { value: 'star', name: 'Star', icon: FaStar },
    { value: 'fire', name: 'Fire', icon: FaFire },
    { value: 'sparkles', name: 'Sparkles', icon: HiSparkles },
    { value: 'chart', name: 'Chart', icon: FaChartBar },
    { value: 'tree', name: 'Tree Branch', icon: GiTreeBranch },
    { value: 'pine', name: 'Pine Tree', icon: GiPineTree }
  ];

  const getIconComponent = (iconValue: string, className: string = "w-5 h-5") => {
    const option = iconOptions.find(opt => opt.value === iconValue);
    if (option) {
      const IconComponent = option.icon;
      return <IconComponent className={className} />;
    }
    return <HiLightBulb className={className} />; // Default
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!summary) return null;

  // Empty state - show welcome screen when no sessions exist
  if (summary.sessions.length === 0) {
    return (
      <div className="relative w-full h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 overflow-auto">
        <div className="flex items-center justify-center min-h-full p-4 sm:p-6">
          <div className="max-w-6xl w-full">
            {/* Hero Section */}
            <div className="text-center mb-6">
              <div className="flex justify-center mb-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full blur-3xl opacity-30 animate-pulse"></div>
                  <GiTreeBranch className="relative w-16 h-16 text-cyan-400" />
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-2">
                Welcome to Idea Forest
              </h1>
              <p className="text-base sm:text-lg text-gray-600">
                Your visual workspace for growing ideas into reality
              </p>
            </div>

            {/* Content Grid - Two Columns on Desktop */}
            <div className="grid lg:grid-cols-2 gap-4 mb-6">
              {/* What is Idea Forest Section */}
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <HiLightBulb className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" />
                  What is Idea Forest?
                </h2>

                <p className="text-sm sm:text-base text-gray-700 mb-4 leading-relaxed">
                  <strong>Idea Forest</strong> is a powerful visual thinking tool that helps you organize, develop, and connect your ideas through interactive tree structures.
                </p>

                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {/* Feature 1 */}
                  <div className="flex flex-col gap-2 p-2 sm:p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                      <GiTreeBranch className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-xs sm:text-sm mb-0.5">Branch & Expand</h3>
                      <p className="text-xs text-gray-600">
                        Create hierarchical structures
                      </p>
                    </div>
                  </div>

                  {/* Feature 2 */}
                  <div className="flex flex-col gap-2 p-2 sm:p-3 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border border-emerald-100">
                    <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-xs sm:text-sm mb-0.5">Connect Trees</h3>
                      <p className="text-xs text-gray-600">
                        Link related idea clusters
                      </p>
                    </div>
                  </div>

                  {/* Feature 3 */}
                  <div className="flex flex-col gap-2 p-2 sm:p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-100">
                    <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                      <HiRocketLaunch className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-xs sm:text-sm mb-0.5">Convert to Tasks</h3>
                      <p className="text-xs text-gray-600">
                        Turn ideas into action
                      </p>
                    </div>
                  </div>

                  {/* Feature 4 */}
                  <div className="flex flex-col gap-2 p-2 sm:p-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-100">
                    <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center">
                      <GiBrain className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-xs sm:text-sm mb-0.5">AI-Powered</h3>
                      <p className="text-xs text-gray-600">
                        Brainstorm with AI assistance
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* How to Get Started Section */}
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <HiSparkles className="w-5 h-5 sm:w-6 sm:h-6 text-pink-500" />
                  How to Get Started
                </h2>

                <div className="space-y-2">
                  <div className="flex gap-2 items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                      1
                    </div>
                    <p className="text-xs sm:text-sm text-gray-700">
                      <strong>Create your first Idea Tree</strong> by clicking the button below
                    </p>
                  </div>

                  <div className="flex gap-2 items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                      2
                    </div>
                    <p className="text-xs sm:text-sm text-gray-700">
                      <strong>Add nodes</strong> using the "+" button or AI to brainstorm ideas
                    </p>
                  </div>

                  <div className="flex gap-2 items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                      3
                    </div>
                    <p className="text-xs sm:text-sm text-gray-700">
                      <strong>Branch your ideas</strong> by clicking "Add Child" to explore deeper
                    </p>
                  </div>

                  <div className="flex gap-2 items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                      4
                    </div>
                    <p className="text-xs sm:text-sm text-gray-700">
                      <strong>Connect related trees</strong> to show relationships between ideas
                    </p>
                  </div>

                  <div className="flex gap-2 items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                      5
                    </div>
                    <p className="text-xs sm:text-sm text-gray-700">
                      <strong>Take action</strong> by converting ideas into tasks
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="text-center">
              <button
                onClick={createNewTree}
                className="px-6 py-3 sm:px-8 sm:py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-2xl hover:from-cyan-600 hover:to-blue-700 transition-all shadow-2xl hover:shadow-cyan-500/50 transform hover:scale-105 font-bold text-base sm:text-lg flex items-center gap-2 sm:gap-3 mx-auto backdrop-blur-xl border border-white/20"
              >
                <GiTreeBranch className="w-5 h-5 sm:w-6 sm:h-6" />
                Create Your First Idea Tree
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
              <p className="text-xs sm:text-sm text-gray-500 mt-3">
                Start organizing your ideas in seconds
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 overflow-hidden">
      {/* Toolbar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center">
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 px-4 py-2 flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FaTree className="w-6 h-6 text-cyan-600" />
            Forest Canvas
          </h1>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span>{summary.total_sessions} Trees</span>
            <span>•</span>
            <span>{summary.total_connections} Connections</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowHelpModal(true)}
            className="px-4 py-2 bg-white/80 backdrop-blur-md text-gray-700 rounded-xl hover:bg-white transition-all shadow-lg font-medium flex items-center gap-2 border border-gray-200"
            title="How to use Idea Forest"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Help
          </button>
          <button
            onClick={createNewTree}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg shadow-cyan-500/50 font-medium flex items-center gap-2 border border-white/20"
          >
            <GiTreeBranch className="w-5 h-5" />
            New Tree
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="w-full h-full cursor-move"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* SVG for connection lines */}
        <svg
          ref={svgRef}
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${scale})`
          }}
        >
          {/* Existing connections */}
          {(summary.connections || []).map((conn) => {
            const fromPos = getCardPosition(conn.from_session_id);
            const toPos = getCardPosition(conn.to_session_id);

            return (
              <g key={conn.id}>
                <line
                  x1={fromPos.x + 150}
                  y1={fromPos.y + 100}
                  x2={toPos.x + 150}
                  y2={toPos.y + 100}
                  stroke={getConnectionColor(conn.connection_type)}
                  strokeWidth="3"
                  strokeDasharray={conn.connection_type === 'alternative_to' ? '5,5' : '0'}
                />
                {conn.label && (
                  <text
                    x={(fromPos.x + toPos.x) / 2 + 150}
                    y={(fromPos.y + toPos.y) / 2 + 100}
                    fill={getConnectionColor(conn.connection_type)}
                    fontSize="12"
                    fontWeight="bold"
                    textAnchor="middle"
                    className="pointer-events-none"
                  >
                    {conn.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Drag connection line */}
          {connectingFrom && dragConnectionPosition && (
            <line
              x1={getHandlePosition(connectingFrom).x}
              y1={getHandlePosition(connectingFrom).y}
              x2={(dragConnectionPosition.x - canvasOffset.x) / scale}
              y2={(dragConnectionPosition.y - canvasOffset.y) / scale}
              stroke="#3B82F6"
              strokeWidth="3"
              strokeDasharray="5,5"
              className="pointer-events-none"
            />
          )}
        </svg>

        {/* Tree Cards */}
        <div
          style={{
            transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${scale})`,
            transformOrigin: '0 0'
          }}
        >
          {(summary.sessions || []).map((session) => {
            const pos = getCardPosition(session.id);
            const isSelected = selectedForConnection.includes(session.id);

            return (
              <div
                key={session.id}
                className={`absolute bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-2xl cursor-pointer transition-all border ${
                  isSelected ? 'ring-4 ring-purple-500/70 border-purple-400/50' : 'border-white/30 hover:shadow-cyan-500/30'
                } ${connectingFrom === session.id ? 'ring-4 ring-cyan-400/70 border-cyan-400/50' : ''} ${
                  connectingFrom && connectingFrom !== session.id && hoveredHandle === session.id ? 'ring-4 ring-green-400/70 border-green-400/50' : ''
                }`}
                style={{
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  width: '300px',
                  borderLeft: `4px solid ${session.color || '#06B6D4'}`
                }}
                onMouseDown={(e) => {
                  if (!connectingFrom) {
                    handleCardMouseDown(session.id, e);
                  }
                }}
                onMouseUp={(e) => {
                  if (connectingFrom && connectingFrom !== session.id) {
                    e.stopPropagation();
                    handleConnectionEnd(session.id);
                  }
                }}
                onMouseEnter={() => {
                  if (connectingFrom && connectingFrom !== session.id) {
                    setHoveredHandle(session.id);
                  }
                }}
                onMouseLeave={() => {
                  if (connectingFrom) {
                    setHoveredHandle(null);
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (e.shiftKey) {
                    toggleConnectionSelection(session.id);
                  }
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  onTreeSelect(session.id);
                }}
              >
                {/* Connection Handle - Single Dot */}
                <div
                  className={`absolute bg-blue-600 border-3 border-white rounded-full shadow-lg cursor-crosshair transition-all z-10 ${
                    hoveredHandle === session.id ? 'w-5 h-5' : 'w-4 h-4'
                  } ${connectingFrom === session.id ? 'opacity-100 scale-125' : 'opacity-80 hover:opacity-100'}`}
                  style={{ right: '-8px', top: '50%', transform: 'translateY(-50%)' }}
                  onMouseDown={(e) => handleConnectionStart(session.id, e)}
                  onMouseUp={(e) => {
                    e.stopPropagation();
                    handleConnectionEnd(session.id);
                  }}
                  onMouseEnter={() => setHoveredHandle(session.id)}
                  onMouseLeave={() => setHoveredHandle(null)}
                />


                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="relative icon-picker-container" style={{ zIndex: editingIconId === session.id ? 10000 : 'auto' }}>
                        <button
                          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${
                            editingIconId === session.id
                              ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg scale-110'
                              : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:scale-105'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingIconId(editingIconId === session.id ? null : session.id);
                          }}
                          title="Click to change icon"
                          type="button"
                        >
                          {getIconComponent(session.icon || 'lightbulb', 'w-6 h-6')}
                        </button>
                        {/* Icon Picker Dropdown */}
                        {editingIconId === session.id && (
                          <>
                            {/* Backdrop */}
                            <div
                              className="fixed inset-0"
                              style={{ zIndex: 9998 }}
                              onClick={() => setEditingIconId(null)}
                            />
                            {/* Picker */}
                            <div
                              className="absolute top-14 left-0 bg-white rounded-2xl shadow-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-200"
                              style={{
                                zIndex: 9999,
                                border: '2px solid transparent',
                                backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                backgroundOrigin: 'border-box',
                                backgroundClip: 'padding-box, border-box',
                                minWidth: '280px'
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                </svg>
                                Choose Icon
                              </div>
                              <div className="grid grid-cols-5 gap-2">
                                {iconOptions.map((option) => {
                                  const IconComp = option.icon;
                                  const isSelected = session.icon === option.value;
                                  return (
                                    <button
                                      key={option.value}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateSessionIcon(session.id, option.value);
                                      }}
                                      className={`group relative w-12 h-12 rounded-xl transition-all duration-200 flex items-center justify-center ${
                                        isSelected
                                          ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg scale-105'
                                          : 'bg-gray-50 text-gray-600 hover:bg-gradient-to-br hover:from-indigo-400 hover:to-purple-500 hover:text-white hover:scale-105 hover:shadow-md'
                                      }`}
                                      title={option.name}
                                      type="button"
                                    >
                                      <IconComp className="w-5 h-5" />
                                      {isSelected && (
                                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                          </svg>
                                        </div>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                      <div>
                        {editingSessionId === session.id ? (
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onBlur={() => updateSessionName(session.id, editingName)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateSessionName(session.id, editingName);
                              } else if (e.key === 'Escape') {
                                setEditingSessionId(null);
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="font-semibold text-gray-900 border border-blue-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                        ) : (
                          <h3
                            className="font-semibold text-gray-900 cursor-pointer hover:text-blue-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSessionId(session.id);
                              setEditingName(session.name);
                            }}
                          >
                            {session.name}
                          </h3>
                        )}
                        {session.is_default && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Default</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(session.id);
                      }}
                      className="text-gray-400 hover:text-red-600"
                    >
                      ×
                    </button>
                  </div>

                  {/* Description */}
                  {editingDescriptionId === session.id ? (
                    <textarea
                      value={editingDescription}
                      onChange={(e) => setEditingDescription(e.target.value)}
                      onBlur={() => updateSessionDescription(session.id, editingDescription)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          updateSessionDescription(session.id, editingDescription);
                        } else if (e.key === 'Escape') {
                          setEditingDescriptionId(null);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full text-sm text-gray-600 mb-4 border border-blue-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={2}
                      autoFocus
                      placeholder="Add a description..."
                    />
                  ) : (
                    <p
                      className="text-sm text-gray-600 mb-4 line-clamp-2 cursor-pointer hover:text-blue-600 min-h-[2.5rem]"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingDescriptionId(session.id);
                        setEditingDescription(session.description || '');
                      }}
                      title={session.description || 'Click to add description'}
                    >
                      {session.description || <span className="text-gray-400 italic">Click to add description...</span>}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Total Nodes</div>
                          <div className="text-sm font-semibold text-gray-900">{session.nodes_count}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Last Updated</div>
                          <div className="text-sm font-semibold text-gray-900">
                            {session.updated_at ? new Date(session.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Today'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="text-xs text-gray-500 text-center">
                    Double-click to open • Drag from blue dot to connect
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Connection Modal */}
      {showConnectionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Connect Trees</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Tree</label>
                <select
                  value={newConnection.from_session_id}
                  onChange={(e) => setNewConnection({ ...newConnection, from_session_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a tree</option>
                  {(summary.sessions || []).map(session => (
                    <option key={session.id} value={session.id}>{session.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Connection Type</label>
                <select
                  value={newConnection.connection_type}
                  onChange={(e) => setNewConnection({ ...newConnection, connection_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="builds_on">Builds On</option>
                  <option value="relates_to">Relates To</option>
                  <option value="alternative_to">Alternative To</option>
                  <option value="extends">Extends</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Tree</label>
                <select
                  value={newConnection.to_session_id}
                  onChange={(e) => setNewConnection({ ...newConnection, to_session_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a tree</option>
                  {(summary.sessions || [])
                    .filter(s => s.id !== newConnection.from_session_id)
                    .map(session => (
                      <option key={session.id} value={session.id}>{session.name}</option>
                    ))
                  }
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Label (Optional)</label>
                <input
                  type="text"
                  value={newConnection.label}
                  onChange={(e) => setNewConnection({ ...newConnection, label: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Connection label..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <textarea
                  value={newConnection.description}
                  onChange={(e) => setNewConnection({ ...newConnection, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                  placeholder="Explain the relationship..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowConnectionModal(false);
                  setSelectedForConnection([]);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createConnection}
                disabled={!newConnection.from_session_id || !newConnection.to_session_id}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Connect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <GiTreeBranch className="w-8 h-8" />
                How to Use Idea Forest
              </h2>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-8">
              {/* What is Idea Forest Section */}
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <HiLightBulb className="w-7 h-7 text-yellow-500" />
                  What is Idea Forest?
                </h3>

                <p className="text-gray-700 text-lg leading-relaxed mb-6">
                  <strong>Idea Forest</strong> is a powerful visual thinking tool that helps you organize, develop, and connect your ideas through interactive tree structures. Each tree represents a thought journey - a space where you can branch ideas, make connections, and transform concepts into action.
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Feature 1 */}
                  <div className="flex gap-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                        <GiTreeBranch className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">Branch & Expand</h4>
                      <p className="text-sm text-gray-600">
                        Start with a seed idea and branch it into sub-ideas, creating a hierarchical structure that mirrors your thinking process.
                      </p>
                    </div>
                  </div>

                  {/* Feature 2 */}
                  <div className="flex gap-4 p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">Connect Trees</h4>
                      <p className="text-sm text-gray-600">
                        Link related idea trees to show how concepts build on, relate to, or extend each other across your project.
                      </p>
                    </div>
                  </div>

                  {/* Feature 3 */}
                  <div className="flex gap-4 p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                        <HiRocketLaunch className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">Convert to Tasks</h4>
                      <p className="text-sm text-gray-600">
                        Transform any idea node into an actionable task, seamlessly moving from ideation to execution.
                      </p>
                    </div>
                  </div>

                  {/* Feature 4 */}
                  <div className="flex gap-4 p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-amber-600 rounded-lg flex items-center justify-center">
                        <GiBrain className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">AI-Powered</h4>
                      <p className="text-sm text-gray-600">
                        Use AI to brainstorm new branches, refine ideas, and get suggestions for expanding your thought trees.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* How to Get Started Section */}
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <HiSparkles className="w-7 h-7 text-pink-500" />
                  Getting Started
                </h3>

                <div className="space-y-4">
                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      1
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Create an Idea Tree</h4>
                      <p className="text-gray-700 text-sm">
                        Click the "New Tree" button to create your first tree. Give it a name that represents your main concept or project theme.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      2
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Add Your First Node</h4>
                      <p className="text-gray-700 text-sm">
                        Once inside a tree, click the "+" button or use AI to brainstorm. Each node can have a title, description, tags, and status (idea/in-progress/completed).
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      3
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Branch Your Ideas</h4>
                      <p className="text-gray-700 text-sm">
                        Select a node and click "Add Child" to create sub-ideas. Build a hierarchy that explores concepts at different levels of detail.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      4
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Connect Related Trees</h4>
                      <p className="text-gray-700 text-sm">
                        Back in the Forest Canvas, drag from the blue connection dot on one tree card to another to create relationships (builds on, relates to, extends, etc.).
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      5
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Convert to Tasks</h4>
                      <p className="text-gray-700 text-sm">
                        When an idea is ready for action, use the "Convert to Task" option on any node to create a task in your Task Management section.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Keyboard Shortcuts */}
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  ⌨️ Canvas Controls
                </h3>

                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-700 text-white rounded flex items-center justify-center text-xs font-mono">
                        🖱️
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">Drag Cards</p>
                        <p className="text-xs text-gray-600">Click and drag to reposition</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-700 text-white rounded flex items-center justify-center text-xs font-mono">
                        2×
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">Open Tree</p>
                        <p className="text-xs text-gray-600">Double-click card</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-700 text-white rounded flex items-center justify-center text-xs font-mono">
                        🔵
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">Connect Trees</p>
                        <p className="text-xs text-gray-600">Drag from blue dot</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-700 text-white rounded flex items-center justify-center text-xs font-mono">
                        🔍
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">Zoom</p>
                        <p className="text-xs text-gray-600">Mouse wheel</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-700 text-white rounded flex items-center justify-center text-xs font-mono">
                        ↔️
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">Pan Canvas</p>
                        <p className="text-xs text-gray-600">Drag background</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-700 text-white rounded flex items-center justify-center text-xs font-mono">
                        ✏️
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">Edit Name</p>
                        <p className="text-xs text-gray-600">Click tree name</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tips & Best Practices */}
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  💡 Tips & Best Practices
                </h3>

                <div className="space-y-3">
                  <div className="flex gap-3 items-start p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex-shrink-0 text-blue-600 text-xl">💭</div>
                    <div>
                      <p className="text-sm text-gray-800">
                        <strong>Start broad, then narrow:</strong> Begin with high-level concepts and branch down into specifics. This helps maintain clarity.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div className="flex-shrink-0 text-emerald-600 text-xl">🏷️</div>
                    <div>
                      <p className="text-sm text-gray-800">
                        <strong>Use tags consistently:</strong> Create a tagging system (e.g., #urgent, #research, #frontend) to filter and organize nodes.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex-shrink-0 text-purple-600 text-xl">🔄</div>
                    <div>
                      <p className="text-sm text-gray-800">
                        <strong>Update node status:</strong> Mark nodes as "in-progress" or "completed" to track your idea development journey.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex-shrink-0 text-amber-600 text-xl">🤖</div>
                    <div>
                      <p className="text-sm text-gray-800">
                        <strong>Leverage AI:</strong> Use the AI brainstorm feature when you're stuck or want to explore new angles on an idea.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-2xl border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md font-semibold"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForestCanvas;
