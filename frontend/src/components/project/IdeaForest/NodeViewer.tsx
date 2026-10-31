import React, { useState, useRef, useEffect } from 'react';
import config from '../../../config';
import { FaLightbulb, FaBolt, FaBook, FaBullseye } from 'react-icons/fa';
import { Sparkles, RotateCw, FileText, MessageSquare, Trash2, Calendar, Plus, Rocket, BookOpen } from 'lucide-react';
import { IdeaNode } from '../../../types/project/ideaForest';
import { NodeMarkdown } from '../../common/NodeMarkdown';

const { AI_AGENT_URL } = config;

interface NodeViewerProps {
  node: IdeaNode | null;
  isOpen: boolean;
  onClose: () => void;
  onNodeUpdated: () => void;
  onNodeDelete?: (nodeId: string) => void;
  projectId: string;
}

interface Selection {
  id: string;
  text: string;
  question: string;
  processing?: boolean;
}

const DEFAULT_QUESTIONS = [
  "Tell me more about this",
  "How can I implement this?",
  "What does this mean?",
  "Can you provide examples?",
  "What are the alternatives?",
  "Why is this important?",
  "What are the next steps?",
  "Break this down further"
];

// Default node styling
const DEFAULT_NODE_STYLE = { label: 'Node', color: '#6366f1', icon: '💡' };

