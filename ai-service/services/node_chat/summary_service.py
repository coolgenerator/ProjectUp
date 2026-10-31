"""
Summary Service
Generates AI-powered summaries, descriptions, and tags for nodes
"""

import logging
import json
import re
from typing import Dict, List, Optional

from services.llm.vertex_ai_service import vertex_ai_service
from prompts.node_chat_prompts import NodeChatPrompts

logger = logging.getLogger(__name__)


class SummaryService:
    """Service for generating node summaries and metadata"""

    async def generate_node_summary(
        self,
        message_content: str,
        current_title: str,
        current_description: str = "",
        current_summary: str = ""
    ) -> Dict[str, any]:
        """
        Generate AI-powered summary, description, and tags for a node

        Args:
            message_content: AI message content to use for update
            current_title: Current node title
            current_description: Current node description
            current_summary: Current node summary

        Returns:
            Dictionary with summary, description, and tags

        Raises:
            ValueError: If AI fails to generate valid content
            json.JSONDecodeError: If response is not valid JSON
        """
        # Get prompt from NodeChatPrompts
        prompt = NodeChatPrompts.get_node_summary_generation_prompt(
            current_title=current_title,
            current_description=current_description,
            current_summary=current_summary,
            message_content=message_content
        )

        # Generate using Vertex AI
        response_text = await vertex_ai_service.generate_text(
            prompt=prompt,
            temperature=0.3,
            max_output_tokens=2000
        )

        # Try to extract JSON from response
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
        else:
            # Fallback: try parsing entire response
            result = json.loads(response_text)

        summary = result.get("summary", "").strip()
        description = result.get("description", "").strip()
        tags = result.get("tags", [])

        # Ensure tags is a list and clean them
        if not isinstance(tags, list):
            tags = []
        tags = [tag.strip().lower() for tag in tags if tag and isinstance(tag, str)][:4]  # Max 4 tags

        if not summary or not description:
            raise ValueError("AI failed to generate summary or description")

        logger.info(f"Generated summary, description, and {len(tags)} tags")

        return {
            "summary": summary,
            "description": description,
            "tags": tags
        }

    async def generate_node_summary_from_conversation(
        self,
        conversation_history: List[Dict[str, str]],
        current_title: str,
        current_description: str = "",
        current_summary: str = ""
    ) -> Dict[str, any]:
        """
        Generate AI-powered summary, description, and tags from full conversation history

        Args:
            conversation_history: List of {role, content} message dicts
            current_title: Current node title
            current_description: Current node description
            current_summary: Current node summary

        Returns:
            Dictionary with summary, description, and tags

        Raises:
            ValueError: If AI fails to generate valid content
            json.JSONDecodeError: If response is not valid JSON
        """
        # Format conversation history for the prompt
        conversation_text = self._format_conversation(conversation_history)

        logger.info(f"Generating summary from conversation with {len(conversation_history)} messages")

        # Create prompt with full conversation context
        prompt = f"""You are helping to update a node's title, summary, description, and tags based on a chat conversation.

**Current Node:**
- Title: {current_title}
- Description: {current_description or "(empty)"}
- Summary: {current_summary or "(empty)"}

**Full Conversation:**
{conversation_text}

**Your Task:**
Analyze the ENTIRE conversation above and generate:
1. A clear, specific **title** (4-8 words) that captures the main topic or goal
2. A concise **summary** (1-2 sentences) that captures the essence of what was discussed
3. A detailed **description** that integrates ALL key insights from the conversation with the existing content
4. 2-4 relevant **tags** that categorize this node (lowercase, single-word or hyphenated)

**Requirements:**
- The title should be specific and actionable (not generic like "Project Root")
- The summary should be brief and informative (1-2 sentences max)
- The description should be comprehensive, incorporating ALL important points from the conversation
- If there's existing content, preserve important information while enhancing it with new insights
- Use clear, professional language
- Format the description with markdown for readability
- Tags should reflect the technical domain, task type, or topic area

**Important:**
- Consider the PROGRESSION of ideas throughout the conversation
- Synthesize multiple messages into a cohesive description
- Don't just use the last message - incorporate the full context

Respond ONLY with valid JSON in this exact format:
{{
  "title": "Specific 4-8 word title here",
  "summary": "One to two sentence summary here",
  "description": "Detailed description with markdown formatting here",
  "tags": ["tag1", "tag2", "tag3"]
}}

Only output valid JSON, nothing else."""

        # Generate using Vertex AI
        response_text = await vertex_ai_service.generate_text(
            prompt=prompt,
            temperature=0.3,
            max_output_tokens=2000
        )

        # Try to extract JSON from response
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
        else:
            # Fallback: try parsing entire response
            result = json.loads(response_text)

        title = result.get("title", "").strip()
        summary = result.get("summary", "").strip()
        description = result.get("description", "").strip()
        tags = result.get("tags", [])

        # Ensure tags is a list and clean them
        if not isinstance(tags, list):
            tags = []
        tags = [tag.strip().lower() for tag in tags if tag and isinstance(tag, str)][:4]  # Max 4 tags

        if not summary or not description:
            raise ValueError("AI failed to generate summary or description")

        # Use generated title or fallback to current title
        if not title:
            title = current_title

        logger.info(f"Generated title, summary from conversation, description, and {len(tags)} tags")

        return {
            "title": title,
            "summary": summary,
            "description": description,
            "tags": tags
        }

    def _format_conversation(self, conversation_history: List[Dict[str, str]]) -> str:
        """Format conversation history into readable text

        Args:
            conversation_history: List of {role, content} message dicts

        Returns:
            Formatted conversation string
        """
        lines = []
        for msg in conversation_history:
            role = msg.get('role', 'unknown')
            content = msg.get('content', '')
            if role == 'user':
                lines.append(f"User: {content}")
            elif role == 'assistant':
                lines.append(f"AI: {content}")
        return "\n\n".join(lines)
