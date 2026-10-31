"""
ReAct Reasoning Engine
Implements iterative Reason → Act → Observe → Reflect loops for deep analysis
"""

import logging
from typing import Dict, List, Any, Optional, Tuple
from sqlalchemy.orm import Session
import json

from services.node_chat.tools import NODE_CHAT_TOOLS, ToolExecutor
from services.node_chat.project_context_builder import ProjectContextBuilder
from core.llm_adapter import generate_chat_with_tools

# RAG imports
try:
    from services.rag import RAGService
    HAS_RAG = True
except ImportError:
    HAS_RAG = False
    RAGService = None

logger = logging.getLogger(__name__)


class ReActEngine:
    """
    ReAct (Reason + Act) Engine for multi-step reasoning

    Implements the ReAct pattern:
    1. Thought: Reason about what to do next
    2. Action: Decide which tool to call (if any)
    3. Observation: Execute tool and observe results
    4. Reflection: Assess progress and decide next steps
    5. Repeat until goal is achieved or max iterations reached
    """

    def __init__(
        self,
        db: Session,
        user_id: int,
        max_iterations: int = 5,
        enable_reflection: bool = True,
        enable_rag: bool = True
    ):
        self.db = db
        self.user_id = user_id
        self.max_iterations = max_iterations
        self.enable_reflection = enable_reflection
        self.enable_rag = enable_rag and HAS_RAG
        self.context_builder = ProjectContextBuilder(db)

        # Initialize RAG service if available
        if self.enable_rag:
            try:
                self.rag_service = RAGService(db=db)
                logger.info("RAG service enabled for ReAct engine")
            except Exception as e:
                logger.warning(f"Could not initialize RAG service: {e}")
                self.enable_rag = False
                self.rag_service = None
        else:
            self.rag_service = None

    async def run_react_loop(
        self,
        query: str,
        node_id: str,
        project_id: str,
        conversation_history: List[Dict] = None
    ) -> Dict[str, Any]:
        """
        Run the ReAct reasoning loop

        Args:
            query: User's question or request
            node_id: Current node ID
            project_id: Project ID
            conversation_history: Previous conversation messages

        Returns:
            Dict containing:
            - final_response: The final answer
            - reasoning_steps: List of all reasoning steps
            - tool_calls: List of all tools called
            - iterations: Number of iterations taken
        """
        logger.info(f"Starting ReAct loop for query: {query[:100]}...")

        # Build comprehensive context
        context = await self.context_builder.build_full_context(
            node_id=node_id,
            project_id=project_id,
            include_tasks=True,
            include_resources=True,
            include_milestones=True,
            include_sibling_nodes=True,
            include_project_description=True
        )

        # Retrieve relevant documents using RAG (if enabled)
        rag_context = []
        if self.enable_rag and self.rag_service:
            try:
                logger.info("Retrieving relevant documents via RAG...")
                rag_context = self.rag_service.retrieve_relevant_context(
                    project_id=project_id,
                    query=query,
                    max_chunks=5,
                    collection_type="documents",
                    min_relevance=0.3
                )
                if rag_context:
                    logger.info(f"Retrieved {len(rag_context)} relevant document chunks")
                    context["rag_documents"] = rag_context
                    context["has_rag_context"] = True
                else:
                    logger.info("No relevant documents found in RAG store")
                    context["has_rag_context"] = False
            except Exception as e:
                logger.error(f"Error retrieving RAG context: {e}")
                context["has_rag_context"] = False

        # Initialize tracking
        reasoning_steps = []
        all_tool_calls = []
        conversation_history = conversation_history or []

        # Create tool executor
        tool_executor = ToolExecutor(
            db=self.db,
            node_id=node_id,
            project_id=project_id,
            user_id=self.user_id
        )

        for iteration in range(self.max_iterations):
            logger.info(f"ReAct iteration {iteration + 1}/{self.max_iterations}")

            # STEP 1: THOUGHT - Reason about what to do next
            thought_prompt = self._build_thought_prompt(
                query=query,
                context=context,
                reasoning_steps=reasoning_steps,
                iteration=iteration
            )

            thought_response = await self._generate_thought(
                thought_prompt,
                conversation_history,
                context
            )

            reasoning_steps.append({
                "iteration": iteration + 1,
                "type": "thought",
                "content": thought_response.get("thought", ""),
                "should_act": thought_response.get("should_act", False),
                "is_complete": thought_response.get("is_complete", False)
            })

            # Check if we're done
            if thought_response.get("is_complete"):
                logger.info("Goal achieved, generating final response")
                break

            # STEP 2: ACTION - Decide and execute tool calls
            if thought_response.get("should_act"):
                action_result = await self._execute_action(
                    query=query,
                    context=context,
                    reasoning_history=reasoning_steps,
                    conversation_history=conversation_history,
                    tool_executor=tool_executor
                )

                reasoning_steps.append({
                    "iteration": iteration + 1,
                    "type": "action",
                    "tool_calls": action_result.get("tool_calls", []),
                    "tool_results": action_result.get("tool_results", [])
                })

                all_tool_calls.extend(action_result.get("tool_calls", []))

                # STEP 3: OBSERVATION - Observe the results
                observation = self._build_observation(action_result)
                reasoning_steps.append({
                    "iteration": iteration + 1,
                    "type": "observation",
                    "content": observation
                })

                # STEP 4: REFLECTION - Assess progress (optional)
                if self.enable_reflection:
                    reflection = await self._generate_reflection(
                        query=query,
                        reasoning_steps=reasoning_steps,
                        context=context
                    )

                    reasoning_steps.append({
                        "iteration": iteration + 1,
                        "type": "reflection",
                        "content": reflection.get("reflection", ""),
                        "progress_assessment": reflection.get("progress", ""),
                        "next_steps": reflection.get("next_steps", [])
                    })

        # Generate final comprehensive response
        final_response = await self._generate_final_response(
            query=query,
            context=context,
            reasoning_steps=reasoning_steps,
            conversation_history=conversation_history
        )

        return {
            "final_response": final_response,
            "reasoning_steps": reasoning_steps,
            "tool_calls": all_tool_calls,
            "iterations": len([step for step in reasoning_steps if step["type"] == "thought"]),
            "context_used": {
                "tasks_count": len(context.get("tasks", {}).get("node_tasks", [])),
                "milestones_count": context.get("milestones", {}).get("total", 0),
                "related_nodes": context.get("statistics", {})
            }
        }

    def _build_thought_prompt(
        self,
        query: str,
        context: Dict[str, Any],
        reasoning_steps: List[Dict],
        iteration: int
    ) -> str:
        """Build prompt for thought generation"""

        context_str = self.context_builder.format_context_for_prompt(context)

        # Build reasoning history
        history_str = ""
        if reasoning_steps:
            history_str = "\n\n## Previous Reasoning Steps:\n"
            for step in reasoning_steps[-3:]:  # Last 3 steps
                if step["type"] == "thought":
                    history_str += f"\n**Thought:** {step['content']}\n"
                elif step["type"] == "observation":
                    history_str += f"\n**Observation:** {step['content']}\n"
                elif step["type"] == "reflection":
                    history_str += f"\n**Reflection:** {step['content']}\n"

        return f"""You are analyzing the user's request using chain-of-thought reasoning.

## User's Request:
{query}

## Available Context:
{context_str}

{history_str}

## Your Task (Iteration {iteration + 1}/{self.max_iterations}):

Think step-by-step about how to answer the user's request. Use the following format:

<thinking>
1. What is the user really asking?
2. What information do I have from the context?
3. What information am I missing?
4. Should I use any tools to gather more information?
5. Can I answer the question now, or do I need more steps?
</thinking>

After your thinking, provide a JSON response:
{{
    "thought": "Your detailed reasoning process",
    "should_act": true/false,  // Should we call tools?
    "is_complete": true/false,  // Can we answer now?
    "reasoning": "Explanation of your decision",
    "next_action": "What should happen next"
}}

Think deeply and be thorough. Show your reasoning process.
"""

    async def _generate_thought(
        self,
        prompt: str,
        conversation_history: List[Dict],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate a reasoning thought"""

        messages = conversation_history + [
            {"role": "user", "content": prompt}
        ]

        try:
            result = await generate_chat_with_tools(
                messages=messages,
                tools=None,  # No tools for thought generation
                temperature=0.7  # Slightly higher for reasoning
            )

            response_text = result.get("response", "")

            # Try to extract JSON from response
            try:
                # Look for JSON in the response
                if "{" in response_text and "}" in response_text:
                    json_start = response_text.index("{")
                    json_end = response_text.rindex("}") + 1
                    json_str = response_text[json_start:json_end]
                    thought_data = json.loads(json_str)
                else:
                    # Fallback: create structured response
                    thought_data = {
                        "thought": response_text,
                        "should_act": "tool" in response_text.lower() or "need more" in response_text.lower(),
                        "is_complete": "answer" in response_text.lower() and "can provide" in response_text.lower(),
                        "reasoning": "Parsed from text response"
                    }
            except (json.JSONDecodeError, ValueError) as e:
                logger.warning(f"Could not parse thought as JSON: {e}")
                thought_data = {
                    "thought": response_text,
                    "should_act": False,
                    "is_complete": True,
                    "reasoning": "Defaulting to complete"
                }

            return thought_data

        except Exception as e:
            logger.error(f"Error generating thought: {e}")
            return {
                "thought": f"Error in reasoning: {e}",
                "should_act": False,
                "is_complete": True
            }

    async def _execute_action(
        self,
        query: str,
        context: Dict[str, Any],
        reasoning_history: List[Dict],
        conversation_history: List[Dict],
        tool_executor: ToolExecutor
    ) -> Dict[str, Any]:
        """Execute tool calls based on reasoning"""

        context_str = self.context_builder.format_context_for_prompt(context)

        action_prompt = f"""Based on your reasoning, decide which tools to call.

User's request: {query}

Available context:
{context_str}

Available tools:
{json.dumps([tool['function']['name'] for tool in NODE_CHAT_TOOLS], indent=2)}

Call the appropriate tools to gather information or take actions.
"""

        messages = conversation_history + [
            {"role": "user", "content": action_prompt}
        ]

        try:
            result = await generate_chat_with_tools(
                messages=messages,
                tools=NODE_CHAT_TOOLS,
                temperature=0.5
            )

            tool_calls = result.get("tool_calls", [])
            tool_results = []

            # Execute each tool call
            for tool_call in tool_calls:
                tool_name = tool_call.get("name")
                arguments = tool_call.get("arguments", {})

                logger.info(f"Executing tool: {tool_name}")

                try:
                    result = await tool_executor.execute_tool(tool_name, arguments)
                    tool_results.append({
                        "tool": tool_name,
                        "arguments": arguments,
                        "result": result,
                        "success": result.get("status") == "success"
                    })
                except Exception as e:
                    logger.error(f"Error executing tool {tool_name}: {e}")
                    tool_results.append({
                        "tool": tool_name,
                        "arguments": arguments,
                        "error": str(e),
                        "success": False
                    })

            return {
                "tool_calls": tool_calls,
                "tool_results": tool_results
            }

        except Exception as e:
            logger.error(f"Error in action execution: {e}")
            return {
                "tool_calls": [],
                "tool_results": [],
                "error": str(e)
            }

    def _build_observation(self, action_result: Dict[str, Any]) -> str:
        """Build observation summary from action results"""

        tool_results = action_result.get("tool_results", [])

        if not tool_results:
            return "No tools were executed."

        observations = []
        for result in tool_results:
            tool_name = result.get("tool")
            success = result.get("success", False)

            if success:
                observations.append(f"✓ {tool_name} executed successfully")
                if "result" in result:
                    observations.append(f"  Result: {json.dumps(result['result'], indent=2)[:200]}...")
            else:
                error = result.get("error", "Unknown error")
                observations.append(f"✗ {tool_name} failed: {error}")

        return "\n".join(observations)

    async def _generate_reflection(
        self,
        query: str,
        reasoning_steps: List[Dict],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate reflection on progress"""

        recent_steps = reasoning_steps[-3:]  # Last 3 steps

        reflection_prompt = f"""Reflect on the progress made so far.

Original request: {query}

Recent steps taken:
{json.dumps(recent_steps, indent=2)}

Provide a reflection:
{{
    "reflection": "What have we learned so far?",
    "progress": "How close are we to answering the question?",
    "next_steps": ["What should we do next?"]
}}
"""

        try:
            result = await generate_chat_with_tools(
                messages=[{"role": "user", "content": reflection_prompt}],
                tools=None,
                temperature=0.6
            )

            response = result.get("response", "")

            # Try to parse JSON
            try:
                if "{" in response:
                    json_start = response.index("{")
                    json_end = response.rindex("}") + 1
                    reflection_data = json.loads(response[json_start:json_end])
                else:
                    reflection_data = {
                        "reflection": response,
                        "progress": "Making progress",
                        "next_steps": ["Continue with next iteration"]
                    }
            except:
                reflection_data = {
                    "reflection": response,
                    "progress": "Ongoing",
                    "next_steps": []
                }

            return reflection_data

        except Exception as e:
            logger.error(f"Error generating reflection: {e}")
            return {
                "reflection": f"Error: {e}",
                "progress": "Unknown",
                "next_steps": []
            }

    async def _generate_final_response(
        self,
        query: str,
        context: Dict[str, Any],
        reasoning_steps: List[Dict],
        conversation_history: List[Dict]
    ) -> str:
        """Generate comprehensive final response"""

        context_str = self.context_builder.format_context_for_prompt(context)

        # Summarize reasoning
        reasoning_summary = []
        for step in reasoning_steps:
            if step["type"] == "thought":
                reasoning_summary.append(f"💭 Thought: {step['content'][:200]}...")
            elif step["type"] == "observation":
                reasoning_summary.append(f"👁️ Observed: {step['content'][:150]}...")

        final_prompt = f"""Now provide a comprehensive final answer to the user's request.

## User's Original Request:
{query}

## Available Context:
{context_str}

## Reasoning Process:
{chr(10).join(reasoning_summary)}

## Your Task:
Provide a clear, comprehensive answer that:
1. Directly addresses the user's question
2. References specific information from the context (tasks, milestones, nodes, etc.)
3. Explains your reasoning transparently
4. Offers actionable next steps if applicable

Be thorough, specific, and helpful. Show the user you've done deep analysis.
"""

        messages = conversation_history + [
            {"role": "user", "content": final_prompt}
        ]

        try:
            result = await generate_chat_with_tools(
                messages=messages,
                tools=None,
                temperature=0.7
            )

            return result.get("response", "I apologize, I couldn't generate a response.")

        except Exception as e:
            logger.error(f"Error generating final response: {e}")
            return f"I encountered an error while generating the final response: {e}"
