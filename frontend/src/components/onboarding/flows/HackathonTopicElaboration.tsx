import React, { useState, useEffect } from 'react';
import fetchWithAuth from '../../../hooks/fetchWithAuth';
import config from '../../../config';
import { toast } from 'react-hot-toast';
import { HackathonRequirements } from '../shared/HackathonRequirementsInput';
import { ProjectTopic } from '../shared/AITopicSuggestions';
import TopicElaboration, { TopicElaboration as TopicElaborationType } from '../shared/TopicElaboration';

interface HackathonTopicElaborationProps {
  selectedTopic: ProjectTopic;
  hackathonContext: HackathonRequirements;
  onComplete: (elaboration: TopicElaborationType) => void;
  onBack: () => void;
}

/**
 * Hackathon Topic Elaboration - Displays detailed hackathon project plan
 * Uses hackathon-specific API endpoint but reuses TopicElaboration component
 */
const HackathonTopicElaboration: React.FC<HackathonTopicElaborationProps> = ({
  selectedTopic,
  hackathonContext,
  onComplete,
  onBack,
}) => {
  const [elaboration, setElaboration] = useState<TopicElaborationType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTopicElaboration();
  }, []);

  const loadTopicElaboration = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use new unified API endpoint
      const { elaborateTopic } = await import('../../../api/onboardingAPI');
      const data = await elaborateTopic(
        'hackathon',
        {
          name: selectedTopic.name,
          description: selectedTopic.description,
          tagline: selectedTopic.tagline,
        },
        {
          hackathon_name: hackathonContext.hackathonName,
          hackathon_type: hackathonContext.hackathonType,
          duration_hours: hackathonContext.durationHours,
          theme: hackathonContext.theme,
          team_size: hackathonContext.teamSize,
          team_skills: hackathonContext.teamSkills,
        }
      );

      setElaboration(data);
    } catch (error) {
      console.error('Failed to load topic elaboration:', error);
      setError(error instanceof Error ? error.message : 'Failed to load elaboration');
      toast.error('Failed to generate detailed plan');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !elaboration) {
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
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mt-6">AI正在制定详细计划...</h3>
        <p className="text-gray-600 mt-2">时间规划 · Demo策略 · 风险控制</p>
        <div className="mt-4 flex flex-col items-center space-y-2 text-sm text-gray-500">
          <p>⏰ 按小时分配任务</p>
          <p>🎯 规划Demo流程</p>
          <p>⚡ 识别关键风险</p>
          <p>🔥 制定应急方案</p>
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
            <button onClick={loadTopicElaboration} className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
              重试
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TopicElaboration
      selectedTopic={selectedTopic}
      courseContext={{
        course_name: hackathonContext.hackathonName,
        school: '',
        course_code: '',
        requirements: hackathonContext.theme,
        constraints: {
          team_size: hackathonContext.teamSize,
          duration_weeks: Math.ceil(hackathonContext.durationHours / 24 / 7),
          required_tech: hackathonContext.teamSkills,
        },
      }}
      cachedElaboration={elaboration || undefined}
      projectType="hackathon"
      onComplete={onComplete}
      onBack={onBack}
    />
  );
};

export default HackathonTopicElaboration;
