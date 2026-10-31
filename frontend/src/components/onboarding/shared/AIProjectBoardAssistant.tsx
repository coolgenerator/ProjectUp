import React, { useState, useEffect } from 'react';
import fetchWithAuth from '../../../hooks/fetchWithAuth';
import config from '../../../config';
import { toast } from 'react-hot-toast';
import AIGuidedQuestions, {
  GuidedQuestion,
  GuidedQuestionAnswer,
} from './AIGuidedQuestions';
import AIBoardPreview, { GeneratedBoard } from './AIBoardPreview';

interface AIProjectBoardAssistantProps {
  projectScenario: string; // course, research, product, personal
  projectData: any; // Basic project info already collected
  onBoardGenerated: (board: GeneratedBoard) => void;
  onSkip?: () => void;
}

const AIProjectBoardAssistant: React.FC<AIProjectBoardAssistantProps> = ({
  projectScenario,
  projectData,
  onBoardGenerated,
  onSkip,
}) => {
  const [step, setStep] = useState<'loading' | 'questions' | 'generating' | 'preview'>('loading');
  const [questions, setQuestions] = useState<GuidedQuestion[]>([]);
  const [generatedBoard, setGeneratedBoard] = useState<GeneratedBoard | null>(null);
  const [answers, setAnswers] = useState<GuidedQuestionAnswer[]>([]);

  // Load guided questions for this scenario
  useEffect(() => {
    loadGuidedQuestions();
  }, [projectScenario]);

  const loadGuidedQuestions = async () => {
    try {
      const response = await fetchWithAuth(
        `${config.API_BASE_URL}/api/projects/templates/questions?scenario=${projectScenario}`
      );

      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions || []);
        setStep('questions');
      } else {
        toast.error('Failed to load questions');
        if (onSkip) onSkip();
      }
    } catch (error) {
      console.error('Failed to load questions:', error);
      toast.error('Failed to load AI assistant');
      if (onSkip) onSkip();
    }
  };

  const handleQuestionsComplete = async (answersArray: GuidedQuestionAnswer[]) => {
    setAnswers(answersArray);
    setStep('generating');

    try {
      // Generate project board
      const response = await fetchWithAuth(
        `${config.API_BASE_URL}/api/projects/board/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            project_scenario: projectScenario,
            user_inputs: projectData,
            guided_answers: answersArray,
            syllabus_text: findSyllabusText(answersArray),
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setGeneratedBoard(data.board);
        setStep('preview');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to generate board');
        setStep('questions');
      }
    } catch (error) {
      console.error('Failed to generate board:', error);
      toast.error('Failed to generate project board');
      setStep('questions');
    }
  };

  const handleConfirmBoard = () => {
    if (generatedBoard) {
      onBoardGenerated(generatedBoard);
    }
  };

  const handleRegenerate = () => {
    // Go back to questions to allow editing
    setStep('questions');
    setGeneratedBoard(null);
  };

  const handleCancel = () => {
    if (onSkip) {
      onSkip();
    }
  };

  // Helper to find syllabus text from answers
  const findSyllabusText = (answersArray: GuidedQuestionAnswer[]): string | undefined => {
    for (const answer of answersArray) {
      if (answer.question_id === 'q2' && answer.answer) {
        if (typeof answer.answer === 'object' && answer.answer.type === 'text') {
          return answer.answer.content;
        }
      }
    }
    return undefined;
  };

  if (step === 'loading') {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (step === 'questions') {
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
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">AI Project Board Assistant</h2>
          <p className="text-gray-600">
            Answer a few questions to generate a customized project board with tasks and milestones
          </p>
          {onSkip && (
            <button
              onClick={onSkip}
              className="mt-4 text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Skip and create manually
            </button>
          )}
        </div>

        <AIGuidedQuestions
          questions={questions}
          onComplete={handleQuestionsComplete}
          onSkip={onSkip}
        />
      </div>
    );
  }

  if (step === 'generating' || !generatedBoard) {
    return <AIBoardPreview board={null as any} isGenerating={true} onConfirm={() => {}} onRegenerate={() => {}} onCancel={handleCancel} />;
  }

  return (
    <AIBoardPreview
      board={generatedBoard}
      isGenerating={false}
      onConfirm={handleConfirmBoard}
      onRegenerate={handleRegenerate}
      onCancel={handleCancel}
    />
  );
};

export default AIProjectBoardAssistant;
