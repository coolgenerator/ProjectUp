/**
 * Task Feedback Modal
 * Collect user feedback on task guidance helpfulness
 */

import React, { useState } from 'react';
import { useAnalytics } from '../../hooks/useAnalytics';

interface TaskFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  projectId: string;
  taskTitle: string;
}

export const TaskFeedbackModal: React.FC<TaskFeedbackModalProps> = ({
  isOpen,
  onClose,
  taskId,
  projectId,
  taskTitle,
}) => {
  const { submitTaskFeedback } = useAnalytics();

  const [rating, setRating] = useState<number>(0);
  const [wasHelpful, setWasHelpful] = useState<boolean | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0 || wasHelpful === null) {
      return;
    }

    setIsSubmitting(true);

    try {
      await submitTaskFeedback(
        projectId,
        taskId,
        rating,
        wasHelpful,
        comment || undefined
      );

      setSubmitted(true);

      // Auto-close after 2 seconds
      setTimeout(() => {
        onClose();
        // Reset form
        setRating(0);
        setWasHelpful(null);
        setComment('');
        setSubmitted(false);
      }, 2000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-6">
        {!submitted ? (
          <>
            {/* Header */}
            <div>
              <h3 className="text-xl font-bold text-gray-900">How was the guidance?</h3>
              <p className="text-sm text-gray-600 mt-1">
                Your feedback helps us improve task guidance for everyone
              </p>
              <p className="text-sm text-gray-500 mt-2 font-medium truncate">{taskTitle}</p>
            </div>

            {/* Was it helpful? */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-900">
                Was the guidance helpful?
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setWasHelpful(true)}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                    wasHelpful === true
                      ? 'bg-green-100 border-2 border-green-500 text-green-700'
                      : 'bg-gray-100 border-2 border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  👍 Yes, helpful!
                </button>
                <button
                  onClick={() => setWasHelpful(false)}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                    wasHelpful === false
                      ? 'bg-red-100 border-2 border-red-500 text-red-700'
                      : 'bg-gray-100 border-2 border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  👎 Not really
                </button>
              </div>
            </div>

            {/* Star rating */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-900">
                Rate the quality (1-5 stars)
              </label>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`text-3xl transition-all hover:scale-110 ${
                      star <= rating ? 'text-yellow-400' : 'text-gray-300'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <p className="text-xs text-center text-gray-500">
                {rating === 0 && 'Click to rate'}
                {rating === 1 && 'Poor'}
                {rating === 2 && 'Fair'}
                {rating === 3 && 'Good'}
                {rating === 4 && 'Very Good'}
                {rating === 5 && 'Excellent'}
              </p>
            </div>

            {/* Optional comment */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">
                Additional feedback (optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What did you like or what could be improved?"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                maxLength={500}
              />
              <p className="text-xs text-gray-500 text-right">{comment.length}/500</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={rating === 0 || wasHelpful === null || isSubmitting}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                  rating === 0 || wasHelpful === null
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </>
        ) : (
          /* Success state */
          <div className="text-center py-8 space-y-4">
            <div className="text-6xl">🎉</div>
            <h3 className="text-xl font-bold text-gray-900">Thank you!</h3>
            <p className="text-gray-600">Your feedback helps us improve</p>
          </div>
        )}
      </div>
    </div>
  );
};
