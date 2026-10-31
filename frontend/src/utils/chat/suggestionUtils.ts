/**
 * The AI agent can still propose course creation, but courses were removed
 * from the product. Drop those suggestions before they reach the chat UI.
 */
export const withoutCourseSuggestions = <T extends { type?: string; actionType?: string }>(suggestions: T[]): T[] =>
  suggestions.filter(s => s.type !== 'create_course' && s.actionType !== 'create_course');
