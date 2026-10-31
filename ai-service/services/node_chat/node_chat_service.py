"""
Node Chat Service
Handles business logic for chatting with idea tree nodes
"""

import logging
import re
from typing import Dict, Any, List, Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session

from prompts.node_chat_prompts import NodeChatPrompts
from core.llm_adapter import generate_chat, generate_chat_with_tools
from services.node_chat.context_builder import NodeChatContextBuilder
from services.node_chat.tools import NODE_CHAT_TOOLS, ToolExecutor
from services.node_chat.react_engine import ReActEngine

logger = logging.getLogger(__name__)


def fix_code_block_formatting(text: str) -> str:
    """
    Post-process AI response to fix incorrectly formatted code blocks.
    Converts code blocks containing only titles/short text to bold text.

    Args:
        text: AI response text

    Returns:
        Formatted text with code blocks replaced by bold where appropriate
    """
    # Pattern 1: Bold + inline code combined (e.g., **`Data Parser`**)
    # This is the most common issue - convert to just bold
    bold_inline_code_pattern = r'\*\*`([^`]+)`\*\*'

    # Pattern 2: Inline code blocks without language
    # e.g., ```HTTP Request Manager```
    inline_pattern = r'```\s*([^`\n]{1,60})\s*```'

    # Pattern 3: Multiline code blocks without language
    # e.g., ```\nHTTP Request Manager\n```
    multiline_pattern = r'```\n([^\n`]{1,60})\n```'

    def replacement(match):
        content = match.group(1).strip()
        # If it's short text (likely a title/concept), convert to bold
        # Don't convert if it contains typical code syntax like () {} [] = etc.
        if len(content) <= 60 and not re.search(r'[(){}\[\]=<>;]', content):
            return f"**{content}**"
        # Keep as code block if it looks like actual code
        return match.group(0)

    # Fix bold + inline code combinations first (most common issue)
    text = re.sub(bold_inline_code_pattern, r'**\1**', text)

    # Then apply code block patterns
    text = re.sub(inline_pattern, replacement, text)
    text = re.sub(multiline_pattern, replacement, text)

    return text


