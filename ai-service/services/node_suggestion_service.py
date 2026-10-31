"""
Node Suggestion Service

Generates contextual child node suggestions based on parent node content.
"""

import logging
from typing import List, Dict, Any, Optional
from langchain_google_vertexai import ChatVertexAI
from langchain_core.messages import SystemMessage, HumanMessage
import json
import re
import uuid

logger = logging.getLogger(__name__)


class NodeSuggestionService:
    """
    Generates smart suggestions for child nodes based on parent context.

    Analyzes:
    - Parent node title and description
    - Parent node type (if available in metadata)
    - Existing child nodes (to avoid duplicates)
    - Recent chat messages (for additional context)
    """

    def __init__(self, model_name: str = "gemini-2.5-pro", temperature: float = 0.7):
        """
        Initialize suggestion service.

        Args:
            model_name: Vertex AI model to use
            temperature: LLM temperature (0.7 for creative suggestions)
        """
        self.llm = ChatVertexAI(model=model_name, temperature=temperature)

    async def generate_suggestions(
        self,
        parent_node_id: str,
        parent_title: str,
        parent_description: str,
        existing_children: List[Dict[str, Any]] = None,
        recent_chat: List[str] = None,
        count: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Generate contextual child node suggestions.

        Args:
            parent_node_id: Parent node ID
            parent_title: Parent node title
            parent_description: Parent node description
            existing_children: List of existing child nodes
            recent_chat: Recent chat messages for context
            count: Number of suggestions to generate (default 5)

        Returns:
            List of suggested nodes with:
            - title: Suggested node title
            - description: Suggested description
            - template_type: Suggested template (if any)
            - rationale: Why this suggestion is relevant
            - priority: 1-3 (1=high, 2=medium, 3=low)
        """
        try:
            logger.info(f"Generating {count} suggestions for parent node: {parent_node_id}")

            # Build context - include both title and description for better duplicate detection
            existing_children_list = existing_children or []
            existing_children_info = [
                {
                    "title": child.get("title", ""),
                    "description": child.get("description", "")
                }
                for child in existing_children_list
            ]

            # Log existing children to verify duplicate avoidance
            if existing_children_info:
                logger.info(f"Avoiding duplicates of {len(existing_children_info)} existing children: {[c['title'] for c in existing_children_info]}")

            chat_context = "\n".join(recent_chat or []) if recent_chat else "No recent chat"

            system_prompt = self._build_system_prompt()
            human_prompt = self._build_human_prompt(
                parent_title=parent_title,
                parent_description=parent_description,
                existing_children=existing_children_info,
                chat_context=chat_context,
                count=count
            )

            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=human_prompt)
            ]

            response = await self.llm.ainvoke(messages)
            suggestions = self._parse_suggestions(response.content)

            logger.info(f"Generated {len(suggestions)} suggestions for node {parent_node_id}")
            return suggestions

        except Exception as e:
            logger.error(f"Error generating suggestions: {e}")
            return self._fallback_suggestions(parent_title, parent_description)

    def _build_system_prompt(self) -> str:
        """Build the system prompt for suggestion generation"""
        return """You are an AI assistant that helps users build project structures by suggesting relevant child nodes.

When a user is working on a parent node, suggest 3-5 logical next steps, sub-components, or related items that would help them progress.

**Suggestion Types:**
1. **Break Down**: Decompose complex ideas into smaller components
2. **Next Steps**: Action items or tasks to accomplish the goal
3. **Learning Resources**: Courses, tutorials, or research needed
4. **Dependencies**: Prerequisites or blockers to address
5. **Milestones**: Key checkpoints or deliverables
6. **Related Ideas**: Connected concepts to explore

**Guidelines:**
- Be specific and actionable
- **NEVER duplicate existing child nodes** - check titles AND concepts carefully
- If an existing child covers a topic, suggest a different aspect or next step instead
- Consider recent chat context for relevance
- Prioritize based on logical workflow
- Use clear, concise titles (3-7 words)
- Provide helpful descriptions (1-2 sentences)

**Response Format:**
Return ONLY a JSON array:
```json
[
  {
    "title": "Specific, actionable title",
    "description": "1-2 sentence description of what this child node represents",
    "template_type": "expand|breakdown|learning|action|milestone|idea",
    "rationale": "Why this suggestion is relevant now",
    "priority": 1
  }
]
```

priority: 1=most important/logical next step, 2=helpful but not critical, 3=optional/exploratory

**Important**: Ensure titles are unique and don't duplicate existing child nodes."""

    def _build_human_prompt(
        self,
        parent_title: str,
        parent_description: str,
        existing_children: List[Dict[str, str]],
        chat_context: str,
        count: int
    ) -> str:
        """Build the human prompt with context"""
        if existing_children:
            existing_str = "\n".join([
                f"- {child['title']}" + (f": {child['description']}" if child.get('description') else "")
                for child in existing_children
            ])
        else:
            existing_str = "None"

        return f"""Generate {count} contextual suggestions for child nodes.

**Parent Node:**
- Title: {parent_title}
- Description: {parent_description or 'No description provided'}

**Existing Child Nodes (DO NOT DUPLICATE):**
{existing_str}

**Recent Chat Context:**
{chat_context}

**Task:**
Suggest {count} relevant child nodes that would help develop this parent node.

⚠️ **CRITICAL**: DO NOT suggest any node with a title or concept similar to the existing child nodes listed above. Your suggestions must be completely different from existing children.

Focus on logical next steps or important components that don't yet exist.

Return the JSON array of suggestions."""

    def _parse_suggestions(self, llm_response: str) -> List[Dict[str, Any]]:
        """Parse LLM response into suggestion objects"""
        try:
            # Extract JSON
            json_match = re.search(r'```json\s*(.*?)\s*```', llm_response, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                json_match = re.search(r'\[.*\]', llm_response, re.DOTALL)
                json_str = json_match.group() if json_match else "[]"

            suggestions = json.loads(json_str)

            # Validate and normalize
            normalized = []
            for sug in suggestions:
                if isinstance(sug, dict) and "title" in sug:
                    normalized.append({
                        "id": f"sug_{uuid.uuid4().hex[:8]}",
                        "title": sug.get("title", ""),
                        "description": sug.get("description", ""),
                        "template_type": sug.get("template_type", "expand"),
                        "rationale": sug.get("rationale", ""),
                        "priority": sug.get("priority", 2)
                    })

            return normalized

        except Exception as e:
            logger.error(f"Error parsing suggestions: {e}")
            logger.debug(f"LLM response: {llm_response}")
            return []

    async def generate_root_node_suggestions(
        self,
        project_id: str,
        project_title: str,
        project_goals: str = "",
        count: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Generate contextual suggestions for the first node in a tree based on project context.

        Args:
            project_id: Project ID
            project_title: Project title
            project_goals: Project goals/description
            count: Number of suggestions to generate (default 5)

        Returns:
            List of suggested root nodes with:
            - title: Suggested node title
            - description: Suggested description
            - template_type: Suggested template (if any)
            - rationale: Why this suggestion is relevant
            - priority: 1-3 (1=high, 2=medium, 3=low)
        """
        try:
            logger.info(f"Generating {count} root node suggestions for project: {project_id}")

            system_prompt = self._build_root_node_system_prompt()
            human_prompt = self._build_root_node_human_prompt(
                project_title=project_title,
                project_goals=project_goals,
                count=count
            )

            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=human_prompt)
            ]

            response = await self.llm.ainvoke(messages)
            suggestions = self._parse_suggestions(response.content)

            logger.info(f"Generated {len(suggestions)} root node suggestions for project {project_id}")
            return suggestions

        except Exception as e:
            logger.error(f"Error generating root node suggestions: {e}")
            return self._fallback_root_suggestions(project_title, project_goals)

    def _build_root_node_system_prompt(self) -> str:
        """Build the system prompt for root node suggestion generation"""
        return """You are an AI assistant that helps users start new idea trees by suggesting relevant first nodes based on their project goals.

When creating the first node in an idea tree, suggest 5 logical starting points that align with the project's objectives.

**Root Node Types:**
1. **Core Feature/Component**: Main building block of the project
2. **Research Topic**: Key area to explore first
3. **Planning/Strategy**: High-level planning or approach
4. **Problem Definition**: Core problem to solve
5. **Goal/Milestone**: Key objective to achieve

**Guidelines:**
- Align suggestions with the project title and goals
- Be specific and actionable
- Each suggestion should be a meaningful starting point
- Avoid generic suggestions - tailor to the project context
- Use clear, concise titles (3-7 words)
- Provide helpful descriptions (1-2 sentences)
- Prioritize based on logical workflow

**Response Format:**
Return ONLY a JSON array:
```json
[
  {
    "title": "Specific, actionable title aligned with project",
    "description": "1-2 sentence description of what this root node represents",
    "template_type": "feature|research|planning|problem|goal",
    "rationale": "Why this is a good starting point for this project",
    "priority": 1
  }
]
```

priority: 1=essential starting point, 2=important but secondary, 3=optional/exploratory"""

    def _build_root_node_human_prompt(
        self,
        project_title: str,
        project_goals: str,
        count: int
    ) -> str:
        """Build the human prompt for root node suggestions"""
        return f"""Generate {count} contextual suggestions for the first node in a new idea tree.

**Project Context:**
- Title: {project_title}
- Goals/Description: {project_goals or 'Not provided'}

**Task:**
Suggest {count} relevant starting points for the first node in this project's idea tree.

Each suggestion should:
1. Align with the project's title and goals
2. Provide a clear, specific starting point
3. Help the user make meaningful progress on their project
4. Be unique from each other (cover different aspects)

Return the JSON array of suggestions."""

    def _fallback_root_suggestions(
        self,
        project_title: str,
        project_goals: str
    ) -> List[Dict[str, Any]]:
        """Generate simple fallback suggestions for root nodes if AI fails"""
        return [
            {
                "id": f"sug_{uuid.uuid4().hex[:8]}",
                "title": f"Core Goals for {project_title}",
                "description": "Define the main objectives and success criteria for this project",
                "template_type": "goal",
                "rationale": "Start by clarifying what you want to achieve",
                "priority": 1
            },
            {
                "id": f"sug_{uuid.uuid4().hex[:8]}",
                "title": "Research and Discovery",
                "description": "Explore existing solutions, best practices, and key concepts",
                "template_type": "research",
                "rationale": "Build knowledge foundation before implementation",
                "priority": 1
            },
            {
                "id": f"sug_{uuid.uuid4().hex[:8]}",
                "title": "Project Planning",
                "description": "Create roadmap, milestones, and resource requirements",
                "template_type": "planning",
                "rationale": "Organize approach and timeline",
                "priority": 2
            },
            {
                "id": f"sug_{uuid.uuid4().hex[:8]}",
                "title": "Key Features",
                "description": "Identify and prioritize core features and functionality",
                "template_type": "feature",
                "rationale": "Define what to build first",
                "priority": 1
            },
            {
                "id": f"sug_{uuid.uuid4().hex[:8]}",
                "title": "Challenges and Solutions",
                "description": "Anticipate obstacles and plan mitigation strategies",
                "template_type": "problem",
                "rationale": "Proactively address potential blockers",
                "priority": 2
            }
        ]

    def _fallback_suggestions(
        self,
        parent_title: str,
        parent_description: str
    ) -> List[Dict[str, Any]]:
        """Generate simple fallback suggestions if AI fails"""
        return [
            {
                "id": f"sug_{uuid.uuid4().hex[:8]}",
                "title": f"Details for {parent_title}",
                "description": "Add more information and context about this topic",
                "template_type": "expand",
                "rationale": "Expand on the parent idea with more details",
                "priority": 1
            },
            {
                "id": f"sug_{uuid.uuid4().hex[:8]}",
                "title": "Implementation steps",
                "description": "Break down into actionable tasks and milestones",
                "template_type": "breakdown",
                "rationale": "Create action plan for execution",
                "priority": 2
            },
            {
                "id": f"sug_{uuid.uuid4().hex[:8]}",
                "title": "Research and learning",
                "description": "Learning resources and background research needed",
                "template_type": "learning",
                "rationale": "Build knowledge foundation",
                "priority": 2
            }
        ]


# Singleton instance
_suggestion_service = None


def get_suggestion_service() -> NodeSuggestionService:
    """Get or create suggestion service instance"""
    global _suggestion_service
    if _suggestion_service is None:
        _suggestion_service = NodeSuggestionService()
    return _suggestion_service
