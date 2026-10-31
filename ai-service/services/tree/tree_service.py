"""
Tree Service
Handles business logic for tree/idea tree operations including AI-powered expansion
"""

import logging
from typing import Dict, Any, Optional

from prompts.tree_prompts import TreePrompts

logger = logging.getLogger(__name__)


class TreeService:
    """Service for tree operations and AI queries"""

    def __init__(self):
        self.prompts = TreePrompts()

    async def process_ai_query(
        self,
        query: str,
        query_type: str,
        context: Optional[Dict[str, Any]] = None,
        llm_service: Optional[Any] = None
    ) -> Dict[str, Any]:
        """
        Process AI query for idea tree expansion

        Args:
            query: User's query/prompt
            query_type: Type of query (expand_idea, etc.)
            context: Optional context dict
            llm_service: Optional LLM service instance

        Returns:
            Dict with generated title, description, and metadata
        """
        try:
            if not query:
                raise ValueError("Query or prompt is required")

            # Get system prompt from prompts module
            system_prompt = self.prompts.get_idea_expansion_prompt(
                user_prompt=query,
                context=context or {}
            )

            # Generate response
            if not llm_service:
                raise ValueError("LLM service is required for AI query processing")

            ai_response = llm_service.generate(
                prompt=query,
                system_prompt=system_prompt,
                max_tokens=1000,
                temperature=0.7
            )
            generated_text = ai_response.get('content', '')

            # Parse response
            parsed = self.prompts.parse_ai_response(generated_text, query)

            return {
                "success": True,
                "title": parsed["title"],
                "description": parsed["description"],
                "raw_response": generated_text,
                "query_type": query_type
            }

        except Exception as e:
            logger.error(f"Error processing tree AI query: {e}")
            raise

    async def generate_child_node_content(
        self,
        parent_node: Dict[str, Any],
        user_input: str,
        llm_service: Any
    ) -> Dict[str, Any]:
        """
        Generate child node content using chat-based workflow.

        Combines parent node context with user input to generate:
        - Chat messages
        - Node title
        - One-sentence summary

        Args:
            parent_node: Parent node dict with title, description, etc.
            user_input: User's input for the child node
            llm_service: LLM service instance

        Returns:
            Dict with title, summary, messages, and raw_response
        """
        try:
            # Build context from parent node
            parent_context = f"""Parent Node: {parent_node.get('title', 'Unknown')}
Description: {parent_node.get('description', 'No description')}"""

            # System prompt for child node generation
            system_prompt = f"""You are helping expand an idea tree. The user is creating a child node.

{parent_context}

Generate content for the child node based on the user's input. Your response should include:
1. A clear, concise title (max 60 chars)
2. A one-sentence summary that provides key details
3. Detailed explanation or breakdown

Format your response as:
TITLE: [title here]
SUMMARY: [one sentence summary]
DETAILS: [detailed content]"""

            # User prompt combining context and input
            user_prompt = f"Create a child node: {user_input}"

            # Generate with LLM
            response = await llm_service.generate(
                prompt=user_prompt,
                system_prompt=system_prompt,
                max_tokens=800,
                temperature=0.7
            )

            generated_text = response.get('content', '')

            # Parse the response
            title = self._extract_field(generated_text, "TITLE")
            summary = self._extract_field(generated_text, "SUMMARY")
            details = self._extract_field(generated_text, "DETAILS")

            # Fallback if parsing fails
            if not title:
                # Use first line or truncate user input
                lines = user_input.split('\n')
                title = lines[0][:60] if lines else user_input[:60]

            if not summary:
                # Use first sentence of details or input
                summary = (details or user_input).split('.')[0][:200] + '.'

            if not details:
                details = generated_text

            return {
                "success": True,
                "title": title.strip(),
                "summary": summary.strip(),
                "description": details.strip(),
                "raw_response": generated_text,
                "messages": [
                    {"role": "user", "content": user_prompt},
                    {"role": "assistant", "content": generated_text}
                ]
            }

        except Exception as e:
            logger.error(f"Error generating child node content: {e}")
            # Return fallback content
            return {
                "success": False,
                "title": user_input[:60],
                "summary": user_input.split('.')[0][:200] + '.',
                "description": user_input,
                "error": str(e)
            }

    def _extract_field(self, text: str, field_name: str) -> str:
        """Extract a field from formatted LLM response"""
        try:
            import re
            pattern = rf"{field_name}:\s*(.+?)(?:\n[A-Z]+:|$)"
            match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
            if match:
                return match.group(1).strip()
            return ""
        except Exception:
            return ""
