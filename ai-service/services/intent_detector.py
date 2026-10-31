"""
Intent Detection Service

Uses LLM to analyze chat messages and detect actionable intents.
Suggests relevant project management actions based on conversation context.
"""

import logging
import json
import re
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime

from langchain_google_vertexai import ChatVertexAI
from langchain_core.messages import SystemMessage, HumanMessage

from models.entities.intent import (
    DetectedIntent,
    ActionType,
    IntentDetectionContext
)
from prompts.intent_prompts import IntentPrompts

logger = logging.getLogger(__name__)


class IntentDetector:
    """
    Analyzes chat messages to detect actionable intents and suggest project actions.

    Uses LLM to identify when users:
    - Mention deadlines → suggest creating milestones
    - Describe complex work → suggest task breakdown
    - Ask "how to" questions → suggest learning plans
    - List multiple ideas → suggest extracting to nodes
    - Mention blockers → suggest dependencies
    - Conclude discussions → suggest saving version
    """

    def __init__(self, model_name: str = "gemini-2.5-pro", temperature: float = 0.3):
        """
        Initialize intent detector with LLM.

        Args:
            model_name: Vertex AI model to use (default: gemini-2.5-pro)
            temperature: LLM temperature (lower = more focused, default: 0.3)
        """
        self.llm = ChatVertexAI(
            model=model_name,
            temperature=temperature,
            max_output_tokens=2048
        )
        self.temperature = temperature

    async def detect_intents(
        self,
        context: IntentDetectionContext
    ) -> List[DetectedIntent]:
        """
        Detect actionable intents from a message and conversation context.

        Args:
            context: Intent detection context with message, node info, and history

        Returns:
            List of detected intents with suggested actions
        """
        try:
            logger.info(f"Detecting intents for message in node {context.node_id}")

            # Build prompt for intent detection
            system_prompt = self._build_system_prompt()
            human_prompt = self._build_human_prompt(context)

            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=human_prompt)
            ]

            # Get LLM response
            response = await self.llm.ainvoke(messages)

            # Parse intents from response
            intents = self._parse_intents(response.content, context)

            logger.info(f"Detected {len(intents)} intents")
            return intents

        except Exception as e:
            logger.error(f"Error detecting intents: {e}")
            return []

    def _build_system_prompt(self) -> str:
        """Build the system prompt for intent detection"""
        return IntentPrompts.get_system_prompt()

    def _build_human_prompt(self, context: IntentDetectionContext) -> str:
        """Build the human prompt with conversation context"""
        return IntentPrompts.get_human_prompt(
            message=context.message,
            node_title=context.node_title,
            node_description=context.node_description,
            node_id=context.node_id,
            existing_nodes_count=context.existing_nodes_count or 0,
            conversation_history=context.conversation_history
        )

    def _parse_intents(
        self,
        llm_response: str,
        context: IntentDetectionContext
    ) -> List[DetectedIntent]:
        """
        Parse LLM response into DetectedIntent objects.

        Args:
            llm_response: Raw LLM response text
            context: Original detection context

        Returns:
            List of parsed DetectedIntent objects
        """
        try:
            # Extract JSON from response (handle markdown code blocks)
            json_match = re.search(r'```json\s*(.*?)\s*```', llm_response, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                # Try to find JSON array directly
                json_match = re.search(r'\[.*\]', llm_response, re.DOTALL)
                if json_match:
                    json_str = json_match.group()
                else:
                    logger.warning("No JSON found in LLM response")
                    return []

            # Parse JSON
            intents_data = json.loads(json_str)

            if not isinstance(intents_data, list):
                logger.warning(f"Expected list, got {type(intents_data)}")
                return []

            # Convert to DetectedIntent objects
            intents = []
            for intent_data in intents_data:
                try:
                    # Generate unique ID
                    intent_id = f"intent_{uuid.uuid4().hex[:12]}"

                    # Validate action type
                    action_type = intent_data.get("type", "").lower()
                    if action_type not in [at.value for at in ActionType]:
                        logger.warning(f"Unknown action type: {action_type}")
                        continue

                    # Create DetectedIntent
                    intent = DetectedIntent(
                        id=intent_id,
                        type=ActionType(action_type),
                        confidence=intent_data.get("confidence", 0.7),
                        title=intent_data.get("title", ""),
                        description=intent_data.get("description", ""),
                        parameters=intent_data.get("parameters", {}),
                        preview=intent_data.get("preview", ""),
                        reasoning=intent_data.get("reasoning"),
                        priority=intent_data.get("priority", 2)
                    )

                    # Filter by confidence threshold
                    if intent.confidence >= 0.6:
                        intents.append(intent)
                    else:
                        logger.debug(f"Filtered intent {intent.type} (confidence: {intent.confidence})")

                except Exception as e:
                    logger.error(f"Error parsing intent: {e}")
                    continue

            return intents

        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            logger.debug(f"LLM response: {llm_response}")
            return []
        except Exception as e:
            logger.error(f"Error parsing intents: {e}")
            return []

    async def refine_intent_parameters(
        self,
        intent: DetectedIntent,
        additional_context: Optional[Dict[str, Any]] = None
    ) -> DetectedIntent:
        """
        Refine intent parameters with additional context or clarification.

        Useful when user wants to modify suggested parameters before execution.

        Args:
            intent: Original detected intent
            additional_context: Additional information to refine parameters

        Returns:
            Updated intent with refined parameters
        """
        try:
            if not additional_context:
                return intent

            # Build refinement prompt
            system_prompt = IntentPrompts.get_refinement_prompt(
                intent_type=intent.type.value,
                original_parameters=intent.parameters,
                additional_context=additional_context
            )

            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content="Refine the parameters based on the additional context.")
            ]

            response = await self.llm.ainvoke(messages)

            # Parse refined parameters
            json_match = re.search(r'\{.*\}', response.content, re.DOTALL)
            if json_match:
                refined_params = json.loads(json_match.group())
                intent.parameters = refined_params

            return intent

        except Exception as e:
            logger.error(f"Error refining intent parameters: {e}")
            return intent


# Singleton instance
_intent_detector = None


def get_intent_detector() -> IntentDetector:
    """Get or create intent detector instance"""
    global _intent_detector
    if _intent_detector is None:
        _intent_detector = IntentDetector()
    return _intent_detector
