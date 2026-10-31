/**
 * Analytics Hook
 * Track user behavior and engagement metrics
 */

import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';

const AI_AGENT_URL = import.meta.env.VITE_AI_AGENT_URL || 'http://localhost:8888';

export interface TrackEventParams {
  eventType: string;
  eventName: string;
  projectId?: string;
  sessionId?: string;
  nodeId?: string;
  taskId?: string;
  properties?: Record<string, any>;
  durationSeconds?: number;
}

export const useAnalytics = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const userId = user?.id;

  /**
   * Track a generic event
   */
  const trackEvent = useCallback(
    async (params: TrackEventParams) => {
      if (!userId) {
        console.warn('[Analytics] No user ID, skipping event tracking');
        return;
      }

      try {
        await fetch(`${AI_AGENT_URL}/ai-api/analytics/track-event`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            ...params,
            event_type: params.eventType,
            event_name: params.eventName,
            project_id: params.projectId,
            session_id: params.sessionId,
            node_id: params.nodeId,
            task_id: params.taskId,
            properties: params.properties,
            duration_seconds: params.durationSeconds,
          }),
        });

        console.log(`[Analytics] Tracked event: ${params.eventName}`);
      } catch (error) {
        console.error('[Analytics] Error tracking event:', error);
      }
    },
    [userId]
  );

  /**
   * ONBOARDING EVENTS
   */

  const trackFirstChatMessage = useCallback(
    (projectId: string, nodeId: string) => {
      trackEvent({
        eventType: 'first_chat_message',
        eventName: 'First Chat Message',
        projectId,
        nodeId,
      });
    },
    [trackEvent]
  );

  const trackFirstTaskAccepted = useCallback(
    (projectId: string, taskId: string) => {
      trackEvent({
        eventType: 'first_task_accepted',
        eventName: 'First Task Accepted',
        projectId,
        taskId,
      });
    },
    [trackEvent]
  );

  const trackUserReturned = useCallback(() => {
    trackEvent({
      eventType: 'user_returned',
      eventName: 'User Returned',
    });
  }, [trackEvent]);

  /**
   * ENGAGEMENT EVENTS
   */

  const trackNodeCreated = useCallback(
    (projectId: string, nodeId: string) => {
      trackEvent({
        eventType: 'node_created',
        eventName: 'Node Created',
        projectId,
        nodeId,
      });
    },
    [trackEvent]
  );

  const trackChatMessageSent = useCallback(
    (projectId: string, nodeId: string, messageLength: number) => {
      trackEvent({
        eventType: 'chat_message_sent',
        eventName: 'Chat Message Sent',
        projectId,
        nodeId,
        properties: { message_length: messageLength },
      });
    },
    [trackEvent]
  );

  const trackAISuggestionShown = useCallback(
    (projectId: string, nodeId: string, suggestionType: string, taskCount: number) => {
      trackEvent({
        eventType: 'ai_suggestion_shown',
        eventName: 'AI Suggestion Shown',
        projectId,
        nodeId,
        properties: { suggestion_type: suggestionType, task_count: taskCount },
      });
    },
    [trackEvent]
  );

  const trackAISuggestionAccepted = useCallback(
    (projectId: string, nodeId: string, suggestionType: string) => {
      trackEvent({
        eventType: 'ai_suggestion_accepted',
        eventName: 'AI Suggestion Accepted',
        projectId,
        nodeId,
        properties: { suggestion_type: suggestionType, accepted: true },
      });
    },
    [trackEvent]
  );

  const trackAISuggestionRejected = useCallback(
    (projectId: string, nodeId: string, suggestionType: string) => {
      trackEvent({
        eventType: 'ai_suggestion_rejected',
        eventName: 'AI Suggestion Rejected',
        projectId,
        nodeId,
        properties: { suggestion_type: suggestionType, accepted: false },
      });
    },
    [trackEvent]
  );

  /**
   * TASK TRACKING
   */

  const trackTaskViewed = useCallback(
    async (projectId: string, taskId: string) => {
      if (!userId) return;

      try {
        await fetch(`${AI_AGENT_URL}/ai-api/analytics/track-task-view`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            task_id: taskId,
            project_id: projectId,
          }),
        });
      } catch (error) {
        console.error('[Analytics] Error tracking task view:', error);
      }
    },
    [userId]
  );

  const trackGuidanceViewed = useCallback(
    async (projectId: string, taskId: string, stepsTotal?: number) => {
      if (!userId) return;

      try {
        await fetch(`${AI_AGENT_URL}/ai-api/analytics/track-guidance-view`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            task_id: taskId,
            project_id: projectId,
            steps_total: stepsTotal,
          }),
        });
      } catch (error) {
        console.error('[Analytics] Error tracking guidance view:', error);
      }
    },
    [userId]
  );

  const trackGuidanceStepCompleted = useCallback(
    async (projectId: string, taskId: string, stepNumber: number) => {
      if (!userId) return;

      try {
        await fetch(`${AI_AGENT_URL}/ai-api/analytics/track-guidance-step`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            task_id: taskId,
            project_id: projectId,
            step_number: stepNumber,
          }),
        });
      } catch (error) {
        console.error('[Analytics] Error tracking guidance step:', error);
      }
    },
    [userId]
  );

  const trackTaskCompleted = useCallback(
    (projectId: string, taskId: string) => {
      trackEvent({
        eventType: 'task_completed',
        eventName: 'Task Completed',
        projectId,
        taskId,
      });
    },
    [trackEvent]
  );

  /**
   * FEEDBACK SUBMISSION
   */

  const submitTaskFeedback = useCallback(
    async (
      projectId: string,
      taskId: string,
      rating: number,
      wasHelpful: boolean,
      comment?: string
    ) => {
      if (!userId) return;

      try {
        await fetch(`${AI_AGENT_URL}/ai-api/analytics/submit-feedback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            task_id: taskId,
            project_id: projectId,
            rating,
            was_helpful: wasHelpful,
            comment,
          }),
        });

        console.log('[Analytics] Feedback submitted successfully');
      } catch (error) {
        console.error('[Analytics] Error submitting feedback:', error);
      }
    },
    [userId]
  );

  /**
   * SESSION TRACKING
   */

  const trackSessionStart = useCallback(() => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    trackEvent({
      eventType: 'session_started',
      eventName: 'Session Started',
      sessionId,
    });

    // Store session ID for subsequent events
    sessionStorage.setItem('analytics_session_id', sessionId);

    return sessionId;
  }, [trackEvent]);

  const getCurrentSessionId = useCallback(() => {
    return sessionStorage.getItem('analytics_session_id');
  }, []);

  return {
    // Generic tracking
    trackEvent,

    // Onboarding
    trackFirstChatMessage,
    trackFirstTaskAccepted,
    trackUserReturned,

    // Engagement
    trackNodeCreated,
    trackChatMessageSent,
    trackAISuggestionShown,
    trackAISuggestionAccepted,
    trackAISuggestionRejected,

    // Task tracking
    trackTaskViewed,
    trackGuidanceViewed,
    trackGuidanceStepCompleted,
    trackTaskCompleted,

    // Feedback
    submitTaskFeedback,

    // Session
    trackSessionStart,
    getCurrentSessionId,
  };
};
