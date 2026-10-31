/**
 * TypeScript interfaces for resource management
 */

export interface Resource {
  id: string;
  name: string;
  resource_type: 'link' | 'file';
  url: string;
  category?: string;
  description?: string;
}
