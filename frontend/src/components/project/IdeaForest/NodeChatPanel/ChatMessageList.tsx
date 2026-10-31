import React, { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../store/store';
import { MessageSquare, Save, Edit2, RotateCw, FileText, Paperclip, X, Lightbulb, Brain, Sparkles, GitBranch } from 'lucide-react';
import { Message, Suggestion } from '../../../../types/chat';
import { getMarkdownComponents } from '../../../../utils/chat/markdownComponents';
import MessageSuggestions from '../MessageSuggestions';
import BranchSelector from './BranchSelector';

interface ChatMessageListProps {
  messages: Message[];
  isGenerating: boolean;
  editingMessageIndex: number | null;
  editedContent: string;
  isBranchingEdit?: boolean;
  loading: boolean;
  copiedCode: string | null;
  generatingSuggestions: { [messageIndex: number]: boolean };
  updatingNode: boolean;
  creatingVersion: boolean;
  creatingBranch: boolean;
  branchingPointMarked: boolean;
  conversationBranches: {
    [branchPointIndex: number]: {
      branches: Array<{
        id: string;
        name: string;
        messages: Message[];
        messageCount: number;
        createdAt: string;
      }>;
      activeBranchId: string;
    };
  };
  onStartEdit: (index: number) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onEditContentChange: (content: string) => void;
  onRegenerate: () => void;
  onUpdateNode: (content: string, messageIndex: number) => void;
  onCreateVersion: (messageIndex?: number) => void;
  onCopyCode: (code: string) => void;
  onSelectSuggestion: (suggestion: Suggestion) => void;
  onBranchSwitch: (branchPointIndex: number, branchId: string) => void;
}

/**
 * Component for rendering the list of chat messages
 */
const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  isGenerating,
  editingMessageIndex,
  editedContent,
  isBranchingEdit = false,
  loading,
  copiedCode,
  generatingSuggestions,
  updatingNode,
  creatingVersion,
  creatingBranch,
  branchingPointMarked,
  conversationBranches,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditContentChange,
  onRegenerate,
  onUpdateNode,
  onCreateVersion,
  onCopyCode,
  onSelectSuggestion,
  onBranchSwitch
}) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(messages.length);

  useEffect(() => {
    // Only auto-scroll if:
    // 1. A new message was added (not just content update during streaming)
    // 2. User is already near the bottom (within 100px)

    const isNewMessage = messages.length > prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = messages.length;

    if (isNewMessage) {
      // New message added - scroll to bottom
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (scrollContainerRef.current) {
      // Content update during streaming - only scroll if user is near bottom
      const container = scrollContainerRef.current;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;

      if (isNearBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages]);

  const markdownComponents = getMarkdownComponents({ copiedCode, onCopyCode });

  // Preprocess message content - normalize backticks for markdown parsing
  const preprocessMarkdown = (content: string): string => {
    if (!content) return '';

    const processed = content
      // First pass: decode HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&#96;/g, '`')
      .replace(/&grave;/g, '`')
      .replace(/&#x60;/gi, '`')
      // Handle escaped backticks - keep them for markdown parsing
      .replace(/\\`/g, '`')
      // Replace various Unicode backtick-like characters with standard backtick
      // eslint-disable-next-line no-misleading-character-class
      .replace(/[\u02CB\u02C8\u0300\u00B4]/g, '`')
      // Replace curly quotes with straight quotes
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"');

    return processed;
  };

  if (messages.length === 0) {
    return (
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto space-y-4 px-4 pb-3">
        <div className="text-center py-12 px-4">
          <div className="w-16 h-16 bg-gradient-to-br from-teal-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-teal-600" />
          </div>
          <p className="text-sm text-slate-600 font-medium mb-2">
            Start a conversation to refine this node's content
          </p>
          <div className="text-xs text-slate-500 space-y-1">
            <div className="flex items-center justify-center gap-2">
              <Lightbulb className="w-3 h-3" />
              <span>"Help me break this down into steps"</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Brain className="w-3 h-3" />
              <span>"What should I consider?"</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="w-3 h-3" />
              <span>"Generate ideas for this"</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto space-y-4 px-4 pb-3">
      {messages.map((msg, index) => {
        // Check if this is a streaming message (empty assistant message with isStreaming flag)
        const isStreamingMessage = msg.role === 'assistant' && (msg as any).isStreaming;

        // Check if this message has conversation branches
        const branchData = conversationBranches[index];
        const hasBranches = branchData && branchData.branches.length > 0;

        // MULTI-USER: Check if this message is from the current user or another user
        const isCurrentUser = msg.role === 'user' && (!msg.user_id || msg.user_id === user?.id);
        const isOtherUser = msg.role === 'user' && msg.user_id && msg.user_id !== user?.id;

        return (
          <React.Fragment key={index}>
            <div
              className={`flex gap-3 ${
                msg.role === 'user' && isCurrentUser
                  ? 'justify-end' // Current user messages: right-aligned
                  : 'justify-start' // Other users & AI: left-aligned
              }`}
            >
            {/* Avatar for AI or other users */}
            {msg.role === 'assistant' && (
              <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center text-sm font-bold shadow-lg">
                AI
              </div>
            )}
            {/* MULTI-USER: Avatar for other users' messages */}
            {isOtherUser && (
              <div className="flex-shrink-0 w-9 h-9 rounded-full overflow-hidden border-2 border-blue-200 shadow-md">
                {msg.avatar_url ? (
                  <img
                    src={msg.avatar_url}
                    alt={msg.username || `User ${msg.user_id}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 text-white flex items-center justify-center text-sm font-bold">
                    {msg.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-md ${
                isCurrentUser
                  ? 'bg-gradient-to-r from-blue-100 to-cyan-50 text-slate-800 border border-blue-200'
                  : isOtherUser
                  ? 'bg-gradient-to-r from-purple-50 to-pink-50 text-slate-800 border border-purple-200'
                  : 'bg-white text-slate-800 border border-slate-200'
              }`}
            >
              {/* Attachments */}
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="mb-2 space-y-2">
                  {msg.attachments.map((attachment, attIndex) => (
                    <div key={attIndex}>
                      {attachment.type === 'image' ? (
                        <img
                          src={attachment.url}
                          alt={attachment.name}
                          className="max-w-full rounded border border-slate-300 dark:border-slate-600"
                        />
                      ) : (
                        <div className="flex items-center gap-2 text-xs bg-slate-200 dark:bg-slate-600 px-2 py-1 rounded">
                          <Paperclip className="w-3 h-3" />
                          <span>{attachment.name}</span>
                          {attachment.size && <span>({(attachment.size / 1024).toFixed(1)} KB)</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* MULTI-USER: Show username for other users' messages */}
              {isOtherUser && (
                <div className="text-xs font-semibold text-blue-600 mb-1 flex items-center gap-1">
                  <span>{msg.username || `User ${msg.user_id}`}</span>
                </div>
              )}

              {/* Message content */}
              <div className="text-sm prose prose-sm max-w-none dark:prose-invert">
                {msg.role === 'user' ? (
                  editingMessageIndex === index ? (
                    <textarea
                      value={editedContent}
                      onChange={(e) => onEditContentChange(e.target.value)}
                      className="w-full px-2 py-1 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-indigo-300 dark:border-indigo-500 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                      rows={3}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          onSaveEdit();
                        } else if (e.key === 'Escape') {
                          onCancelEdit();
                        }
                      }}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  )
                ) : isStreamingMessage && !msg.content ? (
                  // Show loading indicator for streaming messages with no content yet
                  <div className="flex items-center gap-2 text-teal-600">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-sm">AI is thinking...</span>
                  </div>
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[[rehypeKatex, { strict: false, trust: true }]]}
                    components={markdownComponents}
                    skipHtml={false}
                  >
                    {preprocessMarkdown(msg.content || '')}
                  </ReactMarkdown>
                )}
              </div>

              {/* Timestamp and action buttons */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/50">
                <div
                  className={`text-xs font-medium ${
                    msg.role === 'user'
                      ? 'text-slate-500'
                      : 'text-slate-500'
                  }`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1.5">
                  {/* Edit/Save/Cancel buttons for user messages */}
                  {msg.role === 'user' && editingMessageIndex === index && (
                    <>
                      <button
                        onClick={onSaveEdit}
                        disabled={!editedContent.trim()}
                        className={`text-xs px-3 py-1.5 border rounded-lg hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm font-medium flex items-center gap-1 ${
                          isBranchingEdit
                            ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 hover:border-purple-300'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300'
                        }`}
                        title={isBranchingEdit ? "Create a new conversation branch with this edited message (Press Enter)" : "Save your edited message and get a new AI response (Press Enter)"}
                      >
                        {isBranchingEdit ? (
                          <>
                            <GitBranch className="w-3.5 h-3.5" />
                            <span>Create Branch</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" />
                            <span>Save</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={onCancelEdit}
                        className="text-xs px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 transition-all shadow-sm hover:shadow-md font-medium flex items-center gap-1"
                        title="Cancel editing and keep the original message (Press Esc)"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </button>
                    </>
                  )}
                  {msg.role === 'user' && editingMessageIndex !== index && (
                    <>
                      <button
                        onClick={() => onStartEdit(index)}
                        disabled={loading || editingMessageIndex !== null}
                        className="p-1.5 bg-slate-100 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-200 hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                        title="Edit this message and resend to get a new AI response"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {/* Create Version button for user messages - mark branching point */}
                      <button
                        onClick={() => onCreateVersion(index)}
                        disabled={loading || editingMessageIndex !== null || creatingVersion || creatingBranch}
                        className={`text-xs px-3 py-1.5 border rounded-lg hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm font-medium flex items-center gap-1 ${
                          branchingPointMarked
                            ? 'bg-amber-100 text-amber-800 border-amber-400 hover:bg-amber-200 hover:border-amber-500 animate-pulse'
                            : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300'
                        }`}
                        title={
                          branchingPointMarked
                            ? "Branching point marked - your next message will create a new conversation branch"
                            : "Create a conversation branch - explore different directions while preserving the current conversation"
                        }
                      >
                        {creatingBranch ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-purple-700 border-t-transparent rounded-full animate-spin" />
                            <span>Creating branch...</span>
                          </>
                        ) : creatingVersion ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : branchingPointMarked ? (
                          <>
                            <GitBranch className="w-3.5 h-3.5" />
                            <span>Marked</span>
                          </>
                        ) : (
                          <>
                            <GitBranch className="w-3.5 h-3.5" />
                            <span>Branch</span>
                          </>
                        )}
                      </button>
                      {/* Regenerate button - show only on the last user message */}
                      {index === messages.length - 2 && messages[index + 1]?.role === 'assistant' && (
                        <button
                          onClick={onRegenerate}
                          disabled={loading || editingMessageIndex !== null}
                          className="p-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 hover:border-amber-300 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Regenerate AI response - get a different answer to the same question"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  )}

                  {/* Update button for assistant messages */}
                  {msg.role === 'assistant' && msg.content && (
                    <button
                      onClick={() => onUpdateNode(msg.content, index)}
                      disabled={loading || editingMessageIndex !== null || updatingNode}
                      className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 hover:border-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md font-medium flex items-center gap-1"
                      title={updatingNode ? "Generating AI summary and description..." : "Update node content with this message"}
                    >
                      {updatingNode ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
                          <span>Updating...</span>
                        </>
                      ) : (
                        <>
                          <FileText className="w-3.5 h-3.5" />
                          <span>Update</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Message Suggestions - only for assistant messages */}
              {msg.role === 'assistant' && msg.content && (
                <MessageSuggestions
                  suggestions={msg.suggestions || []}
                  onSelectSuggestion={onSelectSuggestion}
                  loading={generatingSuggestions[index] || false}
                  messageId={`${msg.timestamp || index}`}
                />
              )}
            </div>
            {msg.role === 'user' && (
              user?.avatar ? (
                <img
                  src={typeof user.avatar === 'string' ? user.avatar : URL.createObjectURL(user.avatar)}
                  alt={user.username || 'User'}
                  className="flex-shrink-0 w-9 h-9 rounded-xl object-cover shadow-lg border-2 border-white"
                />
              ) : (
                <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 text-white flex items-center justify-center text-sm font-bold shadow-lg">
                  {user?.username?.[0]?.toUpperCase() || 'U'}
                </div>
              )
            )}
          </div>

          {/* Render branch selector if this message has branches */}
          {hasBranches && (
            <BranchSelector
              branches={branchData.branches.map(b => ({
                id: b.id,
                name: b.name,
                createdAt: b.createdAt,
                // Count only user messages (each user question = 1 message)
                messageCount: b.messages.length > 0
                  ? b.messages.filter(m => m.role === 'user').length
                  : Math.ceil((b.messageCount || 0) / 2) // Fallback: estimate user messages as half of total
              }))}
              activeBranchId={branchData.activeBranchId}
              onBranchSwitch={(branchId) => onBranchSwitch(index, branchId)}
              disabled={loading}
            />
          )}
        </React.Fragment>
        );
      })}

      {/* Generating suggestions indicator - show when loading and last message is from user */}
      {loading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
        <div className="flex gap-3 justify-start px-4">
          <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center text-sm font-bold shadow-lg">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="max-w-[85%] rounded-2xl px-4 py-3 shadow-md bg-gradient-to-r from-amber-50 to-orange-50 text-slate-800 border border-amber-200">
            <div className="flex items-center gap-2 text-sm text-amber-700">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span className="font-medium">Generating suggestions...</span>
            </div>
          </div>
        </div>
      )}

      {/* Streaming indicator - only show if last message is NOT already a streaming placeholder */}
      {isGenerating && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && !(messages[messages.length - 1] as any).isStreaming && (
        <div className="flex gap-3 justify-start px-4">
          <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center text-sm font-bold shadow-lg">
            AI
          </div>
          <div className="max-w-[85%] rounded-2xl px-4 py-3 shadow-md bg-white text-slate-800 border border-slate-200">
            <div className="flex items-center gap-2 text-sm text-teal-600">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span className="font-medium">Generating response...</span>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatMessageList;
