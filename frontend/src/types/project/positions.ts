/**
 * Position/Spot interface for project roles
 * Used across project posts and project details to define available positions
 */
export interface Position {
  // Position identifier (used in different contexts)
  name?: string;
  title?: string;

  // Position details
  responsibility?: string;
  description?: string;

  // Number of available spots for this position
  spots: number;
}
