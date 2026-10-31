import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MessageSquare, X, Sparkles, Save, FileText, Loader2, Brain } from 'lucide-react';
import config from '../../../config';
import { IdeaNode } from '../../../types/project/ideaForest';
import { Message, Suggestion, MentionableMaterial } from '../../../types/chat';
import ActionReviewModal from './ActionReviewModal';
import TaskReviewModal from './TaskReviewModal';
import ChatMessageList from './NodeChatPanel/ChatMessageList';
import ChatInput from './NodeChatPanel/ChatInput';
import AttachmentPreview from './NodeChatPanel/AttachmentPreview';
import { useMentions } from '../../../hooks/chat/useMentions';
import { useChatMessages } from '../../../hooks/chat/useChatMessages';
import { useIntentDetection } from '../../../hooks/chat/useIntentDetection';
import { useFileUpload } from '../../../hooks/chat/useFileUpload';
import { versionsAPI } from '../../../api/versions';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/store';
import 'katex/dist/katex.min.css';

const { AI_AGENT_URL } = config;

interface NodeChatPanelProps {
  nodeId: string;
  nodeTitle: string;
  nodeDescription: string;
  projectId: string;
  userId: number;
  isRootNode?: boolean;  // Whether this is the root node of the project
  treeSessionId?: string;  // ID of the IdeaTree session (for updating tree title/description)
  nodeMetadata?: Record<string, unknown>;
  onConclusionUpdate?: (conclusion: string) => void;
  onUpdateNodeContent?: (newContent: string) => void;
  onNodeUpdate?: (metadata?: { title?: string; summary?: string; description?: string; tree_updated?: boolean }) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  allNodes?: IdeaNode[];
  mentionableMaterials?: MentionableMaterial[];
  initialChatPrompt?: string;
  onChatPromptSent?: () => void;
  searchParams?: URLSearchParams;  // For reading/updating URL params (like chatSessionId)
  setSearchParams?: (params: URLSearchParams, options?: { replace?: boolean }) => void;  // For updating URL
}

