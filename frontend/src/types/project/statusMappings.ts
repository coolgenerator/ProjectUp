/**
 * Status and visibility mappings for projects
 * Provides consistent labeling and styling across the application
 */

export interface LabelConfig {
  label: string;
  color: string;
}

/**
 * Project status labels (1-4)
 */
export const statusLabels: Record<number, LabelConfig> = {
  1: { label: "Active", color: "bg-green-100 text-green-800" },
  2: { label: "Archived", color: "bg-amber-100 text-amber-800" },
  3: { label: "Completed", color: "bg-blue-100 text-blue-800" },
  4: { label: "Deleted", color: "bg-gray-100 text-gray-800" }
};

/**
 * Project visibility types
 */
export const visibilityLabels: Record<string, LabelConfig> = {
  "private": { label: "Private", color: "text-gray-700" },
  "public": { label: "Public", color: "text-green-700" },
  "local": { label: "Local", color: "text-purple-700" },
  "organization": { label: "Organization", color: "text-indigo-700" }
};
