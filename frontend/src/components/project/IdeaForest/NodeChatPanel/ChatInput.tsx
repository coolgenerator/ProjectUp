import React, { RefObject } from 'react';
import { Paperclip, Send, HelpCircle, Sparkles } from 'lucide-react';
import MentionMenu from './MentionMenu';
import { MentionableMaterial, IdeaTree } from '../../../../types/chat';

interface ChatInputProps {
  input: string;
  loading: boolean;
  uploadingFiles: boolean;
  showMentionMenu: boolean;
  selectedCategory: 'nodes' | 'papers' | 'resources' | null;
  selectedTreeId: string | null;
  treeSessions: IdeaTree[];
  suggestedMaterials: MentionableMaterial[];
  filteredMaterials: MentionableMaterial[];
  selectedMentionIndex: number;
  textareaRef: RefObject<HTMLTextAreaElement>;
  fileInputRef: RefObject<HTMLInputElement>;
  hasAttachments: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onMentionKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onSend: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectCategory: (category: 'nodes' | 'papers' | 'resources') => void;
  onSelectTree: (treeId: string) => void;
  onSelectMaterial: (material: MentionableMaterial) => void;
}

/**
 * Chat input component with file upload, @ mentions, and send button
 */
const ChatInput: React.FC<ChatInputProps> = ({
  input,
  loading,
  uploadingFiles,
  showMentionMenu,
  selectedCategory,
  selectedTreeId,
  treeSessions,
  suggestedMaterials,
  filteredMaterials,
  selectedMentionIndex,
  textareaRef,
  fileInputRef,
  hasAttachments,
  onInputChange,
  onMentionKeyDown,
  onKeyPress,
  onSend,
  onFileUpload,
  onSelectCategory,
  onSelectTree,
  onSelectMaterial
}) => {
  return (
    <div className="flex-shrink-0 border-t-2 border-slate-200 bg-white pt-3 pb-3 px-4">
      <div className="flex gap-2 items-center">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf,.doc,.docx,.txt"
          onChange={onFileUpload}
          className="hidden"
        />

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          disabled={loading || uploadingFiles}
          className="flex-shrink-0 p-2.5 bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 rounded-lg hover:from-slate-200 hover:to-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
          title="Upload files or images"
        >
          {uploadingFiles ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-600 border-t-transparent" />
          ) : (
            <Paperclip className="w-4 h-4" />
          )}
        </button>

        <div className="flex-1 relative">
          {/* @ Mention Dropdown */}
          <MentionMenu
            show={showMentionMenu}
            selectedCategory={selectedCategory}
            selectedTreeId={selectedTreeId}
            treeSessions={treeSessions}
            suggestedMaterials={suggestedMaterials}
            filteredMaterials={filteredMaterials}
            selectedIndex={selectedMentionIndex}
            onSelectCategory={onSelectCategory}
            onSelectTree={onSelectTree}
            onSelectMaterial={onSelectMaterial}
          />

          <textarea
            ref={textareaRef}
            value={input}
            onChange={onInputChange}
            onKeyDown={onMentionKeyDown}
            onKeyPress={onKeyPress}
            placeholder="Ask AI for help... (Type @ to reference materials)"
            disabled={loading}
            className="w-full px-3 py-2.5 pr-10 bg-white border-2 border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200/50 resize-none shadow-sm"
            rows={2}
          />

          {/* Help icon with tooltip */}
          <div className="absolute right-2 top-2 group">
            <HelpCircle className="w-5 h-5 text-slate-400 hover:text-teal-600 cursor-help transition-colors" />
            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Paperclip className="w-3 h-3 flex-shrink-0 mt-0.5" />
                  <span>Upload images or documents for context</span>
                </div>
                <div className="flex items-start gap-2">
                  <Sparkles className="w-3 h-3 flex-shrink-0 mt-0.5" />
                  <span>Use keywords like "finalize", "conclude", or "summarize" to generate a refined conclusion</span>
                </div>
              </div>
              {/* Arrow */}
              <div className="absolute top-full right-4 -mt-1 w-2 h-2 bg-slate-800 transform rotate-45"></div>
            </div>
          </div>
        </div>

        <button
          onClick={onSend}
          disabled={loading || (!input.trim() && !hasAttachments)}
          className="flex-shrink-0 px-4 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg hover:from-teal-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-md hover:shadow-lg text-sm flex items-center gap-2"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Send</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ChatInput;