const NodeChatPanel: React.FC<NodeChatPanelProps> = ({
  nodeId,
  nodeTitle,
  nodeDescription,
  projectId,
  userId,
  isRootNode = false,
  treeSessionId,
  nodeMetadata,
  onConclusionUpdate,
  onUpdateNodeContent,
  onNodeUpdate,
  isFullscreen = false,
  onToggleFullscreen,
  allNodes = [],
  mentionableMaterials = [],
  initialChatPrompt,
  onChatPromptSent,
  searchParams,
  setSearchParams,
}) => {
  const [input, setInput] = useState('');
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [isBranchingEdit, setIsBranchingEdit] = useState(false); // Track if edit is for branching
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showTaskReviewModal, setShowTaskReviewModal] = useState(false);
  const [reviewTasks, setReviewTasks] = useState<Partial<import('../../../types/task').Task>[]>([]);
  const [showNodeReviewModal, setShowNodeReviewModal] = useState(false);
  const [reviewNodes, setReviewNodes] = useState<any[]>([]);
  const [showActionReviewModal, setShowActionReviewModal] = useState(false);
  const [selectedActionSuggestion, setSelectedActionSuggestion] = useState<Suggestion | null>(null);
  const [updatingNode, setUpdatingNode] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<{ title?: string; summary: string; description: string } | null>(null);
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [creatingBranch, setCreatingBranch] = useState(false); // Track when creating a conversation branch
  const [branchPointIndex, setBranchPointIndex] = useState<number | null>(null);
  const [shouldCreateVersionOnNextResponse, setShouldCreateVersionOnNextResponse] = useState(false);
  const [currentVersionPath, setCurrentVersionPath] = useState<string>('1'); // Track current version like "1", "2", "2.1"
  const [conversationBranches, setConversationBranches] = useState<{
    [branchPointIndex: number]: {
      branches: Array<{
        id: string;
        name: string;
        versionNumber: string;
        parentVersionNumber: string | null;
        messages: Message[];
        messageCount: number;
        createdAt: string;
      }>;
      activeBranchId: string;
    };
  }>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Get user from Redux store for version creation
  const currentUser = useSelector((state: RootState) => state.auth.user);

  /**
   * Calculate the next version number based on current version and existing branches
   * Examples:
   * - From "1" with 0 existing branches at this point -> "2"
   * - From "2" with 1 existing branch (2.1) at this point -> "2.2"
   * - From "2.1" with 0 existing branches at this point -> "2.1.1"
   */
  const calculateNextVersionNumber = (
    currentVersion: string,
    existingBranches: Array<{ versionNumber: string; parentVersionNumber: string | null }>,
    branchPointIndex: number = 0
  ): string => {
    // Find branches that have the current version as parent
    const siblingBranches = existingBranches.filter(b => b.parentVersionNumber === currentVersion);

    // Determine if this should be a hierarchical child (X.Y) or a flat sibling (X+1)
    // Branches at index 0 are root siblings (flat: 1, 2, 3...)
    // Branches at index > 0 are hierarchical children (nested: 2.1, 2.2...)
    const isRootSibling = branchPointIndex === 0;

    if (siblingBranches.length === 0) {
      // This is the first branch from current version
      const parts = currentVersion.split('.');

      if (isRootSibling && parts.length === 1) {
        // Root-level branch at index 0: "1" -> "2" (flat sibling)
        return String(parseInt(parts[0]) + 1);
      } else {
        // Hierarchical branch at index > 0: "1" -> "1.1", "2" -> "2.1"
        return `${currentVersion}.1`;
      }
    } else {
      // There are existing siblings - find the highest sub-version number
      const maxSubVersion = Math.max(...siblingBranches.map(b => {
        const parts = b.versionNumber.split('.');
        return parseInt(parts[parts.length - 1]);
      }));

      // Increment it
      const currentParts = currentVersion.split('.');

      if (isRootSibling && currentParts.length === 1) {
        // Root-level siblings at index 0: "2", "3" -> next is "4"
        return String(parseInt(currentVersion) + (maxSubVersion - parseInt(currentVersion)) + 1);
      } else {
        // Hierarchical siblings: "2.1", "2.2" -> next is "2.3"
        const baseParts = currentVersion.split('.');
        baseParts[baseParts.length - 1] = String(maxSubVersion + 1);
        return baseParts.join('.');
      }
    }
  };

  // Convert legacy allNodes to mentionable materials format
  const allMaterials = useMemo(() => {
    if (mentionableMaterials.length > 0) {
      return mentionableMaterials;
    }
    return allNodes.map(node => ({
      id: node.id,
      title: node.title,
      description: node.description,
      type: 'node' as const,
      metadata: node,
    }));
  }, [allNodes, mentionableMaterials]);

  // Auto-update node function for first AI message (no confirmation required)
  const autoUpdateNodeWithMessage = async (messageContent: string) => {
    if (!messageContent.trim()) return;

    // console.log('[NodeChatPanel] Auto-updating node with first AI message...');

    try {
      // Step 1: Generate AI-powered summary and description
      const generateResponse = await fetch(`${AI_AGENT_URL}/ai-api/node-chat/generate-node-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node_id: nodeId,
          project_id: projectId,
          message_content: messageContent,
          current_title: nodeTitle,
          current_description: nodeDescription || '',
          current_summary: typeof nodeMetadata?.summary === 'string' ? nodeMetadata.summary : '',
          user_id: userId
        })
      });

      if (!generateResponse.ok) {
        const error = await generateResponse.json();
        throw new Error(error.detail || 'Failed to generate summary');
      }

      const { title: newTitle, summary: newSummary, description: newDescription, tags: newTags } = await generateResponse.json();

      // console.log('[NodeChatPanel] AI generated (auto-update):', {
      //   title: newTitle || nodeTitle,
      //   summary: newSummary.substring(0, 100) + '...',
      //   description: newDescription.substring(0, 100) + '...',
      //   tags: newTags || []
      // });

      // Step 2: Update the node with AI-generated content
      // Clear the chat_prompt_pending flag since we've completed the auto-chat
      const updatedMetadata = {
        ...nodeMetadata,
        last_ai_update: new Date().toISOString(),
        updated_from_message: messageContent.substring(0, 200),
        chat_prompt_pending: false, // Clear loading state
        initial_chat_prompt: undefined // Remove the stored prompt
      };

      // console.log('[NodeChatPanel] Updating node with metadata:', {
      //   nodeId,
      //   clearingFlag: true,
      //   metadata: updatedMetadata
      // });

      const updateResponse = await fetch(`${AI_AGENT_URL}/ai-api/idea-tree/nodes/${nodeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle || nodeTitle,  // Use AI-generated title or keep existing
          summary: newSummary,
          description: newDescription,
          tags: newTags || [],
          metadata: updatedMetadata
        })
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        // console.error('[NodeChatPanel] Failed to update node:', errorText);
        throw new Error('Failed to update node');
      }

      const updatedNode = await updateResponse.json();
      // console.log('[NodeChatPanel] ✅ Node auto-updated successfully, metadata after update:', updatedNode.metadata);

      // Step 3: If this is a root node, also update the tree session title and description
      let treeUpdated = false;
      if (isRootNode && treeSessionId) {
        // console.log('[NodeChatPanel] This is a root node, updating tree session...');
        try {
          const treeUpdateResponse = await fetch(`${AI_AGENT_URL}/ai-api/projects/${projectId}/idea-tree?session_id=${treeSessionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: newTitle || nodeTitle,  // Use node title as tree title
              description: newDescription   // Use node description as tree description
            })
          });

          if (treeUpdateResponse.ok) {
            // console.log('[NodeChatPanel] ✅ Tree session also updated with title and description');
            treeUpdated = true;
          } else {
            // console.warn('[NodeChatPanel] Failed to update tree session:', await treeUpdateResponse.text());
          }
        } catch (error) {
          // console.error('[NodeChatPanel] Error updating tree session:', error);
        }
      }

      // Notify parent component to refresh the tree data and pass updated metadata
      // This is crucial to update the node visual state on the canvas
      if (onNodeUpdate) {
        // console.log('[NodeChatPanel] Calling onNodeUpdate with metadata to refresh tree...');
        await onNodeUpdate({
          title: newTitle || nodeTitle,
          summary: newSummary,
          description: newDescription,
          tree_updated: treeUpdated
        }); // Wait for tree refresh to complete
        // console.log('[NodeChatPanel] Tree refresh completed');
      } else {
        // console.warn('[NodeChatPanel] onNodeUpdate callback not available, tree may not refresh');
      }

      if (onUpdateNodeContent) {
        onUpdateNodeContent(newDescription);
      }

      // Additional refresh after a short delay to ensure UI updates
      setTimeout(() => {
        // console.log('[NodeChatPanel] Triggering delayed refresh to ensure UI sync');
        if (onNodeUpdate) {
          onNodeUpdate();
        }
      }, 500);

      // Show success notification
      setSuccessData({ title: newTitle || nodeTitle, summary: newSummary, description: newDescription });
      setShowSuccessModal(true);

      // Automatically create initial version after first message auto-update
      await createVersionAfterUpdate('Initial auto-update from first chat message');
    } catch (error) {
      // console.error('Error auto-updating node content:', error);
      // Don't show alert for auto-update failures, just log them
    }
  };

  // Custom hooks
  const {
    messages,
    loading,
    isGenerating,
    sessionId,
    conclusion,
    generatingSuggestions,
    branchTree,
    reasoningMode,
    reasoningSteps,
    setMessages,
    sendMessage,
    regenerateLastMessage,
    fetchChatMessages,
    toggleReasoningMode
  } = useChatMessages({
    nodeId,
    projectId,
    userId,
    nodeTitle,
    nodeDescription,
    nodeMetadata,
    onConclusionUpdate,
    onNodeUpdate,
    onShowTaskReviewModal: (tasks) => {
      setReviewTasks(tasks);
      setShowTaskReviewModal(true);
    },
    onShowNodeReviewModal: (nodes) => {
      // console.log('[NodeChatPanel] Node review modal triggered with nodes:', nodes);
      setReviewNodes(nodes);
      setShowNodeReviewModal(true);
    },
    onAutoUpdateNode: autoUpdateNodeWithMessage,
    onDetectIntents: async (userMessage: string) => {
      // Detect intents and attach suggestions to the last AI message
      // console.log('[NodeChatPanel] Detecting intents for message:', userMessage);
      try {
        const suggestions = await detectIntents(userMessage);
        // console.log('[NodeChatPanel] Detected suggestions:', suggestions);

        if (suggestions && suggestions.length > 0) {
          // console.log('[NodeChatPanel] Attaching', suggestions.length, 'suggestions to last AI message');
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];

            if (lastMessage && lastMessage.role === 'assistant') {
              lastMessage.suggestions = suggestions;
              // console.log('[NodeChatPanel] Successfully attached suggestions to AI message');

              // Detect multi-option responses in AI message
              if (sessionId) {
                handleMultiOptionDetection(lastMessage.content, sessionId);
              }
            }
            return [...newMessages];
          });
        }
        return suggestions || [];
      } catch (error) {
        // console.error('Error detecting intents:', error);
        return [];
      }
    }
  });

  // Log allNodes count for debugging
  useEffect(() => {
    // console.log(`[NodeChatPanel] allNodes count for node ${nodeId}:`, allNodes.length);
  }, [nodeId, allNodes.length]);

  // Sync branchTree from backend to conversationBranches
  useEffect(() => {
    if (branchTree && Object.keys(branchTree).length > 0) {
      // console.log('[NodeChatPanel] 🌳 Using branch tree from backend:', branchTree);

      // Convert backend branchTree format to frontend conversationBranches format
      const convertedBranches: typeof conversationBranches = {};

      Object.entries(branchTree).forEach(([indexStr, branchInfo]) => {
        const index = parseInt(indexStr);
        convertedBranches[index] = {
          branches: branchInfo.branches.map(b => ({
            id: b.id,
            name: b.name,
            versionNumber: b.version_number,
            parentVersionNumber: b.parent_version_number,
            messages: [], // Not needed for selector, only for display
            messageCount: b.message_count,
            createdAt: b.created_at
          })),
          activeBranchId: branchInfo.active_branch_id || ''
        };
      });

      setConversationBranches(convertedBranches);
      // console.log('[NodeChatPanel] ✅ Conversation branches updated from backend:', {
      //   branchPoints: Object.keys(convertedBranches),
      //   details: convertedBranches
      // });
    }
  }, [branchTree]);

  const {
    executingActions,
    systemMessages,
    detectIntents,
    executeIntents,
    removeSystemMessage
  } = useIntentDetection({
    nodeId,
    nodeTitle,
    nodeDescription,
    projectId,
    userId,
    sessionId,
    messages,
    allNodesCount: allNodes.length
  });

  const {
    showMentionMenu,
    selectedMentionIndex,
    selectedCategory,
    selectedTreeId,
    treeSessions,
    suggestedMaterials,
    filteredMaterialsByCategory,
    setSelectedCategory,
    setSelectedTreeId,
    handleInputChange: handleMentionInputChange,
    insertMention,
    handleMentionKeyDown
  } = useMentions({
    allMaterials,
    nodeId,
    nodeTitle,
    nodeDescription,
    projectId,
    messages,
    textareaRef
  });

  const {
    attachments,
    uploadingFiles,
    fileInputRef,
    handleFileUpload,
    removeAttachment,
    clearAttachments
  } = useFileUpload();

  // Track previous nodeId to detect actual changes (not initial mount)
  const previousNodeIdRef = useRef<string | null>(null);

  // Load sessions and messages when nodeId changes (ensures separate chat sessions per node)
  useEffect(() => {
    // console.log('[NodeChatPanel] 🔄 NodeId is:', nodeId, 'previous was:', previousNodeIdRef.current);

    // IMPORTANT: Clear chatSessionId from URL when node CHANGES (but not on initial mount)
    // This prevents loading the previous node's session for the new node
    const nodeActuallyChanged = previousNodeIdRef.current !== null && previousNodeIdRef.current !== nodeId;

    if (nodeActuallyChanged && setSearchParams && searchParams) {
      const currentChatSessionId = searchParams.get('chatSessionId');
      if (currentChatSessionId) {
        // console.log('[NodeChatPanel] 🧹 Clearing chatSessionId from URL (node changed from', previousNodeIdRef.current, 'to', nodeId, ')');
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('chatSessionId');
        setSearchParams(newParams, { replace: true });
      }
    }

    // Update previous nodeId for next comparison
    previousNodeIdRef.current = nodeId;

    const loadConversationBranches = async () => {
      try {
        // Fetch all conversation sessions for this node
        const response = await fetch(`${AI_AGENT_URL}/ai-api/node-chat/node/${nodeId}/sessions`);
        if (response.ok) {
          const data = await response.json();
          // console.log('[NodeChatPanel] Loaded conversation sessions for node:', nodeId, data.sessions.length);

          // Reconstruct conversation branch tree from sessions
          if (data.sessions && data.sessions.length > 0) {
            const branchTree: typeof conversationBranches = {};

            // Find main session first
            const mainSession = data.sessions.find((s: any) => !s.parent_session_id);

            // Group child sessions by branch_point_index
            const childSessions = data.sessions.filter((s: any) => s.parent_session_id && s.branch_point_index !== null);

            childSessions.forEach((session: any) => {
              const branchIdx = session.branch_point_index;

              if (!branchTree[branchIdx]) {
                branchTree[branchIdx] = {
                  branches: [],
                  activeBranchId: ''
                };
              }

              branchTree[branchIdx].branches.push({
                id: session.id,
                name: session.branch_display_name || `Version ${session.version_number}`,
                versionNumber: session.version_number,
                parentVersionNumber: session.parent_version_number,
                messages: [],
                messageCount: session.message_count || 0,
                createdAt: session.created_at
              });
            });

            // For each branch point, prepend the parent session as the first option
            if (mainSession) {
              Object.keys(branchTree).forEach(indexStr => {
                const index = parseInt(indexStr);
                branchTree[index].branches.unshift({
                  id: mainSession.id,
                  name: `Version ${mainSession.version_number || '1'} (Main)`,
                  versionNumber: mainSession.version_number || '1',
                  parentVersionNumber: null,
                  messages: [],
                  messageCount: mainSession.message_count || 0,
                  createdAt: mainSession.created_at
                });
              });
            }

            setConversationBranches(branchTree);
            // console.log('[NodeChatPanel] Reconstructed branch tree with parent options:', branchTree);
            // console.log('[NodeChatPanel] Branch tree keys (message indices with branches):', Object.keys(branchTree));
            // console.log('[NodeChatPanel] Branches at index 0:', branchTree[0]);

            // Set current version from main session
            if (mainSession) {
              setCurrentVersionPath(mainSession.version_number || '1');
            }
          }
        }
      } catch (error) {
        // console.error('[NodeChatPanel] Error loading conversation sessions:', error);
      }
    };

    // Check if there's a chatSessionId in the URL (for shared links or page refresh)
    const chatSessionId = searchParams?.get('chatSessionId');

    if (chatSessionId && !nodeActuallyChanged) {
      // Load specific session (from shared link or page refresh)
      // console.log('[NodeChatPanel] Loading specific chat session from URL:', chatSessionId);

      // Branch tree is now fetched automatically with messages
      fetchChatMessages(chatSessionId);
    } else {
      // Load default (active) session for this node
      // console.log('[NodeChatPanel] Loading default session for node:', nodeId);

      // Skip fetchChatMessages if we have an initial prompt to auto-send
      // The auto-send will create the session and messages, so fetching would just return empty []
      // and create a race condition where the fetched empty messages overwrite the auto-sent message
      // Branch tree is fetched automatically with messages now
      if (!initialChatPrompt || !initialChatPrompt.trim()) {
        // console.log('[NodeChatPanel] No initial prompt - fetching existing messages');
        fetchChatMessages();
      } else {
        // console.log('[NodeChatPanel] Initial prompt detected - skipping fetchChatMessages to avoid race condition');
        // console.log('[NodeChatPanel] Auto-send will create session and first message');
      }
    }
    // Load conversation branches on node change
    loadConversationBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId]);

  // CRITICAL FIX: Load messages when component first mounts (chat tab opens)
  // This ensures messages load even if nodeId hasn't changed
  useEffect(() => {
    // console.log('[NodeChatPanel] 🔥 Component mounted - checking if initial load is needed');

    // Check if there's a chatSessionId in the URL
    const chatSessionId = searchParams?.get('chatSessionId');

    if (chatSessionId) {
      // console.log('[NodeChatPanel] Loading specific session from URL on mount:', chatSessionId);
      fetchChatMessages(chatSessionId);
    } else if (!initialChatPrompt || !initialChatPrompt.trim()) {
      // Only fetch if no initial prompt (to avoid race condition with auto-send)
      // console.log('[NodeChatPanel] No session in URL, fetching default messages on mount');
      fetchChatMessages();
    } else {
      // console.log('[NodeChatPanel] Initial prompt present, skipping fetch on mount');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps = run only on mount

  // Auto-send initial chat prompt when provided (for new nodes created with conversational prompts)
  // Track if we've already sent the initial prompt to avoid duplicates
  const initialPromptSentRef = useRef(false);
  const lastNodeIdRef = useRef<string>('');
  const componentIdRef = useRef(Math.random().toString(36).substring(7));

  // GLOBAL deduplication map to prevent ANY instance from sending the same prompt twice
  // This is stored outside the component to persist across all instances
  const globalSentPromptsRef = useRef<Map<string, boolean>>(
    typeof window !== 'undefined' && (window as any).__nodeChatSentPrompts
      ? (window as any).__nodeChatSentPrompts
      : new Map()
  );

  if (typeof window !== 'undefined') {
    (window as any).__nodeChatSentPrompts = globalSentPromptsRef.current;
  }

  // Track component lifecycle for debugging
  useEffect(() => {
    // console.log(`[NodeChatPanel ${componentIdRef.current}] 🟢 Component MOUNTED for node ${nodeId}`);
    return () => {
      // console.log(`[NodeChatPanel ${componentIdRef.current}] 🔴 Component UNMOUNTING for node ${nodeId}`);
    };
  }, [nodeId]);

  // Track messages state changes for debugging
  useEffect(() => {
    // console.log(`[NodeChatPanel] 📨 Messages state changed:`, {
      // count: messages.length,
      // sessionId,
      // messages: messages.map(m => ({ role: m.role, contentLength: m.content?.length || 0 }))
    // });
  }, [messages, sessionId]);

  // Reset auto-send flag when node changes
  useEffect(() => {
    if (nodeId !== lastNodeIdRef.current) {
      // console.log(`[NodeChatPanel ${componentIdRef.current}] Node changed from`, lastNodeIdRef.current, 'to', nodeId, '- resetting auto-send flag');
      initialPromptSentRef.current = false;
      lastNodeIdRef.current = nodeId;
    }
  }, [nodeId]);

  // Cleanup effect: Clear stuck chat_prompt_pending flag if summary already exists
  useEffect(() => {
    const cleanupStuckFlag = async () => {
      // If node has description/content but still has chat_prompt_pending flag, clear it
      const summary = nodeMetadata?.summary as string | undefined;
      const hasContent = !!(summary || nodeDescription);

      if (nodeMetadata?.chat_prompt_pending && hasContent) {
        // console.log('[NodeChatPanel] ⚠️ Detected stuck loading flag - content exists but flag is still true');
        // console.log('[NodeChatPanel] Node data:', {
          // nodeTitle,
          // hasSummary: !!summary,
          // hasDescription: !!nodeDescription,
          // summaryPreview: summary?.substring(0, 50),
          // descriptionPreview: nodeDescription?.substring(0, 50)
        // });
        // console.log('[NodeChatPanel] Automatically clearing chat_prompt_pending flag');

        try {
          const response = await fetch(`${AI_AGENT_URL}/ai-api/idea-tree/nodes/${nodeId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              metadata: {
                ...nodeMetadata,
                chat_prompt_pending: false,
                initial_chat_prompt: undefined,
                auto_cleaned: true,
                cleaned_at: new Date().toISOString()
              }
            })
          });

          if (response.ok) {
            // console.log('[NodeChatPanel] ✅ Successfully cleared stuck flag');
            // Refresh tree to update UI
            if (onNodeUpdate) {
              await onNodeUpdate();
            }
          }
        } catch (error) {
          // console.error('[NodeChatPanel] Failed to clear stuck flag:', error);
        }
      }
    };

    // Run cleanup check after a short delay to avoid race conditions
    const timer = setTimeout(cleanupStuckFlag, 1000);
    return () => clearTimeout(timer);
  }, [nodeId, nodeMetadata?.chat_prompt_pending, nodeMetadata?.summary, nodeDescription, onNodeUpdate]);

  // Auto-send effect - runs when prompt or nodeId changes
  // IMPORTANT: Does NOT depend on loading to avoid race conditions with fetchChatMessages
  useEffect(() => {
    // Create a unique key for this node+prompt combination
    const promptKey = `${nodeId}-${initialChatPrompt?.substring(0, 100)}`;
    const globalAlreadySent = globalSentPromptsRef.current.get(promptKey);

    // console.log(`[NodeChatPanel ${componentIdRef.current}] 🔄 Auto-send effect triggered:`, {
      // nodeId,
      // hasPrompt: !!initialChatPrompt,
      // promptText: initialChatPrompt?.substring(0, 30),
      // alreadySentLocally: initialPromptSentRef.current,
      // alreadySentGlobally: globalAlreadySent,
      // messagesCount: messages.length,
      // isFullscreen,
      // trigger: 'dependencies changed'
    // });

    // Track timeout ID for cleanup
    let timeoutId: NodeJS.Timeout | null = null;
    let shouldSend = false;

    // IMPORTANT: Only the non-fullscreen instance should auto-send to prevent duplicates
    // There are two NodeChatPanel instances: one for fullscreen, one for normal tab view
    // We only want the normal tab view to auto-send when a new node is created
    const shouldAutoSend = !isFullscreen;

    // Only send if:
    // 1. We should auto-send (not fullscreen)
    // 2. We have a prompt
    // 3. Haven't sent it yet (local check)
    // 4. Haven't sent it yet (global check across ALL instances)
    // NOTE: Removed loading check to avoid race condition with fetchChatMessages
    if (shouldAutoSend && initialChatPrompt && initialChatPrompt.trim() && !initialPromptSentRef.current && !globalAlreadySent) {
      // console.log(`[NodeChatPanel ${componentIdRef.current}] ✅ Conditions met! Auto-sending initial prompt:`, initialChatPrompt.substring(0, 50) + '...');

      // Mark as sent immediately in BOTH local and global trackers to prevent duplicates
      initialPromptSentRef.current = true;
      globalSentPromptsRef.current.set(promptKey, true);
      shouldSend = true;
      // console.log(`[NodeChatPanel ${componentIdRef.current}] 🔒 Set both local and global sent flags = true (locked)`);

      // Small delay to ensure chat panel is fully initialized
      timeoutId = setTimeout(() => {
        // console.log(`[NodeChatPanel ${componentIdRef.current}] 📤 Executing sendMessage for nodeId:`, nodeId);
        // Send the message automatically (sendMessage will create session if needed)
        sendMessage(initialChatPrompt, [], false).then((result) => {
          // console.log(`[NodeChatPanel ${componentIdRef.current}] ✅ Initial prompt sent successfully`, result);

          // If we got a new session ID, update the URL to navigate to it
          if (result?.sessionId && setSearchParams && searchParams) {
            // console.log(`[NodeChatPanel ${componentIdRef.current}] 🔗 Navigating to new session:`, result.sessionId);

            const newParams = new URLSearchParams(searchParams);
            newParams.set('chatSessionId', result.sessionId);
            setSearchParams(newParams, { replace: true });
            // console.log(`[NodeChatPanel ${componentIdRef.current}] ✅ URL updated with session ID`);
          }

          // Notify parent to clear prompt AFTER URL update to prevent effect re-runs during critical state
          // Small delay ensures URL update completes first
          setTimeout(() => {
            onChatPromptSent?.();
            // console.log(`[NodeChatPanel ${componentIdRef.current}] 🧹 Cleared initialChatPrompt in parent`);
          }, 100);
        }).catch((error) => {
          // console.error(`[NodeChatPanel ${componentIdRef.current}] ❌ Error sending initial prompt:`, error);
          // Reset BOTH flags on error so user can retry
          initialPromptSentRef.current = false;
          globalSentPromptsRef.current.delete(promptKey);
          // console.log(`[NodeChatPanel ${componentIdRef.current}] 🔓 Reset both local and global sent flags = false (error recovery)`);
          // Still notify parent even on error to clear the prompt
          onChatPromptSent?.();
        });
      }, 100);
    } else {
      // console.log(`[NodeChatPanel ${componentIdRef.current}] ⏸️ Auto-send blocked:`, {
        // reason: !shouldAutoSend ? 'fullscreen instance (skip)' :
                // !initialChatPrompt ? 'no prompt' :
                // !initialChatPrompt.trim() ? 'empty prompt' :
                // initialPromptSentRef.current ? 'already sent locally' :
                // globalAlreadySent ? 'already sent globally' : 'unknown'
      // });
    }

    // Cleanup: Clear timeout if effect re-runs or component unmounts
    return () => {
      if (timeoutId) {
        // console.log(`[NodeChatPanel ${componentIdRef.current}] 🧹 Cleaning up auto-send timeout (effect cleanup)`);
        clearTimeout(timeoutId);

        // DO NOT reset the flag here! Once marked as sent, it should stay sent.
        // The flag is only reset on error (in the catch block) or when node changes (in separate useEffect).
        // Resetting here causes duplicates when the effect re-runs due to dependency changes.
      }
    };
    // IMPORTANT: Include nodeId and isFullscreen in dependencies
    // nodeId: re-trigger when node changes
    // isFullscreen: ensure only non-fullscreen instance auto-sends
    // Removed 'loading' dependency to avoid race condition with fetchChatMessages
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialChatPrompt, nodeId, isFullscreen]);

  // Handle escape key for fullscreen
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen && onToggleFullscreen) {
        onToggleFullscreen();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isFullscreen, onToggleFullscreen]);

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      // console.error('Failed to copy code:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);
    handleMentionInputChange(value, e.target.selectionStart);
  };

  const handleMentionSelect = (material: MentionableMaterial) => {
    const mentionCursorPosition = input.lastIndexOf('@');
    const newInput = insertMention(material, input, mentionCursorPosition);
    setInput(newInput);
  };

  const handleMentionKeyDownWrapper = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    handleMentionKeyDown(e, input, (newInput) => setInput(newInput));
  };

  const handleSendMessage = async () => {
    if (!input.trim() && attachments.length === 0) return;

    const messageToSend = input.trim();
    setInput('');

    // If user marked a branching point, create a version before exploring alternative
    if (shouldCreateVersionOnNextResponse && currentUser?.id) {
      // console.log('[NodeChatPanel] Creating version at branching point before exploring alternative...');
      await createVersionAfterUpdate('Branching point - exploring alternative approach');
      setShouldCreateVersionOnNextResponse(false);
    }

    // Get the current chat session ID from URL (if viewing a specific branch)
    const currentChatSessionId = searchParams?.get('chatSessionId') || undefined;

    // console.log('[NodeChatPanel] Sending message:', messageToSend, 'to session:', currentChatSessionId || '(default)');
    await sendMessage(messageToSend, attachments, false, currentChatSessionId);
    clearAttachments();

    // Note: Intent detection is now handled automatically by useChatMessages hook
    // The hook executes: Message Complete → Auto-update → Suggestions → Intent Detection
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !showMentionMenu) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startEditMessage = (index: number, forBranching = false) => {
    // Check bounds first
    if (index < 0 || index >= messages.length) {
      // console.warn('[NodeChatPanel] Invalid message index:', index);
      return;
    }

    const message = messages[index];
    if (!message) {
      // console.warn('[NodeChatPanel] Message not found at index:', index);
      return;
    }

    if (message.role !== 'user') return;
    setEditingMessageIndex(index);
    setEditedContent(message.content);
    setIsBranchingEdit(forBranching);

    if (forBranching) {
      // console.log('[NodeChatPanel] Starting branching edit at message index:', index);
    }
  };

  const cancelEditMessage = () => {
    setEditingMessageIndex(null);
    setEditedContent('');
    setIsBranchingEdit(false);
  };

  const saveEditedMessage = async () => {
    if (editingMessageIndex === null || !editedContent.trim() || !sessionId) return;

    const newContent = editedContent.trim();
    const branchIndex = editingMessageIndex;

    // Handle branching mode - create new branch session
    if (isBranchingEdit) {
      // console.log('[NodeChatPanel] Creating branch at message index:', branchIndex);

      setCreatingBranch(true); // Set branch creation state instead of version
      setEditingMessageIndex(null);
      setEditedContent('');
      setIsBranchingEdit(false);

      try {
        // Get messages up to (but not including) the branching point
        const messagesUpToBranch = messages.slice(0, branchIndex);

        // IMPORTANT: Fetch ALL sessions for this node to properly calculate version number
        // We need to check ALL sibling branches (same parent), not just branches at same index
        const sessionsResponse = await fetch(`${AI_AGENT_URL}/ai-api/node-chat/node/${nodeId}/sessions`);
        if (!sessionsResponse.ok) {
          throw new Error('Failed to fetch sessions for version calculation');
        }

        const sessionsData = await sessionsResponse.json();
        const allSessions = sessionsData.sessions || [];

        // Determine parent based on branch index:
        // - Index 0 (no message above) → parent = root session (Version 1)
        // - Index > 0 → parent = whichever branch was selected at previous message point
        let parentSessionId: string;
        let parentVersionNumber: string;

        if (branchIndex === 0) {
          // Branch at first message → root-level branch, parent = main session
          const rootSession = allSessions.find((s: any) => !s.parent_session_id);
          parentSessionId = rootSession?.id || sessionId;
          parentVersionNumber = rootSession?.version_number || '1';
          // console.log('[NodeChatPanel] Creating root-level branch (index 0), parent = Version', parentVersionNumber);
        } else {
          // Branch at later message → parent = current branch being viewed
          parentSessionId = searchParams?.get('chatSessionId') || sessionId;
          const parentSession = allSessions.find((s: any) => s.id === parentSessionId);
          parentVersionNumber = parentSession?.version_number || currentVersionPath;
          // console.log('[NodeChatPanel] Creating sub-branch (index', branchIndex, '), parent = Version', parentVersionNumber);
        }

        // Find all sibling branches (branches with the same parent_session_id)
        const siblingBranches = allSessions
          .filter((s: any) => s.parent_session_id === parentSessionId)
          .map((s: any) => ({
            id: s.id,
            name: s.branch_display_name || s.branch_name,
            versionNumber: s.version_number,
            parentVersionNumber: s.parent_version_number,
            messages: [],
            messageCount: s.message_count || 0,
            createdAt: s.created_at
          }));

        // console.log('[NodeChatPanel] Found sibling branches:', siblingBranches.length, siblingBranches);

        // Calculate next version number based on ALL siblings, not just at this branch point
        const newVersionNumber = calculateNextVersionNumber(parentVersionNumber, siblingBranches, branchIndex);

        // Call backend to create new branch session
        const response = await fetch(`${AI_AGENT_URL}/ai-api/node-chat/sessions/create-branch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parent_session_id: parentSessionId,
            branch_point_index: branchIndex,
            branch_display_name: `Version ${newVersionNumber}`,
            initial_messages: messagesUpToBranch,
            modified_message: newContent, // The edited user message
            version_number: newVersionNumber,
            parent_version_number: parentVersionNumber
          })
        });

        if (!response.ok) {
          throw new Error('Failed to create branch');
        }

        const branchData = await response.json();
        // console.log('[NodeChatPanel] Branch created:', branchData);

        // Store branch in conversationBranches with hierarchical version numbering
        setBranchPointIndex(branchIndex);
        const newBranchId = branchData.session.id;
        setConversationBranches(prev => {
          const branchPoint = prev[branchIndex] || {
            branches: [],
            activeBranchId: ''
          };

          // If this is the first branch at this point, add the parent version as a branch too
          const isFirstBranch = branchPoint.branches.length === 0;
          const branches = isFirstBranch
            ? [
              {
                id: parentSessionId || 'main',
                name: `Version ${parentVersionNumber}`,
                versionNumber: parentVersionNumber,
                parentVersionNumber: null,
                messages: messages, // All messages up to this point
                messageCount: messages.length,
                createdAt: new Date().toISOString()
              }
            ]
            : branchPoint.branches;

          const newBranch = {
            id: newBranchId,
            name: `Version ${newVersionNumber}`,
            versionNumber: newVersionNumber,
            parentVersionNumber: parentVersionNumber,
            messages: messagesUpToBranch,
            messageCount: messagesUpToBranch.length,
            createdAt: branchData.session.created_at
          };

          return {
            ...prev,
            [branchIndex]: {
              branches: [...branches, newBranch],
              activeBranchId: newBranchId
            }
          };
        });

        // Update current version path to the new branch
        setCurrentVersionPath(newVersionNumber);

        // Switch to the new branch session (set messages up to branch point)
        setMessages(messagesUpToBranch);

        // Send the modified message in the new branch to generate AI response
        // Pass the new branch session ID so the message goes to the correct session
        // NOTE: The backend no longer adds modified_message during branch creation
        // It will be added when we call sendMessage, which prevents duplication
        // console.log('[NodeChatPanel] 🔀 Sending message to new branch:', {
          // branchId: newBranchId,
          // message: newContent.substring(0, 50),
          // currentMessagesInState: messagesUpToBranch.length,
          // action: 'sendMessage will add user message + generate AI response'
        // });

        await sendMessage(newContent, [], false, newBranchId);

        // console.log('[NodeChatPanel] ✅ Branch message sent and AI response generated');

        // Create a version for the branch
        await createVersionAfterUpdate(`Created conversation branch from message ${branchIndex + 1}`);

        // Update URL with new branch's chatSessionId
        if (setSearchParams && searchParams) {
          const newParams = new URLSearchParams(searchParams);
          newParams.set('chatSessionId', newBranchId);
          setSearchParams(newParams, { replace: true });
          // console.log('[NodeChatPanel] 🔗 Updated URL with new branch chatSessionId:', newBranchId);
        }

        // IMPORTANT: Reload branch tree to pick up the new branch
        // This is especially important for nested branches (branches within branches)
        // Without this, the branch selector won't show the newly created branch as an option
        // console.log('[NodeChatPanel] 🔄 Reloading branch tree to display new branch...');
        try {
          const sessionsResponse = await fetch(`${AI_AGENT_URL}/ai-api/node-chat/node/${nodeId}/sessions`);
          if (sessionsResponse.ok) {
            const sessionsData = await sessionsResponse.json();

            // Find child branches of the current session (now includes the newly created branch)
            const childBranches = sessionsData.sessions.filter((s: any) =>
              s.parent_session_id === currentSessionId
            );

            if (childBranches.length > 0) {
              // Group by branch_point_index
              const branchPointGroups: { [index: number]: any[] } = {};
              childBranches.forEach((branch: any) => {
                const idx = branch.branch_point_index;
                if (!branchPointGroups[idx]) {
                  branchPointGroups[idx] = [];
                }
                branchPointGroups[idx].push(branch);
              });

              // Update conversation branches to show all options
              const updatedBranchTree: typeof conversationBranches = { ...conversationBranches };
              Object.keys(branchPointGroups).forEach(indexStr => {
                const index = parseInt(indexStr);
                const branchesAtIndex = branchPointGroups[index];

                // Include current session as first option
                const allOptions = [
                  {
                    id: currentSessionId,
                    name: `Version ${currentVersionPath} (Current)`,
                    versionNumber: currentVersionPath,
                    parentVersionNumber: null,
                    messages: messagesUpToBranch,
                    messageCount: messagesUpToBranch.length,
                    createdAt: new Date().toISOString()
                  },
                  ...branchesAtIndex.map((s: any) => ({
                    id: s.id,
                    name: s.branch_display_name || `Version ${s.version_number}`,
                    versionNumber: s.version_number,
                    parentVersionNumber: s.parent_version_number,
                    messages: [],
                    messageCount: s.message_count || 0,
                    createdAt: s.created_at
                  }))
                ];

                updatedBranchTree[index] = {
                  branches: allOptions,
                  activeBranchId: newBranchId
                };
              });

              setConversationBranches(updatedBranchTree);
              // console.log('[NodeChatPanel] ✅ Updated branch tree with nested branches');
            }
          }
        } catch (error) {
          // console.error('[NodeChatPanel] Error reloading branch tree:', error);
        }

      } catch (error) {
        // console.error('[NodeChatPanel] Error creating branch:', error);
        alert('Failed to create branch. Please try again.');
      } finally {
        setCreatingBranch(false);
      }
      return;
    }

    // Regular edit mode (not branching)
    setMessages((prev) => {
      const newMessages = [...prev];
      newMessages[editingMessageIndex] = {
        ...newMessages[editingMessageIndex],
        content: newContent,
      };
      return newMessages;
    });

    setEditingMessageIndex(null);
    setEditedContent('');

    // Check if this is the last user message
    let isLastUserMessage = true;
    for (let i = editingMessageIndex + 1; i < messages.length; i++) {
      if (messages[i].role === 'user') {
        isLastUserMessage = false;
        break;
      }
    }

    if (isLastUserMessage) {
      const currentChatSessionId = searchParams?.get('chatSessionId') || undefined;
      setMessages((prev) => prev.slice(0, editingMessageIndex + 1));
      await sendMessage(newContent, [], false, currentChatSessionId);
    }
  };

  const saveAsVersion = async () => {
    if (!sessionId || !conclusion) {
      alert('No conclusion available to save');
      return;
    }

    try {
      const response = await fetch(`${AI_AGENT_URL}/ai-api/node-chat/create-version`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          user_id: userId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create version');
      }

      alert('Version saved successfully!');
    } catch (error) {
      // console.error('Error saving version:', error);
      alert('Failed to save version. Please try again.');
    }
  };

  const updateNodeWithMessage = async (messageContent: string, messageIndex: number) => {
    if (!messageContent.trim() || updatingNode) return;

    // Show confirmation
    const confirmed = window.confirm(
      'This will use AI to generate an updated summary and description based on the conversation. Continue?'
    );
    if (!confirmed) return;

    setUpdatingNode(true);

    try {
      // Extract conversation history up to and including this message
      const conversationUpToMessage = messages.slice(0, messageIndex + 1).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // console.log('[NodeChatPanel] Generating AI summary and description from full conversation...', {
        // messagesCount: conversationUpToMessage.length,
        // upToIndex: messageIndex
      // });

      // Get current chat session ID for tracking
      const currentChatSessionId = searchParams?.get('chatSessionId') || sessionId;

      // Step 1: Generate AI-powered summary and description using full conversation
      const generateResponse = await fetch(`${AI_AGENT_URL}/ai-api/node-chat/generate-node-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node_id: nodeId,
          project_id: projectId,
          conversation_history: conversationUpToMessage, // Send full conversation
          current_title: nodeTitle,
          current_description: nodeDescription || '',
          current_summary: typeof nodeMetadata?.summary === 'string' ? nodeMetadata.summary : '',
          chat_session_id: currentChatSessionId, // Track which session
          user_id: userId
        })
      });

      if (!generateResponse.ok) {
        const error = await generateResponse.json();
        // console.error('[NodeChatPanel] Generate summary failed:', error);
        throw new Error(error.detail || JSON.stringify(error) || 'Failed to generate summary');
      }

      const generateResult = await generateResponse.json();
      const { title: newTitle, summary: newSummary, description: newDescription } = generateResult;

      if (!newSummary || !newDescription) {
        // console.error('[NodeChatPanel] Missing summary or description in response:', generateResult);
        throw new Error('AI did not return valid summary or description');
      }

      // console.log('[NodeChatPanel] AI generated:', {
        // title: newTitle,
        // summary: newSummary.substring(0, 100) + '...',
        // description: newDescription.substring(0, 100) + '...'
      // });

      // Step 2: Check if current title is a default title
      // Only update the title if it's still using a default/generic name
      // If the user has customized the title, preserve it and only update the description
      const defaultTitles = [
        'new node',
        'root node',
        'untitled',
        'node',
        'idea',
        'new idea',
        'child node'
      ];

      const currentTitleLower = nodeTitle.toLowerCase().trim();
      const isDefaultTitle = defaultTitles.some(defaultTitle =>
        currentTitleLower === defaultTitle ||
        currentTitleLower.startsWith(defaultTitle + ' ') ||
        currentTitleLower.match(new RegExp(`^${defaultTitle}\\s*\\d+$`, 'i')) // Matches "New Node 1", "Root Node 2", etc.
      );

      // console.log('[NodeChatPanel] Title check:', {
      //   currentTitle: nodeTitle,
      //   isDefaultTitle,
      //   willUpdateTitle: isDefaultTitle
      // });

      // Step 3: Update the node with AI-generated content
      // Only update title if it's a default title
      const updatePayload: any = {
        description: newDescription,
        metadata: {
          ...nodeMetadata,
          summary: newSummary,
          last_ai_update: new Date().toISOString(),
          updated_from_conversation: `${conversationUpToMessage.length} messages`, // Track conversation length
          chat_session_id: currentChatSessionId // Track which conversation branch updated this node
        }
      };

      // Only include title if it's a default title
      if (isDefaultTitle && newTitle) {
        updatePayload.title = newTitle;
      }

      const updateResponse = await fetch(`${AI_AGENT_URL}/ai-api/idea-tree/nodes/${nodeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });

      if (!updateResponse.ok) {
        const updateError = await updateResponse.json();
        // console.error('[NodeChatPanel] Node update failed:', updateError);
        throw new Error(updateError.detail || updateError.message || 'Failed to update node');
      }

      // console.log('[NodeChatPanel] Node updated successfully');

      // Notify parent component
      if (onUpdateNodeContent) {
        onUpdateNodeContent(newDescription);
      }

      if (onNodeUpdate) {
        // Pass updated metadata to parent so UI can refresh with new values
        onNodeUpdate({
          ...(isDefaultTitle && newTitle ? { title: newTitle } : {}),
          summary: newSummary,
          description: newDescription
        });
      }

      // Show success modal instead of alert
      setSuccessData({
        ...(isDefaultTitle && newTitle ? { title: newTitle } : {}),
        summary: newSummary,
        description: newDescription
      });
      setShowSuccessModal(true);

      // Automatically create a version after successful node update
      await createVersionAfterUpdate('Updated from AI chat conversation');
    } catch (error) {
      // console.error('[NodeChatPanel] Error updating node content:', error);

      // Better error message extraction
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error);
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      alert(`Failed to update node: ${errorMessage}`);
    } finally {
      setUpdatingNode(false);
    }
  };

  const handleSuggestionSelect = async (suggestion: Suggestion) => {
    const currentChatSessionId = searchParams?.get('chatSessionId') || undefined;

    // Check if action was already executed
    if (suggestion.executed && suggestion.executionResult?.createdItems) {
      const items = suggestion.executionResult.createdItems;
      const itemsList = items.map(i => `- ${i.title} (${i.type})`).join('\n');
      alert(`This action was already executed and created:\n\n${itemsList}\n\nRefresh the page to see the created items.`);
      // console.log(`[NodeChatPanel] Suggestion already executed:`, suggestion.executionResult);
      return;
    }

    switch (suggestion.type) {
      case 'question':
        setInput(suggestion.text);
        await sendMessage(suggestion.text, [], false, currentChatSessionId);
        break;
      case 'action':
        // Open action review modal for confirmation
        setSelectedActionSuggestion(suggestion);
        setShowActionReviewModal(true);
        break;
      case 'create_node':
      case 'create_child_node':
        // console.log('Create child node:', suggestion.data);
        setSelectedActionSuggestion(suggestion);
        setShowActionReviewModal(true);
        break;
      case 'add_resource':
        // console.log('Add resource:', suggestion.data);
        setSelectedActionSuggestion(suggestion);
        setShowActionReviewModal(true);
        break;
      case 'connect_nodes':
        // console.log('Connect nodes:', suggestion.data);
        setSelectedActionSuggestion(suggestion);
        setShowActionReviewModal(true);
        break;
      case 'extract_tasks':
        // console.log('Extract tasks:', suggestion.data);
        setSelectedActionSuggestion(suggestion);
        setShowActionReviewModal(true);
        break;
      default:
        // console.log('Unknown suggestion type:', suggestion.type);
    }
  };

  const handleActionConfirm = async (suggestion: Suggestion, createdItems?: Array<{type: string; id: string; title: string}>) => {
    // Execute the action using the existing executeIntents function
    if (suggestion.id) {
      await executeIntents([suggestion.id]);
    }

    // Mark the suggestion as executed in the messages state
    if (createdItems && createdItems.length > 0) {
      setMessages(prev => prev.map(msg => {
        if (msg.role === 'assistant' && msg.suggestions) {
          return {
            ...msg,
            suggestions: msg.suggestions.map(s =>
              s.id === suggestion.id
                ? {
                    ...s,
                    executed: true,
                    executionResult: {
                      createdItems,
                      timestamp: new Date().toISOString()
                    }
                  }
                : s
            )
          };
        }
        return msg;
      }));

      // console.log(`[NodeChatPanel] Marked suggestion ${suggestion.id} as executed with ${createdItems.length} items`);
    }

    setShowActionReviewModal(false);
    setSelectedActionSuggestion(null);
  };

  // Detect multi-option responses (Option A, Option B, etc.)
  const detectMultiOptions = (messageContent: string): Array<{ title: string; description: string; branchName: string }> | null => {
    // Pattern to detect Option A, Option B, Option C format
    const optionPattern = /(?:^|\n)(?:#+\s*)?Option\s+([A-Z]):\s*(.+?)(?=\n(?:#+\s*)?Option\s+[A-Z]:|$)/gis;
    const matches = [...messageContent.matchAll(optionPattern)];

    if (matches.length >= 2) {
      return matches.map((match) => {
        const letter = match[1];
        const content = match[2].trim();

        // Extract title (first line) and description (rest)
        const lines = content.split('\n').filter(l => l.trim());
        const title = lines[0]?.replace(/[*#_]+/g, '').trim() || `Option ${letter}`;
        const description = lines.slice(1).join('\n').trim() || content;

        return {
          title,
          description: description || content,
          branchName: `option-${letter.toLowerCase()}`
        };
      });
    }

    return null;
  };

  // Create a version automatically after node update
  const createVersionAfterUpdate = async (changeDescription: string) => {
    if (!currentUser?.id) {
      // console.log('[NodeChatPanel] Cannot create version: user not authenticated');
      return null;
    }

    try {
      // console.log('[NodeChatPanel] Creating version after node update...');

      const version = await versionsAPI.createVersion(
        {
          node_id: nodeId,
          branch_name: 'main',
          title: nodeTitle,
          summary: typeof nodeMetadata?.summary === 'string' ? nodeMetadata.summary : '',
          content: nodeDescription,
          change_description: changeDescription,
          changed_fields: ['description', 'summary']
        },
        currentUser.id
      );

      // console.log('[NodeChatPanel] Version created successfully:', version);

      // If this was from a branching point, store the conversation branch
      if (shouldCreateVersionOnNextResponse && branchPointIndex !== null) {
        const branchId = version.id.toString();
        const currentMessages = [...messages];

        // Fetch all sessions to properly calculate version number
        try {
          const sessionsResponse = await fetch(`${AI_AGENT_URL}/ai-api/node-chat/node/${nodeId}/sessions`);

          if (sessionsResponse.ok) {
            const sessionsData = await sessionsResponse.json();
            const allSessions = sessionsData.sessions || [];

            // Determine parent based on branch index
            let parentSessionId: string;
            let parentVersionNumber: string;

            if (branchPointIndex === 0) {
              // Branch at first message → root-level branch
              const rootSession = allSessions.find((s: any) => !s.parent_session_id);
              parentSessionId = rootSession?.id || sessionId;
              parentVersionNumber = rootSession?.version_number || '1';
            } else {
              // Branch at later message → parent = current branch
              parentSessionId = searchParams?.get('chatSessionId') || sessionId;
              const parentSession = allSessions.find((s: any) => s.id === parentSessionId);
              parentVersionNumber = parentSession?.version_number || currentVersionPath;
            }

            // Find all sibling branches (branches with the same parent_session_id)
            const siblingBranches = allSessions
              .filter((s: any) => s.parent_session_id === parentSessionId)
              .map((s: any) => ({
                id: s.id,
                versionNumber: s.version_number,
                parentVersionNumber: s.parent_version_number,
              }));

            const newVersionNumber = calculateNextVersionNumber(parentVersionNumber, siblingBranches, branchPointIndex);

            setConversationBranches(prev => {
              const branchPoint = prev[branchPointIndex] || {
                branches: [],
                activeBranchId: ''
              };

              // Add new branch with current conversation
              const newBranch = {
                id: branchId,
                name: `Version ${newVersionNumber}`,
                versionNumber: newVersionNumber,
                parentVersionNumber: parentVersionNumber,
                messages: currentMessages,
                messageCount: currentMessages.length,
                createdAt: new Date().toISOString()
              };

              return {
                ...prev,
                [branchPointIndex]: {
                  branches: [...branchPoint.branches, newBranch],
                  activeBranchId: branchId
                }
              };
            });

            // console.log('[NodeChatPanel] Stored conversation branch at index', branchPointIndex);
          }
        } catch (error) {
          // console.error('[NodeChatPanel] Error calculating version number:', error);
        }
      }

      return version;
    } catch (error) {
      // console.error('[NodeChatPanel] Error creating version:', error);
      // Don't show error to user - version creation is background operation
      return null;
    }
  };

  // Handle manual version creation - trigger branching edit mode
  const handleCreateVersion = (messageIndex?: number) => {
    if (!currentUser?.id) {
      // console.log('[NodeChatPanel] Cannot create branch: user not authenticated');
      return;
    }

    // Find the last user message if not specified
    const branchIndex = messageIndex !== undefined
      ? messageIndex
      : (() => {
        // Fallback for browsers without findLastIndex support
        for (let i = messages.length - 1; i >= 0; i--) {
          if (messages[i]?.role === 'user') {
            return i;
          }
        }
        return -1;
      })();

    if (branchIndex === -1 || branchIndex === undefined || branchIndex === null) {
      // console.log('[NodeChatPanel] No user message found to branch from');
      return;
    }

    // Start branching edit mode
    startEditMessage(branchIndex, true);
    // console.log('[NodeChatPanel] Branching edit mode started at message index:', branchIndex);
  };

  // Handle switching between conversation branches
  const handleBranchSwitch = async (branchPointIdx: number, branchId: string) => {
    const branchData = conversationBranches[branchPointIdx];
    if (!branchData) return;

    const selectedBranch = branchData.branches.find(b => b.id === branchId);
    if (!selectedBranch) return;

    // console.log('[NodeChatPanel] 🔀 Switching to branch:', {
      // branchId,
      // versionNumber: selectedBranch.versionNumber,
      // branchName: selectedBranch.name,
      // cachedMessageCount: selectedBranch.messageCount
    // });

    try {
      // Load messages from the selected session
      // console.log('[NodeChatPanel] 📥 Fetching messages for branch:', branchId);
      await fetchChatMessages(branchId);

      // Update current version path
      setCurrentVersionPath(selectedBranch.versionNumber);

      // Find the parent session to get sibling branches
      const sessionsResponse = await fetch(`${AI_AGENT_URL}/ai-api/node-chat/node/${nodeId}/sessions`);
      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json();

        // Find current session details to identify siblings
        const currentSession = sessionsData.sessions.find((s: any) => s.id === branchId);

        if (currentSession && currentSession.parent_session_id && currentSession.branch_point_index !== null) {
          // console.log('[NodeChatPanel] Loading sibling branches for display:', {
            // currentBranch: branchId,
            // parent: currentSession.parent_session_id,
            // branchPoint: currentSession.branch_point_index,
            // branchMessageCount: currentSession.message_count
          // });

          // Find the parent session
          const parentSession = sessionsData.sessions.find((s: any) =>
            s.id === currentSession.parent_session_id
          );

          // Find all sibling branches (same parent and branch point)
          const siblingBranches = sessionsData.sessions.filter((s: any) =>
            s.parent_session_id === currentSession.parent_session_id &&
            s.branch_point_index === currentSession.branch_point_index
          );

          // Build the complete branch list: parent + all siblings
          const allBranchOptions = [];

          // Add parent branch first
          if (parentSession) {
            allBranchOptions.push({
              id: parentSession.id,
              name: `Version ${parentSession.version_number || '1'} (Main)`,
              versionNumber: parentSession.version_number || '1',
              parentVersionNumber: null,
              messages: [],
              messageCount: parentSession.message_count || 0,
              createdAt: parentSession.created_at
            });
          }

          // Add all sibling branches (including current one)
          allBranchOptions.push(...siblingBranches.map((s: any) => ({
            id: s.id,
            name: s.branch_display_name || `Version ${s.version_number}`,
            versionNumber: s.version_number,
            parentVersionNumber: s.parent_version_number,
            messages: [],
            messageCount: s.message_count || 0,
            createdAt: s.created_at
          })));

          // IMPORTANT: The branch_point_index tells us where in the parent conversation this branch diverged.
          // When viewing a branch, its messages array includes:
          //   1. Messages copied from parent (indices 0 to branch_point_index - 1)
          //   2. The modified/divergent message (at index branch_point_index)
          //   3. Subsequent messages in this branch (indices branch_point_index + 1 onwards)
          //
          // The branch selector should appear at the branch_point_index in the branch's message array,
          // which corresponds to where the divergence occurred.
          const branchSelectorIndex = currentSession.branch_point_index;

          // Start with the parent branch selector
          const newBranchTree: typeof conversationBranches = {};
          newBranchTree[branchSelectorIndex] = {
            branches: allBranchOptions,
            activeBranchId: branchId
          };

          // ALSO load child branches of this branch (for nested branch navigation)
          const childBranches = sessionsData.sessions.filter((s: any) =>
            s.parent_session_id === branchId
          );

          if (childBranches.length > 0) {
            // console.log('[NodeChatPanel] Found', childBranches.length, 'child branches of current branch');

            // Group child branches by their branch_point_index
            const childBranchGroups: { [index: number]: any[] } = {};
            childBranches.forEach((branch: any) => {
              const idx = branch.branch_point_index;
              if (!childBranchGroups[idx]) {
                childBranchGroups[idx] = [];
              }
              childBranchGroups[idx].push(branch);
            });

            // Add branch selectors for each child branch point
            Object.keys(childBranchGroups).forEach(indexStr => {
              const index = parseInt(indexStr);
              const branchesAtIndex = childBranchGroups[index];

              // Include current branch as first option
              const allChildOptions = [
                {
                  id: branchId,
                  name: `Version ${currentSession.version_number} (Current)`,
                  versionNumber: currentSession.version_number,
                  parentVersionNumber: currentSession.parent_version_number,
                  messages: [],
                  messageCount: currentSession.message_count || 0,
                  createdAt: currentSession.created_at
                },
                ...branchesAtIndex.map((s: any) => ({
                  id: s.id,
                  name: s.branch_display_name || `Version ${s.version_number}`,
                  versionNumber: s.version_number,
                  parentVersionNumber: s.parent_version_number,
                  messages: [],
                  messageCount: s.message_count || 0,
                  createdAt: s.created_at
                }))
              ];

              newBranchTree[index] = {
                branches: allChildOptions,
                activeBranchId: branchId
              };
            });

            // console.log('[NodeChatPanel] Added', Object.keys(childBranchGroups).length, 'child branch selectors');
          }

          setConversationBranches(newBranchTree);
          // console.log('[NodeChatPanel] ✅ Set branch tree with', Object.keys(newBranchTree).length, 'branch selectors:', {
          //   parentBranchPoint: branchSelectorIndex,
          //   totalBranchOptions: allBranchOptions.length,
          //   options: allBranchOptions.map(b => ({ id: b.id, name: b.name })),
          //   childBranchPoints: childBranches.length > 0 ? Object.keys(newBranchTree).filter(k => parseInt(k) !== branchSelectorIndex) : []
          // });
        } else {
          // Main conversation with no parent - check if there are child branches
          const childBranches = sessionsData.sessions.filter((s: any) =>
            s.parent_session_id === branchId
          );

          if (childBranches.length > 0) {
            // Group child branches by branch_point_index
            const branchPointGroups: { [index: number]: any[] } = {};
            childBranches.forEach((branch: any) => {
              const idx = branch.branch_point_index;
              if (!branchPointGroups[idx]) {
                branchPointGroups[idx] = [];
              }
              branchPointGroups[idx].push(branch);
            });

            // Create branch tree with main session + children at each branch point
            const newBranchTree: typeof conversationBranches = {};
            Object.keys(branchPointGroups).forEach(indexStr => {
              const index = parseInt(indexStr);
              const branchesAtIndex = branchPointGroups[index];

              // Include main session as first option
              const allOptions = [
                {
                  id: branchId,
                  name: `Version ${currentSession?.version_number || '1'} (Main)`,
                  versionNumber: currentSession?.version_number || '1',
                  parentVersionNumber: null,
                  messages: [],
                  messageCount: currentSession?.message_count || 0,
                  createdAt: currentSession?.created_at
                },
                ...branchesAtIndex.map((s: any) => ({
                  id: s.id,
                  name: s.branch_display_name || `Version ${s.version_number}`,
                  versionNumber: s.version_number,
                  parentVersionNumber: s.parent_version_number,
                  messages: [],
                  messageCount: s.message_count || 0,
                  createdAt: s.created_at
                }))
              ];

              newBranchTree[index] = {
                branches: allOptions,
                activeBranchId: branchId
              };
            });

            setConversationBranches(newBranchTree);
            // console.log('[NodeChatPanel] ✅ Set branch tree for main conversation with', Object.keys(branchPointGroups).length, 'branch points');
          } else {
            // No branches at all
            setConversationBranches({});
            // console.log('[NodeChatPanel] Main conversation with no branches');
          }
        }
      }

      // Update URL with chatSessionId for shareable links and page refresh preservation
      if (setSearchParams && searchParams) {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('chatSessionId', branchId);
        setSearchParams(newParams, { replace: true });
        // console.log('[NodeChatPanel] 🔗 Updated URL with chatSessionId:', branchId);
      }
    } catch (error) {
      // console.error('[NodeChatPanel] Error switching branch:', error);
      alert('Failed to load branch messages. Please try again.');
    }
  };

  // Detect and create multi-option branches from AI response
  const handleMultiOptionDetection = async (messageContent: string, chatSessionId: string) => {
    if (!currentUser?.id) return;

    const options = detectMultiOptions(messageContent);
    if (!options || options.length < 2) return;

    // console.log('[NodeChatPanel] Detected multi-option response:', options);

    try {
      const result = await versionsAPI.createMultiOptions(
        {
          node_id: nodeId,
          chat_session_id: chatSessionId,
          options: options.map(opt => ({
            branch_name: opt.branchName,
            display_name: opt.title,
            title: opt.title,
            summary: opt.description.substring(0, 200),
            content: opt.description,
            prompt: `AI-generated option: ${opt.title}`
          }))
        },
        currentUser.id
      );

      // console.log('[NodeChatPanel] Created multi-option branches:', result);

      // Show success notification
      alert(`Created ${result.total_created} option branches! View them in the Version History tab.`);

      // Refresh version timeline
      if (onNodeUpdate) {
        onNodeUpdate();
      }
    } catch (error) {
      // console.error('[NodeChatPanel] Error creating multi-option branches:', error);
      // Don't show error - this is optional enhancement
    }
  };

  const renderChatContent = () => (
    <>
      {/* Removed loading banner - now shows user message + streaming AI response immediately */}

      {/* AI Generating Summary Banner */}
      {updatingNode && (
        <div className="mx-4 mt-4 p-3 bg-white border border-slate-200 rounded-lg flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-300 border-t-teal-500 flex-shrink-0"></div>
            <div>
              <p className="text-sm text-slate-700 font-medium">Generating AI summary and title...</p>
              <p className="text-xs text-slate-500 mt-0.5">Node will be updated automatically</p>
            </div>
          </div>
        </div>
      )}

      {/* Conclusion Preview */}
      {conclusion && (
        <div className="mx-4 mt-4 mb-3 p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border-2 border-emerald-300 rounded-xl shadow-md flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-emerald-600" />
              <h4 className="text-sm text-emerald-800 uppercase font-bold tracking-wide">
                Refined Conclusion
              </h4>
            </div>
            <button
              onClick={saveAsVersion}
              className="px-4 py-2 text-xs bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all font-semibold shadow-md hover:shadow-lg flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Save as Version</span>
            </button>
          </div>
          <p className="text-sm text-slate-800 leading-relaxed font-medium">
            {conclusion}
          </p>
        </div>
      )}

      {/* Reasoning Steps Panel */}
      {reasoningMode && reasoningSteps.length > 0 && (
        <div className="mx-4 mb-3 p-4 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border-2 border-purple-300 rounded-lg shadow-sm flex-shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-5 h-5 text-purple-600 animate-pulse" />
            <h3 className="text-sm font-bold text-purple-800 uppercase tracking-wide">AI Reasoning Process</h3>
            <span className="ml-auto text-xs text-purple-600 font-medium">
              {reasoningSteps.length} step{reasoningSteps.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {reasoningSteps.map((step, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-bold">
                  {step.step}
                </div>
                <div className="flex-1 text-sm text-purple-900">
                  {step.content}
                </div>
              </div>
            ))}
          </div>
          {isGenerating && (
            <div className="mt-3 flex items-center gap-2 text-xs text-purple-600">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Thinking...</span>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <ChatMessageList
        messages={messages}
        isGenerating={isGenerating}
        editingMessageIndex={editingMessageIndex}
        editedContent={editedContent}
        isBranchingEdit={isBranchingEdit}
        loading={loading}
        copiedCode={copiedCode}
        generatingSuggestions={generatingSuggestions}
        updatingNode={updatingNode}
        creatingVersion={creatingVersion}
        creatingBranch={creatingBranch}
        branchingPointMarked={false}
        conversationBranches={conversationBranches}
        onStartEdit={startEditMessage}
        onCancelEdit={cancelEditMessage}
        onSaveEdit={saveEditedMessage}
        onEditContentChange={setEditedContent}
        onRegenerate={regenerateLastMessage}
        onUpdateNode={updateNodeWithMessage}
        onCreateVersion={handleCreateVersion}
        onCopyCode={copyCode}
        onSelectSuggestion={handleSuggestionSelect}
        onBranchSwitch={handleBranchSwitch}
      />

      {/* Attachments Preview */}
      <AttachmentPreview
        attachments={attachments}
        onRemove={removeAttachment}
      />

      {/* System Messages */}
      {systemMessages.length > 0 && (
        <div className="mx-4 mb-2 flex-shrink-0 space-y-2">
          {systemMessages.map((message, index) => (
            <div
              key={index}
              className={`
                p-3 rounded-lg border flex items-start gap-2 animate-in fade-in slide-in-from-bottom duration-300
                ${message.startsWith('✅') ? 'bg-green-50 border-green-200 text-green-800' :
                  message.startsWith('⚠️') ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                    message.startsWith('❌') ? 'bg-red-50 border-red-200 text-red-800' :
                      'bg-blue-50 border-blue-200 text-blue-800'}
              `}
            >
              <span className="flex-1 text-sm font-medium">{message}</span>
              <button
                onClick={() => removeSystemMessage(index)}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <ChatInput
        input={input}
        loading={loading}
        uploadingFiles={uploadingFiles}
        showMentionMenu={showMentionMenu}
        selectedCategory={selectedCategory}
        selectedTreeId={selectedTreeId}
        treeSessions={treeSessions}
        suggestedMaterials={suggestedMaterials}
        filteredMaterials={filteredMaterialsByCategory}
        selectedMentionIndex={selectedMentionIndex}
        textareaRef={textareaRef}
        fileInputRef={fileInputRef}
        hasAttachments={attachments.length > 0}
        onInputChange={handleInputChange}
        onMentionKeyDown={handleMentionKeyDownWrapper}
        onKeyPress={handleKeyPress}
        onSend={handleSendMessage}
        onFileUpload={handleFileUpload}
        onSelectCategory={setSelectedCategory}
        onSelectTree={setSelectedTreeId}
        onSelectMaterial={handleMentionSelect}
      />

      {/* Task Review Modal */}
      <TaskReviewModal
        isOpen={showTaskReviewModal}
        onClose={() => {
          setShowTaskReviewModal(false);
          setReviewTasks([]);
        }}
        initialTasks={reviewTasks}
        projectId={projectId}
        nodeId={nodeId}
        userId={String(userId)}
        onTasksCreated={() => {
          // console.log(`[Node ${nodeId}] Tasks created successfully`);
          setShowTaskReviewModal(false);
          setReviewTasks([]);
          if (onNodeUpdate) {
            onNodeUpdate();
          }
        }}
      />

      {/* Action Review Modal */}
      <ActionReviewModal
        isOpen={showActionReviewModal}
        suggestion={selectedActionSuggestion}
        onClose={() => {
          setShowActionReviewModal(false);
          setSelectedActionSuggestion(null);
        }}
        onConfirm={handleActionConfirm}
        isExecuting={executingActions}
        projectId={projectId}
        nodeId={nodeId}
        onTreeRefresh={() => {
          // Trigger a re-fetch of the tree by emitting a custom event
          // console.log('[NodeChatPanel] Triggering tree refresh after node creation');
          window.dispatchEvent(new CustomEvent('idea-tree-refresh'));
        }}
      />

      {/* Node Review Modal - Temporary Alert for Testing */}
      {showNodeReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Review Child Nodes</h3>
              <button
                onClick={() => {
                  setShowNodeReviewModal(false);
                  setReviewNodes([]);
                }}
                className="text-slate-500 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                AI suggested {reviewNodes.length} child node(s):
              </p>
              {reviewNodes.map((node, index) => (
                <div key={index} className="p-3 bg-slate-50 rounded border border-slate-200">
                  <div className="font-semibold text-sm mb-1">{node.title}</div>
                  <div className="text-xs text-slate-600">{node.description}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    Icon: {node.icon} | Tags: {node.tags?.join(', ') || 'None'}
                  </div>
                </div>
              ))}
              <p className="text-sm text-amber-600 mt-4">
                Note: Node review modal is not fully implemented yet. This is a temporary placeholder.
              </p>
            </div>
            <div className="mt-6 flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowNodeReviewModal(false);
                  setReviewNodes([]);
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal for Node Update */}
      {showSuccessModal && successData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 shadow-2xl">
            <div className="flex items-start gap-4 mb-6">
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-800 mb-1">Node Updated Successfully!</h3>
                <p className="text-sm text-slate-600">
                  AI has generated an updated {successData.title ? 'title, ' : ''}summary and description for this node.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setSuccessData(null);
                }}
                className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Title Section - only show if title was updated */}
              {successData.title && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-blue-700" />
                    <h4 className="text-sm font-bold text-blue-800 uppercase tracking-wide">Title</h4>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">{successData.title}</p>
                </div>
              )}

              {/* Summary Section */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-4 border border-emerald-200">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-emerald-700" />
                  <h4 className="text-sm font-bold text-emerald-800 uppercase tracking-wide">Summary</h4>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{successData.summary}</p>
              </div>

              {/* Description Preview */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-slate-700" />
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Description Updated</h4>
                </div>
                <p className="text-xs text-slate-600 italic">
                  The full description has been updated with AI-generated content. View it in the node details panel.
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setSuccessData(null);
                }}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all font-semibold shadow-md hover:shadow-lg"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // Sidebar mode
  if (!isFullscreen) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {renderChatContent()}
      </div>
    );
  }

  // Fullscreen mode
  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Fullscreen Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b-2 border-slate-200 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">AI Chat: {nodeTitle}</h2>
            <p className="text-xs text-slate-500">Refining node content with AI assistance</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Reasoning Mode Toggle */}
          <button
            onClick={toggleReasoningMode}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 font-medium shadow-sm ${
              reasoningMode
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            title={reasoningMode ? 'Hide AI reasoning steps' : 'Show AI reasoning steps'}
          >
            <Brain className={`w-5 h-5 ${reasoningMode ? 'animate-pulse' : ''}`} />
            <span>{reasoningMode ? 'Deep Mode' : 'Quick Mode'}</span>
          </button>
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all flex items-center gap-2 text-slate-700 font-medium shadow-sm"
              title="Exit fullscreen (ESC)"
            >
              <X className="w-5 h-5" />
              <span>Exit Fullscreen</span>
            </button>
          )}
        </div>
      </div>

      {/* Fullscreen Content */}
      <div className="flex-1 overflow-hidden flex flex-col px-6 py-4">
        {renderChatContent()}
      </div>
    </div>
  );
};

export default NodeChatPanel;
