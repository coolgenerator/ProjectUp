"""
Action Item Extractor

Extracts action items from discussion and creates trackable nodes.
"""

import logging
from typing import Dict, Any, List
import re

from langchain_google_vertexai import ChatVertexAI
from langchain_core.messages import SystemMessage, HumanMessage
import json

from .base_executor import BaseExecutor
from models.entities.intent import ActionExecutionResult, ActionType

logger = logging.getLogger(__name__)


class ActionItemExtractor(BaseExecutor):
    """
    Executor for EXTRACT_ACTION_ITEMS action.

    Extracts action items from conversation text and creates nodes for each.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.llm = ChatVertexAI(model="gemini-2.5-pro", temperature=0.3)

    async def execute(
        self,
        parameters: Dict[str, Any],
        context: Dict[str, Any]
    ) -> ActionExecutionResult:
        """
        Execute action item extraction.

        Expected parameters:
            - text: Text containing action items
            - context_title: Title for context

        Expected context:
            - node_id: Parent node ID
            - session_id: Tree session ID
        """
        try:
            logger.info("Executing EXTRACT_ACTION_ITEMS action")

            # Extract parameters
            text = parameters.get("text", "")
            context_title = parameters.get("context_title", "Discussion")

            session_id = context.get("session_id")
            parent_id = context.get("node_id")

            if not session_id:
                raise ValueError("session_id required in context")

            # Extract action items using LLM
            action_items = await self._extract_action_items(text, context_title)

            # Create nodes for each action item
            created_nodes = []
            for i, item in enumerate(action_items):
                node = await self.create_node(
                    session_id=session_id,
                    title=item["title"],
                    description=item.get("description", ""),
                    metadata={
                        "auto_created": True,
                        "created_from_chat": True,
                        "action_item": True,
                        "priority": item.get("priority", 2),
                        "extracted_from": context_title
                    },
                    parent_id=parent_id
                )
                created_nodes.append(node)

            return ActionExecutionResult(
                success=True,
                action_type=ActionType.EXTRACT_ACTION_ITEMS,
                message=f"✅ Extracted {len(created_nodes)} action items",
                created_nodes=created_nodes,
                metadata={"action_item_count": len(created_nodes)}
            )

        except Exception as e:
            logger.error(f"Error executing EXTRACT_ACTION_ITEMS: {e}")
            return ActionExecutionResult(
                success=False,
                action_type=ActionType.EXTRACT_ACTION_ITEMS,
                message="Failed to extract action items",
                error=str(e)
            )

    async def _extract_action_items(
        self,
        text: str,
        context_title: str
    ) -> List[Dict[str, Any]]:
        """
        Use LLM to extract action items from text.

        Returns list of action items with title, description, priority.
        """
        system_prompt = """You are an expert at extracting action items from discussions.

Extract all actionable items from the text. Each action item should:
1. Start with a verb (action-oriented)
2. Be specific and measurable
3. Be completable by one person or team

Return ONLY a JSON array:
```json
[
  {
    "title": "Action item title (verb-first, concise)",
    "description": "Additional details or context",
    "priority": 1
  }
]
```

priority: 1=urgent/important, 2=normal, 3=low

If no clear action items found, return empty array []."""

        human_prompt = f"""Extract action items from this discussion:

**Context:** {context_title}

**Text:**
{text}

Return the JSON array of action items."""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=human_prompt)
        ]

        try:
            response = await self.llm.ainvoke(messages)

            # Parse JSON
            json_match = re.search(r'```json\s*(.*?)\s*```', response.content, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                json_match = re.search(r'\[.*\]', response.content, re.DOTALL)
                json_str = json_match.group() if json_match else "[]"

            items = json.loads(json_str)
            return items if isinstance(items, list) else []

        except Exception as e:
            logger.error(f"Error extracting action items: {e}")
            return []
