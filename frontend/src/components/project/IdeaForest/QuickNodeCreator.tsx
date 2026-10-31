import React, { useState, useEffect, useMemo } from 'react';
import config from '../../../config';
import { NodeSuggestionList, type NodeSuggestion } from './NodeSuggestionComponents';
import { FaLightbulb, FaBolt, FaBook, FaBullseye, FaQuestionCircle, FaEdit, FaComments, FaTimes, FaClock, FaCheckCircle, FaSearch, FaStar, FaLink, FaClipboardList, FaSeedling } from 'react-icons/fa';
import { IoSparkles, IoCreate } from 'react-icons/io5';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { IdeaNode } from '../../../types/project/ideaForest';
import { findChildNodePosition } from './nodeOverlapUtils';

const { AI_AGENT_URL, API_BASE_URL } = config;

interface QuickNodeCreatorProps {
  node?: IdeaNode | null;  // If provided, we're editing, otherwise creating
  isOpen: boolean;
  onClose: () => void;
  onNodeCreated?: () => void;  // For create mode
  onNodeCreatedWithPrompt?: (nodeId: string, initialPrompt: string) => void;  // For create mode with initial chat
  onSave?: (node: IdeaNode) => void;  // For edit mode
  projectId: string;
  sessionId?: string;  // Tree session ID to associate node with
  parentId?: string;
  position?: { x: number; y: number };
  hasRootNode?: boolean;
  allNodes?: IdeaNode[];  // All nodes in the project for dynamic type discovery
  parentNode?: IdeaNode;  // Parent node for context-aware suggestions
  projectTitle?: string;  // Project title for context-aware root node suggestions
  projectGoals?: string;  // Project goals for context-aware root node suggestions
}

// AI prompts for content generation
const AI_PROMPTS = [
  { label: 'Generate detailed ideas', prompt: 'Generate detailed ideas for: ' },
  { label: 'Break down into subtasks', prompt: 'Break down this idea into actionable subtasks: ' },
  { label: 'Find similar concepts', prompt: 'Find similar concepts and related ideas to: ' },
  { label: 'Identify challenges', prompt: 'What are the main challenges and solutions for: ' },
  { label: 'Create action plan', prompt: 'Create a detailed action plan for: ' },
  { label: 'Find learning resources', prompt: 'Find the best learning resources for: ' },
  { label: 'Create learning path', prompt: 'Create a structured learning path for: ' }
];

// Template definitions
interface NodeTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  prompt: string;
  color: string;
  category?: string;
  rationale?: string;
  priority?: number;
}

// Template categories will be fetched from API

const DEFAULT_TEMPLATES: NodeTemplate[] = [
  {
    id: 'explore-idea',
    name: 'Explore Idea',
    icon: 'lightbulb',
    description: 'Break down a new concept or idea',
    prompt: 'I want to explore the idea of',
    color: '#6366f1'
  },
  {
    id: 'learning-path',
    name: 'Learning Path',
    icon: 'book',
    description: 'Create a structured learning plan',
    prompt: 'Create a comprehensive learning path for',
    color: '#f59e0b'
  },
  {
    id: 'action-plan',
    name: 'Action Plan',
    icon: 'bolt',
    description: 'Define tasks and next steps',
    prompt: 'Create an action plan for',
    color: '#10b981'
  },
  {
    id: 'milestone',
    name: 'Milestone',
    icon: 'bullseye',
    description: 'Set a goal or achievement',
    prompt: 'Define milestone and success criteria for',
    color: '#3b82f6'
  },
  {
    id: 'research',
    name: 'Research Topic',
    icon: 'search',
    description: 'Investigate a topic in depth',
    prompt: 'Research and analyze',
    color: '#8b5cf6'
  },
  {
    id: 'brainstorm',
    name: 'Brainstorm',
    icon: 'star',
    description: 'Generate creative solutions',
    prompt: 'Generate creative ideas for',
    color: '#ec4899'
  }
];

