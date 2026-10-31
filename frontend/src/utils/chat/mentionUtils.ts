import { MentionableMaterial } from '../../types/chat';

/**
 * Get icon emoji for a material type
 */
export const getMaterialIcon = (material: MentionableMaterial): string => {
  if (material.type === 'node') {
    switch (material.subType) {
      case 'idea': return '💡';
      case 'action': return '⚡';
      case 'learn': return '📚';
      case 'milestone': return '🎯';
      default: return '📌';
    }
  } else if (material.type === 'paper') {
    return '📄';
  } else if (material.type === 'resource') {
    return material.subType === 'link' ? '🔗' : '📎';
  }
  return '📌';
};

/**
 * Get label for a material type
 */
export const getMaterialTypeLabel = (material: MentionableMaterial): string => {
  if (material.type === 'node') {
    return material.subType ? material.subType.charAt(0).toUpperCase() + material.subType.slice(1) : 'Node';
  }
  return material.type.charAt(0).toUpperCase() + material.type.slice(1);
};

/**
 * Format a mention text for insertion
 * Format: @[Title](type:id) - e.g., @[My Paper](paper:123)
 */
export const formatMentionText = (material: MentionableMaterial): string => {
  return `@[${material.title}](${material.type}:${material.id})`;
};

/**
 * Filter materials by category and search query
 */
export const filterMaterialsByCategory = (
  materials: MentionableMaterial[],
  category: 'nodes' | 'papers' | 'resources' | null,
  searchQuery: string,
  currentNodeId: string,
  selectedTreeId: string | null = null
): MentionableMaterial[] => {
  if (!category) return [];

  let filtered = materials.filter(material => material.id !== currentNodeId);

  // Filter by category
  if (category === 'nodes') {
    filtered = filtered.filter(m => m.type === 'node');
    // Further filter by selected tree if applicable
    if (selectedTreeId) {
      filtered = filtered.filter(m => m.metadata?.sessionId === selectedTreeId);
    }
  } else if (category === 'papers') {
    // Only show papers with PDFs
    filtered = filtered.filter(m => m.type === 'paper' && m.metadata?.file_url);
  } else if (category === 'resources') {
    filtered = filtered.filter(m => m.type === 'resource');
  }

  // Apply search filter if user is typing
  if (searchQuery) {
    filtered = filtered.filter(material =>
      material.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (material.description && material.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (material.metadata?.authors && material.metadata.authors.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }

  return filtered.slice(0, 10);
};
