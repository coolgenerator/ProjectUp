import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FlaskConical, GraduationCap, Users, FileText, Target, Calendar } from 'lucide-react';

export interface ResearchRequirements {
  researchArea: string;
  institution?: string;
  advisorName?: string;
  researchType: 'experimental' | 'theoretical' | 'applied' | 'mixed';
  researchQuestions: string;
  proposalStatus: 'planning' | 'proposed' | 'approved';
  durationMonths: number;
  constraints: {
    fundingAvailable: boolean;
    requiresEthicsApproval: boolean;
    teamSize: number;
    requiredMethods: string[];
  };
}

interface ResearchRequirementsInputProps {
  onComplete: (data: ResearchRequirements) => void;
  onBack: () => void;
}

const ResearchRequirementsInput: React.FC<ResearchRequirementsInputProps> = ({
  onComplete,
  onBack,
}) => {
  const [data, setData] = useState<ResearchRequirements>({
    researchArea: '',
    institution: '',
    advisorName: '',
    researchType: 'mixed',
    researchQuestions: '',
    proposalStatus: 'planning',
    durationMonths: 6,
    constraints: {
      fundingAvailable: false,
      requiresEthicsApproval: false,
      teamSize: 1,
      requiredMethods: [],
    },
  });

  const [newMethod, setNewMethod] = useState('');

  const isValid = () => {
    return (
      data.researchArea.trim() !== '' &&
      data.researchQuestions.trim() !== '' &&
      data.durationMonths >= 1 &&
      data.durationMonths <= 48
    );
  };

  const addMethod = () => {
    if (newMethod.trim() && !data.constraints.requiredMethods.includes(newMethod.trim())) {
      setData({
        ...data,
        constraints: {
          ...data.constraints,
          requiredMethods: [...data.constraints.requiredMethods, newMethod.trim()],
        },
      });
      setNewMethod('');
    }
  };

  const removeMethod = (method: string) => {
    setData({
      ...data,
      constraints: {
        ...data.constraints,
        requiredMethods: data.constraints.requiredMethods.filter((m) => m !== method),
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full mb-4">
          <FlaskConical className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Research Project Details</h2>
        <p className="text-gray-600">Define your research scope and objectives</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-8"
      >
        <div className="space-y-6">
          {/* Research Area and Institution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Target className="w-4 h-4 mr-2 text-purple-600" />
                Research Area *
              </label>
              <input
                type="text"
                value={data.researchArea}
                onChange={(e) => setData({ ...data, researchArea: e.target.value })}
                placeholder="e.g., Machine Learning, Quantum Computing"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <GraduationCap className="w-4 h-4 mr-2 text-purple-600" />
                Institution (Optional)
              </label>
              <input
                type="text"
                value={data.institution}
                onChange={(e) => setData({ ...data, institution: e.target.value })}
                placeholder="e.g., MIT, Stanford University, or leave blank"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Advisor and Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Users className="w-4 h-4 mr-2 text-purple-600" />
                Advisor/PI Name
              </label>
              <input
                type="text"
                value={data.advisorName}
                onChange={(e) => setData({ ...data, advisorName: e.target.value })}
                placeholder="e.g., Dr. Smith (optional)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 mr-2 text-purple-600" />
                Duration (months) *
              </label>
              <input
                type="number"
                min="1"
                max="48"
                value={data.durationMonths}
                onChange={(e) => setData({ ...data, durationMonths: parseInt(e.target.value) || 6 })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Typical: 6-24 months</p>
            </div>
          </div>

          {/* Research Type */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <FlaskConical className="w-4 h-4 mr-2 text-purple-600" />
              Research Type *
            </label>
            <select
              value={data.researchType}
              onChange={(e) => setData({ ...data, researchType: e.target.value as any })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="experimental">Experimental Research</option>
              <option value="theoretical">Theoretical Research</option>
              <option value="applied">Applied Research</option>
              <option value="mixed">Mixed Methods</option>
            </select>
          </div>

          {/* Research Questions */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 mr-2 text-purple-600" />
              Research Questions/Objectives *
            </label>
            <textarea
              value={data.researchQuestions}
              onChange={(e) => setData({ ...data, researchQuestions: e.target.value })}
              placeholder="What are the main research questions you want to explore? What hypotheses do you want to test?"
              rows={5}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Be specific about what you want to discover or prove
            </p>
          </div>

          {/* Proposal Status */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 mr-2 text-purple-600" />
              Proposal Status
            </label>
            <select
              value={data.proposalStatus}
              onChange={(e) => setData({ ...data, proposalStatus: e.target.value as any })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="planning">Planning (Not yet submitted)</option>
              <option value="proposed">Proposed (Under review)</option>
              <option value="approved">Approved (Ready to start)</option>
            </select>
          </div>

          {/* Constraints */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Users className="w-4 h-4 mr-2 text-purple-600" />
                Team Size
              </label>
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={data.constraints.fundingAvailable}
                  onChange={(e) =>
                    setData({
                      ...data,
                      constraints: { ...data.constraints, fundingAvailable: e.target.checked },
                    })
                  }
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <span className="ml-2 text-sm text-gray-700">Funding Available</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={data.constraints.requiresEthicsApproval}
                  onChange={(e) =>
                    setData({
                      ...data,
                      constraints: { ...data.constraints, requiresEthicsApproval: e.target.checked },
                    })
                  }
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <span className="ml-2 text-sm text-gray-700">Requires Ethics Approval (IRB)</span>
              </label>
            </div>
          </div>

          {/* Research Methods */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <span className="text-purple-600 mr-2">🔬</span>
              Required Research Methods
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newMethod}
                onChange={(e) => setNewMethod(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMethod())}
                placeholder="e.g., Surveys, Experiments, Data Analysis"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={addMethod}
                className="px-6 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-medium"
              >
                Add
              </button>
            </div>
            {data.constraints.requiredMethods.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.constraints.requiredMethods.map((method) => (
                  <span
                    key={method}
                    className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                  >
                    {method}
                    <button
                      type="button"
                      onClick={() => removeMethod(method)}
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
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-md hover:shadow-lg'
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

export default ResearchRequirementsInput;
