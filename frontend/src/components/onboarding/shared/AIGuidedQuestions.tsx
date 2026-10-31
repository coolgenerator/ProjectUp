import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface GuidedQuestion {
  id: string;
  question: string;
  type: 'text' | 'select' | 'multi_select' | 'file_or_text' | 'slider' | 'structured_input';
  hint?: string;
  options?: QuestionOption[];
  fields?: StructuredField[];
  ai_usage: string;
  optional: boolean;
  fallback?: string;
}

export interface QuestionOption {
  label: string;
  value: string;
  description?: string;
}

export interface StructuredField {
  name: string;
  type: string;
  options?: string[];
}

export interface GuidedQuestionAnswer {
  question_id: string;
  answer: any;
}

interface AIGuidedQuestionsProps {
  questions: GuidedQuestion[];
  onComplete: (answers: GuidedQuestionAnswer[]) => void;
  onSkip?: () => void;
}

const AIGuidedQuestions: React.FC<AIGuidedQuestionsProps> = ({
  questions,
  onComplete,
  onSkip,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, any>>(new Map());
  const [currentAnswer, setCurrentAnswer] = useState<any>(null);

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const handleNext = () => {
    if (currentAnswer !== null && currentAnswer !== '') {
      const newAnswers = new Map(answers);
      newAnswers.set(currentQuestion.id, currentAnswer);
      setAnswers(newAnswers);
      setCurrentAnswer(null);

      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // All questions answered
        const answersArray: GuidedQuestionAnswer[] = Array.from(newAnswers.entries()).map(
          ([question_id, answer]) => ({ question_id, answer })
        );
        onComplete(answersArray);
      }
    }
  };

  const handleSkip = () => {
    if (currentQuestion.optional) {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setCurrentAnswer(null);
      } else {
        const answersArray: GuidedQuestionAnswer[] = Array.from(answers.entries()).map(
          ([question_id, answer]) => ({ question_id, answer })
        );
        onComplete(answersArray);
      }
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      const previousAnswer = answers.get(questions[currentIndex - 1].id);
      setCurrentAnswer(previousAnswer || null);
    }
  };

  const renderQuestionInput = () => {
    switch (currentQuestion.type) {
      case 'text':
        return (
          <textarea
            value={currentAnswer || ''}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={4}
            placeholder={currentQuestion.hint || 'Type your answer here...'}
          />
        );

      case 'select':
        return (
          <div className="space-y-2">
            {currentQuestion.options?.map((option) => (
              <button
                key={option.value}
                onClick={() => setCurrentAnswer(option.value)}
                className={`w-full p-4 text-left border-2 rounded-lg transition-all ${
                  currentAnswer === option.value
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-gray-900">{option.label}</div>
                {option.description && (
                  <div className="text-sm text-gray-600 mt-1">{option.description}</div>
                )}
              </button>
            ))}
          </div>
        );

      case 'multi_select':
        const selectedValues = (currentAnswer as string[]) || [];
        return (
          <div className="space-y-2">
            {currentQuestion.options?.map((option) => (
              <label
                key={option.value}
                className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedValues.includes(option.value)
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option.value)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setCurrentAnswer([...selectedValues, option.value]);
                    } else {
                      setCurrentAnswer(selectedValues.filter((v) => v !== option.value));
                    }
                  }}
                  className="mt-1 mr-3 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{option.label}</div>
                  {option.description && (
                    <div className="text-sm text-gray-600 mt-1">{option.description}</div>
                  )}
                </div>
              </label>
            ))}
          </div>
        );

      case 'slider':
        return (
          <div className="space-y-4">
            <input
              type="range"
              min="1"
              max="5"
              value={currentAnswer || 3}
              onChange={(e) => setCurrentAnswer(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-sm text-gray-600">
              <span>1</span>
              <span className="text-lg font-semibold text-blue-600">{currentAnswer || 3}</span>
              <span>5</span>
            </div>
          </div>
        );

      case 'file_or_text':
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-4 mb-4">
              <button
                onClick={() => setCurrentAnswer({ type: 'text', content: '' })}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                  currentAnswer?.type === 'text'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                Paste Text
              </button>
              <button
                onClick={() => setCurrentAnswer({ type: 'file', content: null })}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                  currentAnswer?.type === 'file'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                Upload File
              </button>
            </div>

            {currentAnswer?.type === 'text' && (
              <textarea
                value={currentAnswer.content || ''}
                onChange={(e) =>
                  setCurrentAnswer({ ...currentAnswer, content: e.target.value })
                }
                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={6}
                placeholder="Paste your syllabus or requirements here..."
              />
            )}

            {currentAnswer?.type === 'file' && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setCurrentAnswer({ type: 'file', content: file });
                    }
                  }}
                  className="hidden"
                  id="file-upload"
                  accept=".pdf,.doc,.docx,.txt"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer inline-flex flex-col items-center"
                >
                  <svg
                    className="w-12 h-12 text-gray-400 mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  {currentAnswer.content ? (
                    <span className="text-sm font-medium text-gray-700">
                      {currentAnswer.content.name}
                    </span>
                  ) : (
                    <>
                      <span className="text-sm font-medium text-gray-700">
                        Click to upload file
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        PDF, DOC, DOCX, or TXT
                      </span>
                    </>
                  )}
                </label>
              </div>
            )}
          </div>
        );

      case 'structured_input':
        const structuredValue = (currentAnswer as Record<string, any>) || {};
        return (
          <div className="space-y-4">
            {currentQuestion.fields?.map((field) => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                  {field.name.replace(/_/g, ' ')}
                </label>
                {field.type === 'number' && (
                  <input
                    type="number"
                    value={structuredValue[field.name] || ''}
                    onChange={(e) =>
                      setCurrentAnswer({
                        ...structuredValue,
                        [field.name]: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                )}
                {field.type === 'select' && (
                  <select
                    value={structuredValue[field.name] || ''}
                    onChange={(e) =>
                      setCurrentAnswer({
                        ...structuredValue,
                        [field.name]: e.target.value,
                      })
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select...</option>
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}
                {field.type === 'multi_select' && (
                  <div className="space-y-2">
                    {field.options?.map((opt) => (
                      <label key={opt} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={(structuredValue[field.name] || []).includes(opt)}
                          onChange={(e) => {
                            const currentValues = structuredValue[field.name] || [];
                            const newValues = e.target.checked
                              ? [...currentValues, opt]
                              : currentValues.filter((v: string) => v !== opt);
                            setCurrentAnswer({
                              ...structuredValue,
                              [field.name]: newValues,
                            });
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span className="text-sm text-gray-500">{Math.round(progress)}% Complete</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
            className="h-full bg-gradient-to-r from-blue-600 to-indigo-600"
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white rounded-xl shadow-lg p-8"
        >
          {/* Question */}
          <h3 className="text-2xl font-bold text-gray-900 mb-2">{currentQuestion.question}</h3>

          {/* Hint */}
          {currentQuestion.hint && (
            <p className="text-sm text-gray-600 mb-6">{currentQuestion.hint}</p>
          )}

          {/* AI Usage Info */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-6">
            <div className="flex items-start space-x-2">
              <svg
                className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              <div className="text-sm text-purple-800">
                <span className="font-medium">AI will use this to: </span>
                {currentQuestion.ai_usage}
              </div>
            </div>
          </div>

          {/* Input */}
          <div className="mb-6">{renderQuestionInput()}</div>

          {/* Fallback message */}
          {currentQuestion.optional && currentQuestion.fallback && (
            <p className="text-sm text-gray-500 italic mb-4">💡 {currentQuestion.fallback}</p>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <button
              onClick={handleBack}
              disabled={currentIndex === 0}
              className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ← Back
            </button>

            <div className="flex space-x-3">
              {currentQuestion.optional && (
                <button
                  onClick={handleSkip}
                  className="px-6 py-3 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Skip
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={
                  !currentQuestion.optional &&
                  (currentAnswer === null || currentAnswer === '' ||
                   (Array.isArray(currentAnswer) && currentAnswer.length === 0))
                }
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all font-medium"
              >
                {currentIndex === questions.length - 1 ? 'Generate Board →' : 'Next →'}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default AIGuidedQuestions;
