import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import fetchWithAuth from '../../../hooks/fetchWithAuth';
import config from '../../../config';
import { toast } from 'react-hot-toast';
import { HackathonRequirements } from '../shared/HackathonRequirementsInput';
import { ProjectTopic } from '../shared/AITopicSuggestions';

interface HackathonTopicSuggestionsProps {
  hackathonRequirements: HackathonRequirements;
  onTopicSelected: (topic: ProjectTopic | null) => void;
  onBack: () => void;
}

/**
 * Hackathon Topic Suggestions - Displays AI-generated hackathon project ideas
 * Wrapper component that uses hackathon-specific API endpoint
 */
const HackathonTopicSuggestions: React.FC<HackathonTopicSuggestionsProps> = ({
  hackathonRequirements,
  onTopicSelected,
  onBack,
}) => {
  const [topics, setTopics] = useState<ProjectTopic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTopicSuggestions();
  }, []);

  const loadTopicSuggestions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use new unified API endpoint
      const { suggestTopics } = await import('../../../api/onboardingAPI');
      const data = await suggestTopics('hackathon', {
        hackathon_name: hackathonRequirements.hackathonName,
        hackathon_type: hackathonRequirements.hackathonType,
        duration_hours: hackathonRequirements.durationHours,
        theme: hackathonRequirements.theme,
        team_size: hackathonRequirements.teamSize,
        team_skills: hackathonRequirements.teamSkills,
      });

      // Map hackathon-specific response to ProjectTopic format
      const mappedTopics: ProjectTopic[] = (data.topics || []).map((topic: any) => ({
        topic_id: topic.topic_id,
        name: topic.name,
        tagline: topic.tagline,
        description: topic.description,
        alignment_reason: topic.time_feasibility,
        suggested_tech: topic.suggested_tech,
        difficulty: 'intermediate', // Hackathons are always time-pressured
        difficulty_reason: `可在${hackathonRequirements.durationHours}小时内完成MVP`,
        estimated_weeks: Math.ceil(hackathonRequirements.durationHours / 24 / 7),
        key_features: topic.mvp_scope || topic.demo_highlights || [],
        demo_highlights: topic.demo_highlights,
        wow_factor: topic.wow_factor,
      }));

      setTopics(mappedTopics);
    } catch (error) {
      console.error('Failed to load topic suggestions:', error);
      setError(error instanceof Error ? error.message : 'Failed to load suggestions');
      toast.error('Failed to generate hackathon project ideas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTopic = (topicId: string) => {
    setSelectedTopic(topicId);
  };

  const handleContinue = () => {
    const topic = topics.find((t) => t.topic_id === selectedTopic);
    if (topic) {
      onTopicSelected(topic);
    }
  };

  const handleDefineOwn = () => {
    onTopicSelected(null);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="relative">
          <div className="w-24 h-24 border-8 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-12 h-12 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mt-6">AI正在生成黑客松创意...</h3>
        <p className="text-gray-600 mt-2">基于你的主题和团队技能</p>
        <div className="mt-4 flex flex-col items-center space-y-2 text-sm text-gray-500">
          <p>⚡ 分析时间可行性</p>
          <p>🎯 评估Demo效果</p>
          <p>💡 匹配团队技能</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <svg className="w-12 h-12 text-red-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">生成失败</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex justify-center space-x-3">
            <button onClick={onBack} className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              ← 返回
            </button>
            <button onClick={loadTopicSuggestions} className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
              重试
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">AI推荐的黑客松创意</h2>
        <p className="text-gray-600">
          为 {hackathonRequirements.hackathonName} 量身定制 · {hackathonRequirements.durationHours}小时冲刺
        </p>
      </div>

      {/* Topics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {topics.map((topic, index) => (
          <motion.div
            key={topic.topic_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => handleSelectTopic(topic.topic_id)}
            className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
              selectedTopic === topic.topic_id
                ? 'border-orange-500 bg-orange-50 shadow-lg'
                : 'border-gray-200 hover:border-orange-300 hover:shadow-md'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-xl font-bold text-gray-900">{topic.name}</h3>
              {selectedTopic === topic.topic_id && (
                <svg className="w-6 h-6 text-orange-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>

            <p className="text-sm font-medium text-orange-700 mb-3">{topic.tagline}</p>
            <p className="text-sm text-gray-600 mb-4">{topic.description}</p>

            {topic.wow_factor && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3">
                <p className="text-xs font-medium text-yellow-800">🌟 {topic.wow_factor}</p>
              </div>
            )}

            {topic.demo_highlights && topic.demo_highlights.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-700 mb-1">Demo亮点:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  {topic.demo_highlights.slice(0, 3).map((highlight, i) => (
                    <li key={i}>• {highlight}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-1 mb-3">
              {topic.suggested_tech.slice(0, 4).map((tech) => (
                <span key={tech} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                  {tech}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>⏰ {hackathonRequirements.durationHours}h</span>
              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded font-medium">
                可完成
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Define Own Option */}
      <div className="mb-8">
        <button
          onClick={handleDefineOwn}
          className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-orange-400 hover:bg-orange-50 transition-all text-center"
        >
          <div className="text-gray-600 font-medium">🎯 我有自己的创意</div>
          <div className="text-sm text-gray-500 mt-1">跳过AI建议，直接设置项目</div>
        </button>
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          ← 返回
        </button>
        <button
          onClick={handleContinue}
          disabled={!selectedTopic}
          className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all font-medium"
        >
          查看详细规划 →
        </button>
      </div>
    </div>
  );
};

export default HackathonTopicSuggestions;
