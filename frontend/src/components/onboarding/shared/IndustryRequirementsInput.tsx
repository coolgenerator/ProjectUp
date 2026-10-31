import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building, Handshake, Target, FileText, Users, TrendingUp, DollarSign, Sparkles } from 'lucide-react';
import { getAllIndustries, getIndustryPreset } from '../../../utils/industryPresets';

export interface IndustryRequirements {
  clientCompanyName: string;
  industrySector: string;
  projectType: 'consulting' | 'r&d' | 'product_development' | 'process_improvement' | 'other';
  businessChallenge: string;
  projectScope: string;
  deliverables: string;
  successMetrics: string;
  durationMonths: number;
  budgetRange?: string;
  constraints: {
    teamSize: number;
    requiredExpertise: string[];
    stakeholders: string[];
    compliance?: string;
  };
}

interface IndustryRequirementsInputProps {
  onComplete: (data: IndustryRequirements) => void;
  onBack: () => void;
}

const IndustryRequirementsInput: React.FC<IndustryRequirementsInputProps> = ({
  onComplete,
  onBack,
}) => {
  const [data, setData] = useState<IndustryRequirements>({
    clientCompanyName: '',
    industrySector: '',
    projectType: 'consulting',
    businessChallenge: '',
    projectScope: '',
    deliverables: '',
    successMetrics: '',
    durationMonths: 6,
    budgetRange: '',
    constraints: {
      teamSize: 3,
      requiredExpertise: [],
      stakeholders: [],
      compliance: '',
    },
  });

  const [newExpertise, setNewExpertise] = useState('');
  const [newStakeholder, setNewStakeholder] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);

  // Get industry-specific suggestions
  const industryPreset = getIndustryPreset(data.industrySector);
  const industryOptions = getAllIndustries();

  // Update suggestions when industry changes
  useEffect(() => {
    if (industryPreset && data.industrySector !== 'custom') {
      setShowSuggestions(true);
    }
  }, [data.industrySector, industryPreset]);

  const isValid = () => {
    return (
      data.clientCompanyName.trim() !== '' &&
      data.industrySector.trim() !== '' &&
      data.businessChallenge.trim() !== '' &&
      data.projectScope.trim() !== '' &&
      data.deliverables.trim() !== '' &&
      data.successMetrics.trim() !== '' &&
      data.durationMonths >= 1 &&
      data.durationMonths <= 24 &&
      data.constraints.teamSize >= 1
    );
  };

  const addExpertise = () => {
    if (newExpertise.trim() && !data.constraints.requiredExpertise.includes(newExpertise.trim())) {
      setData({
        ...data,
        constraints: {
          ...data.constraints,
          requiredExpertise: [...data.constraints.requiredExpertise, newExpertise.trim()],
        },
      });
      setNewExpertise('');
    }
  };

  const removeExpertise = (expertise: string) => {
    setData({
      ...data,
      constraints: {
        ...data.constraints,
        requiredExpertise: data.constraints.requiredExpertise.filter((e) => e !== expertise),
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

  // Quick-add functions for suggested items
  const quickAddExpertise = (expertise: string) => {
    if (!data.constraints.requiredExpertise.includes(expertise)) {
      setData({
        ...data,
        constraints: {
          ...data.constraints,
          requiredExpertise: [...data.constraints.requiredExpertise, expertise],
        },
      });
    }
  };

  const quickAddStakeholder = (stakeholder: string) => {
    if (!data.constraints.stakeholders.includes(stakeholder)) {
      setData({
        ...data,
        constraints: {
          ...data.constraints,
          stakeholders: [...data.constraints.stakeholders, stakeholder],
        },
      });
    }
  };

  const quickAddCompliance = (compliance: string) => {
    const current = data.constraints.compliance || '';
    const items = current.split(',').map(s => s.trim()).filter(Boolean);
    if (!items.includes(compliance)) {
      const updated = [...items, compliance].join(', ');
      setData({
        ...data,
        constraints: {
          ...data.constraints,
          compliance: updated,
        },
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-slate-600 to-slate-700 rounded-full mb-4">
          <Handshake className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Industry Project Details</h2>
        <p className="text-gray-600">Professional collaboration with industry partner</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-8"
      >
        <div className="space-y-6">
          {/* Client Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Building className="w-4 h-4 mr-2 text-slate-600" />
                Client/Partner Company *
              </label>
              <input
                type="text"
                value={data.clientCompanyName}
                onChange={(e) => setData({ ...data, clientCompanyName: e.target.value })}
                placeholder="e.g., ABC Corporation, XYZ Industries"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <TrendingUp className="w-4 h-4 mr-2 text-slate-600" />
                Industry Sector *
              </label>
              <select
                value={data.industrySector}
                onChange={(e) => setData({ ...data, industrySector: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              >
                <option value="">Select an industry...</option>
                {industryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.icon} {option.label}
                  </option>
                ))}
              </select>
              {industryPreset && data.industrySector !== 'custom' && (
                <p className="text-xs text-slate-600 mt-1 flex items-center">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Smart suggestions enabled for {industryPreset.name}
                </p>
              )}
            </div>
          </div>

          {/* Industry-Specific Project Type Suggestions */}
          {industryPreset && showSuggestions && industryPreset.commonProjectTypes.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-700 flex items-center">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Common {industryPreset.name} Projects
                </h4>
                <button
                  type="button"
                  onClick={() => setShowSuggestions(false)}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Hide
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {industryPreset.commonProjectTypes.slice(0, 6).map((projectType) => (
                  <button
                    key={projectType}
                    type="button"
                    onClick={() => {
                      if (!data.projectScope.includes(projectType)) {
                        setData({
                          ...data,
                          projectScope: data.projectScope
                            ? `${data.projectScope}\n- ${projectType}`
                            : projectType,
                        });
                      }
                    }}
                    className="px-3 py-1 bg-white border border-slate-300 rounded-md text-xs text-slate-700 hover:bg-slate-100 hover:border-slate-400 transition-colors"
                  >
                    + {projectType}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Project Type and Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 mr-2 text-slate-600" />
                Project Type *
              </label>
              <select
                value={data.projectType}
                onChange={(e) => setData({ ...data, projectType: e.target.value as any })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              >
                <option value="consulting">Consulting Project</option>
                <option value="r&d">Research & Development</option>
                <option value="product_development">Product Development</option>
                <option value="process_improvement">Process Improvement</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Target className="w-4 h-4 mr-2 text-slate-600" />
                Duration (months) *
              </label>
              <input
                type="number"
                min="1"
                max="24"
                value={data.durationMonths}
                onChange={(e) => setData({ ...data, durationMonths: parseInt(e.target.value) || 6 })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Typical: 3-12 months</p>
            </div>
          </div>

          {/* Business Challenge */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Target className="w-4 h-4 mr-2 text-slate-600" />
              Business Challenge/Problem *
            </label>
            <textarea
              value={data.businessChallenge}
              onChange={(e) => setData({ ...data, businessChallenge: e.target.value })}
              placeholder="What business problem or challenge does this project address? What is the pain point?"
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Clearly describe the problem that needs solving
            </p>
          </div>

          {/* Project Scope */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 mr-2 text-slate-600" />
              Project Scope *
            </label>
            <textarea
              value={data.projectScope}
              onChange={(e) => setData({ ...data, projectScope: e.target.value })}
              placeholder="Define the project boundaries: what's included and what's out of scope"
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Be specific about what will and won't be delivered
            </p>
          </div>

          {/* Deliverables */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 mr-2 text-slate-600" />
              Key Deliverables *
            </label>
            {industryPreset && industryPreset.suggestedDeliverables.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                <span className="text-xs text-slate-600 flex items-center mr-2">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Quick add:
                </span>
                {industryPreset.suggestedDeliverables.slice(0, 4).map((deliverable) => (
                  <button
                    key={deliverable}
                    type="button"
                    onClick={() => {
                      if (!data.deliverables.includes(deliverable)) {
                        setData({
                          ...data,
                          deliverables: data.deliverables
                            ? `${data.deliverables}\n- ${deliverable}`
                            : `- ${deliverable}`,
                        });
                      }
                    }}
                    className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                  >
                    + {deliverable}
                  </button>
                ))}
              </div>
            )}
            <textarea
              value={data.deliverables}
              onChange={(e) => setData({ ...data, deliverables: e.target.value })}
              placeholder="List concrete deliverables (e.g., reports, prototypes, software, recommendations)"
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            />
          </div>

          {/* Success Metrics */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <TrendingUp className="w-4 h-4 mr-2 text-slate-600" />
              Success Metrics/KPIs *
            </label>
            <textarea
              value={data.successMetrics}
              onChange={(e) => setData({ ...data, successMetrics: e.target.value })}
              placeholder="How will success be measured? What are the key performance indicators?"
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            />
          </div>

          {/* Team Size and Budget */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Users className="w-4 h-4 mr-2 text-slate-600" />
                Team Size *
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={data.constraints.teamSize}
                onChange={(e) =>
                  setData({
                    ...data,
                    constraints: { ...data.constraints, teamSize: parseInt(e.target.value) || 3 },
                  })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="w-4 h-4 mr-2 text-slate-600" />
                Budget Range (Optional)
              </label>
              <input
                type="text"
                value={data.budgetRange}
                onChange={(e) => setData({ ...data, budgetRange: e.target.value })}
                placeholder="e.g., $10K-$50K, Limited, Flexible"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Required Expertise */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <span className="text-slate-600 mr-2">🎯</span>
              Required Expertise/Skills
            </label>
            {industryPreset && industryPreset.requiredExpertise.length > 0 && (
              <div className="mb-3">
                <span className="text-xs text-slate-600 flex items-center mb-2">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Suggested for {industryPreset.name}:
                </span>
                <div className="flex flex-wrap gap-2 mb-3">
                  {industryPreset.requiredExpertise.map((expertise) => (
                    <button
                      key={expertise}
                      type="button"
                      onClick={() => quickAddExpertise(expertise)}
                      disabled={data.constraints.requiredExpertise.includes(expertise)}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        data.constraints.requiredExpertise.includes(expertise)
                          ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                          : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      {data.constraints.requiredExpertise.includes(expertise) ? '✓' : '+'} {expertise}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newExpertise}
                onChange={(e) => setNewExpertise(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addExpertise())}
                placeholder="e.g., Data Science, Cloud Architecture, UI/UX"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={addExpertise}
                className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium"
              >
                Add
              </button>
            </div>
            {data.constraints.requiredExpertise.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.constraints.requiredExpertise.map((expertise) => (
                  <span
                    key={expertise}
                    className="inline-flex items-center px-3 py-1 bg-slate-100 text-slate-800 rounded-full text-sm"
                  >
                    {expertise}
                    <button
                      type="button"
                      onClick={() => removeExpertise(expertise)}
                      className="ml-2 text-slate-600 hover:text-slate-800"
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
              <Users className="w-4 h-4 mr-2 text-slate-600" />
              Key Stakeholders
            </label>
            {industryPreset && industryPreset.typicalStakeholders.length > 0 && (
              <div className="mb-3">
                <span className="text-xs text-slate-600 flex items-center mb-2">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Typical stakeholders:
                </span>
                <div className="flex flex-wrap gap-2 mb-3">
                  {industryPreset.typicalStakeholders.map((stakeholder) => (
                    <button
                      key={stakeholder}
                      type="button"
                      onClick={() => quickAddStakeholder(stakeholder)}
                      disabled={data.constraints.stakeholders.includes(stakeholder)}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        data.constraints.stakeholders.includes(stakeholder)
                          ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                          : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      {data.constraints.stakeholders.includes(stakeholder) ? '✓' : '+'} {stakeholder}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newStakeholder}
                onChange={(e) => setNewStakeholder(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addStakeholder())}
                placeholder="e.g., CEO, CTO, Product Manager, Faculty Advisor"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={addStakeholder}
                className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium"
              >
                Add
              </button>
            </div>
            {data.constraints.stakeholders.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.constraints.stakeholders.map((stakeholder) => (
                  <span
                    key={stakeholder}
                    className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm"
                  >
                    {stakeholder}
                    <button
                      type="button"
                      onClick={() => removeStakeholder(stakeholder)}
                      className="ml-2 text-gray-600 hover:text-gray-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Compliance/Regulations */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 mr-2 text-slate-600" />
              Compliance/Regulatory Requirements (Optional)
            </label>
            {industryPreset && industryPreset.commonCompliance.length > 0 && (
              <div className="mb-3">
                <span className="text-xs text-slate-600 flex items-center mb-2">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Common {industryPreset.name} compliance:
                </span>
                <div className="flex flex-wrap gap-2">
                  {industryPreset.commonCompliance.map((compliance) => (
                    <button
                      key={compliance}
                      type="button"
                      onClick={() => quickAddCompliance(compliance)}
                      className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                    >
                      + {compliance}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <input
              type="text"
              value={data.constraints.compliance}
              onChange={(e) =>
                setData({
                  ...data,
                  constraints: { ...data.constraints, compliance: e.target.value },
                })
              }
              placeholder="e.g., HIPAA, GDPR, SOC2, Industry standards"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            />
          </div>

          {/* Info Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="flex items-start">
              <Handshake className="w-5 h-5 text-slate-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-slate-800">
                <p className="font-semibold mb-1">💡 Industry Project Best Practices:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Align objectives with business value and ROI</li>
                  <li>Establish clear communication channels with stakeholders</li>
                  <li>Define success metrics and KPIs upfront</li>
                  <li>Plan for regular progress reviews and demos</li>
                  <li>Consider intellectual property and confidentiality agreements</li>
                </ul>
              </div>
            </div>
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
                ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-white hover:from-slate-700 hover:to-slate-800 shadow-md hover:shadow-lg'
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

export default IndustryRequirementsInput;
