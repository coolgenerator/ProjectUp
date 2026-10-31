import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserCheck, Briefcase, Target, FileText, DollarSign, Clock, MessageCircle, Sparkles } from 'lucide-react';

export interface FreelanceRequirements {
  clientName: string;
  clientIndustry?: string;
  projectCategory: 'web_development' | 'mobile_app' | 'design' | 'marketing' | 'consulting' | 'content_creation' | 'data_analysis' | 'other';
  projectBrief: string;
  deliverables: string;
  paymentStructure: 'fixed_price' | 'hourly' | 'milestone_based' | 'retainer';
  budgetOrRate: string;
  timelineWeeks: number;
  communicationPreferences: string;
  specificRequirements: string;
  constraints: {
    teamSize: number;
    requiredSkills: string[];
  };
}

interface FreelanceRequirementsInputProps {
  onComplete: (data: FreelanceRequirements) => void;
  onBack: () => void;
}

const FreelanceRequirementsInput: React.FC<FreelanceRequirementsInputProps> = ({
  onComplete,
  onBack,
}) => {
  const [data, setData] = useState<FreelanceRequirements>({
    clientName: '',
    clientIndustry: '',
    projectCategory: 'web_development',
    projectBrief: '',
    deliverables: '',
    paymentStructure: 'fixed_price',
    budgetOrRate: '',
    timelineWeeks: 4,
    communicationPreferences: 'Email and weekly video calls',
    specificRequirements: '',
    constraints: {
      teamSize: 1,
      requiredSkills: [],
    },
  });

  const [newSkill, setNewSkill] = useState('');

  const projectCategories = [
    { value: 'web_development', label: '💻 Web Development', deliverables: ['Responsive website', 'Backend API', 'Database design', 'Deployment'] },
    { value: 'mobile_app', label: '📱 Mobile App', deliverables: ['iOS app', 'Android app', 'App store submission', 'User documentation'] },
    { value: 'design', label: '🎨 Design (UI/UX/Graphic)', deliverables: ['Wireframes', 'High-fidelity mockups', 'Design system', 'Brand assets'] },
    { value: 'marketing', label: '📢 Marketing & SEO', deliverables: ['Marketing strategy', 'Content calendar', 'SEO optimization', 'Analytics setup'] },
    { value: 'consulting', label: '💼 Consulting & Strategy', deliverables: ['Analysis report', 'Recommendations', 'Implementation plan', 'Training materials'] },
    { value: 'content_creation', label: '✍️ Content Creation', deliverables: ['Blog posts', 'Social media content', 'Video scripts', 'Email campaigns'] },
    { value: 'data_analysis', label: '📊 Data Analysis', deliverables: ['Data cleaning', 'Analysis report', 'Visualizations', 'Predictive models'] },
    { value: 'other', label: '🔧 Other', deliverables: ['Project deliverables', 'Documentation', 'Final report'] },
  ];

  const paymentStructures = [
    { value: 'fixed_price', label: '💰 Fixed Price', description: 'One-time payment for complete project' },
    { value: 'hourly', label: '⏱️ Hourly Rate', description: 'Payment based on hours worked' },
    { value: 'milestone_based', label: '🎯 Milestone-Based', description: 'Payments tied to deliverable milestones' },
    { value: 'retainer', label: '🔄 Retainer', description: 'Ongoing monthly payment for continuous work' },
  ];

  const commonSkillsByCategory: Record<string, string[]> = {
    web_development: ['React', 'Node.js', 'TypeScript', 'Python', 'Database Design', 'REST APIs'],
    mobile_app: ['React Native', 'Swift', 'Kotlin', 'Flutter', 'Mobile UI/UX', 'App Store Optimization'],
    design: ['Figma', 'Adobe Creative Suite', 'UI/UX Design', 'Prototyping', 'Brand Design', 'User Research'],
    marketing: ['SEO', 'Content Marketing', 'Social Media', 'Google Analytics', 'Email Marketing', 'PPC'],
    consulting: ['Strategic Planning', 'Business Analysis', 'Market Research', 'Change Management', 'Presentation'],
    content_creation: ['Copywriting', 'Content Strategy', 'Video Production', 'Storytelling', 'SEO Writing'],
    data_analysis: ['Python', 'SQL', 'Data Visualization', 'Machine Learning', 'Statistics', 'Tableau'],
    other: [],
  };

  const isValid = () => {
    return (
      data.clientName.trim() !== '' &&
      data.projectBrief.trim() !== '' &&
      data.deliverables.trim() !== '' &&
      data.budgetOrRate.trim() !== '' &&
      data.timelineWeeks >= 1 &&
      data.timelineWeeks <= 52
    );
  };

  const addSkill = () => {
    if (newSkill.trim() && !data.constraints.requiredSkills.includes(newSkill.trim())) {
      setData({
        ...data,
        constraints: {
          ...data.constraints,
          requiredSkills: [...data.constraints.requiredSkills, newSkill.trim()],
        },
      });
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setData({
      ...data,
      constraints: {
        ...data.constraints,
        requiredSkills: data.constraints.requiredSkills.filter((s) => s !== skill),
      },
    });
  };

  const quickAddSkill = (skill: string) => {
    if (!data.constraints.requiredSkills.includes(skill)) {
      setData({
        ...data,
        constraints: {
          ...data.constraints,
          requiredSkills: [...data.constraints.requiredSkills, skill],
        },
      });
    }
  };

  const quickAddDeliverable = (deliverable: string) => {
    if (!data.deliverables.includes(deliverable)) {
      setData({
        ...data,
        deliverables: data.deliverables
          ? `${data.deliverables}\n- ${deliverable}`
          : `- ${deliverable}`,
      });
    }
  };

  const selectedCategory = projectCategories.find((cat) => cat.value === data.projectCategory);
  const suggestedSkills = commonSkillsByCategory[data.projectCategory] || [];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full mb-4">
          <UserCheck className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Freelance Project Details</h2>
        <p className="text-gray-600">Client-commissioned work with clear deliverables</p>
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
                <UserCheck className="w-4 h-4 mr-2 text-violet-600" />
                Client Name/Company *
              </label>
              <input
                type="text"
                value={data.clientName}
                onChange={(e) => setData({ ...data, clientName: e.target.value })}
                placeholder="e.g., John Smith, ABC Startup"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Briefcase className="w-4 h-4 mr-2 text-violet-600" />
                Client Industry (Optional)
              </label>
              <input
                type="text"
                value={data.clientIndustry}
                onChange={(e) => setData({ ...data, clientIndustry: e.target.value })}
                placeholder="e.g., E-commerce, SaaS, Healthcare"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Project Category and Timeline */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Briefcase className="w-4 h-4 mr-2 text-violet-600" />
                Project Category *
              </label>
              <select
                value={data.projectCategory}
                onChange={(e) => setData({ ...data, projectCategory: e.target.value as any })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                {projectCategories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 mr-2 text-violet-600" />
                Timeline (weeks) *
              </label>
              <input
                type="number"
                min="1"
                max="52"
                value={data.timelineWeeks}
                onChange={(e) => setData({ ...data, timelineWeeks: parseInt(e.target.value) || 4 })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Typical: 2-12 weeks</p>
            </div>
          </div>

          {/* Project Brief */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 mr-2 text-violet-600" />
              Project Brief/Description *
            </label>
            <textarea
              value={data.projectBrief}
              onChange={(e) => setData({ ...data, projectBrief: e.target.value })}
              placeholder="What does the client need? What problem are you solving for them?"
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Clearly describe what the client needs and why
            </p>
          </div>

          {/* Deliverables with Quick-Add */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Target className="w-4 h-4 mr-2 text-violet-600" />
              Key Deliverables *
            </label>
            {selectedCategory && selectedCategory.deliverables.length > 0 && (
              <div className="mb-3">
                <span className="text-xs text-violet-600 flex items-center mb-2">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Common for {selectedCategory.label}:
                </span>
                <div className="flex flex-wrap gap-2">
                  {selectedCategory.deliverables.map((deliverable) => (
                    <button
                      key={deliverable}
                      type="button"
                      onClick={() => quickAddDeliverable(deliverable)}
                      className="px-2 py-1 bg-violet-50 border border-violet-200 rounded text-xs text-violet-700 hover:bg-violet-100 hover:border-violet-300"
                    >
                      + {deliverable}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <textarea
              value={data.deliverables}
              onChange={(e) => setData({ ...data, deliverables: e.target.value })}
              placeholder="List what you'll deliver to the client (e.g., website, designs, reports, code)"
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>

          {/* Payment Structure and Budget */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="w-4 h-4 mr-2 text-violet-600" />
                Payment Structure *
              </label>
              <select
                value={data.paymentStructure}
                onChange={(e) => setData({ ...data, paymentStructure: e.target.value as any })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                {paymentStructures.map((structure) => (
                  <option key={structure.value} value={structure.value}>
                    {structure.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {paymentStructures.find((s) => s.value === data.paymentStructure)?.description}
              </p>
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="w-4 h-4 mr-2 text-violet-600" />
                Budget/Rate *
              </label>
              <input
                type="text"
                value={data.budgetOrRate}
                onChange={(e) => setData({ ...data, budgetOrRate: e.target.value })}
                placeholder={
                  data.paymentStructure === 'hourly'
                    ? 'e.g., $75/hour'
                    : data.paymentStructure === 'retainer'
                    ? 'e.g., $5000/month'
                    : 'e.g., $10,000'
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Team Size */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <UserCheck className="w-4 h-4 mr-2 text-violet-600" />
              Team Size *
            </label>
            <div className="flex items-center space-x-4">
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
                className="w-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-600">
                {data.constraints.teamSize === 1 ? 'Solo freelancer' : `${data.constraints.teamSize} people`}
              </p>
            </div>
          </div>

          {/* Required Skills */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <span className="text-violet-600 mr-2">🎯</span>
              Required Skills/Technologies
            </label>
            {suggestedSkills.length > 0 && (
              <div className="mb-3">
                <span className="text-xs text-violet-600 flex items-center mb-2">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Common for {selectedCategory?.label}:
                </span>
                <div className="flex flex-wrap gap-2 mb-3">
                  {suggestedSkills.map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => quickAddSkill(skill)}
                      disabled={data.constraints.requiredSkills.includes(skill)}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        data.constraints.requiredSkills.includes(skill)
                          ? 'bg-violet-200 text-violet-500 cursor-not-allowed'
                          : 'bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 hover:border-violet-300'
                      }`}
                    >
                      {data.constraints.requiredSkills.includes(skill) ? '✓' : '+'} {skill}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                placeholder="e.g., React, Python, Figma, SEO"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={addSkill}
                className="px-6 py-2 bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 font-medium"
              >
                Add
              </button>
            </div>
            {data.constraints.requiredSkills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.constraints.requiredSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center px-3 py-1 bg-violet-100 text-violet-800 rounded-full text-sm"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="ml-2 text-violet-600 hover:text-violet-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Communication Preferences */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <MessageCircle className="w-4 h-4 mr-2 text-violet-600" />
              Communication Preferences
            </label>
            <input
              type="text"
              value={data.communicationPreferences}
              onChange={(e) => setData({ ...data, communicationPreferences: e.target.value })}
              placeholder="e.g., Email updates, weekly Zoom calls, Slack for quick questions"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              How will you stay in touch with the client?
            </p>
          </div>

          {/* Specific Requirements */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 mr-2 text-violet-600" />
              Specific Requirements or Constraints (Optional)
            </label>
            <textarea
              value={data.specificRequirements}
              onChange={(e) => setData({ ...data, specificRequirements: e.target.value })}
              placeholder="Any special requirements, constraints, or preferences from the client?"
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>

          {/* Info Box */}
          <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
            <div className="flex items-start">
              <UserCheck className="w-5 h-5 text-violet-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-violet-900">
                <p className="font-semibold mb-1">💡 Freelance Project Best Practices:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Get a clear written contract or statement of work</li>
                  <li>Define scope carefully to avoid scope creep</li>
                  <li>Set up milestone-based payments when possible</li>
                  <li>Communicate regularly to manage expectations</li>
                  <li>Document everything and track your time</li>
                  <li>Build in buffer time for revisions and feedback</li>
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
                ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:from-violet-600 hover:to-purple-600 shadow-md hover:shadow-lg'
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

export default FreelanceRequirementsInput;
