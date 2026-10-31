import { useState, useEffect, useMemo, RefObject } from 'react';
import { MentionableMaterial, IdeaTree } from '../../types/chat';
import { filterMaterialsByCategory, formatMentionText } from '../../utils/chat/mentionUtils';
import config from '../../config';

const { AI_AGENT_URL } = config;

interface UseMentionsProps {
  allMaterials: MentionableMaterial[];
  nodeId: string;
  nodeTitle: string;
  nodeDescription: string;
  projectId: string;
  messages: any[];
  textareaRef: RefObject<HTMLTextAreaElement>;
}

interface UseMentionsReturn {
  showMentionMenu: boolean;
  mentionSearch: string;
  selectedMentionIndex: number;
  selectedCategory: 'nodes' | 'papers' | 'resources' | null;
  selectedTreeId: string | null;
  treeSessions: IdeaTree[];
  suggestedMaterials: MentionableMaterial[];
  filteredMaterialsByCategory: MentionableMaterial[];
  setShowMentionMenu: (show: boolean) => void;
  setSelectedCategory: (category: 'nodes' | 'papers' | 'resources' | null) => void;
  setSelectedTreeId: (id: string | null) => void;
  setSelectedMentionIndex: (index: number) => void;
  handleInputChange: (value: string, cursorPos: number) => void;
  insertMention: (material: MentionableMaterial, input: string, mentionCursorPosition: number) => string;
  handleMentionKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>, input: string, onInsert: (newInput: string) => void) => void;
}

/**
 * Custom hook for handling @ mentions in chat
 */
export const useMentions = ({
  allMaterials,
  nodeId,
  nodeTitle,
  nodeDescription,
  projectId,
  messages,
  textareaRef
}: UseMentionsProps): UseMentionsReturn => {
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionCursorPosition, setMentionCursorPosition] = useState(0);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<'nodes' | 'papers' | 'resources' | null>(null);
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const [ideaTrees, setIdeaTrees] = useState<IdeaTree[]>([]);
  const [suggestedMaterials, setSuggestedMaterials] = useState<MentionableMaterial[]>([]);

  // Fetch tree sessions for category selection
  useEffect(() => {
    const fetchIdeaTrees = async () => {
      try {
        const response = await fetch(`${AI_AGENT_URL}/ai-api/projects/${projectId}/tree-sessions/summary`);
        if (response.ok) {
          const data = await response.json();
          setIdeaTrees(data.sessions || []);
        }
      } catch (error) {
        console.error('Error fetching tree sessions:', error);
      }
    };
    fetchIdeaTrees();
  }, [projectId]);

  // Fetch semantic suggestions based on current context
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!showMentionMenu) return;

      try {
        // Extract recent messages for context
        const recentMessages = messages
          .slice(-5)
          .filter(m => m.role === 'user')
          .map(m => m.content);

        // Call the AI suggestions endpoint
        const response = await fetch(`${AI_AGENT_URL}/ai-api/mentions/suggestions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            node_id: nodeId,
            node_title: nodeTitle,
            node_description: nodeDescription,
            recent_messages: recentMessages,
            project_id: projectId,
            limit: 5
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.suggestions) {
            setSuggestedMaterials(data.suggestions);
          } else {
            // Fallback to recent materials if API fails
            const recentMaterials = allMaterials.slice(0, 5);
            setSuggestedMaterials(recentMaterials);
          }
        } else {
          // Fallback to recent materials on error
          const recentMaterials = allMaterials.slice(0, 5);
          setSuggestedMaterials(recentMaterials);
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        // Fallback to recent materials on exception
        const recentMaterials = allMaterials.slice(0, 5);
        setSuggestedMaterials(recentMaterials);
      }
    };

    fetchSuggestions();
  }, [showMentionMenu, nodeTitle, nodeDescription, messages, nodeId, projectId, allMaterials]);

  // Filter materials by category and tree
  const filteredMaterialsByCategory = useMemo(() => {
    return filterMaterialsByCategory(
      allMaterials,
      selectedCategory,
      mentionSearch,
      nodeId,
      selectedTreeId
    );
  }, [allMaterials, selectedCategory, selectedTreeId, mentionSearch, nodeId]);

  // Handle @ mention detection
  const handleInputChange = (value: string, cursorPos: number) => {
    // Detect @ mention
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Check if there's a space after @ (which would close the mention)
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setShowMentionMenu(true);
        setMentionSearch(textAfterAt);
        setMentionCursorPosition(lastAtIndex);
        setSelectedMentionIndex(0);
        // Reset category and tree selection when opening menu
        if (!showMentionMenu) {
          setSelectedCategory(null);
          setSelectedTreeId(null);
        }
      } else {
        setShowMentionMenu(false);
        setSelectedCategory(null);
        setSelectedTreeId(null);
      }
    } else {
      setShowMentionMenu(false);
      setSelectedCategory(null);
      setSelectedTreeId(null);
    }
  };

  // Insert selected material mention
  const insertMention = (material: MentionableMaterial, input: string, cursorPosition: number): string => {
    const beforeMention = input.slice(0, cursorPosition);
    const afterMention = input.slice(cursorPosition + mentionSearch.length + 1);

    const mentionText = formatMentionText(material);

    const newInput = beforeMention + mentionText + ' ' + afterMention;

    setShowMentionMenu(false);
    setMentionSearch('');

    // Focus back on textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = (beforeMention + mentionText + ' ').length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);

    return newInput;
  };

  // Handle keyboard navigation in mention menu
  const handleMentionKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    input: string,
    onInsert: (newInput: string) => void
  ) => {
    if (!showMentionMenu) return;

    const currentList = selectedCategory ? filteredMaterialsByCategory : suggestedMaterials;

    if (currentList.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedMentionIndex(prev =>
        prev < currentList.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedMentionIndex(prev =>
        prev > 0 ? prev - 1 : currentList.length - 1
      );
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (selectedCategory && currentList.length > 0) {
        const newInput = insertMention(currentList[selectedMentionIndex], input, mentionCursorPosition);
        onInsert(newInput);
      }
    } else if (e.key === 'Escape') {
      setShowMentionMenu(false);
      setSelectedCategory(null);
      setSelectedTreeId(null);
    }
  };

  return {
    showMentionMenu,
    mentionSearch,
    selectedMentionIndex,
    selectedCategory,
    selectedTreeId,
    treeSessions: ideaTrees,
    suggestedMaterials,
    filteredMaterialsByCategory,
    setShowMentionMenu,
    setSelectedCategory,
    setSelectedTreeId,
    setSelectedMentionIndex,
    handleInputChange,
    insertMention,
    handleMentionKeyDown
  };
};
