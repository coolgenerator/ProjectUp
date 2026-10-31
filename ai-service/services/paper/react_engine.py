"""
PaperReActEngine - Chain of Thought reasoning for paper analysis
Implements ReAct (Reason + Act) pattern with paper-specific tools and web search
"""

import logging
from typing import Dict, List, Any, Optional, AsyncIterator
from langchain_google_vertexai import ChatVertexAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from config.settings import settings
import json

from tools.paper_tools import create_paper_tools
from tools.common_tools import WebSearchTool, WikipediaTool

logger = logging.getLogger(__name__)


class PaperReActEngine:
    """
    ReAct (Reason + Act) Engine for paper analysis with chain-of-thought reasoning

    Implements iterative reasoning loop:
    1. Thought: Analyze what information is needed
    2. Action: Choose and execute tools (paper search, web search, etc.)
    3. Observation: Process tool results
    4. Reflection: Assess progress and decide next steps
    5. Repeat until answer is complete
    """

    def __init__(
        self,
        paper_text: str,
        max_iterations: int = 5,
        enable_reflection: bool = True,
        enable_web_search: bool = True
    ):
        """
        Initialize the ReAct engine for paper analysis

        Args:
            paper_text: Full text of the paper
            max_iterations: Maximum reasoning iterations (1-10)
            enable_reflection: Enable reflection step after observations
            enable_web_search: Enable web search capabilities
        """
        self.paper_text = paper_text
        self.max_iterations = min(max(max_iterations, 1), 10)
        self.enable_reflection = enable_reflection
        self.enable_web_search = enable_web_search

        # Initialize LLM for reasoning
        self.llm = ChatVertexAI(
            model_name="gemini-2.0-flash-exp",
            project=settings.VERTEX_PROJECT_ID,
            location=settings.VERTEX_LOCATION,
            temperature=0.3,
        )

        # Initialize tools
        self.tools = self._initialize_tools()
        self.tool_map = {tool.name: tool for tool in self.tools}

        logger.info(f"PaperReActEngine initialized with {len(self.tools)} tools, max_iterations={self.max_iterations}")

    def _initialize_tools(self) -> List:
        """Initialize all available tools for paper analysis"""
        tools = []

        # Add paper-specific tools (these always work)
        paper_tools = create_paper_tools(self.paper_text)
        tools.extend(paper_tools)
        logger.info(f"Paper analysis tools initialized: {len(paper_tools)} tools")

        # Add web search if enabled (optional - graceful failure)
        if self.enable_web_search:
            web_search_initialized = False

            # Try DuckDuckGo first (default)
            try:
                web_search = WebSearchTool(provider="duckduckgo")
                tools.append(web_search.as_tool())
                logger.info("✓ Web search enabled (DuckDuckGo)")
                web_search_initialized = True
            except Exception as e:
                logger.info(f"✗ DuckDuckGo not available: {str(e)[:100]}")

                # Try Tavily as fallback
                try:
                    web_search = WebSearchTool(provider="tavily")
                    tools.append(web_search.as_tool())
                    logger.info("✓ Web search enabled (Tavily)")
                    web_search_initialized = True
                except Exception as e2:
                    logger.info(f"✗ Tavily not available: {str(e2)[:100]}")

            # Try Wikipedia (independent of web search)
            try:
                wiki = WikipediaTool()
                tools.append(wiki.as_tool())
                logger.info("✓ Wikipedia enabled")
            except Exception as e:
                logger.info(f"✗ Wikipedia not available: {str(e)[:100]}")

            if not web_search_initialized:
                logger.info("ℹ️  Continuing with paper-only tools (web search unavailable)")

        return tools

    def _get_tools_description(self) -> str:
        """Get formatted description of all available tools"""
        descriptions = []
        for tool in self.tools:
            descriptions.append(f"- {tool.name}: {tool.description}")
        return "\n".join(descriptions)

    async def run_react_loop(
        self,
        question: str,
        context: Optional[str] = None
    ) -> AsyncIterator[Dict[str, Any]]:
        """
        Run the ReAct reasoning loop with streaming output

        Args:
            question: User's question about the paper
            context: Optional selected text context from the paper

        Yields:
            Streaming events:
            - {"type": "reasoning", "step": int, "phase": str, "content": str}
            - {"type": "tool_call", "tool": str, "args": dict}
            - {"type": "observation", "result": str}
            - {"type": "reflection", "content": str}
            - {"type": "final_answer", "content": str}
            - {"type": "complete"}
        """
        logger.info(f"Starting ReAct loop for question: {question[:100]}...")

        conversation_history = []
        reasoning_steps = []

        # Initial system message
        system_prompt = self._get_system_prompt(question, context)
        conversation_history.append(SystemMessage(content=system_prompt))

        for iteration in range(1, self.max_iterations + 1):
            yield {
                "type": "reasoning",
                "step": iteration,
                "phase": "thinking",
                "content": f"Starting reasoning iteration {iteration}/{self.max_iterations}..."
            }

            # THOUGHT PHASE: Generate reasoning about what to do next
            thought = await self._generate_thought(
                question=question,
                conversation_history=conversation_history,
                iteration=iteration
            )

            yield {
                "type": "reasoning",
                "step": iteration,
                "phase": "thought",
                "content": thought["content"]
            }

            reasoning_steps.append({
                "iteration": iteration,
                "thought": thought["content"]
            })

            # Check if we should stop (have enough information)
            if thought.get("should_stop", False):
                yield {
                    "type": "reasoning",
                    "step": iteration,
                    "phase": "decision",
                    "content": "Sufficient information gathered. Generating final answer..."
                }
                break

            # ACTION PHASE: Decide which tool to use
            if thought.get("should_act", True):
                action = await self._decide_action(
                    thought=thought["content"],
                    conversation_history=conversation_history
                )

                if action.get("tool_name"):
                    tool_name = action["tool_name"]
                    tool_input = action.get("tool_input", "")

                    yield {
                        "type": "tool_call",
                        "step": iteration,
                        "tool": tool_name,
                        "args": {"input": tool_input}
                    }

                    # OBSERVATION PHASE: Execute tool and get results
                    observation = await self._execute_tool(tool_name, tool_input)

                    yield {
                        "type": "observation",
                        "step": iteration,
                        "tool": tool_name,
                        "result": observation[:1000]  # Limit output length
                    }

                    reasoning_steps[-1]["action"] = tool_name
                    reasoning_steps[-1]["observation"] = observation[:500]

                    # Add to conversation history
                    conversation_history.append(
                        AIMessage(content=f"Tool: {tool_name}\nInput: {tool_input}\nResult: {observation[:1000]}")
                    )

                    # REFLECTION PHASE: Assess progress
                    if self.enable_reflection:
                        reflection = await self._generate_reflection(
                            thought=thought["content"],
                            action=tool_name,
                            observation=observation,
                            question=question
                        )

                        yield {
                            "type": "reflection",
                            "step": iteration,
                            "content": reflection
                        }

                        reasoning_steps[-1]["reflection"] = reflection

        # Generate final answer based on all gathered information
        yield {
            "type": "reasoning",
            "phase": "final",
            "content": "Synthesizing final answer from gathered information..."
        }

        final_answer = await self._generate_final_answer(
            question=question,
            conversation_history=conversation_history,
            context=context
        )

        # Stream the final answer in chunks
        for chunk in final_answer.split('\n'):
            if chunk.strip():
                yield {
                    "type": "final_answer",
                    "content": chunk + '\n'
                }

        yield {
            "type": "complete",
            "iterations": len(reasoning_steps),
            "steps": reasoning_steps
        }

    def _get_system_prompt(self, question: str, context: Optional[str] = None) -> str:
        """Generate system prompt for the ReAct agent"""
        context_info = f"\n\nSelected Context from Paper:\n{context}" if context else ""

        return f"""You are an expert AI research assistant using chain-of-thought reasoning to analyze research papers.

You have access to the following tools:
{self._get_tools_description()}

Your task is to answer this question: {question}{context_info}

RECOMMENDED STRATEGY:
1. Start by calling get_paper_metadata to understand the paper's title and abstract
2. Use list_paper_sections to see what sections are available
3. Based on the question, search specific sections (e.g., search_paper_section with "methods" or "results")
4. Use search_paper_keyword to find specific terms or concepts
5. If needed, use web_search to find related work or validate claims

Use a structured reasoning approach:
1. THOUGHT: Think about what information you need
2. ACTION: Decide which tool to use (if any)
3. OBSERVATION: Analyze the tool's results
4. REFLECTION: Assess if you have enough information
5. Repeat until you can provide a comprehensive answer

IMPORTANT: For tools that don't need input (get_paper_metadata, list_paper_sections, get_paper_stats, find_figures_tables), always use an empty string "" as the tool_input.

Be systematic and thorough. Use tools strategically to gather relevant information before answering."""

    async def _generate_thought(
        self,
        question: str,
        conversation_history: List,
        iteration: int
    ) -> Dict[str, Any]:
        """Generate reasoning about what to do next"""

        prompt = f"""Based on the conversation so far, think step-by-step about what information you need to answer the question.

Question: {question}

Iteration: {iteration}/{self.max_iterations}

Provide your reasoning in JSON format:
{{
    "content": "Your step-by-step reasoning here",
    "should_act": true/false (whether you need to use a tool),
    "should_stop": true/false (whether you have enough info to answer)
}}

Think carefully about whether you need more information or can answer now.

IMPORTANT: Respond ONLY with valid JSON. No markdown, no explanations, just the JSON object."""

        conversation_history.append(HumanMessage(content=prompt))

        try:
            response = self.llm.invoke(conversation_history)
        except Exception as e:
            # Handle rate limiting and other API errors
            error_msg = str(e)
            if '429' in error_msg or 'Quota exceeded' in error_msg:
                logger.error("Vertex AI quota exceeded in _generate_thought. Using fallback.")
                # Return a simple fallback response
                class FallbackResponse:
                    content = "I need to analyze the paper systematically to answer this question."
                response = FallbackResponse()
            else:
                raise e  # Re-raise if it's not a rate limit error

        # Parse JSON response with better error handling
        try:
            content = response.content.strip()

            # Remove markdown code blocks
            if '```' in content:
                # Extract content between code blocks
                parts = content.split('```')
                if len(parts) >= 3:
                    content = parts[1]
                    # Remove language identifier
                    if content.startswith('json'):
                        content = content[4:]
                    elif content.startswith('JSON'):
                        content = content[4:]
                content = content.strip()

            # Try to find JSON object in the response
            if not content.startswith('{'):
                # Try to find JSON object
                start_idx = content.find('{')
                end_idx = content.rfind('}')
                if start_idx != -1 and end_idx != -1:
                    content = content[start_idx:end_idx + 1]

            result = json.loads(content)
            # Ensure required "content" key exists
            if "content" not in result:
                logger.warning("JSON missing 'content' key, using raw response")
                result["content"] = response.content[:500]
            return result
        except Exception as e:
            logger.warning(f"Failed to parse thought JSON: {e}")
            logger.warning(f"Response content: {response.content[:200]}")
            # Return fallback with the raw content as reasoning
            return {
                "content": response.content[:500],  # Use the response as thought
                "should_act": iteration < self.max_iterations,
                "should_stop": False
            }

    async def _decide_action(
        self,
        thought: str,
        conversation_history: List
    ) -> Dict[str, Any]:
        """Decide which tool to use based on current reasoning"""

        prompt = f"""Based on your reasoning, decide which tool to use.

Your reasoning: {thought}

Available tools:
{self._get_tools_description()}

IMPORTANT NOTES:
- For tools that don't need input (get_paper_metadata, list_paper_sections, get_paper_stats, find_figures_tables), use an empty string "" as tool_input
- For tools that need input (search_paper_section, search_paper_keyword), provide the specific input needed

Respond in JSON format:
{{
    "tool_name": "name_of_tool_to_use",
    "tool_input": "input_for_the_tool (use empty string for no-input tools)"
}}

Examples:
- To get metadata: {{"tool_name": "get_paper_metadata", "tool_input": ""}}
- To search a section: {{"tool_name": "search_paper_section", "tool_input": "methods"}}
- To list sections: {{"tool_name": "list_paper_sections", "tool_input": ""}}

Choose the most appropriate tool, or use null if no tool is needed."""

        conversation_history.append(HumanMessage(content=prompt))
        response = self.llm.invoke(conversation_history)

        try:
            content = response.content.strip()

            # Remove markdown code blocks
            if '```' in content:
                parts = content.split('```')
                if len(parts) >= 3:
                    content = parts[1]
                    if content.startswith('json') or content.startswith('JSON'):
                        content = content[4:]
                content = content.strip()

            # Try to find JSON object in the response
            if not content.startswith('{'):
                start_idx = content.find('{')
                end_idx = content.rfind('}')
                if start_idx != -1 and end_idx != -1:
                    content = content[start_idx:end_idx + 1]

            result = json.loads(content)
            # Ensure tool_input is a string (empty string if None or missing)
            if result.get("tool_name") and not result.get("tool_input"):
                result["tool_input"] = ""
            return result
        except Exception as e:
            logger.warning(f"Failed to parse action JSON: {e}")
            logger.warning(f"Response content: {response.content[:200]}")
            return {"tool_name": None, "tool_input": ""}

    async def _execute_tool(self, tool_name: str, tool_input: str) -> str:
        """Execute a tool and return the observation"""
        if tool_name not in self.tool_map:
            available_tools = ", ".join(self.tool_map.keys())
            return f"Error: Tool '{tool_name}' not found. Available tools: {available_tools}"

        try:
            tool = self.tool_map[tool_name]

            # Handle empty input for no-input tools
            if not tool_input or tool_input.lower() in ['none', 'null', 'n/a']:
                tool_input = ""

            result = tool.func(tool_input)
            return str(result)
        except TypeError as e:
            # This might happen if the function signature is wrong
            logger.error(f"TypeError executing tool {tool_name} with input '{tool_input}': {e}")
            # Try calling with no arguments as fallback
            try:
                result = tool.func("")
                return str(result)
            except Exception as e2:
                logger.error(f"Fallback also failed: {e2}")
                return f"Error: Tool '{tool_name}' failed. Please check the tool usage. Original error: {str(e)}"
        except Exception as e:
            logger.error(f"Error executing tool {tool_name}: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return f"Error executing {tool_name}: {str(e)}"

    async def _generate_reflection(
        self,
        thought: str,
        action: str,
        observation: str,
        question: str
    ) -> str:
        """Generate reflection on progress toward answering the question"""

        prompt = f"""Reflect on the progress made toward answering the question.

Question: {question}
Your reasoning: {thought}
Action taken: {action}
Observation: {observation[:500]}

Provide a brief reflection (2-3 sentences):
- What did you learn from this action?
- Do you have enough information to answer, or do you need more?
- What should you do next?

Provide just the reflection text, no JSON."""

        response = self.llm.invoke([HumanMessage(content=prompt)])
        return response.content.strip()

    async def _generate_final_answer(
        self,
        question: str,
        conversation_history: List,
        context: Optional[str] = None
    ) -> str:
        """Generate the final comprehensive answer"""

        context_info = f"\n\nUser's selected context: {context}" if context else ""

        prompt = f"""Based on all the information you've gathered through your reasoning and tool usage, provide a comprehensive answer to the question.

Question: {question}{context_info}

Provide a clear, well-structured answer that:
1. Directly addresses the question
2. Synthesizes information from all your research
3. Cites specific sections or sources when relevant
4. Is accurate and helpful

Provide your final answer (no JSON, just the answer text):"""

        conversation_history.append(HumanMessage(content=prompt))
        response = self.llm.invoke(conversation_history)

        return response.content.strip()
