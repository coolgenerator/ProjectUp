import React, { useState } from 'react';
import { motion } from 'framer-motion';
import OnboardingProgressBar from './OnboardingProgressBar';

export interface CompetitionRequirements {
  competitionName: string;
  competitionType: 'kaggle' | 'business_plan' | 'design' | 'hackathon' | 'research' | 'other';
  organizerName: string;
  deadline: string;
  judgingCriteria: string;
  constraints: {
    teamSize: number;
    submissionFormat: string;
    requiredTech: string[];
  };
  prizeInfo?: string;
}

interface CompetitionRequirementsInputProps {
  onComplete: (data: CompetitionRequirements) => void;
  onBack: () => void;
}

/**
 * Competition Requirements Input
 * Collects competition project information
 */
const CompetitionRequirementsInput: React.FC<CompetitionRequirementsInputProps> = ({
  onComplete,
  onBack,
}) => {
  const [data, setData] = useState<CompetitionRequirements>({
    competitionName: '',
    competitionType: 'other',
    organizerName: '',
    deadline: '',
    judgingCriteria: '',
    constraints: {
      teamSize: 3,
      submissionFormat: '',
      requiredTech: [],
    },
    prizeInfo: '',
  });
  const [newTech, setNewTech] = useState('');

  const competitionTypes = [
    { value: 'kaggle', label: 'Data Science/ML (Kaggle)' },
    { value: 'business_plan', label: 'Business Plan' },
    { value: 'design', label: 'Design/UI/UX' },
    { value: 'hackathon', label: 'Hackathon' },
    { value: 'research', label: 'Research/Academic' },
    { value: 'other', label: 'Other' },
  ];

  const handleAddTech = () => {
    if (newTech.trim() && !data.constraints.requiredTech.includes(newTech.trim())) {
      setData({
        ...data,
        constraints: {
          ...data.constraints,
          requiredTech: [...data.constraints.requiredTech, newTech.trim()],
        },
      });
      setNewTech('');
    }
  };

  const handleRemoveTech = (tech: string) => {
    setData({
      ...data,
      constraints: {
        ...data.constraints,
        requiredTech: data.constraints.requiredTech.filter((t) => t !== tech),
      },
    });
  };

  const isValid = () => {
    return (
      data.competitionName.trim() !== '' &&
      data.organizerName.trim() !== '' &&
      data.deadline.trim() !== '' &&
      data.judgingCriteria.trim() !== '' &&
      data.constraints.teamSize > 0
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Bar */}
      <OnboardingProgressBar color="orange" />

      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Competition Project Details</h2>
        <p className="text-gray-600">Tell us about your competition entry requirements</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-8"
      >
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Competition Name *</label>
              <input
                type="text"
                value={data.competitionName}
                onChange={(e) => setData({ ...data, competitionName: e.target.value })}
                placeholder="Kaggle House Prices Challenge"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Competition Type *</label>
              <select
                value={data.competitionType}
                onChange={(e) => setData({ ...data, competitionType: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              >
                {competitionTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Organizer *</label>
              <input
                type="text"
                value={data.organizerName}
                onChange={(e) => setData({ ...data, organizerName: e.target.value })}
                placeholder="Kaggle, MIT, Google, etc."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Submission Deadline *</label>
              <input
                type="date"
                value={data.deadline}
                onChange={(e) => setData({ ...data, deadline: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Judging Criteria & Rules *
            </label>
            <textarea
              value={data.judgingCriteria}
              onChange={(e) => setData({ ...data, judgingCriteria: e.target.value })}
              placeholder="Describe the evaluation criteria, scoring rubric, submission requirements, and competition rules..."
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prize Information (Optional)
            </label>
            <input
              type="text"
              value={data.prizeInfo}
              onChange={(e) => setData({ ...data, prizeInfo: e.target.value })}
              placeholder="$10,000 first place, internship opportunities, etc."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
          </div>

          {/* Constraints */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Submission Constraints</h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Team Size</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={data.constraints.teamSize}
                  onChange={(e) =>
                    setData({
                      ...data,
                      constraints: { ...data.constraints, teamSize: parseInt(e.target.value) || 1 },
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Submission Format</label>
                <input
                  type="text"
                  value={data.constraints.submissionFormat}
                  onChange={(e) =>
                    setData({
                      ...data,
                      constraints: { ...data.constraints, submissionFormat: e.target.value },
                    })
                  }
                  placeholder="PDF, Video, Code + Report, etc."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Required Technologies (Optional)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newTech}
                  onChange={(e) => setNewTech(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTech()}
                  placeholder="Python, TensorFlow, React..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={handleAddTech}
                  className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.constraints.requiredTech.map((tech) => (
                  <span
                    key={tech}
                    className="inline-flex items-center px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm"
                  >
                    {tech}
                    <button onClick={() => handleRemoveTech(tech)} className="ml-2 hover:text-yellow-900">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={onBack}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            ← Back
          </button>
          <button
            onClick={() => isValid() && onComplete(data)}
            disabled={!isValid()}
            className={`px-8 py-3 rounded-lg font-semibold ${
              isValid()
                ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Continue with AI Suggestions →
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default CompetitionRequirementsInput;
