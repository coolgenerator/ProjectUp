import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Rocket, Target, Users, Zap, TrendingUp, Lightbulb } from 'lucide-react';
import OnboardingProgressBar from './OnboardingProgressBar';

export interface ProductRequirements {
  productIdea: string;
  problemStatement: string;
  targetAudience: string;
  productType: 'web_app' | 'mobile_app' | 'saas' | 'marketplace' | 'tool' | 'other';
  developmentStage: 'idea' | 'mvp' | 'beta' | 'production';
  businessModel?: string;
  durationMonths: number;
  constraints: {
    teamSize: number;
    hasFunding: boolean;
    mustUseTech: string[];
    keyFeatures: string[];
  };
}

interface ProductRequirementsInputProps {
  onComplete: (data: ProductRequirements) => void;
  onBack: () => void;
}

const ProductRequirementsInput: React.FC<ProductRequirementsInputProps> = ({
  onComplete,
  onBack,
}) => {
  const [data, setData] = useState<ProductRequirements>({
    productIdea: '',
    problemStatement: '',
    targetAudience: '',
    productType: 'web_app',
    developmentStage: 'idea',
    businessModel: '',
    durationMonths: 3,
    constraints: {
      teamSize: 2,
      hasFunding: false,
      mustUseTech: [],
      keyFeatures: [],
    },
  });

  const [newTech, setNewTech] = useState('');
  const [newFeature, setNewFeature] = useState('');

  const isValid = () => {
    return (
      data.productIdea.trim() !== '' &&
      data.problemStatement.trim() !== '' &&
      data.targetAudience.trim() !== '' &&
      data.durationMonths >= 1 &&
      data.durationMonths <= 24 &&
      data.constraints.teamSize >= 1
    );
  };

  const addTech = () => {
    if (newTech.trim() && !data.constraints.mustUseTech.includes(newTech.trim())) {
      setData({
        ...data,
        constraints: {
          ...data.constraints,
          mustUseTech: [...data.constraints.mustUseTech, newTech.trim()],
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
        mustUseTech: data.constraints.mustUseTech.filter((t) => t !== tech),
      },
    });
  };

  const addFeature = () => {
    if (newFeature.trim() && !data.constraints.keyFeatures.includes(newFeature.trim())) {
      setData({
        ...data,
        constraints: {
          ...data.constraints,
          keyFeatures: [...data.constraints.keyFeatures, newFeature.trim()],
        },
      });
      setNewFeature('');
    }
  };

  const removeFeature = (feature: string) => {
    setData({
      ...data,
      constraints: {
        ...data.constraints,
        keyFeatures: data.constraints.keyFeatures.filter((f) => f !== feature),
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Bar */}
      <OnboardingProgressBar color="green" />

      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full mb-4">
          <Rocket className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Product Development Details</h2>
        <p className="text-gray-600">Describe your product vision and goals</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-8"
      >
        <div className="space-y-6">
          {/* Product Idea */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Lightbulb className="w-4 h-4 mr-2 text-orange-600" />
              Product Idea *
            </label>
            <input
              type="text"
              value={data.productIdea}
              onChange={(e) => setData({ ...data, productIdea: e.target.value })}
              placeholder="e.g., AI-powered study planner for students"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Brief description of what you want to build
            </p>
          </div>

          {/* Problem Statement */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Target className="w-4 h-4 mr-2 text-orange-600" />
              Problem Statement *
            </label>
            <textarea
              value={data.problemStatement}
              onChange={(e) => setData({ ...data, problemStatement: e.target.value })}
              placeholder="What problem does this product solve? Why do people need it?"
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Clearly define the pain point your product addresses
            </p>
          </div>

          {/* Target Audience */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Users className="w-4 h-4 mr-2 text-orange-600" />
              Target Audience *
            </label>
            <input
              type="text"
              value={data.targetAudience}
              onChange={(e) => setData({ ...data, targetAudience: e.target.value })}
              placeholder="e.g., College students, Small business owners, Developers"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Who are your primary users?
            </p>
          </div>

          {/* Product Type and Development Stage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Rocket className="w-4 h-4 mr-2 text-orange-600" />
                Product Type *
              </label>
              <select
                value={data.productType}
                onChange={(e) => setData({ ...data, productType: e.target.value as any })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="web_app">Web Application</option>
                <option value="mobile_app">Mobile App</option>
                <option value="saas">SaaS Platform</option>
                <option value="marketplace">Marketplace</option>
                <option value="tool">Developer Tool</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Zap className="w-4 h-4 mr-2 text-orange-600" />
                Development Stage
              </label>
              <select
                value={data.developmentStage}
                onChange={(e) => setData({ ...data, developmentStage: e.target.value as any })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="idea">Idea (Just starting)</option>
                <option value="mvp">MVP (Minimum Viable Product)</option>
                <option value="beta">Beta (Early users)</option>
                <option value="production">Production (Launched)</option>
              </select>
            </div>
          </div>

          {/* Business Model and Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <TrendingUp className="w-4 h-4 mr-2 text-orange-600" />
                Business Model (Optional)
              </label>
              <input
                type="text"
                value={data.businessModel}
                onChange={(e) => setData({ ...data, businessModel: e.target.value })}
                placeholder="e.g., Freemium, Subscription, Marketplace fee"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Target className="w-4 h-4 mr-2 text-orange-600" />
                Development Duration (months) *
              </label>
              <input
                type="number"
                min="1"
                max="24"
                value={data.durationMonths}
                onChange={(e) => setData({ ...data, durationMonths: parseInt(e.target.value) || 3 })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Typical: 2-6 months for MVP</p>
            </div>
          </div>

          {/* Team Size and Funding */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Users className="w-4 h-4 mr-2 text-orange-600" />
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
                    constraints: { ...data.constraints, teamSize: parseInt(e.target.value) || 2 },
                  })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center pt-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={data.constraints.hasFunding}
                  onChange={(e) =>
                    setData({
                      ...data,
                      constraints: { ...data.constraints, hasFunding: e.target.checked },
                    })
                  }
                  className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                />
                <span className="ml-2 text-sm text-gray-700">Have Funding/Budget</span>
              </label>
            </div>
          </div>

          {/* Key Features */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Zap className="w-4 h-4 mr-2 text-orange-600" />
              Key Features to Build
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                placeholder="e.g., User authentication, Real-time chat"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={addFeature}
                className="px-6 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 font-medium"
              >
                Add
              </button>
            </div>
            {data.constraints.keyFeatures.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.constraints.keyFeatures.map((feature) => (
                  <span
                    key={feature}
                    className="inline-flex items-center px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm"
                  >
                    {feature}
                    <button
                      type="button"
                      onClick={() => removeFeature(feature)}
                      className="ml-2 text-orange-600 hover:text-orange-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Tech Stack */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <span className="text-orange-600 mr-2">⚙️</span>
              Preferred Tech Stack
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newTech}
                onChange={(e) => setNewTech(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTech())}
                placeholder="e.g., React, Node.js, PostgreSQL"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={addTech}
                className="px-6 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 font-medium"
              >
                Add
              </button>
            </div>
            {data.constraints.mustUseTech.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.constraints.mustUseTech.map((tech) => (
                  <span
                    key={tech}
                    className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm"
                  >
                    {tech}
                    <button
                      type="button"
                      onClick={() => removeTech(tech)}
                      className="ml-2 text-red-600 hover:text-red-800"
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
                ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white hover:from-orange-700 hover:to-red-700 shadow-md hover:shadow-lg'
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

export default ProductRequirementsInput;
