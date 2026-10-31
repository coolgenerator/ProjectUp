import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Building2, Users, Target, FileText, Clock } from 'lucide-react';
import OnboardingProgressBar from './OnboardingProgressBar';

export interface InternshipRequirements {
  companyName: string;
  projectName: string;
  mentorName?: string;
  businessObjectives: string;
  deliverables: string;
  durationMonths: number;
  constraints: {
    requiredTech: string[];
    stakeholders: string[];
  };
}

interface InternshipRequirementsInputProps {
  onComplete: (data: InternshipRequirements) => void;
  onBack: () => void;
}

const InternshipRequirementsInput: React.FC<InternshipRequirementsInputProps> = ({
  onComplete,
  onBack,
}) => {
  const [data, setData] = useState<InternshipRequirements>({
    companyName: '',
    projectName: '',
    mentorName: '',
    businessObjectives: '',
    deliverables: '',
    durationMonths: 3,
    constraints: {
      requiredTech: [],
      stakeholders: [],
    },
  });

  const [newTech, setNewTech] = useState('');
  const [newStakeholder, setNewStakeholder] = useState('');

  const isValid = () => {
    return (
      data.companyName.trim() !== '' &&
      data.projectName.trim() !== '' &&
      data.businessObjectives.trim() !== '' &&
      data.deliverables.trim() !== '' &&
      data.durationMonths >= 1 &&
      data.durationMonths <= 12
    );
  };

  const addTech = () => {
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

  const removeTech = (tech: string) => {
    setData({
      ...data,
      constraints: {
        ...data.constraints,
        requiredTech: data.constraints.requiredTech.filter((t) => t !== tech),
      },
    });
  };

  const addStakeholder = () => {
    if (newStakeholder.trim() && !data.constraints.stakeholders.includes(newStakeholder.trim())) {
      setData({
        ...data,
        constraints: {
          ...data.constraints,
          stakeholders: [...data.constraints.stakeholders, newStakeholder.trim()],
        },
      });
      setNewStakeholder('');
    }
  };

  const removeStakeholder = (stakeholder: string) => {
    setData({
      ...data,
      constraints: {
        ...data.constraints,
        stakeholders: data.constraints.stakeholders.filter((s) => s !== stakeholder),
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Bar */}
      <OnboardingProgressBar color="blue" />

      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full mb-4">
          <Briefcase className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Internship Project Details</h2>
        <p className="text-gray-600">Tell us about your internship project requirements</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-8"
      >
        <div className="space-y-6">
          {/* Company Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Building2 className="w-4 h-4 mr-2 text-indigo-600" />
                Company Name *
              </label>
              <input
                type="text"
                value={data.companyName}
                onChange={(e) => setData({ ...data, companyName: e.target.value })}
                placeholder="e.g., Google, Microsoft, Startup Inc."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 mr-2 text-indigo-600" />
                Project/Team Name *
              </label>
              <input
                type="text"
                value={data.projectName}
                onChange={(e) => setData({ ...data, projectName: e.target.value })}
                placeholder="e.g., Mobile App Team, Backend Infrastructure"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Mentor and Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Users className="w-4 h-4 mr-2 text-indigo-600" />
                Mentor/Manager Name
              </label>
              <input
                type="text"
                value={data.mentorName}
                onChange={(e) => setData({ ...data, mentorName: e.target.value })}
                placeholder="e.g., John Smith (optional)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 mr-2 text-indigo-600" />
                Duration (months) *
              </label>
              <input
                type="number"
                min="1"
                max="12"
                value={data.durationMonths}
                onChange={(e) => setData({ ...data, durationMonths: parseInt(e.target.value) || 3 })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Typical: 3-6 months</p>
            </div>
          </div>

          {/* Business Objectives */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Target className="w-4 h-4 mr-2 text-indigo-600" />
              Business Objectives *
            </label>
            <textarea
              value={data.businessObjectives}
              onChange={(e) => setData({ ...data, businessObjectives: e.target.value })}
              placeholder="What are the business goals of this project? What problem does it solve?"
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Describe the business value, target users, and expected impact
            </p>
          </div>

          {/* Deliverables */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 mr-2 text-indigo-600" />
              Expected Deliverables *
            </label>
            <textarea
              value={data.deliverables}
              onChange={(e) => setData({ ...data, deliverables: e.target.value })}
              placeholder="What specific outputs are expected? (e.g., production-ready feature, API endpoints, documentation)"
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              List concrete deliverables and success criteria
            </p>
          </div>

          {/* Required Technologies */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <span className="text-indigo-600 mr-2">⚙️</span>
              Required Technologies
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newTech}
                onChange={(e) => setNewTech(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTech())}
                placeholder="e.g., Python, React, Docker"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={addTech}
                className="px-6 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 font-medium"
              >
                Add
              </button>
            </div>
            {data.constraints.requiredTech.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.constraints.requiredTech.map((tech) => (
                  <span
                    key={tech}
                    className="inline-flex items-center px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm"
                  >
                    {tech}
                    <button
                      type="button"
                      onClick={() => removeTech(tech)}
                      className="ml-2 text-indigo-600 hover:text-indigo-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Stakeholders */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Users className="w-4 h-4 mr-2 text-indigo-600" />
              Key Stakeholders
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newStakeholder}
                onChange={(e) => setNewStakeholder(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addStakeholder())}
                placeholder="e.g., Product Manager, Engineering Lead"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={addStakeholder}
                className="px-6 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 font-medium"
              >
                Add
              </button>
            </div>
            {data.constraints.stakeholders.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.constraints.stakeholders.map((stakeholder) => (
                  <span
                    key={stakeholder}
                    className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                  >
                    {stakeholder}
                    <button
                      type="button"
                      onClick={() => removeStakeholder(stakeholder)}
                      className="ml-2 text-purple-600 hover:text-purple-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={onBack}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={() => isValid() && onComplete(data)}
            disabled={!isValid()}
            className={`px-8 py-3 rounded-lg font-semibold transition-all ${
              isValid()
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-md hover:shadow-lg'
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

export default InternshipRequirementsInput;
