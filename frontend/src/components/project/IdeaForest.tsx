import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HiLightBulb, HiRocketLaunch, HiSparkles } from 'react-icons/hi2';
import { GiBrain, GiTreeBranch, GiPineTree } from 'react-icons/gi';
import { FaStar, FaFire, FaChartBar, FaBullseye, FaTree } from 'react-icons/fa';
import ForestCanvas from './ForestCanvas';
import IdeaTree from './IdeaForest/IdeaTree';
import ConfirmDialog from '../common/ConfirmDialog';
import config from '../../config';

const { AI_AGENT_URL } = config;

interface IdeaForestProps {
  projectId: string;
}

type ViewType = 'canvas' | 'tree';

interface ViewState {
  type: ViewType;
  sessionId?: string;
}

interface TreeSession {
  id: string;
  name: string;
  color: string;
  icon: string;
  nodes_count: number;
  is_default: boolean;
}

const IdeaForest: React.FC<IdeaForestProps> = ({ projectId }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize state from URL parameters
  const getInitialViewStack = (): ViewState[] => {
    const view = searchParams.get('view');
    const sessionId = searchParams.get('sessionId');

    if (view === 'tree' && sessionId) {
      return [{ type: 'tree' as const, sessionId }];
    }
    return [{ type: 'canvas' as const }];
  };

  const [viewStack, setViewStack] = useState<ViewState[]>(getInitialViewStack);
  const [isNavbarOpen, setIsNavbarOpen] = useState(false);
  const [sessions, setSessions] = useState<TreeSession[]>([]);
  const [showQuickTips, setShowQuickTips] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<{id: string, name: string} | null>(null);

  const currentView = viewStack[viewStack.length - 1];

  // Sync URL with viewStack changes
  useEffect(() => {
    const section = searchParams.get('section');
    const newParams = new URLSearchParams(searchParams);

    if (currentView.type === 'tree' && currentView.sessionId) {
      newParams.set('view', 'tree');
      newParams.set('sessionId', currentView.sessionId);
    } else {
      newParams.delete('view');
      newParams.delete('sessionId');
    }

    // Preserve the section parameter
    if (section) {
      newParams.set('section', section);
    }

    setSearchParams(newParams, { replace: true });
  }, [currentView]);

  // Fetch sessions for navbar
  const fetchSessions = async () => {
    try {
      const response = await fetch(`${AI_AGENT_URL}/ai-api/projects/${projectId}/tree-sessions/summary`);
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [projectId, currentView]);

  const handleTreeSelect = (sessionId: string) => {
    const newViewStack = [...viewStack, { type: 'tree' as const, sessionId }];
    setViewStack(newViewStack);
    setIsNavbarOpen(false); // Close navbar after selection
  };

  const handleBack = () => {
    if (viewStack.length > 1) {
      const newViewStack = viewStack.slice(0, -1);
      setViewStack(newViewStack);
    }
  };

  const handleDeleteSession = async () => {
    if (!sessionToDelete) return;

    try {
      const response = await fetch(`${AI_AGENT_URL}/ai-api/tree-sessions/${sessionToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove from local state
        setSessions(sessions.filter(s => s.id !== sessionToDelete.id));

        // If we're currently viewing this session, go back to canvas
        if (currentView.type === 'tree' && currentView.sessionId === sessionToDelete.id) {
          handleBackToCanvas();
        }
      } else {
        alert('Failed to delete session');
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete session');
    }

    // Close dialog and reset state
    setShowDeleteConfirm(false);
    setSessionToDelete(null);
  };

  const handleBackToCanvas = () => {
    setViewStack([{ type: 'canvas' as const }]);
    setIsNavbarOpen(false); // Close navbar after selection
  };

  const handleNavToSession = (sessionId: string) => {
    setViewStack([{ type: 'tree' as const, sessionId }]);
    setIsNavbarOpen(false);
  };

  const iconOptions = [
    { value: 'lightbulb', label: 'Lightbulb', icon: HiLightBulb },
    { value: 'rocket', label: 'Rocket', icon: HiRocketLaunch },
    { value: 'brain', label: 'Brain', icon: GiBrain },
    { value: 'target', label: 'Target', icon: FaBullseye },
    { value: 'star', label: 'Star', icon: FaStar },
    { value: 'fire', label: 'Fire', icon: FaFire },
    { value: 'sparkles', label: 'Sparkles', icon: HiSparkles },
    { value: 'chart', label: 'Chart', icon: FaChartBar },
    { value: 'tree', label: 'Tree Branch', icon: GiTreeBranch },
    { value: 'pine', label: 'Pine Tree', icon: GiPineTree },
  ];

  const getIconComponent = (iconValue: string) => {
    const option = iconOptions.find(opt => opt.value === iconValue);
    if (option) {
      const IconComponent = option.icon;
      return <IconComponent className="w-5 h-5" />;
    }
    return <HiLightBulb className="w-5 h-5" />; // Default
  };

  return (
    <div className="relative w-full h-screen flex flex-col">
      {/* Header - only show when in tree view */}
      {currentView.type === 'tree' && currentView.sessionId && (
        <div className="flex-shrink-0 z-50">
          {/* This will be populated by IdeaForest's header content */}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Collapsible Sidebar Navbar */}
        <div
          className={`${
            isNavbarOpen ? 'w-72' : 'w-12'
          } bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-r border-white/20 transition-all duration-300 flex flex-col z-50 shadow-xl`}
        >
        {/* Toggle Button */}
        <button
          onClick={() => setIsNavbarOpen(!isNavbarOpen)}
          className="p-3 hover:bg-white/30 dark:hover:bg-slate-800/30 transition-colors border-b border-white/20 flex items-center justify-center"
        >
          {isNavbarOpen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>

        {/* Navbar Content */}
        {isNavbarOpen && (
          <div className="flex-1 overflow-y-auto">
            {/* Forest Canvas Option */}
            <div
              onClick={handleBackToCanvas}
              className={`px-4 py-3 cursor-pointer transition-colors rounded-lg mx-2 ${
                currentView.type === 'canvas'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-l-4 border-cyan-500'
                  : 'hover:bg-white/20 dark:hover:bg-slate-800/20'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                  <FaTree className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Forest Canvas</h3>
                  <p className="text-xs text-gray-500">{sessions.length} trees</p>
                </div>
              </div>
            </div>

            <div className="h-px bg-gray-200 my-2" />

            {/* Tree Sessions List */}
            <div className="px-3 py-2">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Trees</h4>
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`px-3 py-2 rounded-xl cursor-pointer transition-colors mb-1 group relative ${
                    currentView.type === 'tree' && currentView.sessionId === session.id
                      ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/50 shadow-lg'
                      : 'hover:bg-white/20 dark:hover:bg-slate-800/20'
                  }`}
                  onClick={() => handleNavToSession(session.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-indigo-600">
                      {getIconComponent(session.icon || 'lightbulb')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{session.name}</p>
                      <p className="text-xs text-gray-500">{session.nodes_count} nodes</p>
                    </div>
                    {/* Delete Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSessionToDelete({ id: session.id, name: session.name });
                        setShowDeleteConfirm(true);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all"
                      title="Delete session"
                    >
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

        {/* Content Area */}
        <div className="flex-1 relative overflow-hidden">
          {currentView.type === 'canvas' ? (
            <ForestCanvas
              projectId={projectId}
              onTreeSelect={handleTreeSelect}
              onTreeUpdate={fetchSessions}
            />
          ) : (
            <IdeaTree projectId={projectId} sessionId={currentView.sessionId} />
          )}

          {/* Help Tooltip (only on canvas) */}
          {currentView.type === 'canvas' && (
            <div className="absolute bottom-4 right-4">
              <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 overflow-hidden">
                <button
                  onClick={() => setShowQuickTips(!showQuickTips)}
                  className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-white/30 dark:hover:bg-slate-800/30 transition-colors flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Quick Tips</span>
                  </div>
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
                  <div className="border-t border-white/20 p-4 max-w-xs">
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• <strong>Drag</strong> cards to reposition</li>
                      <li>• <strong>Double-click</strong> card to open tree</li>
                      <li>• <strong>Shift+click</strong> to select for connection</li>
                      <li>• <strong>Mouse wheel</strong> to zoom</li>
                      <li>• <strong>Click+drag</strong> background to pan</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setSessionToDelete(null);
        }}
        onConfirm={handleDeleteSession}
        title="Delete Tree Session"
        message={`Are you sure you want to delete "${sessionToDelete?.name}"? This will permanently delete all nodes in this session. This action cannot be undone.`}
        confirmText="Delete Forever"
        cancelText="Cancel"
        danger={true}
        requiresTyping={true}
        typingConfirmText="DELETE"
      />
    </div>
  );
};

export default IdeaForest;
