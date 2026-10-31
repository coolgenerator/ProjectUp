"""
Personalized Suggestions Routes

Generates context-aware suggestions for IdeaTree based on project data.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import logging
from langchain_google_vertexai import ChatVertexAI
from langchain_core.messages import SystemMessage, HumanMessage

from config.settings import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai-api/idea-tree", tags=["personalized-suggestions"])


class ProjectContext(BaseModel):
    """Project context for generating personalized suggestions."""
    projectTitle: str
    projectGoals: Optional[str] = ""
    tasksCount: int = 0
    milestonesCount: int = 0
    plansCount: int = 0
    recentTasks: List[Dict[str, Any]] = []
    recentMilestones: List[Dict[str, Any]] = []
    recentPlans: List[Dict[str, Any]] = []


class PersonalizedSuggestionsRequest(BaseModel):
    """Request for personalized suggestions."""
    project_context: ProjectContext
    count: int = 4


class Suggestion(BaseModel):
    """A single personalized suggestion."""
    title: str
    description: str
    prompt: str
    icon: str
    reason: str  # Why this suggestion is relevant


@router.post("/personalized-suggestions",
    summary="Generate Personalized Suggestions",
    description="Generate context-aware IdeaTree suggestions based on project data"
)
async def generate_personalized_suggestions(request: PersonalizedSuggestionsRequest):
    """Generate personalized IdeaTree suggestions based on project context."""
    try:
        # Initialize LLM
        llm = ChatVertexAI(
            model=settings.vertex_ai_model,
            temperature=0.8,
            max_output_tokens=4096,  # Increased for detailed chain-of-thought prompts
            project=settings.gcp_project_id,
            location=settings.gcp_location
        )

        # Build context summary
        context = request.project_context
        logger.info(f"Received project context: Title='{context.projectTitle}', Goals/Desc length={len(context.projectGoals or '')}")

        context_summary = f"""
Project Information:
- Title: {context.projectTitle}
- Goals/Description: {context.projectGoals or 'Not specified'}
- Current Status:
  - {context.tasksCount} tasks
  - {context.milestonesCount} milestones
  - {context.plansCount} plans

Recent Tasks:
{_format_items(context.recentTasks, 'title', 'status') if context.recentTasks else 'None yet'}

Recent Milestones:
{_format_items(context.recentMilestones, 'title', 'status') if context.recentMilestones else 'None yet'}

Recent Plans:
{_format_items(context.recentPlans, 'title', 'plan_type') if context.recentPlans else 'None yet'}
"""

        system_prompt = """You are an expert project planning assistant helping users deeply explore ideas for their projects.

Your task is to analyze the project context and generate personalized suggestions that guide users through THOUGHTFUL, DETAILED explorations.

CRITICAL PRINCIPLES:
1. NEVER generate generic one-liners like "Define Project Goals" or "Create a Roadmap"
2. Create prompts that guide the AI through CHAIN-OF-THOUGHT reasoning
3. Prompts should include multiple aspects to consider, questions to explore, and trade-offs to analyze
4. Incorporate the project's specific context (title, description, domain) into every suggestion

PROMPT STRUCTURE (3-5 sentences):
Each prompt should:
- Start with project context ("For my project [title]...")
- State the specific aspect to explore
- Ask multiple related questions or considerations
- Mention relevant factors, constraints, or trade-offs
- Guide toward actionable insights

GOOD PROMPT EXAMPLE STRUCTURE:
"For my project '[Project Title]', I want to explore [specific aspect]. What are the key considerations for [sub-aspect 1], [sub-aspect 2], and [sub-aspect 3]? Help me analyze the trade-offs between [approach A] and [approach B], considering [constraint 1] and [constraint 2]. What are the potential challenges I should anticipate, and what are the best practices in this area?"

For each suggestion, provide:
- title: Clear, specific title related to the project (max 60 chars)
- description: What aspects this will explore (max 120 chars)
- prompt: A DETAILED, THOUGHTFUL prompt (3-5 sentences) using chain-of-thought structure
- icon: An emoji representing the suggestion
- reason: Why this exploration is valuable for this project (max 100 chars)

Format your response as a JSON object with a "suggestions" array."""

        user_prompt = f"""Based on the following project context, generate {request.count} personalized IdeaTree suggestions with DETAILED, THOUGHTFUL prompts:

{context_summary}

CRITICAL INSTRUCTIONS - TWO-STEP ANALYSIS:

STEP 1: Evaluate Relevance
- First, analyze if the existing tasks/milestones/plans are ACTUALLY RELATED to the project's title and description
- Consider them relevant ONLY if they clearly align with the project's domain, goals, and scope
- Treat as IRRELEVANT if they are:
  * Test data or placeholders (e.g., random words, single characters, "test", "好嘟")
  * In a different language with no clear connection to the project
  * Generic or unrelated to the project's specific domain
  * Obviously experimental or trial entries