class NodeChatService:
    """Service for node chat interactions"""

    def __init__(self, db: Optional[Session] = None, user_id: Optional[int] = None):
        self.prompts = NodeChatPrompts()
        self.db = db
        self.user_id = user_id
        self.context_builder = NodeChatContextBuilder(db) if db else None

    async def generate_ai_response_with_tools(
        self,
        message: str,
        conversation_history: List[Dict],
        context: Dict[str, Any],
        node_id: Optional[str] = None,
        project_id: Optional[str] = None,
        enable_tools: bool = True
    ) -> Dict[str, Any]:
        """
        Generate AI response with optional tool calling

        Args:
            message: User's message
            conversation_history: Previous messages
            context: Node context
            node_id: Node UUID
            project_id: Project UUID
            enable_tools: Whether to enable function calling

        Returns:
            Dict with 'response', 'tool_calls', and 'tool_results'
        """
        try:
            # Build context
            formatted_context = None
            enhanced_context = context

            if self.context_builder and node_id and project_id:
                try:
                    enhanced_context = self.context_builder.build_context(
                        node_id=node_id,
                        project_id=project_id,
                        fallback_context=context
                    )
                    formatted_context = self.context_builder.format_context_for_prompt(enhanced_context)
                except Exception as e:
                    logger.warning(f"Failed to build enhanced context: {e}")

            # Build system prompt
            system_prompt = self.prompts.get_system_prompt(
                enhanced_context,
                formatted_context=formatted_context
            )

            # Build messages
            messages = [{"role": "system", "content": system_prompt}]

            for msg in conversation_history:
                messages.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", "")
                })

            messages.append({"role": "user", "content": message})

            # Call LLM with or without tools
            if enable_tools and node_id and project_id and self.user_id:
                result = await generate_chat_with_tools(
                    messages=messages,
                    tools=NODE_CHAT_TOOLS
                )

                ai_message = result.get("message", "")
                # Fix code block formatting issues
                ai_message = fix_code_block_formatting(ai_message)
                tool_calls = result.get("tool_calls", [])

                # Execute tool calls
                tool_results = []
                if tool_calls and self.db:
                    executor = ToolExecutor(
                        db=self.db,
                        node_id=node_id,
                        project_id=project_id,
                        user_id=self.user_id
                    )

                    for tool_call in tool_calls:
                        if tool_call.get("type") == "function":
                            func = tool_call["function"]
                            tool_name = func["name"]
                            arguments = func["arguments"]

                            result = await executor.execute_tool(tool_name, arguments)
                            tool_results.append({
                                "tool_call_id": tool_call["id"],
                                "tool_name": tool_name,
                                "result": result
                            })
            else:
                # Fall back to regular chat
                ai_message = await generate_chat(messages=messages)
                # Fix code block formatting issues
                ai_message = fix_code_block_formatting(ai_message)
                tool_calls = []
                tool_results = []

            # Generate metadata for first message
            first_message_metadata = None
            is_first_message = len(conversation_history) == 0
            if is_first_message:
                first_message_metadata = await self._generate_first_message_metadata(
                    messages=messages,
                    ai_response=ai_message
                )

            return {
                "response": ai_message,
                "tool_calls": tool_calls,
                "tool_results": tool_results,
                "first_message_metadata": first_message_metadata
            }

        except Exception as e:
            logger.error(f"Error generating AI response with tools: {e}")
            raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

    async def generate_ai_response_with_react(
        self,
        message: str,
        conversation_history: List[Dict],
        node_id: str,
        project_id: str,
        max_iterations: int = 5,
        enable_reflection: bool = True
    ) -> Dict[str, Any]:
        """
        Generate AI response using ReAct (Reason + Act) multi-step reasoning

        This method provides deep analysis with:
        - Chain-of-thought reasoning (visible thinking process)
        - Multi-step reasoning loops
        - Access to ALL project data (tasks, milestones, resources, nodes)
        - Tool calling within reasoning loops
        - Reflection on progress

        Args:
            message: User's message/query
            conversation_history: Previous messages
            node_id: Node UUID
            project_id: Project UUID
            max_iterations: Maximum reasoning iterations (default: 5)
            enable_reflection: Whether to reflect on progress each iteration

        Returns:
            Dict with:
            - response: Final comprehensive answer
            - reasoning_steps: List of all reasoning steps (thoughts, actions, observations)
            - tool_calls: All tools called during reasoning
            - iterations: Number of iterations used
            - context_used: Summary of context accessed
        """
        try:
            if not self.db or not self.user_id:
                raise HTTPException(
                    status_code=500,
                    detail="ReAct mode requires database session and user ID"
                )

            logger.info(f"Starting ReAct reasoning for query: {message[:100]}...")

            # Initialize ReAct engine
            react_engine = ReActEngine(
                db=self.db,
                user_id=self.user_id,
                max_iterations=max_iterations,
                enable_reflection=enable_reflection
            )

            # Run ReAct loop
            result = await react_engine.run_react_loop(
                query=message,
                node_id=node_id,
                project_id=project_id,
                conversation_history=conversation_history
            )

            # Fix code block formatting in final response
            final_response = fix_code_block_formatting(result["final_response"])
            result["response"] = final_response

            # Format reasoning steps for frontend display
            formatted_reasoning = self._format_reasoning_for_display(
                result["reasoning_steps"]
            )
            result["reasoning_steps_formatted"] = formatted_reasoning

            logger.info(
                f"ReAct completed: {result['iterations']} iterations, "
                f"{len(result['tool_calls'])} tools called"
            )

            return result

        except Exception as e:
            logger.error(f"Error in ReAct reasoning: {e}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"ReAct reasoning failed: {str(e)}"
            )

    def _format_reasoning_for_display(self, reasoning_steps: List[Dict]) -> str:
        """
        Format reasoning steps into human-readable markdown

        Args:
            reasoning_steps: List of reasoning step dictionaries

        Returns:
            Formatted markdown string
        """
        lines = ["## 🧠 AI Reasoning Process\n"]

        current_iteration = 0
        for step in reasoning_steps:
            iteration = step.get("iteration", 0)

            # Add iteration header
            if iteration != current_iteration:
                current_iteration = iteration
                lines.append(f"\n### Iteration {iteration}\n")

            step_type = step.get("type")

            if step_type == "thought":
                lines.append("#### 💭 Thought Process")
                lines.append(f"{step.get('content', '')}\n")

                if step.get("should_act"):
                    lines.append("**Decision:** Need to gather more information\n")
                if step.get("is_complete"):
                    lines.append("**Decision:** Ready to provide final answer\n")

            elif step_type == "action":
                tool_calls = step.get("tool_calls", [])
                if tool_calls:
                    lines.append("#### ⚡ Actions Taken")
                    for tool_call in tool_calls:
                        tool_name = tool_call.get("name", "unknown")
                        lines.append(f"- Called tool: `{tool_name}`")
                    lines.append("")

            elif step_type == "observation":
                lines.append("#### 👁️ Observation")
                lines.append(f"{step.get('content', '')}\n")

            elif step_type == "reflection":
                lines.append("#### 🔍 Reflection")
                lines.append(f"{step.get('content', '')}")

                progress = step.get("progress_assessment")
                if progress:
                    lines.append(f"\n**Progress:** {progress}")

                next_steps = step.get("next_steps", [])
                if next_steps:
                    lines.append("\n**Next Steps:**")
                    for next_step in next_steps:
                        lines.append(f"- {next_step}")
                lines.append("")

        lines.append("\n---\n")
        return "\n".join(lines)

    async def generate_ai_response(
        self,
        message: str,
        conversation_history: List[Dict],
        context: Dict[str, Any],
        node_id: Optional[str] = None,
        project_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate AI response with conversation context

        Args:
            message: User's message
            conversation_history: Previous messages in the conversation
            context: Node and tree context (fallback)
            node_id: UUID of the node (for enhanced context)
            project_id: UUID of the project (for enhanced context)

        Returns:
            Dict with 'response' and optionally 'conclusion'

        Raises:
            HTTPException: If AI generation fails
        """
        try:
            # Build enhanced context if context builder is available
            formatted_context = None
            enhanced_context = context

            if self.context_builder and node_id and project_id:
                try:
                    enhanced_context = self.context_builder.build_context(
                        node_id=node_id,
                        project_id=project_id,
                        fallback_context=context
                    )
                    formatted_context = self.context_builder.format_context_for_prompt(enhanced_context)
                except Exception as e:
                    logger.warning(f"Failed to build enhanced context, using fallback: {e}")
                    enhanced_context = context

            # Build system message with context
            system_prompt = self.prompts.get_system_prompt(
                enhanced_context,
                formatted_context=formatted_context
            )

            # Build messages array for LLM
            messages = [
                {"role": "system", "content": system_prompt}
            ]

            # Add conversation history
            for msg in conversation_history:
                messages.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", "")
                })

            # Add current message
            messages.append({
                "role": "user",
                "content": message
            })

            # Generate response using LLM
            ai_message = await generate_chat(messages=messages)
            # Fix code block formatting issues
            ai_message = fix_code_block_formatting(ai_message)

            # Check if we should generate a conclusion and summary
            conclusion = None
            summary = None
            if self.prompts.should_generate_conclusion(message):
                conclusion = await self._generate_conclusion(
                    messages=messages,
                    ai_response=ai_message
                )
                summary = await self._generate_summary(
                    messages=messages,
                    ai_response=ai_message
                )

            # Check if this is the first user message (auto-update node)
            first_message_metadata = None
            is_first_message = len(conversation_history) == 0
            if is_first_message:
                first_message_metadata = await self._generate_first_message_metadata(
                    messages=messages,
                    ai_response=ai_message
                )

            return {
                "response": ai_message,
                "conclusion": conclusion,
                "summary": summary,
                "first_message_metadata": first_message_metadata
            }

        except Exception as e:
            logger.error(f"Error generating AI response: {e}")
            raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

    async def _generate_conclusion(
        self,
        messages: List[Dict],
        ai_response: str
    ) -> str:
        """
        Generate a polished conclusion based on the conversation

        Args:
            messages: Full conversation messages
            ai_response: Latest AI response

        Returns:
            Conclusion text
        """
        conclusion_prompt = self.prompts.get_conclusion_prompt()

        conclusion_messages = messages + [
            {"role": "assistant", "content": ai_response},
            {"role": "user", "content": conclusion_prompt}
        ]

        conclusion = await generate_chat(messages=conclusion_messages)
        return conclusion.strip()

    async def _generate_summary(
        self,
        messages: List[Dict],
        ai_response: str
    ) -> str:
        """
        Generate a one-sentence summary based on the conversation

        Args:
            messages: Full conversation messages
            ai_response: Latest AI response

        Returns:
            One-sentence summary text
        """
        summary_prompt = self.prompts.get_summary_prompt()

        summary_messages = messages + [
            {"role": "assistant", "content": ai_response},
            {"role": "user", "content": summary_prompt}
        ]

        summary = await generate_chat(messages=summary_messages)
        return summary.strip()

    async def _generate_first_message_metadata(
        self,
        messages: List[Dict],
        ai_response: str
    ) -> Optional[Dict[str, str]]:
        """
        Generate title, summary, and description for first message auto-update

        Args:
            messages: Full conversation messages
            ai_response: Latest AI response

        Returns:
            Dict with title, summary, description or None if extraction fails
        """
        try:
            import json

            metadata_prompt = self.prompts.get_first_message_metadata_prompt(ai_response)

            metadata_messages = messages + [
                {"role": "assistant", "content": ai_response},
                {"role": "user", "content": metadata_prompt}
            ]

            metadata_response = await generate_chat(messages=metadata_messages)

            # Try to parse JSON response
            # Clean up markdown code blocks if present
            cleaned_response = metadata_response.strip()
            if cleaned_response.startswith("```json"):
                cleaned_response = cleaned_response[7:]
            if cleaned_response.startswith("```"):
                cleaned_response = cleaned_response[3:]
            if cleaned_response.endswith("```"):
                cleaned_response = cleaned_response[:-3]

            cleaned_response = cleaned_response.strip()

            metadata = json.loads(cleaned_response)

            return {
                "title": metadata.get("title", "").strip(),
                "summary": metadata.get("summary", "").strip(),
                "description": metadata.get("description", "").strip(),
                "tags": metadata.get("tags", [])
            }

        except Exception as e:
            logger.error(f"Error generating first message metadata: {e}")
            return None

    def format_conversation_history(
        self,
        messages: List[Dict[str, Any]]
    ) -> List[Dict[str, str]]:
        """
        Format conversation history for LLM consumption

        Args:
            messages: Raw message objects from database

        Returns:
            Formatted messages for LLM
        """
        formatted = []
        for msg in messages:
            formatted.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            })
        return formatted
