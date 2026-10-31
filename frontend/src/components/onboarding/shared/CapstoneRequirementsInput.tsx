import React, { useState } from 'react';
import { motion } from 'framer-motion';

export interface CapstoneRequirements {
  major: string;
  school: string;
  advisorName?: string;
  researchArea: string;
  durationMonths: number;
  defenseRequirements: string;
  constraints: {
    teamSize: number;
    minPageCount?: number;
    requiredTech: string[];
  };
}

interface CapstoneRequirementsInputProps {
  onComplete: (data: CapstoneRequirements) => void;
  onBack: () => void;
}

/**
 * Capstone Requirements Input
 * Collects capstone/final year project information
 */
const CapstoneRequirementsInput: React.FC<CapstoneRequirementsInputProps> = ({
  onComplete,
  onBack,
}) => {
  const [data, setData] = useState<CapstoneRequirements>({
    major: '',
    school: '',
    advisorName: '',
    researchArea: '',
    durationMonths: 6,
    defenseRequirements: '',
    constraints: {
      teamSize: 2,
      minPageCount: 50,
      requiredTech: [],
    },
  });
  const [newTech, setNewTech] = useState('');

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
      data.major.trim() !== '' &&
      data.school.trim() !== '' &&
      data.researchArea.trim() !== '' &&
      data.durationMonths > 0 &&
      data.constraints.teamSize > 0
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
            />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Capstone Project Details</h2>
        <p className="text-gray-600">Tell us about your graduation project requirements</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-8"
      >
        {/* Basic Information */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Major/Program *</label>
              <input
                type="text"
                value={data.major}
                onChange={(e) => setData({ ...data, major: e.target.value })}
                placeholder="Computer Science"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">University *</label>
              <input
                type="text"
                value={data.school}
                onChange={(e) => setData({ ...data, school: e.target.value })}
                placeholder="Stanford University"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Advisor Name (Optional)</label>
            <input
              type="text"
              value={data.advisorName}
              onChange={(e) => setData({ ...data, advisorName: e.target.value })}
              placeholder="Prof. Jane Smith"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Research Area *</label>
            <input
              type="text"
              value={data.researchArea}
              onChange={(e) => setData({ ...data, researchArea: e.target.value })}
              placeholder="Machine Learning, Web Development, IoT, etc."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Defense & Documentation Requirements *
            </label>
            <textarea
              value={data.defenseRequirements}
              onChange={(e) => setData({ ...data, defenseRequirements: e.target.value })}
              placeholder="Describe the thesis defense requirements, documentation standards, evaluation criteria..."
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Constraints */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Constraints</h3>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Team Size</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={data.constraints.teamSize}
                  onChange={(e) =>
                    setData({
                      ...data,
                      constraints: { ...data.constraints, teamSize: parseInt(e.target.value) || 1 },
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Duration (Months)</label>
                <input
                  type="number"
                  min="3"
                  max="12"
                  value={data.durationMonths}
                  onChange={(e) => setData({ ...data, durationMonths: parseInt(e.target.value) || 6 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Min Pages (Optional)</label>
                <input
                  type="number"
                  min="10"
                  value={data.constraints.minPageCount || ''}
                  onChange={(e) =>
                    setData({
                      ...data,
                      constraints: { ...data.constraints, minPageCount: parseInt(e.target.value) || undefined },
                    })
                  }
                  placeholder="50"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                  placeholder="Python, React, TensorFlow..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={handleAddTech}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.constraints.requiredTech.map((tech) => (
                  <span
                    key={tech}
                    className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                  >
                    {tech}
                    <button onClick={() => handleRemoveTech(tech)} className="ml-2 hover:text-purple-900">
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
                ? 'bg-purple-600 text-white hover:bg-purple-700'
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

export default CapstoneRequirementsInput;