STEP 2: Generate Suggestions
- IF tasks/milestones/plans are RELEVANT:
  * Build upon existing work
  * Suggest next steps, deeper explorations, or optimizations
  * Address gaps or extend current efforts
  * Reference specific existing items in the suggestions

- IF tasks/milestones/plans are IRRELEVANT or EMPTY:
  * Base suggestions ENTIRELY on the project title and description
  * Focus on foundational explorations for getting started
  * Suggest key aspects to explore for this type of project
  * Do NOT mention or reference the irrelevant tasks

REQUIREMENTS:
1. Analyze the project title and description to understand the domain and objectives
2. Generate suggestions that help explore different aspects deeply
3. Create DETAILED chain-of-thought prompts (3-5 sentences each) that:
   - Reference the specific project by name
   - Ask multiple related questions or considerations
   - Explore trade-offs, challenges, and best practices
   - Guide the AI toward comprehensive analysis
   - Use ONLY text - no image references, no table placeholders (e.g., do NOT write "[Image #1]" or "[Table 1]")

4. Suggestion categories (choose relevant ones based on project):
   - Technical approach viability and feasibility analysis
   - Implementation strategy and architecture decisions
   - Potential challenges, risks, and mitigation strategies
   - Resource requirements and timeline considerations
   - Alternative approaches and their trade-offs
   - Success metrics and evaluation criteria
   - Domain-specific best practices and methodologies

5. If the project has existing tasks/milestones/plans:
   - Suggest explorations that deepen understanding
   - Identify optimization opportunities
   - Explore what-if scenarios or alternatives

6. Make each prompt guide the AI through MULTIPLE aspects:
   ✓ "For [project], explore [X]. What are [questions A, B, C]? Analyze [trade-off]. Consider [constraints]."
   ✗ "Help me define project goals" (too generic and short)

Return JSON format:
{{
  "suggestions": [
    {{
      "title": "Specific aspect to explore (max 60 chars)",
      "description": "What dimensions this will cover (max 120 chars)",
      "prompt": "For my project '{context.projectTitle}', [detailed 3-5 sentence chain-of-thought prompt with questions, considerations, trade-offs]...",
      "icon": "🔍",
      "reason": "Why exploring this helps the project (max 100 chars)"
    }}
  ]
}}"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt)
        ]

        # Get AI response (CRITICAL: Use ainvoke for async non-blocking call)
        response = await llm.ainvoke(messages)

        # Parse JSON response
        import json
        import re

        # Extract JSON from response
        content = response.content
        logger.info(f"Raw LLM response length: {len(content)} chars")
        logger.info(f"Raw LLM response (first 500 chars): {content[:500]}")
        logger.info(f"Raw LLM response (last 200 chars): ...{content[-200:]}")
        logger.info(f"Has opening backticks: {'```' in content}")
        logger.info(f"Number of backtick blocks: {content.count('```')}")

        # Try to extract JSON from markdown code blocks or plain text
        json_str = None

        # First try markdown code block
        if '```' in content:
            # Extract content between ``` markers (greedy to get everything)
            code_block_match = re.search(r'```(?:json)?\s*(.*)\s*```', content, re.DOTALL)
            if code_block_match:
                json_str = code_block_match.group(1).strip()
                logger.info(f"Extracted from code block, length: {len(json_str)}")

        # If no code block, try to find JSON object directly
        if not json_str:
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                json_str = json_match.group().strip()
                logger.info(f"Extracted as plain JSON, length: {len(json_str)}")

        if not json_str:
            logger.error("No JSON found in LLM response")
            return {
                "status": "success",
                "suggestions": []
            }

        try:
            # Clean up common JSON issues
            json_str = json_str.strip()
            # Remove trailing commas before closing braces/brackets
            json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)

            data = json.loads(json_str)
            suggestions = data.get('suggestions', [])

            # Validate suggestions
            validated_suggestions = []
            for s in suggestions[:request.count]:
                if all(key in s for key in ['title', 'description', 'prompt', 'icon', 'reason']):
                    validated_suggestions.append(s)
                else:
                    logger.warning(f"Invalid suggestion format: {s}")

            logger.info(f"Successfully parsed {len(validated_suggestions)} suggestions")
            return {
                "status": "success",
                "suggestions": validated_suggestions
            }
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            logger.error(f"Attempted to parse: {json_str[:500]}")
            return {
                "status": "success",
                "suggestions": []
            }

    except Exception as e:
        logger.error(f"Error generating personalized suggestions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _format_items(items: List[Dict], title_key: str, status_key: str) -> str:
    """Format a list of items for context summary."""
    if not items:
        return "None"

    formatted = []
    for item in items:
        title = item.get(title_key, 'Untitled')
        status = item.get(status_key, 'unknown')
        formatted.append(f"  - {title} ({status})")

    return "\n".join(formatted)
