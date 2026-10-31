import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GiTreeBranch, GiBrain, GiPineTree } from 'react-icons/gi';
import { HiLightBulb, HiRocketLaunch, HiSparkles } from 'react-icons/hi2';
import { FaStar, FaFire, FaChartBar, FaBullseye } from 'react-icons/fa';
import config from '../../../config';
import fetchWithAuth from '../../../hooks/fetchWithAuth';
import QuickNodeCreator from './QuickNodeCreator';
import NodeViewer from './NodeViewer';
import IdeaTreeSidebar from './IdeaTreeSidebar';
import IdeaTreeFlowCanvas from './IdeaTreeFlowCanvas';
import { IdeaNode, NodeConnection, IdeaThread } from '../../../types/project/ideaForest';

const { AI_AGENT_URL, API_BASE_URL } = config;

interface IdeaTreeProps {
  projectId: string;
  sessionId?: string | null;
}

const IdeaTree: React.FC<IdeaTreeProps> = ({ projectId, sessionId }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [nodes, setNodes] = useState<IdeaNode[]>([]);
  const [connections, setConnections] = useState<NodeConnection[]>([]);
  const [threads, setThreads] = useState<IdeaThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get initial values from URL
  const initialNodeId = searchParams.get('nodeId');
  const initialTab = searchParams.get('tab') as 'details' | 'chat' | 'versions' | null;

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(initialNodeId);
  const [sidebarOpen, setSidebarOpen] = useState(!!initialNodeId);
  const [activeTab, setActiveTab] = useState<'details' | 'chat' | 'versions'>(initialTab || 'details');
  const [initialChatPrompt, setInitialChatPrompt] = useState<string>(''); // For auto-sending first message
  const [scale, setScale] = useState(1);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [viewingNode, setViewingNode] = useState<IdeaNode | null>(null);
  const [showNodeViewer, setShowNodeViewer] = useState(false);
  const [showQuickCreator, setShowQuickCreator] = useState(false);
  const [quickCreatorContext, setQuickCreatorContext] = useState<{ parentId?: string; position?: { x: number; y: number } }>({});
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [sessionName, setSessionName] = useState('Idea Forest');
  const [sessionDescription, setSessionDescription] = useState('');
  const [sessionIcon, setSessionIcon] = useState<string>('lightbulb');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [editingIconId, setEditingIconId] = useState<string | null>(null);
  const [projectTitle, setProjectTitle] = useState<string>('');
  const [projectGoals, setProjectGoals] = useState<string>('');
  const [firstMessage, setFirstMessage] = useState<string>('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('personalized');
  const [categories, setCategories] = useState<any[]>([]);
  const [isEditingMessage, setIsEditingMessage] = useState(false);
  const [personalizedSuggestions, setPersonalizedSuggestions] = useState<any[]>([]);
  const [loadingPersonalizedSuggestions, setLoadingPersonalizedSuggestions] = useState(false);
  const [suggestionLoadingMessage, setSuggestionLoadingMessage] = useState('🔄 Preparing personalized suggestions...');
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use refs to prevent re-fetching
  const lastFetchedProjectId = useRef<string | null>(null);
  const fetchInProgress = useRef(false);

  // Debug: Monitor initialChatPrompt state changes
  useEffect(() => {
    // console.log('[IdeaTree] initialChatPrompt state changed to:', initialChatPrompt ? initialChatPrompt.substring(0, 50) : '(empty)');
  }, [initialChatPrompt]);

  useEffect(() => {
    // Only fetch if projectId changed and not already fetching
    if (projectId && projectId !== lastFetchedProjectId.current && !fetchInProgress.current) {
      fetchIdeaTreeData();
    }
  }, [projectId]);

  // Fetch project details for context-aware suggestions
  useEffect(() => {
    const fetchProjectDetails = async () => {
      if (!projectId) return;

      try {
        // Use the same endpoint as ProjectDashboard for consistency
        const response = await fetchWithAuth(`${API_BASE_URL}/api/project/${projectId}`);

        if (response.ok) {
          const project = await response.json();
          // console.log('[IdeaTree] Fetched project data:', {
          //   title: project.title,
          //   name: project.name,
          //   goals: project.goals,
          //   description: project.description,
          //   fullProject: project
          // });
          setProjectTitle(project.title || project.name || '');
          setProjectGoals(project.goals || project.description || '');
        } else {
          // console.error('[IdeaTree] Failed to fetch project details - Status:', response.status);
        }
      } catch (error) {
        // console.error('Failed to fetch project details:', error);
      }
    };

    fetchProjectDetails();
  }, [projectId]);

  // Fetch categories from AI service
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${AI_AGENT_URL}/ai-api/templates/categories`);
        if (response.ok) {
          const categoriesData = await response.json();
          setCategories(categoriesData);
        } else {
          // console.error(...);
        }
      } catch (error) {
        // console.error(...);
      }
    };

    fetchCategories();
  }, []);

  // Fetch templates when category changes (skip for personalized)
  useEffect(() => {
    const fetchTemplates = async () => {
      setLoadingTemplates(true);
      try {
        const response = await fetch(`${AI_AGENT_URL}/ai-api/templates/category/${selectedCategory}?limit=20`);

        if (response.ok) {
          const templatesData = await response.json();
          setTemplates(templatesData);
        } else {
          // console.error(...);
          setTemplates([]);
        }
      } catch (error) {
        // console.error(...);
        setTemplates([]);
      } finally {
        setLoadingTemplates(false);
      }
    };

    if (selectedCategory && selectedCategory !== 'personalized') {
      fetchTemplates();
    }
  }, [selectedCategory]);


  // Fetch session name, description, and icon when sessionId changes
  useEffect(() => {
    const fetchSessionName = async () => {
      if (sessionId) {
        try {
          const response = await fetch(`${AI_AGENT_URL}/ai-api/tree-sessions/${sessionId}`);
          if (response.ok) {
            const session = await response.json();
            // console.log(...);
            // console.log(...);
            setSessionName(session.name || 'Idea Forest');
            setSessionDescription(session.description || '');
            setSessionIcon(session.icon || 'lightbulb');
          }
        } catch (error) {
          // console.error(...);
        }
      }
    };
    fetchSessionName();
  }, [sessionId]);

  // Generate personalized suggestions based on project context
  useEffect(() => {
    const generatePersonalizedSuggestions = async () => {
      // console.log('[PersonalizedSuggestions] useEffect triggered:', { projectId, nodesLength: nodes.length, projectTitle, projectGoals });

      // Only generate if we have a project and the tree is empty
      if (!projectId || nodes.length > 0) {
        // console.log(...);
        return;
      }

      // Wait for project details to load (at least title or goals must be present)
      // Allow generation even with minimal context - AI will provide generic suggestions
      if (!projectTitle && !projectGoals) {
        // console.log(...);
        // Don't return - proceed with empty context
      }

      // console.log(...);

      setLoadingPersonalizedSuggestions(true);
      setSuggestionLoadingMessage('📋 Gathering project context...');
      // console.log(...);

      try {
        // Fetch project context data
        setSuggestionLoadingMessage('🔍 Analyzing tasks, milestones, and plans...');
        const [tasksResponse, milestonesResponse, plansResponse] = await Promise.all([
          fetchWithAuth(`${API_BASE_URL}/api/tasks/project/${projectId}`).catch(() => null),
          fetchWithAuth(`${API_BASE_URL}/api/project/${projectId}/milestones`).catch(() => null),
          fetchWithAuth(`${API_BASE_URL}/api/projects/${projectId}/plans`).catch(() => null)
        ]);

        // console.log('[PersonalizedSuggestions] Fetched context responses:', {
        //   tasksOk: tasksResponse?.ok,
        //   milestonesOk: milestonesResponse?.ok,
        //   plansOk: plansResponse?.ok
        // });

        let tasks: any[] = [];
        let milestones: any[] = [];
        let plans: any[] = [];

        if (tasksResponse?.ok) {
          const tasksData = await tasksResponse.json();
          // Handle both array and object responses
          tasks = Array.isArray(tasksData) ? tasksData : (tasksData?.tasks || []);
        }

        if (milestonesResponse?.ok) {
          const milestonesData = await milestonesResponse.json();
          // Handle both array and object responses
          milestones = Array.isArray(milestonesData) ? milestonesData : (milestonesData?.milestones || []);
        }

        if (plansResponse?.ok) {
          const plansData = await plansResponse.json();
          // Handle both array and object responses
          plans = Array.isArray(plansData) ? plansData : (plansData?.plans || []);
        }

        // console.log('[PersonalizedSuggestions] Parsed context data:', {
        //   tasksCount: tasks.length,
        //   milestonesCount: milestones.length,
        //   plansCount: plans.length
        // });

        // Build context summary (works even with minimal data)
        const contextSummary = {
          projectTitle: projectTitle || 'Untitled Project',
          projectGoals: projectGoals || '',
          tasksCount: tasks.length,
          milestonesCount: milestones.length,
          plansCount: plans.length,
          recentTasks: tasks.slice(0, 5).map((t: any) => ({ title: t.title, status: t.status })),
          recentMilestones: milestones.slice(0, 3).map((m: any) => ({ title: m.title, status: m.status })),
          recentPlans: plans.slice(0, 3).map((p: any) => ({ title: p.title, plan_type: p.plan_type }))
        };

        // console.log('[PersonalizedSuggestions] Context summary:', contextSummary);

        // Call AI service to generate personalized suggestions
        setSuggestionLoadingMessage('✨ AI is generating personalized suggestions for your project... (this may take 10-30 seconds)');
        const url = `${AI_AGENT_URL}/ai-api/idea-tree/personalized-suggestions`;
        // console.log(...);

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_context: contextSummary,
            count: 4 // Generate 4 suggestions
          })
        });

        // console.log('[PersonalizedSuggestions] AI service response:', { ok: response.ok, status: response.status });

        if (response.ok) {
          const data = await response.json();
          // console.log(...);
          setPersonalizedSuggestions(data.suggestions || []);
        } else {
          // console.error(...);
          setPersonalizedSuggestions([]);
        }
      } catch (error) {
        // console.error(...);
        setPersonalizedSuggestions([]);
      } finally {
        setLoadingPersonalizedSuggestions(false);
        // console.log(...);
      }
    };

    generatePersonalizedSuggestions();
  }, [projectId, projectTitle, projectGoals, nodes.length]);

  const updateSessionName = async (newName: string) => {
    if (!sessionId || !newName.trim()) return;

    try {
      await fetch(`${AI_AGENT_URL}/ai-api/tree-sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() })
      });
      setSessionName(newName.trim());
      setIsEditingName(false);
    } catch (error) {
      // console.error(...);
    }
  };

  const updateSessionIcon = async (newIcon: string) => {
    if (!sessionId) return;

    try {
      // Optimistic update
      setSessionIcon(newIcon);
      setEditingIconId(null);

      // Update backend
      const response = await fetch(`${AI_AGENT_URL}/ai-api/tree-sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ icon: newIcon })
      });

      if (!response.ok) {
        // console.error(...);
        // Revert on failure
        const refreshResponse = await fetch(`${AI_AGENT_URL}/ai-api/tree-sessions/${sessionId}`);
        if (refreshResponse.ok) {
          const session = await refreshResponse.json();
          setSessionIcon(session.icon || 'lightbulb');
        }
      }
    } catch (error) {
      // console.error(...);
    }
  };

  // Icon options - same as ForestCanvas
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

  const fetchIdeaTreeData = async () => {
    // Prevent concurrent fetches
    if (fetchInProgress.current) return;

    fetchInProgress.current = true;
    lastFetchedProjectId.current = projectId;

    try {
      setLoading(true);
      setError(null);

      // Include session_id in query parameters to filter nodes for this specific tree session
      const url = new URL(`${AI_AGENT_URL}/ai-api/projects/${projectId}/idea-tree`);
      if (sessionId) {
        url.searchParams.append('session_id', sessionId);
      }

      const response = await fetch(url.toString());

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      setNodes(data.nodes || []);
      setConnections(data.connections || []);
      setThreads(data.threads || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load idea forest');
      // console.error(...);
    } finally {
      setLoading(false);
      fetchInProgress.current = false;
    }
  };

  const handleNodeSelect = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setSidebarOpen(true);

    // Update URL with nodeId and current tab
    const newParams = new URLSearchParams(searchParams);
    newParams.set('nodeId', nodeId);
    if (!newParams.has('tab')) {
      newParams.set('tab', 'details');
      setActiveTab('details');
    }

    // IMPORTANT: Clear chatSessionId when switching to a different node
    // Each node has its own chat sessions, so the old session ID doesn't apply
    newParams.delete('chatSessionId');

    setSearchParams(newParams, { replace: true });
  };

  const handleNodeCreatedWithPrompt = async (nodeId: string, initialPrompt: string) => {
    // console.log(...);

    // Refresh tree data to show the new node
    await fetchIdeaTreeData();

    // Select the new node and open chat tab
    setSelectedNodeId(nodeId);
    setSidebarOpen(true);
    setActiveTab('chat');

    // Set the initial prompt to be sent automatically
    setInitialChatPrompt(initialPrompt);
    // console.log(...);

    // Update URL
    const newParams = new URLSearchParams(searchParams);
    newParams.set('nodeId', nodeId);
    newParams.set('tab', 'chat');

    // IMPORTANT: Clear chatSessionId when creating/opening a new node
    // This new node doesn't have chat sessions yet, so any existing session ID is invalid
    newParams.delete('chatSessionId');

    setSearchParams(newParams, { replace: true });

    // Close the quick creator
    setShowQuickCreator(false);
    setQuickCreatorContext({});
  };

  const handleTabChange = (tab: 'details' | 'chat' | 'versions') => {
    setActiveTab(tab);

    // Update URL with new tab
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', tab);
    setSearchParams(newParams, { replace: true });
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
    setSelectedNodeId(null);

    // Remove nodeId, tab, and chatSessionId from URL
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('nodeId');
    newParams.delete('tab');
    newParams.delete('chatSessionId');
    setSearchParams(newParams, { replace: true });
  };

  const handleNodePositionUpdate = useCallback(async (nodeId: string, position: { x: number; y: number }) => {
    setNodes(prevNodes =>
      prevNodes.map(node =>
        node.id === nodeId ? { ...node, position } : node
      )
    );

    // Update position in AI agent
    try {
      await fetch(`${AI_AGENT_URL}/ai-api/idea-tree/nodes/${nodeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position }),
      });
    } catch (error) {
      // console.error(...);
    }
  }, []);
  
  const handleToggleExpand = useCallback(async (nodeId: string) => {
    // console.log(...);

    const node = nodes.find(n => n.id === nodeId);
    if (!node) {
      // console.log(...);
      return;
    }

    const newExpandedState = !node.expanded;
    // console.log('[IdeaTree] 📊 Toggling expanded state:', {
    //   nodeId,
    //   nodeTitle: node.title,
    //   currentState: node.expanded,
    //   newState: newExpandedState
    // });

    // Update local state immediately for responsive UI
    setNodes(prevNodes =>
      prevNodes.map(n =>
        n.id === nodeId ? { ...n, expanded: newExpandedState } : n
      )
    );
    // console.log(...);

    // Update in AI agent backend
    try {
      const response = await fetch(`${AI_AGENT_URL}/ai-api/idea-tree/nodes/${nodeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expanded: newExpandedState }),
      });

      if (response.ok) {
        // console.log(...);
      } else {
        // console.error(...);
      }
    } catch (error) {
      // console.error(...);
    }
  }, [nodes]);
  
  // Check if a node has children
  const nodeHasChildren = useCallback((nodeId: string): boolean => {
    return nodes.some(n => n.parent_id === nodeId);
  }, [nodes]);
  
  // Mark nodes with visibility (using hidden property for React Flow)
  const nodesWithVisibility = useMemo(() => {
    const collapsedParents = new Set<string>();

    // Find all collapsed parent nodes
    nodes.forEach(node => {
      if (!node.expanded && nodeHasChildren(node.id)) {
        collapsedParents.add(node.id);
        // console.log(...);
      }
    });

    // Check each node if it should be hidden
    const shouldHideNode = (node: IdeaNode): boolean => {
      if (!node.parent_id) return false; // Root nodes are never hidden

      // Check if any ancestor is collapsed
      let currentParentId: string | null = node.parent_id;
      while (currentParentId) {
        if (collapsedParents.has(currentParentId)) {
          // console.log(...);
          return true;
        }
        const parent = nodes.find(n => n.id === currentParentId);
        currentParentId = parent?.parent_id || null;
      }
      return false;
    };

    // Add hidden property to all nodes
    const nodesWithHidden = nodes.map(node => ({
      ...node,
      hidden: shouldHideNode(node)
    }));

    const hiddenCount = nodesWithHidden.filter(n => n.hidden).length;
    // console.log('[IdeaTree] 👁️ Nodes with visibility:', {
    //   total: nodes.length,
    //   visible: nodes.length - hiddenCount,
    //   hidden: hiddenCount
    // });

    return nodesWithHidden;
  }, [nodes, nodeHasChildren]);

  const handleNodeAction = useCallback(async (nodeId: string, action: string) => {
    // console.log('[IdeaTree] 📢 handleNodeAction called:', { nodeId, action });

    switch (action) {
      case 'toggle-expand':
        // console.log(...);
        // Toggle expand/collapse for the node
        handleToggleExpand(nodeId);
        break;

      case 'add-child':
        // Open quick creator with parent context
        const parentNode = nodes.find(n => n.id === nodeId);
        if (parentNode) {
          // Suggest a position below parent (QuickNodeCreator will refine to avoid overlaps)
          const siblings = nodes.filter(n => n.parent_id === nodeId);
          const parentX = parentNode.position?.x || 0;
          const parentY = parentNode.position?.y || 0;

          // Position below parent, centered based on sibling count
          const suggestedX = parentX + (siblings.length * 330) - (siblings.length * 330) / 2;
          const suggestedY = parentY + 250; // Below parent with spacing

          setQuickCreatorContext({
            parentId: nodeId,
            position: { x: suggestedX, y: suggestedY }
          });
          setShowQuickCreator(true);

          // Make sure parent is expanded
          if (!parentNode.expanded) {
            handleToggleExpand(nodeId);
          }
        }
        break;

      case 'chat':
        // Open sidebar chat tab for this node
        handleNodeSelect(nodeId);
        setActiveTab('chat');
        break;

      case 'edit':
      case 'edit-properties':
        // Open sidebar details tab for this node
        handleNodeSelect(nodeId);
        setActiveTab('details');
        break;

      case 'connect':
        // TODO: Implement connection creation
        // console.log(...);
        break;
      
      case 'delete':
        if (confirm('Are you sure you want to delete this node and all its children?')) {
          try {
            const response = await fetch(`${AI_AGENT_URL}/ai-api/idea-tree/nodes/${nodeId}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                'Content-Type': 'application/json'
              }
            });

            if (response.ok) {
              await fetchIdeaTreeData();
              if (selectedNodeId === nodeId) {
                setSelectedNodeId(null);
                setSidebarOpen(false);
              }
              // Show success message
              alert('Node deleted successfully');
            } else {
              const errorData = await response.json();
              throw new Error(errorData.detail || 'Failed to delete node');
            }
          } catch (error) {
            // console.error(...);
            alert(`Failed to delete node: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        break;
    }
  }, [nodes, projectId, selectedNodeId, handleToggleExpand]);

  // Handle connection creation for React Flow
  const handleConnectionCreate = useCallback(async (fromId: string, toId: string, type: string = 'related') => {
    try {
      const response = await fetch(`${AI_AGENT_URL}/ai-api/projects/${projectId}/idea-tree/connections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from_node_id: fromId,
          to_node_id: toId,
          connection_type: type,
        }),
      });

      if (response.ok) {
        await fetchIdeaTreeData();
      }
    } catch (error) {
      // console.error(...);
    }
  }, [projectId]);

  // Handle connection deletion for React Flow
  const handleConnectionDelete = useCallback(async (connectionId: string) => {
    try {
      const response = await fetch(`${AI_AGENT_URL}/ai-api/idea-tree/connections/${connectionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchIdeaTreeData();
      }
    } catch (error) {
      // console.error(...);
    }
  }, []);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.3));
  const handleResetZoom = () => {
    setScale(1);
    setCanvasOffset({ x: 0, y: 0 });
  };
  const handleFullScreen = () => {
    if (!containerRef.current) return;
    
    if (!isFullScreen) {
      // Enter full screen
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if ((containerRef.current as any).webkitRequestFullscreen) {
        (containerRef.current as any).webkitRequestFullscreen();
      } else if ((containerRef.current as any).mozRequestFullScreen) {
        (containerRef.current as any).mozRequestFullScreen();
      } else if ((containerRef.current as any).msRequestFullscreen) {
        (containerRef.current as any).msRequestFullscreen();
      }
      setIsFullScreen(true);
    } else {
      // Exit full screen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
      setIsFullScreen(false);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullScreenChange);
    document.addEventListener('mozfullscreenchange', handleFullScreenChange);
    document.addEventListener('MSFullscreenChange', handleFullScreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullScreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullScreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullScreenChange);
    };
  }, []);

  // Listen for tree refresh events (triggered when nodes are created via AI suggestions)
  useEffect(() => {
    const handleTreeRefresh = () => {
      // console.log(...);
      fetchIdeaTreeData();
    };

    window.addEventListener('idea-tree-refresh', handleTreeRefresh);

    return () => {
      window.removeEventListener('idea-tree-refresh', handleTreeRefresh);
    };
  }, [fetchIdeaTreeData]);

  // Listen for node-created events (triggered when AI creates a new node)
  useEffect(() => {
    const handleNodeCreated = async (event: any) => {
      const { nodeId, initialPrompt } = event.detail;
      // console.log(...);

      // Refresh tree data to show the new node
      await fetchIdeaTreeData();

      // Select the new node and open chat tab
      setSelectedNodeId(nodeId);
      setSidebarOpen(true);
      setActiveTab('chat');

      // Set the initial prompt to be sent automatically if provided
      if (initialPrompt) {
        setInitialChatPrompt(initialPrompt);
        // console.log(...);
      }

      // Update URL
      const newParams = new URLSearchParams(searchParams);
      newParams.set('nodeId', nodeId);
      newParams.set('tab', 'chat');
      newParams.delete('chatSessionId'); // Clear session ID for new node

      setSearchParams(newParams, { replace: true });
    };

    window.addEventListener('node-created', handleNodeCreated);

    return () => {
      window.removeEventListener('node-created', handleNodeCreated);
    };
  }, [fetchIdeaTreeData, searchParams, setSearchParams]);

  // Handle keyboard shortcuts for zoom and fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle F11 for fullscreen
      if (e.key === 'F11') {
        e.preventDefault();
        handleFullScreen();
      }
      // Handle Escape to exit fullscreen
      else if (e.key === 'Escape' && isFullScreen) {
        e.preventDefault();
        handleFullScreen();
      }
      // Handle zoom shortcuts
      else if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          handleZoomIn();
        } else if (e.key === '-') {
          e.preventDefault();
          handleZoomOut();
        } else if (e.key === '0') {
          e.preventDefault();
          handleResetZoom();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen]);

  // Handle mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setScale(prev => Math.min(Math.max(prev + delta, 0.3), 3));
    }
  }, []);

  // Handle panning and closing sidebars
  const handleMouseDown = (e: React.MouseEvent) => {
    // Check if we're clicking on the canvas background (not on a node)
    const target = e.target as HTMLElement;
    const isCanvas = target.id === 'idea-tree-canvas' || target.closest('#idea-tree-canvas-container');
    const isNode = target.closest('.draggable-node');
    
    // Close sidebar and NodeViewer when clicking outside of nodes
    if (!isNode) {
      if (sidebarOpen) {
        setSidebarOpen(false);
        setSelectedNodeId(null);
      }
      if (showNodeViewer) {
        setShowNodeViewer(false);
        setViewingNode(null);
      }
    }
    
    // Allow panning with left click on empty canvas, middle click, or Alt+Left click
    if ((e.button === 0 && isCanvas && !isNode) || e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - canvasOffset.x, y: e.clientY - canvasOffset.y });
    }
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      e.preventDefault();
      setCanvasOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  }, [isPanning, panStart]);

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleNodeUpdated = () => {
    fetchIdeaTreeData();
  };

  const handleCreateNewNode = () => {
    setQuickCreatorContext({});
    setShowQuickCreator(true);
  };

  const handleCreateFirstNode = async () => {
    // Check if there's already a root node
    const hasRootNode = nodes.some(n => n.is_root);
    if (hasRootNode) {
      setError('A root node already exists for this project');
      return;
    }

    if (!firstMessage.trim()) {
      setError('Please enter a message or select a template to get started');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const nodeData = {
        session_id: sessionId,
        title: 'Project Root',
        description: 'This is the main idea for your project',
        position: { x: 500, y: 100 },
        color: '#6366f1',
        icon: 'tree',
        is_root: true
      };

      const response = await fetch(`${AI_AGENT_URL}/ai-api/projects/${projectId}/idea-tree/nodes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(nodeData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP error! status: ${response.status}`);
      }

      const newNode = await response.json();

      // Refresh the idea tree after creating the node
      await fetchIdeaTreeData();

      // Set the initial chat prompt so it auto-sends when node is selected
      setInitialChatPrompt(firstMessage);

      // Select the new node and open chat tab
      setSelectedNodeId(newNode.id);
      setSidebarOpen(true);
      setActiveTab('chat');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create node');
      // console.error(...);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics dynamically - fully dynamic from data
  const stats = useMemo(() => {
    return {
      total: nodes.length,
      connections: connections.length,
    };
  }, [nodes, connections]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading idea forest...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-50 h-full">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-600">
          <h3 className="font-semibold mb-2">Error Loading Idea Forest</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* Header */}
      <header className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl px-6 py-4 border-b border-white/20 flex justify-between items-start z-50 flex-shrink-0 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50">
        <div className="flex items-start gap-3">
          <div className="relative icon-picker-container" style={{ zIndex: editingIconId === 'tree-header' ? 10000 : 'auto' }}>
            <button
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${
                editingIconId === 'tree-header'
                  ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg scale-110'
                  : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white hover:scale-105 shadow-lg'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setEditingIconId(editingIconId === 'tree-header' ? null : 'tree-header');
              }}
              title="Click to change icon"
              type="button"
            >
              {getIconComponent(sessionIcon, 'w-6 h-6')}
            </button>
            {/* Icon Picker Dropdown */}
            {editingIconId === 'tree-header' && (
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
                      const isSelected = sessionIcon === option.value;
                      return (
                        <button
                          key={option.value}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateSessionIcon(option.value);
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
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            {isEditingName ? (
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => updateSessionName(editingName)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    updateSessionName(editingName);
                  } else if (e.key === 'Escape') {
                    setIsEditingName(false);
                  }
                }}
                className="text-xl font-semibold text-gray-800 border border-blue-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            ) : (
              <div className="flex items-center gap-2">
                <h1
                  className="text-xl font-semibold text-slate-800 cursor-pointer hover:text-teal-600 transition-colors"
                  onClick={() => {
                    setIsEditingName(true);
                    setEditingName(sessionName);
                  }}
                >
                  {sessionName}
                </h1>
                <span className="px-3 py-1 text-xs bg-white border border-slate-300 rounded-full text-slate-700 font-semibold shadow-sm flex-shrink-0">
                  {stats.total} nodes
                </span>
              </div>
            )}
            {sessionDescription && (
              <p className="text-sm text-slate-600 line-clamp-2 max-w-2xl">
                {sessionDescription}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Stats Bar - Simple */}
      <div className="px-6 py-3 bg-white/40 dark:bg-slate-900/40 backdrop-blur-lg border-b border-white/20 flex items-center gap-4 text-sm flex-shrink-0 shadow-md shadow-slate-200/30 overflow-x-auto">
        {/* Connections Count */}
        {stats.connections > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-lg">
            <span className="text-purple-600 font-medium">🔗 Links</span>
            <span className="font-bold text-purple-700">{stats.connections}</span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div 
        ref={containerRef}
        id="idea-tree-canvas-container"
        className="flex-1 overflow-hidden relative bg-gray-50"
      >
        {/* Full Screen Header */}
        {isFullScreen && (
          <div className="absolute top-0 left-0 right-0 z-50 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-lg shadow-slate-200/50 border-b border-white/20">
            <div className="flex items-center justify-between px-6 py-3">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold text-gray-900">Idea Forest Canvas</h2>
                <span className="text-sm text-gray-500">|</span>
                <span className="text-sm text-gray-600">Project: {projectId}</span>
                <span className="text-sm text-gray-500">|</span>
                <span className="text-sm text-gray-600">{nodes.length} nodes</span>
                
                {/* Quick Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => {
                      setQuickCreatorContext({});
                      setShowQuickCreator(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Node
                  </button>
                  
                  <button
                    onClick={fetchIdeaTreeData}
                    className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Zoom Controls for Canvas */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={handleZoomOut}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                      title="Zoom Out"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                      </svg>
                    </button>
                    <span className="px-2 text-sm text-gray-600">
                      {Math.round(scale * 100)}%
                    </span>
                    <button
                      onClick={handleZoomIn}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                      title="Zoom In"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                      </svg>
                    </button>
                    <button
                      onClick={handleResetZoom}
                      className="p-1 hover:bg-gray-200 rounded transition-colors ml-1"
                      title="Reset Zoom"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>

                {/* Exit Full Screen Button */}
                <button
                  onClick={handleFullScreen}
                  className="flex items-center gap-2 px-4 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                  </svg>
                  Exit Full Screen
                </button>
              </div>
            </div>
          </div>
        )}
        {nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full overflow-y-auto">
            <div className="max-w-5xl w-full">
              {/* Main Welcome Card */}
              <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/30 rounded-2xl shadow-2xl p-4">
                <div className="text-center mb-3">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <GiTreeBranch className="w-6 h-6 text-blue-600" />
                    <h2 className="text-xl font-bold text-blue-900">Welcome to IdeaTree!</h2>
                  </div>
                  <p className="text-xs text-blue-700">
                    Transform your ideas into actionable project plans with ProjectUp IdeaTree
                  </p>
                </div>

                {/* Message Input Section */}
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-xl p-3 border border-white/40 shadow-lg mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    💬 What Would You Like to Explore?
                  </h3>
                  {/* Display formatted prompt if it contains placeholders and not in edit mode */}
                  {firstMessage && firstMessage.includes('[') && !isEditingMessage ? (
                    <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded text-xs leading-relaxed max-h-40 overflow-y-auto">
                      {firstMessage.split(/(\[.*?\]|\(\d+\)[^(]*)/g).map((part, idx) => {
                        // Highlight placeholders in brackets
                        if (part.startsWith('[') && part.endsWith(']')) {
                          return (
                            <span key={idx} className="bg-yellow-200 text-yellow-900 px-1 py-0.5 rounded font-semibold">
                              {part}
                            </span>
                          );
                        }
                        // Format numbered items on separate lines
                        if (part.match(/^\(\d+\)/)) {
                          return (
                            <div key={idx} className="mt-1">
                              {part.split(/(\[.*?\])/g).map((subpart, subidx) =>
                                subpart.startsWith('[') && subpart.endsWith(']') ? (
                                  <span key={subidx} className="bg-yellow-200 text-yellow-900 px-1 py-0.5 rounded font-semibold">
                                    {subpart}
                                  </span>
                                ) : (
                                  <span key={subidx}>{subpart}</span>
                                )
                              )}
                            </div>
                          );
                        }
                        return <span key={idx}>{part}</span>;
                      })}
                    </div>
                  ) : (
                    <textarea
                      value={firstMessage}
                      onChange={(e) => setFirstMessage(e.target.value)}
                      placeholder="Type your message here, or click a template below..."
                      className="w-full h-32 px-3 py-2 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-gray-900 placeholder-gray-400 text-xs"
                    />
                  )}
                  {error && firstMessage.trim() === '' && (
                    <p className="text-xs text-red-600 mt-1">{error}</p>
                  )}
                  {firstMessage && firstMessage.includes('[') && !isEditingMessage && (
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => setIsEditingMessage(true)}
                        className="text-xs px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-medium transition-colors"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => {
                          setFirstMessage('');
                          setIsEditingMessage(false);
                        }}
                        className="text-xs px-3 py-1 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 font-medium transition-colors"
                      >
                        🗑️ Clear
                      </button>
                    </div>
                  )}
                </div>

                {/* Template Section with Category Tabs */}
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-xl p-3 border border-white/40 shadow-lg mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <HiLightBulb className="w-4 h-4 text-yellow-500" />
                    Choose a Template or Suggestion:
                  </h3>

                  {/* Category Tabs */}
                  <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1">
                    {[
                      { id: 'personalized', name: 'For You', icon: '✨', color: '#8b5cf6' },
                      { id: 'datascience', name: 'Data Science', icon: '🤖', color: '#3b82f6' },
                      { id: 'computer-science', name: 'CS', icon: '💻', color: '#ec4899' },
                      { id: 'design', name: 'Design', icon: '🎨', color: '#f59e0b' },
                      { id: 'product', name: 'Product', icon: '🎯', color: '#ec4899' },
                      { id: 'planning', name: 'Planning', icon: '📋', color: '#6366f1' },
                      { id: 'biology', name: 'Biology', icon: '🧬', color: '#10b981' },
                      { id: 'medicine', name: 'Medicine', icon: '🏥', color: '#ef4444' },
                      { id: 'engineering', name: 'Engineering', icon: '⚙️', color: '#64748b' },
                      { id: 'finance', name: 'Finance', icon: '💰', color: '#8b5cf6' },
                      { id: 'business', name: 'Business', icon: '💼', color: '#06b6d4' },
                      { id: 'marketing', name: 'Marketing', icon: '📢', color: '#ec4899' },
                      { id: 'research', name: 'Research', icon: '🔬', color: '#6366f1' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                          selectedCategory === cat.id
                            ? 'bg-gradient-to-r text-white shadow-sm'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        style={
                          selectedCategory === cat.id
                            ? { background: `linear-gradient(135deg, ${cat.color}, ${cat.color}dd)` }
                            : {}
                        }
                      >
                        <span className="text-sm">{cat.icon}</span>
                        <span className="hidden sm:inline">{cat.name}</span>
                      </button>
                    ))}
                  </div>

                  {/* Templates Grid or Personalized Suggestions */}
                  {selectedCategory === 'personalized' ? (
                    loadingPersonalizedSuggestions ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="flex flex-col items-center gap-3 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                          {/* Simple spinning ring */}
                          <div className="relative">
                            <div className="w-12 h-12 border-3 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <HiSparkles className="w-5 h-5 text-purple-500 animate-pulse" />
                            </div>
                          </div>

                          {/* Text */}
                          <div className="text-center space-y-1">
                            <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                              <span>✨</span>
                              <span>{suggestionLoadingMessage}</span>
                            </p>
                            <p className="text-xs text-gray-600">Creating domain-specific suggestions for you</p>

                            {/* Animated dots */}
                            <div className="flex justify-center gap-1 pt-2">
                              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : personalizedSuggestions.length > 0 ? (
                      <div className="grid md:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                        {personalizedSuggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setFirstMessage(suggestion.prompt || suggestion.title);
                              setIsEditingMessage(false);
                            }}
                            className="text-left p-3 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg hover:border-purple-400 hover:shadow-md transition-all group"
                          >
                            <div className="flex items-start gap-2 mb-1.5">
                              <div className="text-xl">{suggestion.icon || '💡'}</div>
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-xs text-purple-900 group-hover:text-purple-700 mb-1 line-clamp-2">
                                  {suggestion.title}
                                </div>
                                <div className="text-xs text-gray-600 line-clamp-2">{suggestion.description}</div>
                              </div>
                            </div>
                            {suggestion.reason && (
                              <div className="mt-2 pt-2 border-t border-purple-100">
                                <p className="text-xs text-purple-700 italic">
                                  💭 {suggestion.reason}
                                </p>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-gray-500 text-xs">
                        <p className="mb-2">✨ Generating personalized suggestions...</p>
                        <p className="text-xs text-gray-400">Based on your project details</p>
                      </div>
                    )
                  ) : loadingTemplates ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-3 gap-2 max-h-32 overflow-y-auto pr-1">
                      {templates.length > 0 ? (
                        templates.slice(0, 6).map((template) => (
                          <button
                            key={template.id}
                            onClick={() => {
                              setFirstMessage(template.prompt || template.description);
                              setIsEditingMessage(false); // Show formatted view by default
                            }}
                            className="text-left p-2 bg-gradient-to-br border rounded hover:shadow-sm transition-all group"
                            style={{
                              borderColor: template.color || '#3b82f6',
                              backgroundImage: `linear-gradient(to bottom right, ${template.color || '#3b82f6'}15, ${template.color || '#3b82f6'}05)`,
                            }}
                          >
                            <div className="flex items-start gap-2 mb-1">
                              <div className="text-lg">{template.icon || '📋'}</div>
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-xs text-gray-900 group-hover:opacity-80 mb-0.5 line-clamp-1" style={{ color: template.color || '#3b82f6' }}>
                                  {template.name}
                                </div>
                                <div className="text-xs text-gray-600 line-clamp-2">{template.description}</div>
                              </div>
                            </div>
                            {/* Tags */}
                            {template.tags && template.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {template.tags.slice(0, 3).map((tag: string, idx: number) => (
                                  <span
                                    key={idx}
                                    className="text-xs px-1.5 py-0.5 rounded-full bg-white/60 text-gray-700 border border-gray-200"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="col-span-3 text-center py-4 text-gray-500 text-xs">
                          No templates available in this category.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* CTA Button */}
                <div className="text-center">
                  <button
                    onClick={handleCreateFirstNode}
                    disabled={loading || !firstMessage.trim()}
                    className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Creating Node...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <HiRocketLaunch className="w-4 h-4" />
                        Create Your First Node
                      </span>
                    )}
                  </button>
                  <p className="text-xs text-gray-600 mt-1.5">
                    {firstMessage.trim()
                      ? "Your message will be sent to the AI assistant"
                      : "Enter a message or select a template to begin"
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* React Flow Canvas */}
            <div className={`w-full h-full ${isFullScreen ? 'pt-16' : ''}`}>
              <IdeaTreeFlowCanvas
                nodes={nodesWithVisibility}
                connections={connections}
                onNodeSelect={handleNodeSelect}
                onNodeAction={handleNodeAction}
                onNodePositionUpdate={handleNodePositionUpdate}
                onConnectionCreate={handleConnectionCreate}
                onConnectionDelete={handleConnectionDelete}
                selectedNodeId={selectedNodeId}
              />
            </div>

            {/* Zoom Controls */}
            <>
                <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                  <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 p-1 flex flex-col gap-1">
                    <button
                      onClick={handleZoomIn}
                      title="Zoom In (Ctrl/Cmd +)"
                      className="w-10 h-10 hover:bg-gray-100 rounded flex items-center justify-center transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                      </svg>
                    </button>
                    <button
                      onClick={handleZoomOut}
                      title="Zoom Out (Ctrl/Cmd -)"
                      className="w-10 h-10 hover:bg-gray-100 rounded flex items-center justify-center transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                      </svg>
                    </button>
                    <button
                      onClick={handleResetZoom}
                      title="Reset Zoom (Ctrl/Cmd 0)"
                      className="w-10 h-10 hover:bg-gray-100 rounded flex items-center justify-center transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                    <button
                      onClick={handleFullScreen}
                      title={isFullScreen ? "Exit Full Screen (Esc)" : "Full Screen (F11)"}
                      className="w-10 h-10 hover:bg-gray-100 rounded flex items-center justify-center transition-colors"
                    >
                      {isFullScreen ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 px-3 py-2 text-xs text-gray-600 dark:text-gray-300 font-medium text-center">
                    {Math.round(scale * 100)}%
                  </div>
                </div>
              </>
          </>
        )}

        {/* Sidebar - inside canvas container for fullscreen support */}
        <IdeaTreeSidebar
          node={selectedNodeId ? nodes.find(n => n.id === selectedNodeId) || null : null}
          open={sidebarOpen}
          onClose={handleCloseSidebar}
          projectId={projectId}
          onNodeUpdate={fetchIdeaTreeData}
          onNodeDelete={(nodeId) => handleNodeAction(nodeId, 'delete')}
          allNodes={nodes}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          initialChatPrompt={initialChatPrompt}
          onChatPromptSent={() => setInitialChatPrompt('')}
          searchParams={searchParams}
          setSearchParams={setSearchParams}
        />
      </div>

      {/* Node Viewer Modal */}
      <NodeViewer
        node={viewingNode}
        isOpen={showNodeViewer}
        onClose={() => {
          setShowNodeViewer(false);
          setViewingNode(null);
        }}
        onNodeUpdated={handleNodeUpdated}
        onNodeDelete={(nodeId) => handleNodeAction(nodeId, 'delete')}
        projectId={projectId}
      />

      {/* Quick Node Creator Modal (for creating only) */}
      <QuickNodeCreator
        isOpen={showQuickCreator}
        onClose={() => {
          setShowQuickCreator(false);
          setQuickCreatorContext({});
        }}
        onNodeCreated={() => {
          fetchIdeaTreeData();
          setShowQuickCreator(false);
          setQuickCreatorContext({});
        }}
        onNodeCreatedWithPrompt={handleNodeCreatedWithPrompt}
        projectId={projectId}
        sessionId={sessionId || undefined}
        parentId={quickCreatorContext.parentId}
        position={quickCreatorContext.position}
        hasRootNode={nodes.some(n => n.is_root)}
        allNodes={nodes}
        parentNode={quickCreatorContext.parentId ? nodes.find(n => n.id === quickCreatorContext.parentId) : undefined}
        projectTitle={projectTitle}
        projectGoals={projectGoals}
      />
    </div>
  );
};

export default IdeaTree;