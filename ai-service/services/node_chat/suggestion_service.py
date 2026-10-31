"""
Suggestion Service
Generates contextual follow-up suggestions after AI messages
"""

import logging
import json
import uuid
from typing import List, Dict

from core.llm_adapter import generate_chat
from prompts.node_chat_prompts import NodeChatPrompts

logger = logging.getLogger(__name__)


class SuggestionService:
    """Service for generating follow-up suggestions"""

    async def generate_suggestions(
        self,
        node_title: str,
        node_description: str,
        message_content: str,
        conversation_history: List[Dict[str, str]] = None
    ) -> List[Dict]:
        """
        Generate contextual follow-up suggestions after an AI message

        Args:
            node_title: Current node title
            node_description: Current node description
            message_content: Latest AI response content
            conversation_history: List of recent conversation messages

        Returns:
            List of suggestion dictionaries with type, text, description, and data
        """
        if conversation_history is None:
            conversation_history = []

        # Get prompt from NodeChatPrompts
        prompt = NodeChatPrompts.get_suggestions_generation_prompt(
            node_title=node_title,
            node_description=node_description,
            message_content=message_content,
            recent_conversation=json.dumps(conversation_history[-3:], indent=2)
        )

        try:
            # Call LLM to generate suggestions
            response = await generate_chat(
                messages=[{"role": "user", "content": prompt}],
                system_prompt=NodeChatPrompts.get_suggestions_system_prompt()
            )

            # Parse response
            suggestions = self._parse_suggestions_response(response)

            logger.info(f"Generated {len(suggestions)} suggestions")
            return suggestions

        except Exception as e:
            logger.error(f"Error generating suggestions: {e}")
            # Return fallback suggestions
            return self._get_fallback_suggestions()

    def _parse_suggestions_response(self, response_text: str) -> List[Dict]:
        """
        Parse LLM response to extract suggestions

        Args:
            response_text: Raw LLM response

        Returns:
            List of suggestion dictionaries
        """
        try:
            # Extract JSON from response
            response_text = response_text.strip()

            # Try to find JSON in response
            if '```json' in response_text:
                # Extract from code block
                start = response_text.find('```json') + 7
                end = response_text.find('```', start)
                response_text = response_text[start:end].strip()
            elif '```' in response_text:
                # Extract from code block without language
                start = response_text.find('```') + 3
                end = response_text.find('```', start)
                response_text = response_text[start:end].strip()

            # Find JSON object (starts with { or [)
            if '{' in response_text:
                start = response_text.find('{')
                end = response_text.rfind('}') + 1
                response_text = response_text[start:end]
            elif '[' in response_text:
                start = response_text.find('[')
                end = response_text.rfind(']') + 1
                response_text = response_text[start:end]

            parsed = json.loads(response_text)

            # Handle both nested structure and flat array
            suggestions = []
            if isinstance(parsed, dict):
                # New nested structure: {"suggested_questions": [...], "suggested_actions": [...]}
                if 'suggested_questions' in parsed:
                    suggestions.extend(parsed['suggested_questions'])
                if 'suggested_actions' in parsed:
                    suggestions.extend(parsed['suggested_actions'])
            elif isinstance(parsed, list):
                # Legacy flat array structure
                suggestions = parsed
            else:
                logger.warning("Suggestions response is not a dict or list")
                return self._get_fallback_suggestions()

            # Define allowed suggestion types (ONLY actionable types)
            allowed_types = {
                'question',
                'create_child_node',
                'create_node',
                'create_course',
                'add_resource',
                'extract_tasks',
                'connect_nodes'
            }

            # Ensure each suggestion has required fields and is an allowed type
            valid_suggestions = []
            for sug in suggestions:
                if isinstance(sug, dict) and 'type' in sug and 'text' in sug:
                    # Filter out non-actionable suggestions
                    if sug['type'] not in allowed_types:
                        logger.warning(f"Filtered out non-actionable suggestion type: {sug['type']}")
                        continue

                    # Skip suggestions that look like generic recommendations
                    text_lower = sug.get('text', '').lower()
                    if any(phrase in text_lower for phrase in ['please review', 'i suggest', 'recommendation:', 'you should consider']):
                        logger.warning(f"Filtered out recommendation-style suggestion: {sug.get('text', '')[:50]}")
                        continue

                    if 'id' not in sug:
                        sug['id'] = f"sug-{uuid.uuid4()}"
                    if 'description' not in sug:
                        sug['description'] = ""
                    if 'data' not in sug:
                        sug['data'] = {}
                    valid_suggestions.append(sug)

            return valid_suggestions[:7]  # Limit to 7 (as specified in prompt)

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse suggestions JSON: {e}")
            logger.error(f"Response was: {response_text[:500]}")
            return self._get_fallback_suggestions()

    def _get_fallback_suggestions(self) -> List[Dict]:
        """
        Get generic fallback suggestions when AI generation fails

        Returns:
            List of fallback suggestion dictionaries
        """
        return [
            {
                "id": "fallback-1",
                "type": "question",
                "text": "What are the next steps?",
                "description": "Ask about the implementation plan",
                "data": {}
            },
            {
                "id": "fallback-2",
                "type": "create_node",
                "text": "Create a related node",
                "description": "Break this down into sub-topics",
                "data": {}
            }
        ]
