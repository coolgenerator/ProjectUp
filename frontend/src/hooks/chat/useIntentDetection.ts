import { useState } from 'react';
import { DetectedIntent } from '../../components/project/IdeaForest/ActionSuggestionCard';
import config from '../../config';
import { withoutCourseSuggestions } from '../../utils/chat/suggestionUtils';

const { AI_AGENT_URL } = config;

interface UseIntentDetectionProps {
  nodeId: string;
  nodeTitle: string;
  nodeDescription: string;
  projectId: string;
  userId: number;
  sessionId: string | null;
  messages: any[];
  allNodesCount: number;
}

interface UseIntentDetectionReturn {
  detectedIntents: DetectedIntent[];
  showIntentSuggestions: boolean;
  executingActions: boolean;
  systemMessages: string[];
  detectIntents: (userMessage: string) => Promise<any[]>; // Returns suggestions
  executeIntents: (intentIds: string[]) => Promise<void>;
  dismissIntentSuggestions: () => void;
  addSystemMessage: (content: string) => void;
  removeSystemMessage: (index: number) => void;
  clearSystemMessages: () => void;
}

/**
 * Custom hook for detecting and executing AI intents/actions
 */
export const useIntentDetection = ({
  nodeId,
  nodeTitle,
  nodeDescription,
  projectId,
  userId,
  sessionId,
  messages,
  allNodesCount
}: UseIntentDetectionProps): UseIntentDetectionReturn => {
  const [detectedIntents, setDetectedIntents] = useState<DetectedIntent[]>([]);
  const [showIntentSuggestions, setShowIntentSuggestions] = useState(false);
  const [executingActions, setExecutingActions] = useState(false);
  const [systemMessages, setSystemMessages] = useState<string[]>([]);

  // Intent detection function - returns suggestions to be attached to message
  const detectIntents = async (userMessage: string): Promise<any[]> => {
    console.log('[useIntentDetection] Starting intent detection for message:', userMessage);
    try {
      // Get recent conversation history (last 5 user messages)
      const recentMessages = messages
        .filter(m => m.role === 'user')
        .slice(-5)
        .map(m => m.content);

      console.log('[useIntentDetection] Request payload:', {
        message: userMessage,
        node_id: nodeId,
        session_id: sessionId || 'temp-session',
        conversation_history: recentMessages
      });

      const response = await fetch(`${AI_AGENT_URL}/ai-api/intents/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          node_id: nodeId,
          node_title: nodeTitle,
          node_description: nodeDescription,
          project_id: projectId,
          session_id: sessionId || 'temp-session',
          conversation_history: recentMessages,
          existing_nodes_count: allNodesCount,
          user_id: userId
        })
      });

      console.log('[useIntentDetection] Response status:', response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log('[useIntentDetection] Response data:', data);

        if (data.success && data.intents && data.intents.length > 0) {
          console.log(`[useIntentDetection] Detected ${data.intents.length} intents:`, data.intents);
          // Convert intents to suggestions format
          const suggestions = withoutCourseSuggestions(data.intents.map((intent: any) => ({
            id: intent.id,
            type: 'action',
            text: intent.title,
            description: intent.preview || intent.description,
            actionType: intent.type,
            confidence: intent.confidence,
            priority: intent.priority,
            parameters: intent.parameters
          })));
          console.log('[useIntentDetection] Converted to suggestions:', suggestions);
          return suggestions;
        } else {
          console.log('[useIntentDetection] No intents detected in response');
        }
      } else {
        console.error('[useIntentDetection] Response not OK:', await response.text());
      }
      return [];
    } catch (error) {
      console.error('[useIntentDetection] Error detecting intents:', error);
      return [];
    }
  };

  // Execute accepted intents
  const executeIntents = async (intentIds: string[]) => {
    setExecutingActions(true);
    try {
      const intentsToExecute = detectedIntents.filter(intent => intentIds.includes(intent.id));

      const actions = intentsToExecute.map(intent => ({
        intent_id: intent.id,
        action_type: intent.type,
        parameters: intent.parameters,
        node_id: nodeId,
        project_id: projectId,
        session_id: sessionId || 'temp-session',
        user_id: userId
      }));

      const response = await fetch(`${AI_AGENT_URL}/ai-api/intents/execute-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent_ids: intentIds,
          actions: actions
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Show success message only if something was created
          const nodesCreated = data.total_nodes_created || 0;
          const depsCreated = data.total_dependencies_created || 0;

          if (nodesCreated > 0 || depsCreated > 0) {
            const successMessage = `✅ AI created ${nodesCreated} node(s)${depsCreated > 0 ? ` and ${depsCreated} dependency(ies)` : ''}`;
            addSystemMessage(successMessage);
          }

          // Hide suggestions
          setShowIntentSuggestions(false);
          setDetectedIntents([]);
        } else {
          // Show error
          const errorMessage = `⚠️ Some actions failed: ${data.errors?.join(', ') || 'Unknown error'}`;
          addSystemMessage(errorMessage);
        }
      }
    } catch (error) {
      console.error('Error executing intents:', error);
      const errorMessage = `❌ Failed to execute actions: ${error}`;
      addSystemMessage(errorMessage);
    } finally {
      setExecutingActions(false);
    }
  };

  const dismissIntentSuggestions = () => {
    setShowIntentSuggestions(false);
    setDetectedIntents([]);
  };

  const addSystemMessage = (content: string) => {
    setSystemMessages(prev => [...prev, content]);
  };

  const removeSystemMessage = (index: number) => {
    setSystemMessages(prev => prev.filter((_, i) => i !== index));
  };

  const clearSystemMessages = () => {
    setSystemMessages([]);
  };

  return {
    detectedIntents,
    showIntentSuggestions,
    executingActions,
    systemMessages,
    detectIntents,
    executeIntents,
    dismissIntentSuggestions,
    addSystemMessage,
    removeSystemMessage,
    clearSystemMessages
  };
};
