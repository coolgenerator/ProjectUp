import React, { useState, useEffect } from 'react';
import { HiLightBulb, HiRocketLaunch, HiSparkles } from 'react-icons/hi2';
import { GiBrain, GiTreeBranch } from 'react-icons/gi';
import { FaStar, FaFire, FaChartBar, FaBullseye } from 'react-icons/fa';
import fetchWithAuth from '../../hooks/fetchWithAuth';
import config from '../../config';
import { IdeaTree, IdeaTreeConnection, IdeaTreeSummary } from '../../types/ideaTree';

const { API_BASE_URL } = config;

interface TreeDashboardProps {
  projectId: string;
  onSessionSelect: (sessionId: string) => void;
}

const TreeDashboard: React.FC<TreeDashboardProps> = ({ projectId, onSessionSelect }) => {
  const [summary, setSummary] = useState<IdeaTreeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [newSession, setNewSession] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    icon: 'lightbulb',
    purpose: ''
  });
  const [newConnection, setNewConnection] = useState({
    from_session_id: '',
    to_session_id: '',
    connection_type: 'relates_to',
    label: '',
    description: ''
  });

  useEffect(() => {
    fetchSummary();
  }, [projectId]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/${projectId}/tree-sessions/summary`);
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error('Error fetching session summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSession = async () => {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/tree-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newSession,
          project_id: projectId
        })
      });

      if (response.ok) {
        setShowCreateModal(false);
        setNewSession({ name: '', description: '', color: '#3B82F6', icon: 'lightbulb', purpose: '' });
        fetchSummary();
      }
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const createConnection = async () => {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/tree-sessions/connections`, {
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
        fetchSummary();
      }
    } catch (error) {
      console.error('Error creating connection:', error);
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return;

    try {
      await fetchWithAuth(`${API_BASE_URL}/api/tree-sessions/${sessionId}`, { method: 'DELETE' });
      fetchSummary();
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const deleteConnection = async (connId: string) => {
    try {
      await fetchWithAuth(`${API_BASE_URL}/api/tree-sessions/connections/${connId}`, { method: 'DELETE' });
      fetchSummary();
    } catch (error) {
      console.error('Error deleting connection:', error);
    }
  };

  const getConnectionLabel = (type: string) => {
    const labels: Record<string, string> = {
      builds_on: 'Builds On',
      relates_to: 'Relates To',
      alternative_to: 'Alternative To',
      extends: 'Extends'
    };
    return labels[type] || type;
  };

  const getConnectionColor = (type: string) => {
    const colors: Record<string, string> = {
      builds_on: 'bg-blue-100 text-blue-800 border-blue-300',
      relates_to: 'bg-purple-100 text-purple-800 border-purple-300',
      alternative_to: 'bg-orange-100 text-orange-800 border-orange-300',
      extends: 'bg-green-100 text-green-800 border-green-300'
    };
    return colors[type] || 'bg-gray-100 text-gray-800 border-gray-300';
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
    { value: 'tree', name: 'Tree', icon: GiTreeBranch }
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tree Sessions Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage and connect your brainstorming sessions</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + New Session
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
            <div className="text-blue-600 text-sm font-medium">Total Sessions</div>
            <div className="text-2xl font-bold text-blue-900 mt-1">{summary.total_sessions}</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
            <div className="text-purple-600 text-sm font-medium">Total Connections</div>
            <div className="text-2xl font-bold text-purple-900 mt-1">{summary.total_connections}</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
            <div className="text-green-600 text-sm font-medium">Total Nodes</div>
            <div className="text-2xl font-bold text-green-900 mt-1">
              {summary.sessions.reduce((sum, s) => sum + s.nodes_count, 0)}
            </div>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
            <div className="text-orange-600 text-sm font-medium">Avg Completion</div>
            <div className="text-2xl font-bold text-orange-900 mt-1">
              {summary.sessions.length > 0
                ? Math.round(summary.sessions.reduce((sum, s) => sum + s.completion_rate, 0) / summary.sessions.length)
                : 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Sessions Grid */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Sessions</h2>
          {selectedSessions.length >= 2 && (
            <button
              onClick={() => setShowConnectionModal(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
            >
              Connect Selected ({selectedSessions.length})
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {summary.sessions.map((session) => (
            <div
              key={session.id}
              className={`relative bg-white border-2 rounded-lg p-5 hover:shadow-lg transition-shadow cursor-pointer ${
                selectedSessions.includes(session.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
              style={{ borderLeftWidth: '6px', borderLeftColor: session.color || '#3B82F6' }}
              onClick={() => {
                if (selectedSessions.includes(session.id)) {
                  setSelectedSessions(selectedSessions.filter(id => id !== session.id));
                } else {
                  setSelectedSessions([...selectedSessions, session.id]);
                }
              }}
            >
              {/* Session Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <div className="text-indigo-600 mr-3">
                    {getIconComponent(session.icon || 'lightbulb', 'w-8 h-8')}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{session.name}</h3>
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
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{session.description}</p>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">{session.nodes_count}</div>
                  <div className="text-xs text-gray-500">Nodes</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">{session.connections_count}</div>
                  <div className="text-xs text-gray-500">Links</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">{Math.round(session.completion_rate)}%</div>
                  <div className="text-xs text-gray-500">Done</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all"
                    style={{ width: `${session.completion_rate}%` }}
                  ></div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSessionSelect(session.id);
                  }}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  Open Tree
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Connections Section */}
      {summary.connections.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Session Connections</h2>
          <div className="space-y-3">
            {summary.connections.map((conn) => {
              const fromSession = summary.sessions.find(s => s.id === conn.from_session_id);
              const toSession = summary.sessions.find(s => s.id === conn.to_session_id);

              return (
                <div
                  key={conn.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: fromSession?.color || '#3B82F6' }}
                        ></div>
                        <span className="font-medium text-gray-900">{fromSession?.name}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getConnectionColor(conn.connection_type)}`}>
                          {getConnectionLabel(conn.connection_type)}
                        </span>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: toSession?.color || '#3B82F6' }}
                        ></div>
                        <span className="font-medium text-gray-900">{toSession?.name}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => deleteConnection(conn.id)}
                      className="text-gray-400 hover:text-red-600 ml-4"
                    >
                      ×
                    </button>
                  </div>
                  {conn.description && (
                    <p className="text-sm text-gray-600 mt-2">{conn.description}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create New Session</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newSession.name}
                  onChange={(e) => setNewSession({ ...newSession, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., MVP Features Brainstorm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newSession.description}
                  onChange={(e) => setNewSession({ ...newSession, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="What is this session about?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purpose/Goal</label>
                <input
                  type="text"
                  value={newSession.purpose}
                  onChange={(e) => setNewSession({ ...newSession, purpose: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="What do you want to achieve?"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <input
                    type="color"
                    value={newSession.color}
                    onChange={(e) => setNewSession({ ...newSession, color: e.target.value })}
                    className="w-full h-10 rounded-md cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                  <select
                    value={newSession.icon}
                    onChange={(e) => setNewSession({ ...newSession, icon: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    {iconOptions.map(icon => (
                      <option key={icon.value} value={icon.value}>
                        {icon.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createSession}
                disabled={!newSession.name}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Connection Modal */}
      {showConnectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Connect Sessions</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Session</label>
                <select
                  value={newConnection.from_session_id}
                  onChange={(e) => setNewConnection({ ...newConnection, from_session_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a session</option>
                  {selectedSessions.length > 0
                    ? selectedSessions.map(id => {
                        const session = summary.sessions.find(s => s.id === id);
                        return session ? (
                          <option key={session.id} value={session.id}>{session.name}</option>
                        ) : null;
                      })
                    : summary.sessions.map(session => (
                        <option key={session.id} value={session.id}>{session.name}</option>
                      ))
                  }
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
                <label className="block text-sm font-medium text-gray-700 mb-1">To Session</label>
                <select
                  value={newConnection.to_session_id}
                  onChange={(e) => setNewConnection({ ...newConnection, to_session_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a session</option>
                  {selectedSessions.length > 0
                    ? selectedSessions.map(id => {
                        const session = summary.sessions.find(s => s.id === id);
                        return session && session.id !== newConnection.from_session_id ? (
                          <option key={session.id} value={session.id}>{session.name}</option>
                        ) : null;
                      })
                    : summary.sessions
                        .filter(s => s.id !== newConnection.from_session_id)
                        .map(session => (
                          <option key={session.id} value={session.id}>{session.name}</option>
                        ))
                  }
                </select>
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
                  setSelectedSessions([]);
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
    </div>
  );
};

export default TreeDashboard;
