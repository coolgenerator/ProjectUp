import React, { useState, useEffect } from 'react';
import {
  LearningResource,
  ResourceType,
  ResourceStatus,
  CreateLearningResourceRequest,
  RESOURCE_TYPE_CONFIG
} from '../../../types/task';
import fetchWithAuth from '../../../hooks/fetchWithAuth';

interface LearningResourceListProps {
  taskId: string;
  onResourcesChanged: () => void;
}

const LearningResourceList: React.FC<LearningResourceListProps> = ({
  taskId,
  onResourcesChanged
}) => {
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Add form state
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ResourceType>('article');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedTimeMinutes, setEstimatedTimeMinutes] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [keyTakeaways, setKeyTakeaways] = useState<string[]>([]);
  const [takeawayInput, setTakeawayInput] = useState('');

  const fetchResources = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth(`/api/tasks/${taskId}/resources`);

      if (response.ok) {
        const data = await response.json();
        setResources(data.resources || []);
      }
    } catch (error) {
      console.error('Error fetching resources:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [taskId]);

  const handleAddResource = async () => {
    if (!title.trim()) return;

    try {
      const resourceData: CreateLearningResourceRequest = {
        title,
        type,
        url: url || undefined,
        description: description || undefined,
        estimated_time_minutes: estimatedTimeMinutes ? parseInt(estimatedTimeMinutes) : undefined
      };

      const response = await fetchWithAuth(`/api/tasks/${taskId}/resources`, {
        method: 'POST',
        body: JSON.stringify(resourceData)
      });

      if (response.ok) {
        setTitle('');
        setType('article');
        setUrl('');
        setDescription('');
        setEstimatedTimeMinutes('');
        setShowAddForm(false);
        await fetchResources();
        onResourcesChanged();
      }
    } catch (error) {
      console.error('Error adding resource:', error);
    }
  };

  const handleMarkComplete = async (resourceId: string) => {
    try {
      const response = await fetchWithAuth(
        `/api/tasks/${taskId}/resources/${resourceId}/complete`,
        {
          method: 'POST',
          body: JSON.stringify({
            notes: editingId === resourceId ? notes : undefined,
            key_takeaways: editingId === resourceId && keyTakeaways.length > 0 ? keyTakeaways : undefined
          })
        }
      );

      if (response.ok) {
        setEditingId(null);
        setNotes('');
        setKeyTakeaways([]);
        await fetchResources();
        onResourcesChanged();
      }
    } catch (error) {
      console.error('Error marking resource complete:', error);
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!window.confirm('Are you sure you want to delete this resource?')) return;

    try {
      const response = await fetchWithAuth(`/api/tasks/${taskId}/resources/${resourceId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchResources();
        onResourcesChanged();
      }
    } catch (error) {
      console.error('Error deleting resource:', error);
    }
  };

  const handleAddTakeaway = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && takeawayInput.trim()) {
      e.preventDefault();
      setKeyTakeaways([...keyTakeaways, takeawayInput.trim()]);
      setTakeawayInput('');
    }
  };

  const completedCount = resources.filter(r => r.status === 'completed').length;
  const totalCount = resources.length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin text-2xl">⏳</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress Summary */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-bold text-amber-900">Learning Progress</h4>
          <span className="text-2xl font-bold text-amber-700">{completionRate}%</span>
        </div>
        <div className="w-full bg-amber-200 rounded-full h-3 mb-2">
          <div
            className="bg-gradient-to-r from-amber-400 to-amber-600 h-3 rounded-full transition-all"
            style={{ width: `${completionRate}%` }}
          />
        </div>
        <div className="text-sm text-amber-700">
          {completedCount} of {totalCount} resources completed
        </div>
      </div>

      {/* Add Resource Button */}
      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full py-3 border-2 border-dashed border-blue-300 rounded-lg text-blue-700 font-semibold hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Learning Resource
        </button>
      )}

      {/* Add Resource Form */}
      {showAddForm && (
        <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50 space-y-3">
          <h4 className="font-bold text-blue-900">New Learning Resource</h4>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Resource title *"
            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            autoFocus
          />

          <select
            value={type}
            onChange={(e) => setType(e.target.value as ResourceType)}
            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {(Object.keys(RESOURCE_TYPE_CONFIG) as ResourceType[]).map((t) => (
              <option key={t} value={t}>
                {RESOURCE_TYPE_CONFIG[t].icon} {RESOURCE_TYPE_CONFIG[t].label}
              </option>
            ))}
          </select>

          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="URL (optional)"
            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
          />

          <input
            type="number"
            min="0"
            value={estimatedTimeMinutes}
            onChange={(e) => setEstimatedTimeMinutes(e.target.value)}
            placeholder="Estimated time in minutes (optional)"
            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />

          <div className="flex gap-2">
            <button
              onClick={handleAddResource}
              disabled={!title.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Resource
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setTitle('');
                setUrl('');
                setDescription('');
                setEstimatedTimeMinutes('');
              }}
              className="px-4 py-2 bg-white border border-blue-300 text-blue-700 font-semibold rounded-lg hover:bg-blue-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Resource List */}
      {resources.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <div className="text-4xl mb-2">📚</div>
          <p>No learning resources yet. Add one to get started!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {resources.map((resource) => {
            const typeConfig = RESOURCE_TYPE_CONFIG[resource.type];
            const isCompleted = resource.status === 'completed';
            const isEditing = editingId === resource.id;

            return (
              <div
                key={resource.id}
                className={`p-4 border-2 rounded-lg ${
                  isCompleted
                    ? 'bg-green-50 border-green-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{typeConfig.icon}</span>
                      <h5 className={`font-semibold ${isCompleted ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                        {resource.title}
                      </h5>
                      {isCompleted && (
                        <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded-full font-bold">
                          ✓ Completed
                        </span>
                      )}
                    </div>

                    {resource.description && (
                      <p className="text-sm text-slate-600 mb-2">{resource.description}</p>
                    )}

                    {resource.url && (
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Open Resource
                      </a>
                    )}

                    {resource.estimated_time_minutes && (
                      <div className="text-xs text-slate-500 mt-1">
                        ⏱️ Estimated: {resource.estimated_time_minutes} minutes
                      </div>
                    )}

                    {/* Notes and Takeaways (for completed resources) */}
                    {isCompleted && (
                      <div className="mt-3 pt-3 border-t border-green-300">
                        {resource.notes && (
                          <div className="mb-2">
                            <div className="text-xs font-semibold text-green-700 mb-1">Notes:</div>
                            <p className="text-sm text-green-800">{resource.notes}</p>
                          </div>
                        )}
                        {resource.key_takeaways && resource.key_takeaways.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold text-green-700 mb-1">Key Takeaways:</div>
                            <ul className="list-disc list-inside text-sm text-green-800 space-y-1">
                              {resource.key_takeaways.map((takeaway, idx) => (
                                <li key={idx}>{takeaway}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Complete Form */}
                    {isEditing && !isCompleted && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded space-y-2">
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Add notes about this resource..."
                          rows={2}
                          className="w-full px-3 py-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                        />
                        <div>
                          <input
                            type="text"
                            value={takeawayInput}
                            onChange={(e) => setTakeawayInput(e.target.value)}
                            onKeyDown={handleAddTakeaway}
                            placeholder="Add key takeaway and press Enter..."
                            className="w-full px-3 py-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                          {keyTakeaways.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {keyTakeaways.map((takeaway, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm text-blue-800">
                                  <span>• {takeaway}</span>
                                  <button
                                    onClick={() => setKeyTakeaways(keyTakeaways.filter((_, i) => i !== idx))}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1">
                    {!isCompleted && (
                      <>
                        <button
                          onClick={() => {
                            if (isEditing) {
                              handleMarkComplete(resource.id);
                            } else {
                              setEditingId(resource.id);
                              setNotes('');
                              setKeyTakeaways([]);
                            }
                          }}
                          className="px-3 py-1.5 bg-green-600 text-white text-sm font-semibold rounded hover:bg-green-700 transition-all"
                        >
                          {isEditing ? '✓ Complete' : 'Mark Complete'}
                        </button>
                        {isEditing && (
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setNotes('');
                              setKeyTakeaways([]);
                            }}
                            className="px-3 py-1.5 bg-slate-200 text-slate-700 text-sm font-semibold rounded hover:bg-slate-300 transition-all"
                          >
                            Cancel
                          </button>
                        )}
                      </>
                    )}
                    <button
                      onClick={() => handleDeleteResource(resource.id)}
                      className="px-3 py-1.5 bg-red-100 text-red-700 text-sm font-semibold rounded hover:bg-red-200 transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LearningResourceList;
