import { useState, useEffect, useRef } from 'react';
import { Message, Attachment, Suggestion } from '../../types/chat';
import { Task } from '../../types/task';
import { IdeaNode } from '../../types/project/ideaForest';
import config from '../../config';
import { withoutCourseSuggestions } from '../../utils/chat/suggestionUtils';

const { AI_AGENT_URL } = config;

interface NodeMetadata {
  title?: string;
  summary?: string;
  description?: string;
  [key: string]: unknown;
}

interface ToolResult {
  result?: {
    action?: string;
    tasks?: Task[];
    nodes?: IdeaNode[];
    success?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface UseChatMessagesProps {
  nodeId: string;
  projectId: string;
  userId: number;
  nodeTitle: string;
  nodeDescription: string;
  nodeMetadata?: NodeMetadata;
  onConclusionUpdate?: (conclusion: string) => void;
  onNodeUpdate?: (metadata?: { title?: string; summary?: string; description?: string }) => void;
  onShowTaskReviewModal?: (tasks: Task[]) => void;
  onShowNodeReviewModal?: (nodes: IdeaNode[]) => void;
  onDetectIntents?: (userMessage: string) => Promise<Suggestion[]>;
  onAutoUpdateNode?: (content: string) => Promise<void>;
}

interface BranchInfo {
  branches: Array<{
    id: string;
    name: string;
    version_number: string;
    parent_version_number: string | null;
    message_count: number;
    created_at: string;
  }>;
  active_branch_id: string | null;
}

interface ReasoningStep {
  step: number;
  content: string;
  timestamp: string;
}

interface UseChatMessagesReturn {
  messages: Message[];
  loading: boolean;
  isGenerating: boolean;
  sessionId: string | null;
  conclusion: string;
  summary: string;
  generatingSuggestions: { [messageIndex: number]: boolean };
  branchTree: { [branchPointIndex: number]: BranchInfo };
  reasoningMode: boolean;
  reasoningSteps: ReasoningStep[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  sendMessage: (messageToSend: string, attachments: Attachment[], regenerate?: boolean, targetSessionId?: string) => Promise<{ sessionId: string | null }>;
  regenerateLastMessage: () => Promise<void>;
  generateSuggestions: (messageIndex: number, messageContent: string) => Promise<void>;
  fetchChatMessages: (specificSessionId?: string) => Promise<void>;
  toggleReasoningMode: () => void;
}

/**
 * Custom hook for managing chat messages and AI interactions
 */
export const useChatMessages = ({
  nodeId,
  projectId,
  userId,
  nodeTitle,
  nodeDescription,
  // nodeMetadata is intentionally not destructured as it's not used in this hook
  onConclusionUpdate,
  onNodeUpdate,
  onShowTaskReviewModal,
  onShowNodeReviewModal,
  onDetectIntents,
  onAutoUpdateNode
}: UseChatMessagesProps): UseChatMessagesReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [conclusion, setConclusion] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [branchTree, setBranchTree] = useState<{ [branchPointIndex: number]: BranchInfo }>({});
  const streamingRef = useRef<boolean>(false);
  const [generatingSuggestions, setGeneratingSuggestions] = useState<{ [messageIndex: number]: boolean }>({});

  // Reasoning mode state
  const [reasoningMode, setReasoningMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('chat-reasoning-mode');
    return saved ? JSON.parse(saved) : false;
  });
  const [reasoningSteps, setReasoningSteps] = useState<ReasoningStep[]>([]);

  // Toggle reasoning mode and persist preference
  const toggleReasoningMode = () => {
    setReasoningMode(prev => {
      const newMode = !prev;
      localStorage.setItem('chat-reasoning-mode', JSON.stringify(newMode));
      // console.log(`[useChatMessages] Reasoning mode ${newMode ? 'enabled' : 'disabled'}`);
      return newMode;
    });
  };

  // Reset chat state when nodeId changes (ensure separate sessions per node)
  useEffect(() => {
    // console.log(`[useChatMessages] NodeId changed to: ${nodeId}, resetting chat state`);
    setMessages([]);
    setSessionId(null);
    setConclusion('');
    setSummary('');
    setIsGenerating(false);
    setGeneratingSuggestions({});
    setReasoningSteps([]);
  }, [nodeId]);

  // Continue streaming in background when component unmounts
  useEffect(() => {
    return () => {
      if (streamingRef.current) {
        // console.log('Chat streaming continues in background...');
      }
    };
  }, []);

  const fetchChatMessages = async (specificSessionId?: string) => {
    const startTime = performance.now();
    try {
      // PERFORMANCE: Use pagination to load only recent messages first (default 100)
      // This prevents 10+ second delays for chats with many messages
      const params = new URLSearchParams();
      if (specificSessionId) {
        params.append('session_id', specificSessionId);
      }
      params.append('limit', '100'); // Load first 100 messages (most recent conversations)
      params.append('offset', '0');

      const url = `${AI_AGENT_URL}/ai-api/node-chat/node/${nodeId}/messages?${params.toString()}`;

      // console.log(`[useChatMessages] 📥 Fetching messages (${new Date().toLocaleTimeString()}):`, {
      //   url,
      //   sessionId: specificSessionId || 'default',
      //   limit: 100
      // });

      const fetchStart = performance.now();
      const response = await fetch(url);
      const fetchEnd = performance.now();
      // console.log(`[useChatMessages] ⏱️ API call took ${(fetchEnd - fetchStart).toFixed(0)}ms`);
      if (response.ok) {
        const data = await response.json();

        // Check if backend returned a warning (e.g., session doesn't belong to node)
        if (data.warning) {
          // console.warn(`[useChatMessages] ⚠️ Backend warning:`, data.warning);
          // console.warn(`[useChatMessages] Session mismatch detected - clearing messages and session`);
        }

        // console.log(`[useChatMessages] ✅ Fetched messages:`, {
        //   sessionId: data.session_id,
        //   messageCount: data.messages?.length || 0,
        //   messages: data.messages?.map((m: Message) => ({
        //     role: m.role,
        //     contentPreview: m.content?.substring(0, 50),
        //     hasSuggestions: !!(m.suggestions && m.suggestions.length > 0),
        //     suggestionsCount: m.suggestions?.length || 0
        //   })),
        //   versionNumber: data.version_number,
        //   branchName: data.branch_name,
        //   branchTreeKeys: data.branch_tree ? Object.keys(data.branch_tree) : [],
        //   warning: data.warning || null
        // });

        setMessages(data.messages || []);
        setSessionId(data.session_id || null);
        setBranchTree(data.branch_tree || {});
        if (data.conclusion) {
          setConclusion(data.conclusion);
        }
        if (data.summary) {
          setSummary(data.summary);
        }

        const totalTime = performance.now() - startTime;
        // console.log(`[useChatMessages] ✅ Total fetch time: ${totalTime.toFixed(0)}ms (${data.messages?.length || 0} messages)`);
      } else {
        // console.error(`[useChatMessages] ❌ Failed to fetch messages:`, response.status, response.statusText);
      }
    } catch (error) {
      // console.error('[useChatMessages] Error fetching chat messages:', error);
      const totalTime = performance.now() - startTime;
      // console.error(`[useChatMessages] ❌ Failed after ${totalTime.toFixed(0)}ms`);
    }
  };

  // Generate follow-up suggestions for a message
  const generateSuggestions = async (messageIndex: number, messageContent: string) => {
    try {
      // console.log(`[useChatMessages] 🔮 Generating suggestions for message ${messageIndex}:`, {
      //   contentPreview: messageContent.substring(0, 100),
      //   nodeId,
      //   messageCount: messages.length
      // });

      setGeneratingSuggestions(prev => ({ ...prev, [messageIndex]: true }));

      const response = await fetch(`${AI_AGENT_URL}/ai-api/node-chat/generate-suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node_id: nodeId,
          project_id: projectId,
          message_content: messageContent,
          node_title: nodeTitle,
          node_description: nodeDescription,
          conversation_history: messages.slice(-5).map(m => ({ role: m.role, content: m.content })),
          session_id: sessionId,  // Include session ID to save suggestions to DB
          message_index: messageIndex  // Include message index to attach suggestions
        })
      });

      // console.log(`[useChatMessages] 📡 Suggestions API response:`, {
      //   status: response.status,
      //   ok: response.ok
      // });

      if (response.ok) {
        const data = await response.json();
        // console.log(`[useChatMessages] 📥 Suggestions data:`, {
        //   success: data.success,
        //   suggestionsCount: data.suggestions?.length || 0,
        //   suggestions: data.suggestions
        // });

        if (data.success && data.suggestions && data.suggestions.length > 0) {
          setMessages(prev => {
            const updated: Message[] = [...prev];
            if (updated[messageIndex]) {
              updated[messageIndex] = {
                ...updated[messageIndex],
                suggestions: withoutCourseSuggestions(data.suggestions)
              };
              // console.log(`[useChatMessages] ✅ Attached ${data.suggestions.length} suggestions to message ${messageIndex}`);
            }
            return updated;
          });
        } else {
          // console.warn(`[useChatMessages] ⚠️ No suggestions returned or empty array`);
        }
      } else {
        // console.error(`[useChatMessages] ❌ Suggestions API failed:`, response.status, response.statusText);
        const errorText = await response.text();
        // console.error(`[useChatMessages] Error body:`, errorText);
      }
    } catch (error) {
      // console.error('[useChatMessages] ❌ Error generating suggestions:', error);
    } finally {
      setGeneratingSuggestions(prev => ({ ...prev, [messageIndex]: false }));
    }
  };

  const sendMessage = async (userMessage: string, attachments: Attachment[], regenerate: boolean = false, targetSessionId?: string): Promise<{ sessionId: string | null }> => {
    if (!userMessage && attachments.length === 0) return { sessionId: null };

    const callId = Math.random().toString(36).substring(7);
    const effectiveSessionId = targetSessionId || sessionId;
    // console.log(`[useChatMessages] 📨 sendMessage called (${callId}) for node ${nodeId}:`, {
      // message: userMessage.substring(0, 50),
      // regenerate,
      // messageLength: userMessage.length,
      // hasAttachments: attachments.length > 0,
      // currentMessagesCount: messages.length,
      // targetSessionId: effectiveSessionId
    // });

    setLoading(true);
    setIsGenerating(true);
    streamingRef.current = true;

    // Reset reasoning steps for new message
    setReasoningSteps([]);

    // Add timeout to detect stuck requests (2 minutes)
    const timeoutId = setTimeout(() => {
      if (streamingRef.current) {
        // console.error(`[useChatMessages] ⏱️ Request timed out after 2 minutes for node ${nodeId}`);
        setLoading(false);
        setIsGenerating(false);
        streamingRef.current = false;

        // Show error message
        setMessages((prev) => {
          if (prev.length > 0 && prev[prev.length - 1].role === 'assistant' && !prev[prev.length - 1].content) {
            // Replace empty assistant message with error
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = {
              role: 'assistant' as const,
              content: '⚠️ Request timed out. The AI service may be experiencing issues. Please try again.',
              timestamp: new Date().toISOString(),
              isStreaming: false,
            };
            return newMessages;
          }
          return prev;
        });
      }
    }, 120000); // 2 minutes timeout

    // Add user message immediately (only if not regenerating)
    if (!regenerate) {
      // console.log(`[useChatMessages] ➕ Adding user message to state (${callId}):`, userMessage.substring(0, 30));
      setMessages((prev) => {
        // console.log(`[useChatMessages] 📊 Messages before add (${callId}):`, prev.length);
        const updated: Message[] = [
          ...prev,
          {
            role: 'user' as const,
            content: userMessage,
            timestamp: new Date().toISOString(),
            attachments: attachments.length > 0 ? [...attachments] : undefined
          },
          // Add empty assistant message placeholder immediately for better UX
          {
            role: 'assistant' as const,
            content: '',
            timestamp: new Date().toISOString(),
            isStreaming: true, // Mark as streaming so UI can show loading indicator
          }
        ];
        // console.log(`[useChatMessages] 📊 Messages after add (${callId}):`, updated.length);
        return updated;
      });
    }

    try {
      // Use enhanced context endpoint for full project access
      const streamEndpoint = `${AI_AGENT_URL}/ai-api/node-chat/send-message-with-context`;

      const requestBody = {
        node_id: nodeId,
        project_id: projectId,
        user_id: userId,
        session_id: effectiveSessionId || undefined,
        message: userMessage,
      };

      // console.log(`[useChatMessages] 📤 Sending message with ENHANCED PROJECT CONTEXT:`, {
        // endpoint: streamEndpoint,
        // nodeId,
        // projectId,
        // sessionId: requestBody.session_id,
        // messagePreview: userMessage.substring(0, 50),
        // regenerate,
        // note: 'AI has access to all project tasks, milestones, and nodes'
      // });

      const response = await fetch(streamEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      // console.log(`[useChatMessages] 📥 Response status:`, response.status, response.ok ? 'OK' : 'ERROR');

      if (!response.ok) {
        // Fallback to non-streaming
        const regularEndpoint = `${AI_AGENT_URL}/ai-api/node-chat/send-message`;
        const fallbackResponse = await fetch(regularEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        if (!fallbackResponse.ok) {
          throw new Error('Failed to send message');
        }

        const data = await fallbackResponse.json();
        // console.log(`[Node ${nodeId}] Fallback (Non-streaming) AI Response:`, {
          // message: data.message,
          // length: data.message?.length,
          // sessionId: data.session_id,
          // hasConclusion: !!data.conclusion,
          // hasSummary: !!data.metadata?.summary,
          // toolCalls: data.tool_calls?.length || 0,
          // toolResults: data.tool_results?.length || 0
        // });

        // Log tool calls if any
        if (data.tool_calls?.length) {
          // console.log(`[Node ${nodeId}] Tool Calls:`, data.tool_calls);
        }
        if (data.tool_results?.length) {
          // console.log(`[Node ${nodeId}] Tool Results:`, data.tool_results);

          // Handle task review modal for non-streaming responses
          data.tool_results.forEach((toolResult: ToolResult) => {
            if (toolResult.result?.action === 'review_tasks' && toolResult.result?.tasks) {
              // console.log(`[Node ${nodeId}] Opening task review modal with ${toolResult.result.tasks.length} tasks (non-streaming)`);
              if (onShowTaskReviewModal) {
                onShowTaskReviewModal(toolResult.result.tasks);
              }
            }
          });
        }

        setSessionId(data.session_id);

        // Add or update assistant message
        if (regenerate && messages.length > 0) {
          setMessages((prev) => {
            const newMessages: Message[] = [...prev];
            newMessages[newMessages.length - 1] = {
              role: 'assistant' as const,
              content: data.message,
              timestamp: new Date().toISOString(),
            };
            return newMessages;
          });
        } else {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant' as const, content: data.message, timestamp: new Date().toISOString() },
          ]);
        }

        // Detect intents and attach suggestions to the AI message
        if (onDetectIntents && userMessage && !regenerate) {
          setTimeout(async () => {
            try {
              const suggestions = await onDetectIntents(userMessage);
              if (suggestions && suggestions.length > 0) {
                setMessages((prev) => {
                  const newMessages: Message[] = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  if (lastMessage && lastMessage.role === 'assistant') {
                    lastMessage.suggestions = suggestions;
                  }
                  return [...newMessages];
                });
              }
            } catch (error) {
              // console.error('Error detecting intents:', error);
            }
          }, 500);
        }

        if (data.conclusion) {
          setConclusion(data.conclusion);
          if (onConclusionUpdate) {
            onConclusionUpdate(data.conclusion);
          }
        }

        if (data.metadata?.summary) {
          setSummary(data.metadata.summary);
          if (onNodeUpdate) {
            onNodeUpdate();
          }
        }

        // Sequential execution: Auto-update → Suggestions → Intent Detection (non-streaming)
        if (data.message && !regenerate) {
          const executeAutoUpdate = async () => {
            if (onAutoUpdateNode) {
              const isFirstAIMessage = messages.length === 1; // Only user message before this
              if (isFirstAIMessage) {
                // console.log(`[Node ${nodeId}] First AI message (non-streaming) - auto-updating node`);
                await onAutoUpdateNode(data.message).catch(error => {
                  // console.error('Error auto-updating node:', error);
                });
              }
            }
          };

          const executeSuggestions = () => {
            return new Promise<void>((resolve) => {
              setMessages(prev => {
                const lastIndex = prev.length - 1;
                if (lastIndex >= 0 && prev[lastIndex].role === 'assistant') {
                  generateSuggestions(lastIndex, data.message);
                }
                resolve();
                return prev;
              });
            });
          };

          // Execute in sequence
          executeAutoUpdate()
            .then(() => new Promise(resolve => setTimeout(resolve, 500)))
            .then(executeSuggestions)
            .then(() => {
              // console.log(`[Node ${nodeId}] (Non-streaming) Auto-update and suggestions complete`);
              if (onDetectIntents) {
                return onDetectIntents(messages[messages.length - 2]?.content || '');
              }
            })
            .catch(error => {
              // console.error(`[Node ${nodeId}] Error in post-message processing:`, error);
            });
        }

        // Fallback complete - clear timeout and return session ID
        clearTimeout(timeoutId);
        setLoading(false);
        setIsGenerating(false);
        streamingRef.current = false;
        return { sessionId: data.session_id };
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      // For regenerate mode, add a new AI placeholder (user message should still be there)
      // For normal mode, placeholder was already added above immediately after user message
      if (regenerate && messages.length > 0) {
        setMessages((prev) => {
          // Don't replace the last message - append a new AI placeholder
          // (The last AI response was already removed by regenerateLastMessage)
          const updated: Message[] = [
            ...prev,
            {
              role: 'assistant' as const,
              content: '',
              timestamp: new Date().toISOString(),
              isStreaming: true,
            }
          ];
          return updated;
        });
      }
      // else: Assistant placeholder already exists from initial add (line 205-210)

      if (reader) {
        // Keep reference to continue streaming even if component unmounts
        const continueStreaming = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6));

                    if (data.type === 'chunk') {
                      assistantMessage += data.content;
                      // console.log(`[Node ${nodeId}] AI Chunk:`, data.content);
                      // Update the assistant message in real-time
                      setMessages((prev) => {
                        const newMessages: Message[] = [...prev];
                        newMessages[newMessages.length - 1] = {
                          role: 'assistant' as const,
                          content: assistantMessage,
                          timestamp: new Date().toISOString(),
                          isStreaming: true, // Keep streaming flag during updates
                        };
                        return newMessages;
                      });
                    } else if (data.type === 'context') {
                      // Handle enhanced project context summary
                      // console.log(`[Node ${nodeId}] 📊 Enhanced Context Loaded:`, data.summary);
                      // console.log(`  - Node Tasks: ${data.summary?.tasks_count || 0}`);
                      // console.log(`  - Project Tasks: ${data.summary?.project_tasks || 0}`);
                      // console.log(`  - Milestones: ${data.summary?.milestones || 0}`);
                      // console.log(`  - Sibling Nodes: ${data.summary?.sibling_nodes || 0}`);
                      // console.log(`  - Child Nodes: ${data.summary?.child_nodes || 0}`);
                      // console.log(`  ✨ AI now has full project context!`);
                    } else if (data.type === 'reasoning_step') {
                      // Handle reasoning step (only if reasoning mode is enabled)
                      if (reasoningMode) {
                        const step: ReasoningStep = {
                          step: data.step || reasoningSteps.length + 1,
                          content: data.content,
                          timestamp: new Date().toISOString()
                        };
                        setReasoningSteps(prev => [...prev, step]);
                        // console.log(`[Node ${nodeId}] 🤔 Reasoning Step ${step.step}:`, data.content);
                      }
                    } else if (data.type === 'tool_call') {
                      // Handle tool call event
                      // console.log(`[Node ${nodeId}] Tool called:`, data.tool_name, 'with args:', data.arguments);

                      // Log it as reasoning step if mode enabled
                      if (reasoningMode) {
                        const step: ReasoningStep = {
                          step: reasoningSteps.length + 1,
                          content: `🔧 Calling tool: ${data.tool_name}`,
                          timestamp: new Date().toISOString()
                        };
                        setReasoningSteps(prev => [...prev, step]);
                        // console.log(`[Node ${nodeId}] 🔧 Tool Call:`, data.tool_name);
                      }
                    } else if (data.type === 'tool_result') {
                      // Handle tool result event
                      // console.log(`[Node ${nodeId}] Tool result:`, data.result);

                      // Log it as reasoning step if mode enabled
                      if (reasoningMode) {
                        const step: ReasoningStep = {
                          step: reasoningSteps.length + 1,
                          content: `✅ Tool result: ${data.tool_name} completed`,
                          timestamp: new Date().toISOString()
                        };
                        setReasoningSteps(prev => [...prev, step]);
                        // console.log(`[Node ${nodeId}] ✅ Tool Result:`, data.tool_name);
                      }

                      // Handle task review modal
                      if (data.result?.action === 'review_tasks' && data.result?.tasks) {
                        // console.log(`[Node ${nodeId}] Opening task review modal with ${data.result.tasks.length} tasks`);
                        if (onShowTaskReviewModal) {
                          onShowTaskReviewModal(data.result.tasks);
                        }
                      }

                      // Handle node review modal
                      if (data.result?.action === 'review_nodes' && data.result?.nodes) {
                        // console.log(`[Node ${nodeId}] Opening node review modal with ${data.result.nodes.length} nodes`);
                        if (onShowNodeReviewModal) {
                          onShowNodeReviewModal(data.result.nodes);
                        }
                      }

                      if (data.result?.success && onNodeUpdate) {
                        onNodeUpdate();
                      }
                    } else if (data.type === 'suggestions') {
                      // Handle suggestions from backend
                      // console.log(`[Node ${nodeId}] Received ${data.suggestions.length} suggestions from backend`);
                      setMessages((prev) => {
                        const newMessages: Message[] = [...prev];
                        const lastMessage = newMessages[newMessages.length - 1];
                        if (lastMessage && lastMessage.role === 'assistant') {
                          lastMessage.suggestions = withoutCourseSuggestions(data.suggestions);
                          // console.log(`[Node ${nodeId}] Attached suggestions to last AI message`);
                        }
                        return newMessages;
                      });
                    } else if (data.type === 'node_updated') {
                      // console.log(`[Node ${nodeId}] Node auto-updated:`, data.metadata);
                      if (onNodeUpdate) {
                        onNodeUpdate(data.metadata); // Pass metadata to callback
                      }
                    } else if (data.type === 'done') {
                      // console.log(`[Node ${nodeId}] ✅ AI Message Complete:`, {
                        // fullMessage: assistantMessage,
                        // length: assistantMessage.length,
                        // sessionId: data.session_id,
                        // targetSessionId: effectiveSessionId,
                        // sessionMatches: data.session_id === effectiveSessionId,
                        // hasConclusion: !!data.conclusion,
                        // hasSummary: !!data.summary
                      // });
                      setSessionId(data.session_id);
                      if (data.conclusion) {
                        setConclusion(data.conclusion);
                        if (onConclusionUpdate) {
                          onConclusionUpdate(data.conclusion);
                        }
                      }
                      if (data.summary) {
                        setSummary(data.summary);
                        if (onNodeUpdate) {
                          onNodeUpdate();
                        }
                      }

                      // Sequential execution: Auto-update → Suggestions → Intent Detection
                      if (assistantMessage && !regenerate) {
                        // Step 1: Auto-update node with first AI message
                        const executeAutoUpdate = async () => {
                          if (onAutoUpdateNode) {
                            const isFirstAIMessage = messages.length === 1; // Only user message before this
                            // console.log(`[Node ${nodeId}] Auto-update check:`, {
                              // hasCallback: !!onAutoUpdateNode,
                              // hasMessage: !!assistantMessage,
                              // isRegenerate: regenerate,
                              // messageCount: messages.length + 1, // +1 for the new assistant message
                              // isFirstAIMessage
                            // });
                            if (isFirstAIMessage) {
                              // console.log(`[Node ${nodeId}] First AI message - auto-updating node`);
                              await onAutoUpdateNode(assistantMessage).catch(error => {
                                // console.error(`[Node ${nodeId}] Error auto-updating node:`, error);
                              });
                            }
                          }
                        };

                        // Step 2: Generate follow-up suggestions (only if not already received from stream)
                        const executeSuggestions = () => {
                          return new Promise<void>((resolve) => {
                            setMessages(prev => {
                              const lastIndex = prev.length - 1;
                              if (lastIndex >= 0 && prev[lastIndex].role === 'assistant') {
                                // Check if suggestions already exist (from streaming event)
                                const lastMessage = prev[lastIndex];
                                if (!lastMessage.suggestions || lastMessage.suggestions.length === 0) {
                                  // console.log(`[Node ${nodeId}] No suggestions in stream, generating via API`);
                                  generateSuggestions(lastIndex, assistantMessage);
                                } else {
                                  // console.log(`[Node ${nodeId}] Suggestions already received from stream, skipping API call`);
                                }
                              }
                              resolve();
                              return prev;
                            });
                          });
                        };

                        // Step 3: Detect intents (will be called from NodeChatPanel)
                        // Execute in sequence
                        executeAutoUpdate()
                          .then(() => new Promise(resolve => setTimeout(resolve, 500)))
                          .then(executeSuggestions)
                          .then(() => {
                            // console.log(`[Node ${nodeId}] Auto-update and suggestions complete, ready for intent detection`);
                            // Intent detection will be triggered by onDetectIntents callback
                            if (onDetectIntents) {
                              return onDetectIntents(messages[messages.length - 2]?.content || '');
                            }
                          })
                          .catch(error => {
                            // console.error(`[Node ${nodeId}] Error in post-message processing:`, error);
                          });
                      }

                      // Mark streaming as complete
                      setMessages((prev) => {
                        const newMessages: Message[] = [...prev];
                        if (newMessages[newMessages.length - 1]?.role === 'assistant') {
                          newMessages[newMessages.length - 1] = {
                            ...newMessages[newMessages.length - 1],
                            isStreaming: false, // Streaming complete
                          };
                        }
                        return newMessages;
                      });
                    } else if (data.type === 'error') {
                      throw new Error(data.message);
                    }
                  } catch (parseError) {
                    // console.error('Error parsing SSE data:', parseError);
                  }
                }
              }
            }
          } catch (streamError) {
            // console.error('Streaming error:', streamError);
          }
        };

        // Start streaming (continues even if component unmounts)
        await continueStreaming();
      }
    } catch (error) {
      // console.error('Error sending message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Remove the empty assistant message on error
      setMessages((prev) => {
        if (prev.length > 0 && prev[prev.length - 1].role === 'assistant' && !prev[prev.length - 1].content) {
          return prev.slice(0, -1);
        }
        return prev;
      });

      alert(`Failed to send message: ${errorMessage}`);
      return { sessionId: null }; // Return null on error
    } finally {
      // Clear timeout
      clearTimeout(timeoutId);

      setLoading(false);
      setIsGenerating(false);
      streamingRef.current = false;
    }

    // Return the session ID after streaming completes
    return { sessionId };
  };

  const regenerateLastMessage = async () => {
    if (messages.length < 2) return;

    // Find the last user message and the last AI response
    let lastUserMessage = '';
    let lastAIMessageIndex = -1;

    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant' && lastAIMessageIndex === -1) {
        lastAIMessageIndex = i;
      }
      if (messages[i].role === 'user') {
        lastUserMessage = messages[i].content;
        break;
      }
    }

    if (!lastUserMessage) return;

    // Remove the last AI message before regenerating
    if (lastAIMessageIndex !== -1) {
      setMessages(prevMessages => prevMessages.filter((_, index) => index !== lastAIMessageIndex));
      // console.log(`[useChatMessages] 🔄 Removed last AI message at index ${lastAIMessageIndex} for regeneration`);
    }

    await sendMessage(lastUserMessage, [], true);
  };

  return {
    messages,
    loading,
    isGenerating,
    sessionId,
    conclusion,
    summary,
    generatingSuggestions,
    branchTree,
    reasoningMode,
    reasoningSteps,
    setMessages,
    sendMessage,
    regenerateLastMessage,
    generateSuggestions,
    fetchChatMessages,
    toggleReasoningMode
  };
};
