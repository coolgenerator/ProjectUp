/**
 * Unified AI-Guided Project Onboarding API
 *
 * Centralized API calls for all 10 project types:
 * - course, hackathon, capstone, research, competition
 * - internship, opensource, portfolio
 * - coursenote, examprep
 *
 * NOTE: Calls AI service directly at port 8888
 */

import config from '../config';

export interface ProjectType {
  id: string;
  name: string;
  description: string;
  tier: number;
}

/**
 * Get list of supported project types
 */
export async function getSupportedProjectTypes(): Promise<ProjectType[]> {
  const response = await fetch(
    `${config.AI_AGENT_URL}/onboarding/supported-types`,
    {
      method: 'GET',
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get supported project types');
  }

  const data = await response.json();
  return data.project_types;
}

/**
 * Suggest topics for a project type
 */
export async function suggestTopics(
  projectType: string,
  context: Record<string, any>
): Promise<{ topics: any[]; analysis_summary?: string }> {
  const response = await fetch(
    `${config.AI_AGENT_URL}/onboarding/${projectType}/suggest-topics`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(context),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate topic suggestions');
  }

  return await response.json();
}

/**
 * Elaborate on a selected topic
 */
export async function elaborateTopic(
  projectType: string,
  selectedTopic: any,
  context: Record<string, any>
): Promise<any> {
  const response = await fetch(
    `${config.AI_AGENT_URL}/onboarding/${projectType}/elaborate-topic`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        selected_topic: selectedTopic,
        context: context,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to elaborate topic');
  }

  return await response.json();
}

/**
 * Refine/customize a topic based on user modifications
 */
export async function refineTopic(
  projectType: string,
  context: Record<string, any>
): Promise<any> {
  const response = await fetch(
    `${config.AI_AGENT_URL}/onboarding/${projectType}/refine-topic`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(context),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to refine topic');
  }

  return await response.json();
}

/**
 * Generate project details (name options, description, tags)
 */
export async function generateProjectDetails(
  projectType: string,
  elaboration: any
): Promise<{
  name_options: Array<{ name: string; rationale: string }>;
  description: string;
  tags: string[];
}> {
  const response = await fetch(
    `${config.AI_AGENT_URL}/onboarding/${projectType}/generate-details`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        elaboration: elaboration,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate project details');
  }

  return await response.json();
}

// Legacy API functions for backward compatibility
// TODO: Remove once all components are migrated

/**
 * @deprecated Use suggestTopics with projectType='course' instead
 */
export async function suggestCourseTopics(context: Record<string, any>) {
  return suggestTopics('course', context);
}

/**
 * @deprecated Use elaborateTopic with projectType='course' instead
 */
export async function elaborateCourseTop(selectedTopic: any, context: Record<string, any>) {
  return elaborateTopic('course', selectedTopic, context);
}

/**
 * @deprecated Use generateProjectDetails with projectType='course' instead
 */
export async function generateCourseProjectDetails(elaboration: any) {
  return generateProjectDetails('course', elaboration);
}

/**
 * @deprecated Use suggestTopics with projectType='hackathon' instead
 */
export async function suggestHackathonTopics(context: Record<string, any>) {
  return suggestTopics('hackathon', context);
}

/**
 * @deprecated Use elaborateTopic with projectType='hackathon' instead
 */
export async function elaborateHackathonTopic(selectedTopic: any, context: Record<string, any>) {
  return elaborateTopic('hackathon', selectedTopic, context);
}

/**
 * @deprecated Use generateProjectDetails with projectType='hackathon' instead
 */
export async function generateHackathonProjectDetails(elaboration: any) {
  return generateProjectDetails('hackathon', elaboration);
}
