/**
 * Utility functions for preventing node overlaps in the Idea Forest canvas
 */

import { IdeaNode } from '../../../types/project/ideaForest';

export const NODE_WIDTH = 280;
export const NODE_HEIGHT = 120;
export const MIN_SPACING = 50; // Minimum gap between nodes

export interface Position {
  x: number;
  y: number;
}

/**
 * Get all visible nodes (excluding children of collapsed parents)
 */
export function getVisibleNodes(allNodes: IdeaNode[]): IdeaNode[] {
  const collapsedParents = new Set<string>();

  // Find all collapsed parent nodes
  allNodes.forEach(node => {
    if (!node.expanded && hasChildren(node.id, allNodes)) {
      collapsedParents.add(node.id);
    }
  });

  // Filter to only visible nodes
  const isNodeVisible = (node: IdeaNode): boolean => {
    if (!node.parent_id) return true; // Root nodes are always visible

    // Check if any ancestor is collapsed
    let currentParentId: string | null = node.parent_id;
    while (currentParentId) {
      if (collapsedParents.has(currentParentId)) {
        return false;
      }
      const parent = allNodes.find(n => n.id === currentParentId);
      currentParentId = parent?.parent_id || null;
    }

    return true;
  };

  return allNodes.filter(isNodeVisible);
}

/**
 * Check if a node has children
 */
function hasChildren(nodeId: string, allNodes: IdeaNode[]): boolean {
  return allNodes.some(n => n.parent_id === nodeId);
}

/**
 * Check if two rectangles overlap
 */
export function doRectsOverlap(
  rect1: { x: number; y: number; width: number; height: number },
  rect2: { x: number; y: number; width: number; height: number },
  spacing: number = MIN_SPACING
): boolean {
  // Add spacing to dimensions for buffer
  const r1 = {
    left: rect1.x - spacing / 2,
    right: rect1.x + rect1.width + spacing / 2,
    top: rect1.y - spacing / 2,
    bottom: rect1.y + rect1.height + spacing / 2,
  };

  const r2 = {
    left: rect2.x - spacing / 2,
    right: rect2.x + rect2.width + spacing / 2,
    top: rect2.y - spacing / 2,
    bottom: rect2.y + rect2.height + spacing / 2,
  };

  return !(
    r1.right < r2.left ||
    r1.left > r2.right ||
    r1.bottom < r2.top ||
    r1.top > r2.bottom
  );
}

/**
 * Check if a position would cause overlap with any visible nodes
 */
export function wouldOverlap(
  position: Position,
  allNodes: IdeaNode[],
  excludeNodeId?: string
): boolean {
  const visibleNodes = getVisibleNodes(allNodes);

  const testRect = {
    x: position.x,
    y: position.y,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
  };

  return visibleNodes.some(node => {
    // Skip the node being moved/created
    if (excludeNodeId && node.id === excludeNodeId) {
      return false;
    }

    // Skip nodes without position
    if (!node.position) {
      return false;
    }

    const nodeRect = {
      x: node.position.x,
      y: node.position.y,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    };

    return doRectsOverlap(testRect, nodeRect);
  });
}

/**
 * Find the nearest non-overlapping position
 * Tries multiple candidate positions in a spiral pattern around the original position
 */
export function findNonOverlappingPosition(
  desiredPosition: Position,
  allNodes: IdeaNode[],
  excludeNodeId?: string,
  maxAttempts: number = 100
): Position {
  // If desired position doesn't overlap, use it
  if (!wouldOverlap(desiredPosition, allNodes, excludeNodeId)) {
    return desiredPosition;
  }

  // Generate candidate positions in a spiral pattern
  const candidates: Position[] = [];
  const step = MIN_SPACING + 20; // Distance between candidate positions

  for (let radius = 1; radius <= Math.ceil(Math.sqrt(maxAttempts)); radius++) {
    // Try positions in a square around the original point
    for (let angle = 0; angle < 360; angle += 45) {
      const rad = (angle * Math.PI) / 180;
      candidates.push({
        x: desiredPosition.x + Math.cos(rad) * radius * step,
        y: desiredPosition.y + Math.sin(rad) * radius * step,
      });

      if (candidates.length >= maxAttempts) break;
    }
    if (candidates.length >= maxAttempts) break;
  }

  // Find first non-overlapping candidate
  for (const candidate of candidates) {
    if (!wouldOverlap(candidate, allNodes, excludeNodeId)) {
      console.log('[Overlap Prevention] Found non-overlapping position:', {
        original: desiredPosition,
        adjusted: candidate,
        distance: Math.sqrt(
          Math.pow(candidate.x - desiredPosition.x, 2) +
          Math.pow(candidate.y - desiredPosition.y, 2)
        ).toFixed(0) + 'px'
      });
      return candidate;
    }
  }

  // If no non-overlapping position found, return original with warning
  console.warn('[Overlap Prevention] Could not find non-overlapping position after', maxAttempts, 'attempts');
  return desiredPosition;
}

/**
 * Find non-overlapping position for a new child node below its parent
 */
export function findChildNodePosition(
  parentNode: IdeaNode,
  allNodes: IdeaNode[],
  suggestedPosition?: Position
): Position {
  // If suggested position provided and doesn't overlap, use it
  if (suggestedPosition && !wouldOverlap(suggestedPosition, allNodes)) {
    return suggestedPosition;
  }

  // Calculate base position below parent
  const parentPos = parentNode.position || { x: 200, y: 200 };
  const baseY = parentPos.y + NODE_HEIGHT + MIN_SPACING + 80; // Extra space for edge

  // Get visible siblings (other children of same parent)
  const visibleNodes = getVisibleNodes(allNodes);
  const siblings = visibleNodes.filter(n => n.parent_id === parentNode.id);

  // Generate candidate positions spread horizontally below parent
  const candidates: Position[] = [];
  const siblingCount = siblings.length;
  const totalWidth = (siblingCount + 1) * (NODE_WIDTH + MIN_SPACING);
  const startX = parentPos.x - totalWidth / 2;

  // Try positions to the right of siblings
  for (let i = 0; i <= siblingCount + 2; i++) {
    candidates.push({
      x: startX + i * (NODE_WIDTH + MIN_SPACING),
      y: baseY,
    });
  }

  // Also try positions offset vertically to avoid crowding
  for (let i = 0; i <= siblingCount + 2; i++) {
    candidates.push({
      x: startX + i * (NODE_WIDTH + MIN_SPACING),
      y: baseY + NODE_HEIGHT + MIN_SPACING,
    });
  }

  // Find first non-overlapping candidate
  for (const candidate of candidates) {
    if (!wouldOverlap(candidate, allNodes)) {
      return candidate;
    }
  }

  // Fallback: use spiral search from parent position
  return findNonOverlappingPosition(
    { x: parentPos.x + NODE_WIDTH + MIN_SPACING, y: baseY },
    allNodes
  );
}
