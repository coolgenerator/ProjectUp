import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import OnboardingProgressBar from './OnboardingProgressBar';

export interface HackathonRequirements {
  hackathonName: string;
  hackathonType: string; // tech, business, design, social-impact, etc.
  durationHours: number;
  theme: string;
  teamSize: number;
  teamSkills: string[];
}

interface HackathonRequirementsInputProps {
  onComplete: (data: HackathonRequirements) => void;
  onBack: () => void;
}

const HACKATHON_TYPES = [
  { value: 'tech', label: '🖥️ 技术黑客松 (Tech Hackathon)', description: '软件开发、算法、AI/ML等' },
  { value: 'business', label: '💼 商业黑客松 (Business Plan)', description: '创业想法、商业模式、市场策略' },
  { value: 'design', label: '🎨 设计黑客松 (Design Sprint)', description: 'UI/UX、产品设计、用户体验' },
  { value: 'social-impact', label: '🌍 社会影响 (Social Impact)', description: '环保、教育、社会公益' },
  { value: 'game', label: '🎮 游戏开发 (Game Jam)', description: '游戏创意、关卡设计、游戏开发' },
  { value: 'hardware', label: '⚙️ 硬件/IoT', description: '物联网、硬件原型、嵌入式系统' },
];

const POPULAR_SKILLS = [
  'React', 'Node.js', 'Python', 'TypeScript', 'JavaScript',
  'Java', 'C++', 'Go', 'Rust', 'Swift',
  'UI/UX Design', 'Figma', 'Product Management', 'Marketing',
  'Data Science', 'Machine Learning', 'AI', 'DevOps',
  'Mobile Development', 'Unity', 'Unreal Engine', 'Blockchain',
];

/**
 * Hackathon Requirements Input - Step 1 of Hackathon Project Flow
 *
 * Collects hackathon information, team size, duration, and team skills
 */
