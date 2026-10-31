import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Target, Users, Award, Globe, Layers } from 'lucide-react';

export interface PortfolioRequirements {
  careerGoal: string;
  targetAudience: string;
  skillsToShowcase: string[];
  projectComplexity: 'simple' | 'moderate' | 'complex';
  showcasePlatform: string;
  durationWeeks: number;
  constraints: {
    mustUseTech: string[];
    projectType: 'web' | 'mobile' | 'ml' | 'fullstack' | 'other';
  };
}

interface PortfolioRequirementsInputProps {
  onComplete: (data: PortfolioRequirements) => void;
  onBack: () => void;
}

const PortfolioRequirementsInput: React.FC<PortfolioRequirementsInputProps> = ({
  onComplete,
  onBack,
}) => {
  const [data, setData] = useState<PortfolioRequirements>({
    careerGoal: '',
    targetAudience: '',
    skillsToShowcase: [],
    projectComplexity: 'moderate',
    showcasePlatform: '',
    durationWeeks: 8,
    constraints: {
      mustUseTech: [],
      projectType: 'web',
    },
  });

  const [newSkill, setNewSkill] = useState('');
  const [newTech, setNewTech] = useState('');

  const isValid = () => {
    return (
      data.careerGoal.trim() !== '' &&
      data.targetAudience.trim() !== '' &&
      data.skillsToShowcase.length > 0 &&
      data.showcasePlatform.trim() !== '' &&
      data.durationWeeks >= 1 &&
      data.durationWeeks <= 24
    );
  };

  const addSkill = () => {
    if (newSkill.trim() && !data.skillsToShowcase.includes(newSkill.trim())) {
      setData({
        ...data,
        skillsToShowcase: [...data.skillsToShowcase, newSkill.trim()],
      });
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setData({
      ...data,
      skillsToShowcase: data.skillsToShowcase.filter((s) => s !== skill),
    });
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

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full mb-4">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Portfolio Project Details</h2>
        <p className="text-gray-600">Create a project that showcases your skills</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-8"
      >
        <div className="space-y-6">
          {/* Career Goal and Target Audience */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Target className="w-4 h-4 mr-2 text-pink-600" />
                Career Goal *
              </label>
              <input
                type="text"
                value={data.careerGoal}
                onChange={(e) => setData({ ...data, careerGoal: e.target.value })}
                placeholder="e.g., Get hired as Full-Stack Developer"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                What do you want to achieve with this project?
              </p>
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Users className="w-4 h-4 mr-2 text-pink-600" />
                Target Audience *
              </label>
              <input
                type="text"
                value={data.targetAudience}
                onChange={(e) => setData({ ...data, targetAudience: e.target.value })}
                placeholder="e.g., Tech recruiters, potential clients"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Who will be viewing this project?
              </p>
            </div>
          </div>

          {/* Skills to Showcase */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Award className="w-4 h-4 mr-2 text-pink-600" />
              Skills to Showcase *
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                placeholder="e.g., React, System Design, API Development"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={addSkill}
                className="px-6 py-2 bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-200 font-medium"
              >
                Add
              </button>
            </div>
            {data.skillsToShowcase.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.skillsToShowcase.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center px-3 py-1 bg-pink-100 text-pink-800 rounded-full text-sm"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="ml-2 text-pink-600 hover:text-pink-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Add at least one skill you want to demonstrate
            </p>
          </div>

          {/* Project Complexity and Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Layers className="w-4 h-4 mr-2 text-pink-600" />
                Project Complexity *
              </label>
              <select
                value={data.projectComplexity}
                onChange={(e) => setData({ ...data, projectComplexity: e.target.value as any })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="simple">Simple (Single feature, quick demo)</option>
                <option value="moderate">Moderate (Multiple features, polished)</option>
                <option value="complex">Complex (Full application, production-ready)</option>
              </select>
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Sparkles className="w-4 h-4 mr-2 text-pink-600" />
                Project Type *
              </label>
              <select
                value={data.constraints.projectType}
                onChange={(e) =>
                  setData({
                    ...data,
                    constraints: { ...data.constraints, projectType: e.target.value as any },
                  })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="web">Web Application</option>
                <option value="mobile">Mobile App</option>
                <option value="ml">Machine Learning</option>
                <option value="fullstack">Full-Stack Application</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Showcase Platform and Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Globe className="w-4 h-4 mr-2 text-pink-600" />
                Showcase Platform *
              </label>
              <input
                type="text"
                value={data.showcasePlatform}
                onChange={(e) => setData({ ...data, showcasePlatform: e.target.value })}
                placeholder="e.g., GitHub, Personal website, Vercel"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Where will you host/showcase this project?
              </p>
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Award className="w-4 h-4 mr-2 text-pink-600" />
                Duration (weeks) *
              </label>
              <input
                type="number"
                min="1"
                max="24"
                value={data.durationWeeks}
                onChange={(e) => setData({ ...data, durationWeeks: parseInt(e.target.value) || 8 })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Typical: 4-12 weeks</p>
            </div>
          </div>

          {/* Technologies to Use */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <span className="text-pink-600 mr-2">⚙️</span>
              Technologies You Want to Use
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newTech}
                onChange={(e) => setNewTech(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTech())}
                placeholder="e.g., React, Next.js, PostgreSQL"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={addTech}
                className="px-6 py-2 bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-200 font-medium"
              >
                Add
              </button>
            </div>
            {data.constraints.mustUseTech.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.constraints.mustUseTech.map((tech) => (
                  <span
                    key={tech}
                    className="inline-flex items-center px-3 py-1 bg-rose-100 text-rose-800 rounded-full text-sm"
                  >
                    {tech}
                    <button
                      type="button"
                      onClick={() => removeTech(tech)}
                      className="ml-2 text-rose-600 hover:text-rose-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Optional: Technologies you want to highlight in your portfolio
            </p>
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
                ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white hover:from-pink-700 hover:to-rose-700 shadow-md hover:shadow-lg'
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

export default PortfolioRequirementsInput;
