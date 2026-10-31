"""
Tree/Idea tree prompts
Contains all prompt templates for idea tree expansion and AI queries
"""

from typing import Dict, Any, Optional


class TreePrompts:
    """Prompt templates for tree/idea tree operations"""

    @staticmethod
    def get_idea_expansion_prompt(
        user_prompt: str,
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """Get prompt for expanding idea tree nodes

        Args:
            user_prompt: User's query/prompt
            context: Optional context about parent, current node, etc.

        Returns:
            System prompt for AI
        """
        system_prompt = "You are an AI assistant helping with idea tree expansion. Generate detailed, actionable content for nodes in the tree."

        # Add context if available
        if context:
            context_info = []
            if context.get('parent_content'):
                context_info.append(f"Parent context: {context['parent_content']}")
            if context.get('current_title'):
                context_info.append(f"Current title: {context['current_title']}")
            if context.get('current_description'):
                context_info.append(f"Current description: {context['current_description']}")

            if context_info:
                system_prompt += "\n\nContext:\n" + "\n".join(context_info)

        return system_prompt

    @staticmethod
    def parse_ai_response(response_text: str, user_prompt: str) -> Dict[str, str]:
        """Parse AI response into title and description

        Args:
            response_text: Raw AI response
            user_prompt: Original user prompt (fallback for title)

        Returns:
            Dict with 'title' and 'description'
        """
        lines = response_text.strip().split('\n')

        # Try to extract title (first line or first sentence)
        generated_title = lines[0][:100] if lines else user_prompt[:100]

        # Rest is description
        generated_description = '\n'.join(lines[1:]) if len(lines) > 1 else response_text

        return {
            "title": generated_title,
            "description": generated_description
        }