// Helper function to generate context-aware templates
const generateContextAwareTemplates = (parentNode?: IdeaNode): NodeTemplate[] => {
  if (!parentNode) {
    return DEFAULT_TEMPLATES;
  }

  // Add parent-specific templates at the beginning
  const contextTemplates: NodeTemplate[] = [
    {
      id: 'expand-parent',
      name: `Expand "${parentNode.title.slice(0, 20)}..."`,
      icon: 'seedling',
      description: `Add details to parent node`,
      prompt: `Based on "${parentNode.title}", expand on`,
      color: parentNode.color || '#6366f1'
    },
    {
      id: 'break-down',
      name: 'Break Down',
      icon: 'clipboard-list',
      description: 'Split parent into smaller tasks',
      prompt: `Break down "${parentNode.title}" into actionable steps for`,
      color: '#10b981'
    },
    {
      id: 'related-idea',
      name: 'Related Idea',
      icon: 'link',
      description: 'Add a related concept',
      prompt: `Related to "${parentNode.title}", explore`,
      color: '#6366f1'
    }
  ];

  return [...contextTemplates, ...DEFAULT_TEMPLATES];
};


// Helper function to get icon component from icon string
const getIconComponent = (iconName: string) => {
  const iconMap: Record<string, any> = {
    'lightbulb': FaLightbulb,
    'bolt': FaBolt,
    'book': FaBook,
    'bullseye': FaBullseye,
    'question': FaQuestionCircle,
    'search': FaSearch,
    'star': FaStar,
    'link': FaLink,
    'clipboard-list': FaClipboardList,
    'seedling': FaSeedling,
  };
  return iconMap[iconName] || FaLightbulb;
};
const QuickNodeCreator: React.FC<QuickNodeCreatorProps> = ({
  node,
  isOpen,
  onClose,
  onNodeCreated,
  onNodeCreatedWithPrompt,
  onSave,
  projectId,
  sessionId,
  parentId,
  position,
  hasRootNode,
  allNodes = [],
  parentNode,
  projectTitle,
  projectGoals
}) => {
  const isEditMode = !!node;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [userInput, setUserInput] = useState(''); // Chat-based input
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAIPrompts, setShowAIPrompts] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [generatingTitle, setGeneratingTitle] = useState(false);

  // AI Suggestion state
  const [aiSuggestions, setAiSuggestions] = useState<NodeSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number | null>(null);

  // Template system state
  const [showMode, setShowMode] = useState<'ai' | 'templates'>('ai'); // Toggle between AI and templates
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<{id: string; name: string; count: number; icon: string}[]>([]);
  const [apiTemplates, setApiTemplates] = useState<NodeSuggestion[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');

  // Convert to Task state
  const [convertingToTask, setConvertingToTask] = useState(false);

  // Project-based suggestions for root nodes
  const [projectSuggestions, setProjectSuggestions] = useState<NodeSuggestion[]>([]);
  const [loadingProjectSuggestions, setLoadingProjectSuggestions] = useState(false);

  // Reset form when modal opens/closes or node changes
  useEffect(() => {
    if (node) {
      // Edit mode: populate with existing node data
      setTitle(node.title);
      setDescription(node.description || '');
      setUserInput(node.description || '');
      setTags(node.tags || []);
    } else {
      // Create mode: reset to defaults
      setTitle('');
      setDescription('');
      setUserInput('');
      setTags([]);
    }
    setError(null);
    setTagInput('');
    setAiSuggestions([]);
    setSelectedSuggestionIndex(null);
    setShowMode('ai'); // Default to AI mode
    setSelectedCategory('all'); // Default to all templates
    setTemplateSearchQuery(''); // Clear search query
  }, [node, isOpen, parentNode]);

  // Fetch AI suggestions when modal opens in create mode with parent node
  useEffect(() => {
    const fetchSuggestions = async () => {
      // Only fetch for create mode with parent node
      if (isEditMode || !isOpen || !parentNode) {
        return;
      }

      setLoadingSuggestions(true);
      try {
        // Gather existing children titles for context
        const existingChildren = allNodes
          .filter(n => n.parent_id === parentNode.id)
          .map(n => ({ title: n.title, description: n.description || '' }));

        // Build request payload
        const requestPayload = {
          parent_node_id: parentNode.id,
          parent_title: parentNode.title,
          parent_description: parentNode.description || '',
          existing_children: existingChildren,
          recent_chat: [], // TODO: Integrate with chat history if available
          count: 5,
          session_id: `project_${projectId}_${Date.now()}`
        };

        const response = await fetch(`${AI_AGENT_URL}/ai-api/node-suggestions/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          },
          body: JSON.stringify(requestPayload)
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.suggestions) {
            setAiSuggestions(data.suggestions);
          }
        } else {
          console.error('Failed to fetch AI suggestions:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching AI suggestions:', error);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    fetchSuggestions();
  }, [isOpen, isEditMode, parentNode, projectId, allNodes]);

  // Fetch template categories when modal opens
  useEffect(() => {
    const fetchCategories = async () => {
      if (!isOpen) return;

      try {
        const response = await fetch(`${AI_AGENT_URL}/ai-api/templates/categories`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        } else {
          console.warn('Template categories not available (server error), using fallback');
          // Use fallback empty categories - template system is optional
          setCategories([]);
        }
      } catch (error) {
        console.error('Error fetching template categories:', error);
        // Template system is optional, continue without it
        setCategories([]);
      }
    };

    fetchCategories();
  }, [isOpen]);

  // Fetch templates when category changes or when searching
  useEffect(() => {
    const fetchTemplates = async () => {
      if (!isOpen || showMode !== 'templates') return;

      setLoadingTemplates(true);
      try {
        let templates = [];

        // Use semantic search if there's a search query
        if (templateSearchQuery.trim()) {
          const searchResponse = await fetch(`${AI_AGENT_URL}/ai-api/templates/search`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify({
              query: templateSearchQuery,
              category: selectedCategory,
              limit: 20,
              threshold: 0.5
            })
          });

          if (searchResponse.ok) {
            templates = await searchResponse.json();
          }
        } else {
          // Fetch by category if no search query
          const categoryResponse = await fetch(
            `${AI_AGENT_URL}/ai-api/templates/category/${selectedCategory}?limit=50`,
            {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
              }
            }
          );

          if (categoryResponse.ok) {
            templates = await categoryResponse.json();
          }
        }

        // Convert API templates to NodeSuggestion format
        const suggestions = templates.map((template: any) => ({
          id: template.id,
          title: template.name,
          description: template.description,
          rationale: template.rationale || '',
          priority: template.priority || 2,
          similarity: template.similarity
        }));

        setApiTemplates(suggestions);
      } catch (error) {
        console.error('Error fetching templates:', error);
      } finally {
        setLoadingTemplates(false);
      }
    };

    fetchTemplates();
  }, [isOpen, showMode, selectedCategory, templateSearchQuery]);

  // Fetch project-based suggestions for root nodes from backend
  useEffect(() => {
    const fetchProjectSuggestions = async () => {
      // Only fetch for root nodes (no parent) in create mode
      if (!isEditMode && !parentId && projectTitle && isOpen) {
        setLoadingProjectSuggestions(true);
        try {
          const response = await fetch(`${AI_AGENT_URL}/ai-api/node-suggestions/root-node`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify({
              project_id: projectId,
              project_title: projectTitle,
              project_goals: projectGoals || '',
              count: 5,
              session_id: `project_${projectId}_${Date.now()}`
            })
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.suggestions) {
              setProjectSuggestions(data.suggestions);
            } else {
              setProjectSuggestions([]);
            }
          } else {
            console.error('Failed to fetch project suggestions:', response.statusText);
            setProjectSuggestions([]);
          }
        } catch (error) {
          console.error('Error fetching project suggestions:', error);
          setProjectSuggestions([]);
        } finally {
          setLoadingProjectSuggestions(false);
        }
      } else {
        setProjectSuggestions([]);
      }
    };

    fetchProjectSuggestions();
  }, [isOpen, isEditMode, parentId, projectId, projectTitle, projectGoals]);

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (!tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSuggestionSelect = (suggestion: NodeSuggestion, index: number) => {
    // Pre-populate title and description from selected suggestion
    setTitle(suggestion.title);
    setDescription(suggestion.description);
    setUserInput(suggestion.description);
    setSelectedSuggestionIndex(index);
  };

  // Generate title from user input using LLM
  const generateTitleFromInput = async (input: string): Promise<string> => {
    try {
      setGeneratingTitle(true);

      const contextInfo = parentNode
        ? `This is a child node of "${parentNode.title}". `
        : '';

      const response = await fetch(`${AI_AGENT_URL}/ai-api/generate-title`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          content: input,
          context: contextInfo,
          max_length: 60
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.title || input.slice(0, 60);
      } else {
        // Fallback: use first sentence or first 60 chars
        const firstSentence = input.split(/[.!?]/)[0];
        return firstSentence.slice(0, 60);
      }
    } catch (error) {
      console.error('Failed to generate title:', error);
      // Fallback: use first sentence or first 60 chars
      const firstSentence = input.split(/[.!?]/)[0];
      return firstSentence.slice(0, 60);
    } finally {
      setGeneratingTitle(false);
    }
  };

  const handleAIPrompt = async (promptTemplate: string) => {
    const content = title || description;
    if (!content) {
      setError('Please enter a title or description first');
      return;
    }

    setAiLoading(true);
    setError(null);

    try {
      const response = await fetch(`${AI_AGENT_URL}/ai-api/agents/enhanced-roadmap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptTemplate + content,
          context: {
            project_id: projectId,
            parent_id: parentId || node?.parent_id,
            current_content: description
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Append AI response to description
        setDescription(
          description + '\n\n---\nAI Suggestions:\n' + data.response
        );
      } else {
        throw new Error('Failed to generate AI content');
      }
    } catch (err) {
      setError('Failed to generate AI content. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!userInput.trim() && !title.trim()) {
      setError('Please describe what you want to create');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Determine if user provided a conversational prompt vs explicit title/description
      const hasExplicitTitle = title.trim().length > 0;
      const hasUserPrompt = userInput.trim().length > 0;
      const hasExplicitDescription = description.trim().length > 0;

      let finalTitle = title;
      let finalDescription = description;
      let initialChatPrompt = '';

      if (!hasExplicitTitle && hasUserPrompt) {
        // User provided a conversational prompt but no title
        // Create node with placeholder title that will be updated by AI
        finalTitle = 'New Idea...'; // Placeholder
        finalDescription = ''; // Leave empty, will be filled by AI
        initialChatPrompt = userInput; // Save the prompt for chat
      } else if (hasExplicitTitle && hasUserPrompt) {
        // User provided both title AND prompt
        // Use title as-is, and treat prompt as initial chat message
        finalTitle = title;
        finalDescription = description; // Use explicit description if provided
        initialChatPrompt = userInput; // Save prompt for auto-chat
      } else if (hasExplicitTitle) {
        // User provided title only (no prompt in userInput)
        finalTitle = title;
        finalDescription = description;
        // No auto-chat
      } else {
        // Fallback - no title, no prompt
        finalTitle = 'New Node';
        finalDescription = description;
      }
      if (isEditMode) {
        // Edit mode: Update existing node
        const updateData: any = {
          title: finalTitle,
          description: finalDescription,
          tags
        };

        const response = await fetch(`${AI_AGENT_URL}/ai-api/idea-tree/nodes/${node.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        });

        if (!response.ok) {
          throw new Error('Failed to update node');
        }

        const updatedNode = await response.json();
        onSave?.(updatedNode);
        onClose();
      } else {
        // Create mode
        // Calculate smart position that avoids overlaps with visible nodes (respects folded state)
        const smartPosition = parentNode
          ? findChildNodePosition(parentNode, allNodes || [], position)
          : position || { x: 400, y: 300 };

        const nodeData: any = {
          title: finalTitle,
          description: finalDescription,
          expanded: true,
          position: smartPosition,
          tags
        };

        if (sessionId) {
          nodeData.session_id = sessionId;
        }

        if (parentId) {
          nodeData.parent_id = parentId;
        }

        if (!hasRootNode && !parentId) {
          nodeData.is_root = true;
        }

        // If user provided a conversational prompt, include it for backend to handle
        if (initialChatPrompt && initialChatPrompt.trim()) {
          nodeData.initial_chat_prompt = initialChatPrompt;
          nodeData.user_id = parseInt(localStorage.getItem('user_id') || '1');
          console.log('[QuickNodeCreator] Sending initial prompt to backend:', initialChatPrompt.substring(0, 50));
        }

        // Backend will create node, chat session, and send first message atomically
        const endpoint = `${AI_AGENT_URL}/ai-api/projects/${projectId}/idea-tree/nodes`;

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(nodeData)
        });

        if (!response.ok) {
          throw new Error('Failed to create node');
        }

        const newNode = await response.json();

        // If user provided a conversational prompt, open chat tab and trigger auto-send
        if (initialChatPrompt && onNodeCreatedWithPrompt) {
          console.log('[QuickNodeCreator] Node created with initial prompt, opening chat to auto-send');
          console.log('[QuickNodeCreator] ✅ Calling onNodeCreatedWithPrompt with:', {
            nodeId: newNode.id,
            promptLength: initialChatPrompt.length,
            promptPreview: initialChatPrompt.substring(0, 50)
          });
          // Pass the prompt so frontend can auto-send it
          onNodeCreatedWithPrompt(newNode.id, initialChatPrompt);
        } else if (onSave) {
          onSave(newNode);
        } else {
          onNodeCreated?.();
        }
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save node');
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToTask = async () => {
    if (!node) return;

    setConvertingToTask(true);
    setError(null);

    try {
      // Get user ID from localStorage
      const userId = localStorage.getItem('user_id') || 'unknown';

      // Default task type
      const taskType = 'action';

      const response = await fetch(`${AI_AGENT_URL}/ai-api/tasks/convert-from-idea`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          idea_node_id: node.id,
          project_id: projectId,  // Changed to pass UUID as string
          created_by: userId,
          title: node.title,
          description: node.description || '',
          task_type: taskType,
          tags: node.tags || [],
          priority: node.priority || 3
        })
      });

      if (!response.ok) {
        throw new Error('Failed to convert node to task');
      }

      const data = await response.json();
      const newTask = data.task;

      // Show success message and optionally navigate to task management
      alert(`Successfully converted "${node.title}" to a task!\n\nYou can view it in Task Management.`);

      // Close the modal
      onClose();

      // Optional: Navigate to task management
      // window.location.href = `/project/${projectId}/tasks`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert to task');
    } finally {
      setConvertingToTask(false);
    }
  };

  // Get current suggestions based on mode
  // For root nodes, prioritize project-based suggestions
  // NOTE: This must be BEFORE the early return to avoid hook order violations
  const currentSuggestions = useMemo(() => {
    if (showMode === 'ai') {
      // For root nodes (no parent), show project suggestions first, then AI suggestions
      if (!parentId && projectSuggestions.length > 0) {
        return [...projectSuggestions, ...aiSuggestions];
      }
      return aiSuggestions;
    }
    return apiTemplates;
  }, [showMode, parentId, projectSuggestions, aiSuggestions, apiTemplates]);

  if (!isOpen) return null;

  // Template selection handler
  const handleTemplateSelect = async (suggestion: NodeSuggestion, index: number) => {
    setTitle(suggestion.title);
    setDescription(suggestion.description);
    setSelectedSuggestionIndex(index);

    // Log template usage to API for analytics
    try {
      await fetch(`${AI_AGENT_URL}/ai-api/templates/usage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          template_id: suggestion.id,
          project_id: parseInt(projectId),
          context: {
            parent_id: parentId,
            selected_category: selectedCategory
          }
        })
      });
    } catch (error) {
      console.error('Error logging template usage:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden border-2 border-slate-200">
        {/* Header */}
        <div
          className="px-6 py-4 border-b-2 flex items-center justify-between bg-indigo-50 border-indigo-100"
        >
          <h2 className="text-xl font-bold flex items-center gap-3 text-indigo-600">
            <span className="text-2xl drop-shadow-sm">
              <FaLightbulb />
            </span>
            <span>{isEditMode ? 'Edit Node' : 'Quick Create Node'}</span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/60 transition-all text-indigo-600"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* AI Suggestions or Templates - Show in Create Mode */}
          {!isEditMode && (
            <div>
              {/* Header with Mode Toggle (hide toggle for root nodes) */}
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-bold text-slate-700">
                  {!parentNode ? (
                    // Root node - show project-specific label
                    <>
                      AI-Suggested Starting Points
                      {projectTitle && (
                        <span className="ml-2 text-xs font-normal text-slate-500">
                          (For "{projectTitle}")
                        </span>
                      )}
                    </>
                  ) : (
                    // Child node - show context-based label
                    <>
                      {showMode === 'ai' ? 'AI-Suggested Child Nodes' : 'Template Library'}
                      {showMode === 'ai' && (
                        <span className="ml-2 text-xs font-normal text-slate-500">
                          (Based on "{parentNode.title}")
                        </span>
                      )}
                    </>
                  )}
                </label>
                {/* Only show mode toggle for child nodes (not root nodes) */}
                {parentNode && (
                  <div className="flex gap-1.5 bg-slate-100 p-1 rounded-lg shadow-inner">
                    <button
                      onClick={() => setShowMode('ai')}
                      className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                        showMode === 'ai'
                          ? 'bg-white text-purple-700 shadow-md'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                      }`}
                    >
                      <IoSparkles /> AI Suggestions
                    </button>
                    <button
                      onClick={() => setShowMode('templates')}
                      className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                        showMode === 'templates'
                          ? 'bg-white text-purple-700 shadow-md'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                      }`}
                    >
                      <FaBook /> Templates
                    </button>
                  </div>
                )}
              </div>

              {/* Template Search & Category Selector - Only for Templates and Child Nodes */}
              {showMode === 'templates' && parentNode && (
                <>
                  {/* Search Input */}
                  <div className="mb-4 relative">
                    <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={templateSearchQuery}
                      onChange={(e) => setTemplateSearchQuery(e.target.value)}
                      placeholder="Search templates semantically..."
                      className="w-full pl-10 pr-4 py-2.5 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all shadow-sm"
                    />
                    {templateSearchQuery && (
                      <p className="text-xs text-slate-500 mt-1">
                        Using AI semantic search to find relevant templates
                      </p>
                    )}
                  </div>

                  {/* Category Selector */}
                  <div className="mb-4">
                    <div className="flex gap-2 flex-wrap">
                      {categories.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => {
                            setSelectedCategory(category.id);
                            setSelectedSuggestionIndex(null);
                            setTemplateSearchQuery(''); // Clear search when changing category
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm ${
                            selectedCategory === category.id
                              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md scale-105'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:shadow-md'
                          }`}
                        >
                          {category.icon} {category.name} ({category.count})
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Suggestion/Template List */}
              <NodeSuggestionList
                suggestions={currentSuggestions}
                loading={showMode === 'ai' ? (loadingSuggestions || loadingProjectSuggestions) : loadingTemplates}
                onSelectSuggestion={showMode === 'ai' ? handleSuggestionSelect : handleTemplateSelect}
                selectedIndex={selectedSuggestionIndex}
                isTemplateMode={showMode === 'templates'}
              />
            </div>
          )}

          {/* Chat-based Input */}
          <>
            {/* Main Chat Input */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FaComments /> Describe what you want to create <span className="text-red-500">*</span>
                </span>
                {generatingTitle && (
                  <span className="text-xs text-purple-600 animate-pulse flex items-center gap-1">
                    <IoSparkles /> Generating title...
                  </span>
                )}
              </label>
              <div className="relative">
                <textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder={
                    parentNode
                      ? `Continue from "${parentNode.title}"...\n\nExample:\n- Add a learning resource for React hooks\n- Break down authentication into subtasks\n- Create a milestone for MVP completion`
                      : `Type your requirements naturally...\n\nExample:\n- I want to learn React and build a todo app\n- Create an action plan for user authentication\n- Set up a learning path for machine learning basics`
                  }
                  rows={8}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all shadow-sm resize-none font-normal"
                  autoFocus
                />
                <div className="absolute bottom-3 right-3 text-xs text-slate-400">
                  {userInput.length} characters
                </div>
              </div>
            </div>

            {/* Preview Title (if available) */}
            {title && (
              <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-bold text-purple-900 flex items-center gap-1.5">
                    <FaEdit /> Title:
                  </span>
                  <button
                    onClick={() => setTitle('')}
                    className="text-xs text-purple-600 hover:text-purple-800 underline"
                  >
                    Edit
                  </button>
                </div>
                <div className="text-base font-semibold text-slate-800">{title}</div>
              </div>
            )}
          </>

          {/* Tags (optional for all types) */}
          {(
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Tags <span className="text-xs font-normal text-slate-500">(Optional)</span>
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-medium flex items-center gap-1 shadow-sm"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 text-slate-500 hover:text-red-500 transition-colors"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Type a tag and press Enter (e.g., important, research, urgent)"
                className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all shadow-sm"
              />
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t-2 border-slate-200 bg-slate-50 flex justify-between gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-slate-700 font-semibold bg-white border-2 border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
          >
            Cancel
          </button>

          <div className="flex gap-3">
            {/* Convert to Task button - show in edit mode */}
            {isEditMode && node && (
              <button
                onClick={handleConvertToTask}
                disabled={convertingToTask}
                className="px-6 py-2.5 text-white font-bold bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg hover:from-green-700 hover:to-emerald-700 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md"
              >
                {convertingToTask ? (
                  <>
                    <AiOutlineLoading3Quarters className="animate-spin" />
                    <span>Converting...</span>
                  </>
                ) : (
                  <>
                    <FaCheckCircle />
                    <span>Convert to Task</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading || generatingTitle || (!userInput.trim() && !title.trim())}
              className="px-6 py-2.5 text-white font-bold bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg hover:from-purple-700 hover:to-indigo-700 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md"
            >
              {loading || generatingTitle ? (
                <>
                  <AiOutlineLoading3Quarters className="animate-spin" />
                  <span>
                    {generatingTitle ? 'Generating title...' : isEditMode ? 'Updating...' : 'Creating...'}
                  </span>
                </>
              ) : (
                <>
                  {isEditMode ? <FaEdit /> : <IoSparkles />}
                  <span>{isEditMode ? 'Update Node' : 'Create Node'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickNodeCreator;