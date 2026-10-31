import React, { useState } from 'react';
import { X, Plus, Trash2, Milestone as MilestoneIcon, GripVertical, Calendar } from 'lucide-react';
import config from '../../../config';
import { Milestone } from '../../../types/project/milestone';

const { AI_AGENT_URL } = config;

interface MilestoneReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMilestones: Partial<Milestone>[];
  projectId: string;
  nodeId: string;
  userId: string;
  onMilestonesCreated?: () => void;
}

const MilestoneReviewModal: React.FC<MilestoneReviewModalProps> = ({
  isOpen,
  onClose,
  initialMilestones,
  projectId,
  nodeId,
  userId,
  onMilestonesCreated,
}) => {
  const [milestones, setMilestones] = useState<Milestone[]>(
    initialMilestones.map((m, index) => ({
      id: `temp-${index}`,
      title: m.title || '',
      description: m.description || '',
      target_date: m.target_date,
      priority: m.priority || 3,
      success_criteria: m.success_criteria || [],
    }))
  );
  const [loading, setLoading] = useState(false);

  const handleMilestoneChange = (id: string, field: keyof Milestone, value: any) => {
    setMilestones(milestones.map(m =>
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  const handleAddMilestone = () => {
    setMilestones([
      ...milestones,
      {
        id: `temp-${Date.now()}`,
        title: '',
        description: '',
        priority: 3,
        success_criteria: [],
      },
    ]);
  };

  const handleRemoveMilestone = (id: string) => {
    setMilestones(milestones.filter(m => m.id !== id));
  };

  const handleAddCriteria = (milestoneId: string) => {
    setMilestones(milestones.map(m =>
      m.id === milestoneId
        ? { ...m, success_criteria: [...(m.success_criteria || []), ''] }
        : m
    ));
  };

  const handleCriteriaChange = (milestoneId: string, index: number, value: string) => {
    setMilestones(milestones.map(m =>
      m.id === milestoneId
        ? {
            ...m,
            success_criteria: (m.success_criteria || []).map((c, i) => i === index ? value : c)
          }
        : m
    ));
  };

  const handleRemoveCriteria = (milestoneId: string, index: number) => {
    setMilestones(milestones.map(m =>
      m.id === milestoneId
        ? {
            ...m,
            success_criteria: (m.success_criteria || []).filter((_, i) => i !== index)
          }
        : m
    ));
  };

  const handleSubmit = async () => {
    if (milestones.length === 0 || milestones.some(m => !m.title.trim())) {
      alert('Please fill in all milestone titles');
      return;
    }

    setLoading(true);
    try {
      // Create roadmap with milestones via roadmap service
      // Note: Adapting to use task service with milestone type
      const createPromises = milestones.map(milestone =>
        fetch(`${AI_AGENT_URL}/ai-api/tasks/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: projectId,
            title: milestone.title,
            description: milestone.description || null,
            task_type: 'action', // Milestone as a task type
            priority: milestone.priority,
            idea_node_id: nodeId,
            due_date: milestone.target_date || null,
            created_by: userId,
            tags: ['milestone'],
            action_metadata: {
              is_milestone: true,
              success_criteria: milestone.success_criteria || [],
            },
          }),
        })
      );

      const results = await Promise.all(createPromises);
      const allSuccessful = results.every(r => r.ok);

      if (allSuccessful) {
        alert(`Successfully created ${milestones.length} milestone(s)!`);
        if (onMilestonesCreated) onMilestonesCreated();
        onClose();
      } else {
        throw new Error('Some milestones failed to create');
      }
    } catch (error) {
      console.error('Error creating milestones:', error);
      alert('Failed to create milestones. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg">
              <MilestoneIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Review Milestones</h2>
              <p className="text-sm text-gray-600">
                Review and edit {milestones.length} milestone{milestones.length !== 1 ? 's' : ''} before creating
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Milestones List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {milestones.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <MilestoneIcon className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">
                No Related Content Detected
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
                The current node content doesn't appear to describe project milestones or goals. Try adding milestone-related content to this node first, or create milestones manually.
              </p>
              <button
                onClick={handleAddMilestone}
                className="mt-6 px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg font-medium hover:from-cyan-700 hover:to-cyan-800 shadow-lg transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Milestone Manually
              </button>
            </div>
          )}

          {milestones.map((milestone, index) => (
            <div
              key={milestone.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-cyan-300 transition-colors bg-white"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 text-gray-400 mt-2">
                  <GripVertical className="w-5 h-5" />
                </div>

                <div className="flex-1 space-y-3">
                  {/* Title */}
                  <input
                    type="text"
                    value={milestone.title}
                    onChange={(e) => handleMilestoneChange(milestone.id, 'title', e.target.value)}
                    placeholder="Milestone title *"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 font-medium"
                  />

                  {/* Description */}
                  <textarea
                    value={milestone.description}
                    onChange={(e) => handleMilestoneChange(milestone.id, 'description', e.target.value)}
                    placeholder="Milestone description"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-none"
                  />

                  {/* Priority & Target Date */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Priority
                      </label>
                      <select
                        value={milestone.priority}
                        onChange={(e) => handleMilestoneChange(milestone.id, 'priority', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                      >
                        <option value={1}>1 - Highest</option>
                        <option value={2}>2 - High</option>
                        <option value={3}>3 - Medium</option>
                        <option value={4}>4 - Low</option>
                        <option value={5}>5 - Lowest</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        Target Date
                      </label>
                      <input
                        type="date"
                        value={milestone.target_date || ''}
                        onChange={(e) => handleMilestoneChange(milestone.id, 'target_date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  {/* Success Criteria */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Success Criteria
                    </label>
                    <div className="space-y-2">
                      {(milestone.success_criteria || []).map((criteria, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input
                            type="text"
                            value={criteria}
                            onChange={(e) => handleCriteriaChange(milestone.id, idx, e.target.value)}
                            placeholder={`Criterion ${idx + 1}`}
                            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                          />
                          <button
                            onClick={() => handleRemoveCriteria(milestone.id, idx)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => handleAddCriteria(milestone.id)}
                        className="text-sm text-cyan-600 hover:text-cyan-700 font-medium"
                      >
                        + Add Success Criterion
                      </button>
                    </div>
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => handleRemoveMilestone(milestone.id)}
                  className="flex-shrink-0 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}

          {/* Add Milestone Button */}
          <button
            onClick={handleAddMilestone}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-cyan-400 hover:text-cyan-600 hover:bg-cyan-50 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Another Milestone
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {milestones.length} milestone{milestones.length !== 1 ? 's' : ''} to create
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || milestones.length === 0}
              className={`
                px-6 py-2 rounded-lg font-medium text-white transition-all
                ${loading || milestones.length === 0
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 shadow-lg hover:shadow-xl'
                }
              `}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </span>
              ) : (
                `Create ${milestones.length} Milestone${milestones.length !== 1 ? 's' : ''}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MilestoneReviewModal;