const NodeViewer: React.FC<NodeViewerProps> = ({
  node,
  isOpen,
  onClose,
  onNodeUpdated,
  onNodeDelete,
  projectId
}) => {
  const [selections, setSelections] = useState<Selection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regeneratePrompt, setRegeneratePrompt] = useState('');
  const [showRegenerateInput, setShowRegenerateInput] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState('');
  const [showInitialPrompt, setShowInitialPrompt] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [processingAll, setProcessingAll] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Check if node is empty (no description or very short description)
  const isNodeEmpty = !node?.description || node.description.trim().length < 10;

  // Use default node styling (color and icon can be set per node)
  const nodeStyle = node?.color && node?.icon
    ? { label: 'Node', color: node.color, icon: node.icon }
    : DEFAULT_NODE_STYLE;

  useEffect(() => {
    if (!isOpen) {
      setSelections([]);
      setShowSidebar(false);
      setRegeneratePrompt('');
      setShowRegenerateInput(false);
      setInitialPrompt('');
      setShowInitialPrompt(false);
      setError(null);
    } else if (isNodeEmpty && node?.is_root) {
      // Automatically show initial prompt for empty root nodes
      setShowInitialPrompt(true);
    }
  }, [isOpen, isNodeEmpty, node?.is_root]);

  if (!node || !isOpen) return null;

  const handleTextSelection = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    
    if (text && text.length > 0) {
      // Check if this text is already selected
      const existingSelection = selections.find(s => s.text === text);
      if (!existingSelection) {
        const newSelection: Selection = {
          id: `sel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          text: text.substring(0, 200), // Limit text length
          question: `Tell me more about: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`
        };
        setSelections([...selections, newSelection]);
        setShowSidebar(true);
      }
      
      // Clear the browser selection
      selection?.removeAllRanges();
    }
  };

  const updateSelectionQuestion = (id: string, question: string) => {
    setSelections(selections.map(sel => 
      sel.id === id ? { ...sel, question } : sel
    ));
  };

  const removeSelection = (id: string) => {
    setSelections(selections.filter(sel => sel.id !== id));
    if (selections.length <= 1) {
      setShowSidebar(false);
    }
  };

  const processSelection = async (selection: Selection) => {
    if (!selection.question.trim()) {
      setError('Please enter a question');
      return;
    }

    // Mark this selection as processing
    setSelections(selections.map(sel => 
      sel.id === selection.id ? { ...sel, processing: true } : sel
    ));

    try {
      // Generate AI response for the follow-up question
      const aiResponse = await fetch(`${AI_AGENT_URL}/ai-api/idea-tree/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: selection.question,
          context: {
            project_id: projectId,
            parent_node_id: node.id,
            parent_content: node.description,
            selected_text: selection.text,
            parent_title: node.title
          }
        })
      });

      if (!aiResponse.ok) {
        throw new Error('Failed to generate AI response');
      }

      const aiData = await aiResponse.json();

      // Create a new child node with the AI response
      const childNodeData = {
        session_id: node.session_id,
        parent_id: node.id,
        title: aiData.title || selection.question.substring(0, 50),
        description: aiData.description || '',
        expanded: true,
        position: {
          x: (node.position?.x || 0) + 50 + Math.random() * 100,
          y: (node.position?.y || 0) + 100 + Math.random() * 50
        },
        color: '#10b981',
        icon: 'bolt',
        ai_generated: true,
        ai_suggestions: aiData.suggestions || null,
        tags: ['follow-up', ...(aiData.tags || [])],
        metadata: {
          parent_context: selection.text,
          original_question: selection.question
        }
      };

      const response = await fetch(`${AI_AGENT_URL}/ai-api/projects/${projectId}/idea-tree/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(childNodeData)
      });

      if (!response.ok) {
        throw new Error('Failed to create child node');
      }

      // Remove the processed selection
      removeSelection(selection.id);
      
      // Refresh the tree
      onNodeUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create follow-up');
      // Remove processing flag on error
      setSelections(selections.map(sel => 
        sel.id === selection.id ? { ...sel, processing: false } : sel
      ));
    }
  };

  const processAllSelections = async () => {
    setProcessingAll(true);
    setError(null);
    
    // Process all selections sequentially
    for (const selection of selections) {
      if (!selection.processing) {
        await processSelection(selection);
        // Add a small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    setProcessingAll(false);
  };

  const handleInitialGenerate = async () => {
    if (!initialPrompt.trim()) {
      setError('Please describe what you want to create');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Generate initial content for empty node
      const aiResponse = await fetch(`${AI_AGENT_URL}/ai-api/idea-tree/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: initialPrompt,
          context: {
            project_id: projectId,
            node_id: node.id,
            node_title: node.title,
            is_root: node.is_root,
            initial_generation: true
          }
        })
      });

      if (!aiResponse.ok) {
        throw new Error('Failed to generate content');
      }

      const aiData = await aiResponse.json();

      // Update the node with generated content
      const response = await fetch(`${AI_AGENT_URL}/ai-api/idea-tree/nodes/${node.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: aiData.title || initialPrompt.substring(0, 50),
          description: aiData.description || '',
          ai_generated: true,
          ai_suggestions: aiData.suggestions || null,
          tags: aiData.tags || []
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update node');
      }

      onNodeUpdated();
      setShowInitialPrompt(false);
      setInitialPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate content');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!regeneratePrompt.trim()) {
      setError('Please enter instructions for regeneration');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Generate new content based on the regeneration prompt
      const aiResponse = await fetch(`${AI_AGENT_URL}/ai-api/idea-tree/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: regeneratePrompt,
          context: {
            project_id: projectId,
            node_id: node.id,
            current_title: node.title,
            current_description: node.description,
            regenerate: true
          }
        })
      });

      if (!aiResponse.ok) {
        throw new Error('Failed to regenerate content');
      }

      const aiData = await aiResponse.json();

      // Update the node with regenerated content
      const response = await fetch(`${AI_AGENT_URL}/ai-api/idea-tree/nodes/${node.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: aiData.title || node.title,
          description: aiData.description || node.description,
          ai_suggestions: aiData.suggestions || node.ai_suggestions,
          tags: [...(node.tags || []), ...(aiData.tags || [])]
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update node');
      }

      onNodeUpdated();
      setShowRegenerateInput(false);
      setRegeneratePrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate content');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-hidden flex ${showSidebar ? 'max-w-6xl' : 'max-w-4xl'} transition-all border-2 border-slate-200`}>
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div
            className="px-6 py-5 border-b-2 flex items-center justify-between bg-white/50 backdrop-blur-sm"
            style={{ borderBottomColor: nodeStyle.color + '40' }}
          >
            <div className="flex items-center gap-4">
              <div className="text-4xl drop-shadow-md" style={{ color: nodeStyle.color }}>{nodeStyle.icon}</div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">{node.title}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">{nodeStyle.label}</span>
                  {node.ai_generated && (
                    <span className="text-xs bg-gradient-to-r from-purple-100 to-fuchsia-100 text-purple-700 px-3 py-1 rounded-lg font-bold border border-purple-300 shadow-sm flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      AI Generated
                    </span>
                  )}
                  {node.status && (
                    <span className="text-xs bg-gradient-to-r from-cyan-100 to-blue-100 text-cyan-700 px-3 py-1 rounded-lg font-bold border border-cyan-300 shadow-sm capitalize">
                      {node.status.replace('_', ' ')}
                    </span>
                  )}
                  {node.progress > 0 && (
                    <span className="text-xs bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 px-3 py-1 rounded-lg font-bold border border-emerald-300 shadow-sm">
                      {node.progress}% Complete
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onNodeDelete && (
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this node and all its children?')) {
                      onNodeDelete(node.id);
                      onClose();
                    }
                  }}
                  className="w-10 h-10 flex items-center justify-center hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm hover:shadow-md text-red-500"
                  title="Delete Node"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center hover:bg-slate-500 hover:text-white rounded-xl transition-all shadow-sm hover:shadow-md font-bold text-slate-500"
                title="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          {!isNodeEmpty && (
            <div className="px-6 py-4 border-b-2 border-slate-200 bg-white/50 backdrop-blur-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowRegenerateInput(!showRegenerateInput)}
                  className="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white rounded-xl hover:from-purple-600 hover:to-fuchsia-700 transition-all flex items-center gap-2 font-bold shadow-lg hover:shadow-xl hover:scale-105"
                >
                  <RotateCw className="w-4 h-4" />
                  <span>Regenerate with AI</span>
                </button>
                {selections.length > 0 && (
                  <button
                    onClick={() => setShowSidebar(!showSidebar)}
                    className="px-4 py-2.5 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-xl hover:from-slate-700 hover:to-slate-800 transition-all flex items-center gap-2 font-bold shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Questions ({selections.length})</span>
                  </button>
                )}
              </div>
              <div className="text-sm text-slate-600 font-medium bg-amber-50 px-3 py-2 rounded-lg border border-amber-200 flex items-center gap-1">
                <FaLightbulb className="w-3 h-3 text-amber-600" />
                <span className="font-bold">Tip:</span> Select any text to ask follow-up questions
              </div>
            </div>
          )}

          {/* Initial Prompt for Empty Nodes */}
          {isNodeEmpty && showInitialPrompt && (
            <div className="px-6 py-6 bg-gradient-to-r from-indigo-50 via-purple-50 to-fuchsia-50 border-b-2 border-purple-200">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-indigo-900 mb-3 flex items-center gap-2">
                  <Rocket className="w-6 h-6 text-indigo-600" />
                  Let's get started!
                </h3>
                <p className="text-sm text-slate-700 font-medium leading-relaxed">
                  {node.is_root
                    ? "This is your root node. Describe your main idea or goal, and AI will help you develop it."
                    : "This node needs content. Describe what you want to explore here."}
                </p>
              </div>
              <div className="flex gap-2">
                <textarea
                  value={initialPrompt}
                  onChange={(e) => setInitialPrompt(e.target.value)}
                  placeholder="Describe what you want to explore or accomplish here..."
                  className="flex-1 px-4 py-3 border-2 border-purple-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[120px] shadow-sm bg-white font-medium"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleInitialGenerate}
                  disabled={loading || !initialPrompt.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 flex items-center gap-2 font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                >
                  {loading ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate Content</span>
                    </>
                  )}
                </button>
                {!node.is_root && (
                  <button
                    onClick={() => setShowInitialPrompt(false)}
                    className="px-4 py-3 bg-gradient-to-r from-slate-400 to-slate-500 text-white rounded-xl hover:from-slate-500 hover:to-slate-600 font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Regenerate Input */}
          {!isNodeEmpty && showRegenerateInput && (
            <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-fuchsia-50 border-b-2 border-purple-200">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={regeneratePrompt}
                  onChange={(e) => setRegeneratePrompt(e.target.value)}
                  placeholder="How would you like to modify this content?"
                  className="flex-1 px-4 py-3 border-2 border-purple-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm bg-white font-medium"
                  autoFocus
                />
                <button
                  onClick={handleRegenerate}
                  disabled={loading || !regeneratePrompt.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-xl hover:from-purple-700 hover:to-fuchsia-700 disabled:opacity-50 font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                >
                  {loading ? 'Regenerating...' : 'Regenerate'}
                </button>
                <button
                  onClick={() => {
                    setShowRegenerateInput(false);
                    setRegeneratePrompt('');
                  }}
                  className="px-4 py-3 bg-gradient-to-r from-slate-400 to-slate-500 text-white rounded-xl hover:from-slate-500 hover:to-slate-600 font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div 
              ref={contentRef}
              className="relative prose max-w-none"
              onMouseUp={handleTextSelection}
            >
              {/* Tags */}
              {node.tags && node.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {node.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}


              {/* Description */}
              {isNodeEmpty ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    No content yet
                  </h3>
                  <p className="text-gray-500 mb-6">
                    {node.is_root
                      ? "Start by describing your project or idea above"
                      : "Add content to this node using the form above"}
                  </p>
                  {!showInitialPrompt && (
                    <button
                      onClick={() => setShowInitialPrompt(true)}
                      className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-colors flex items-center gap-2 mx-auto"
                    >
                      <Sparkles className="w-4 h-4" />
                      Generate Content with AI
                    </button>
                  )}
                </div>
              ) : (
                <NodeMarkdown
                  content={node.description}
                  className="text-gray-700 leading-relaxed select-text"
                />
              )}

              {/* AI Suggestions */}
              {node.ai_suggestions && (
                <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <h3 className="text-lg font-semibold text-purple-900 mb-2 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    AI Suggestions
                  </h3>
                  <div className="text-sm text-purple-800">
                    {typeof node.ai_suggestions === 'string' 
                      ? <p>{node.ai_suggestions}</p>
                      : <pre className="whitespace-pre-wrap">{JSON.stringify(node.ai_suggestions, null, 2)}</pre>
                    }
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t-2 border-slate-200 bg-white/50 backdrop-blur-sm flex justify-between items-center">
            <div className="text-sm text-slate-600 font-medium bg-slate-100 px-3 py-2 rounded-lg border border-slate-300 flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              Created: {new Date(node.created_at || '').toLocaleDateString()}
            </div>
            <button
              onClick={onClose}
              className="px-6 py-3 text-white bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 rounded-xl transition-all font-bold shadow-lg hover:shadow-xl hover:scale-105"
            >
              Close
            </button>
          </div>
        </div>

        {/* Sidebar for Selections */}
        {showSidebar && selections.length > 0 && (
          <div className="w-96 border-l bg-gray-50 flex flex-col">
            <div className="px-4 py-3 border-b bg-white">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Follow-up Questions</h3>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Edit your questions below and create child nodes
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selections.map((selection, index) => (
                <div key={selection.id} className="bg-white rounded-lg border border-gray-200 p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 mb-1">
                        Selection {index + 1}:
                      </div>
                      <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded border border-gray-200 mb-2">
                        "{selection.text.substring(0, 100)}{selection.text.length > 100 ? '...' : ''}"
                      </div>
                    </div>
                    <button
                      onClick={() => removeSelection(selection.id)}
                      className="text-gray-400 hover:text-red-500 ml-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    <textarea
                      value={selection.question}
                      onChange={(e) => updateSelectionQuestion(selection.id, e.target.value)}
                      placeholder="Enter your question..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm min-h-[60px]"
                    />
                    
                    <div className="flex flex-wrap gap-1">
                      {DEFAULT_QUESTIONS.slice(0, 3).map((q, i) => (
                        <button
                          key={i}
                          onClick={() => updateSelectionQuestion(selection.id, q)}
                          className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                    
                    <button
                      onClick={() => processSelection(selection)}
                      disabled={selection.processing || !selection.question.trim()}
                      className="w-full px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                    >
                      {selection.processing ? (
                        <>
                          <RotateCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Create Child Node</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {selections.length > 1 && (
              <div className="p-4 border-t bg-white">
                <button
                  onClick={processAllSelections}
                  disabled={processingAll || selections.every(s => !s.question.trim())}
                  className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processingAll ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      <span>Processing All...</span>
                    </>
                  ) : (
                    <>
                      <Rocket className="w-4 h-4" />
                      <span>Create All Child Nodes</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NodeViewer;