const HackathonRequirementsInput: React.FC<HackathonRequirementsInputProps> = ({ onComplete, onBack }) => {
  const [hackathonName, setHackathonName] = useState('');
  const [hackathonType, setHackathonType] = useState('tech');
  const [durationHours, setDurationHours] = useState(24);
  const [theme, setTheme] = useState('');
  const [teamSize, setTeamSize] = useState(3);
  const [teamSkills, setTeamSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');

  const handleAddSkill = (skill: string) => {
    if (!teamSkills.includes(skill)) {
      setTeamSkills([...teamSkills, skill]);
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setTeamSkills(teamSkills.filter((s) => s !== skill));
  };

  const handleAddCustomSkill = () => {
    if (customSkill.trim() && !teamSkills.includes(customSkill.trim())) {
      setTeamSkills([...teamSkills, customSkill.trim()]);
      setCustomSkill('');
    }
  };

  const handleSubmit = () => {
    // Validation
    if (!hackathonName.trim()) {
      toast.error('请输入黑客松名称');
      return;
    }
    if (!theme.trim()) {
      toast.error('请输入黑客松主题或挑战');
      return;
    }
    if (teamSkills.length === 0) {
      toast.error('请至少添加一个团队技能');
      return;
    }

    onComplete({
      hackathonName: hackathonName.trim(),
      hackathonType,
      durationHours,
      theme: theme.trim(),
      teamSize,
      teamSkills,
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Bar */}
      <OnboardingProgressBar color="orange" />

      {/* Header */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-orange-500 to-red-500 rounded-full mb-4"
        >
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </motion.div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">黑客松项目创建</h2>
        <p className="text-gray-600">极限时间挑战 · Demo驱动开发 · 快速原型</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-8 space-y-6">
        {/* Time Warning Banner */}
        <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-orange-900">
              <p className="font-semibold mb-1">⏰ 黑客松关键提醒</p>
              <ul className="space-y-1 text-orange-800">
                <li>• <strong>Demo效果 &gt; 产品完整性</strong> - 评委只看展示效果</li>
                <li>• <strong>快速原型 &gt; 代码质量</strong> - 能用就行，不需要完美</li>
                <li>• <strong>功能实现 &gt; 架构优雅</strong> - 时间有限，聚焦核心</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Hackathon Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            黑客松名称 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={hackathonName}
            onChange={(e) => setHackathonName(e.target.value)}
            placeholder="例如：HackMIT 2024, TreeHacks, CalHacks"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        {/* Hackathon Type */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            黑客松类型 <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {HACKATHON_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setHackathonType(type.value)}
                className={`text-left p-4 rounded-lg border-2 transition-all ${
                  hackathonType === type.value
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-orange-300'
                }`}
              >
                <div className="font-semibold text-gray-900 mb-1">{type.label}</div>
                <div className="text-sm text-gray-600">{type.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            黑客松时长 <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="12"
              max="72"
              step="12"
              value={durationHours}
              onChange={(e) => setDurationHours(Number(e.target.value))}
              className="flex-1"
            />
            <div className="w-24 px-4 py-2 bg-orange-100 text-orange-900 font-bold text-center rounded-lg">
              {durationHours}h
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>12h (半天)</span>
            <span>24h (经典)</span>
            <span>36h (马拉松)</span>
            <span>48h (周末)</span>
          </div>
        </div>

        {/* Theme */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            黑客松主题/挑战 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            rows={4}
            placeholder="描述黑客松的主题、挑战方向、评分标准等...&#10;&#10;例如：&#10;- 主题：AI for Social Good&#10;- 挑战：创建帮助解决社会问题的AI应用&#10;- 评分：创新性(30%) + 技术实现(30%) + 社会影响力(30%) + Demo展示(10%)"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        {/* Team Size */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            团队大小
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="1"
              max="6"
              value={teamSize}
              onChange={(e) => setTeamSize(Number(e.target.value))}
              className="flex-1"
            />
            <div className="w-20 px-4 py-2 bg-gray-100 text-gray-900 font-bold text-center rounded-lg">
              {teamSize}人
            </div>
          </div>
        </div>

        {/* Team Skills */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            团队技能 <span className="text-red-500">*</span>
          </label>
          <p className="text-sm text-gray-600 mb-3">
            选择团队成员掌握的技能，AI会推荐适合你们的项目创意
          </p>

          {/* Popular Skills */}
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-700 mb-2">常用技能</p>
            <div className="flex flex-wrap gap-2">
              {POPULAR_SKILLS.map((skill) => (
                <button
                  key={skill}
                  onClick={() => handleAddSkill(skill)}
                  disabled={teamSkills.includes(skill)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                    teamSkills.includes(skill)
                      ? 'bg-orange-100 text-orange-700 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-700 hover:bg-orange-100 hover:text-orange-700'
                  }`}
                >
                  {teamSkills.includes(skill) ? '✓ ' : '+ '}
                  {skill}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Skill Input */}
          <div className="flex space-x-2 mb-4">
            <input
              type="text"
              value={customSkill}
              onChange={(e) => setCustomSkill(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomSkill();
                }
              }}
              placeholder="添加其他技能..."
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <button
              onClick={handleAddCustomSkill}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              添加
            </button>
          </div>

          {/* Selected Skills */}
          {teamSkills.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-700 mb-2">已选技能 ({teamSkills.length})</p>
              <div className="flex flex-wrap gap-2">
                {teamSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium"
                  >
                    {skill}
                    <button
                      onClick={() => handleRemoveSkill(skill)}
                      className="ml-2 hover:text-orange-900 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <svg
              className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">💡 接下来做什么？</p>
              <p>
                AI会基于你的黑客松主题和团队技能，推荐3-5个<strong>能在规定时间内完成</strong>且<strong>Demo效果出众</strong>的项目创意。
                每个创意都包含详细的时间规划、技术选型建议、以及Demo策略。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between mt-6">
        <button
          onClick={onBack}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          ← 返回
        </button>
        <button
          onClick={handleSubmit}
          className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 transition-all font-medium"
        >
          获取AI项目建议 →
        </button>
      </div>
    </div>
  );
};

export default HackathonRequirementsInput;
