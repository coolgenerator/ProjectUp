"""
Project Assistant Service

Provides AI-powered services for:
- Project idea generation based on user skills and interests
- Roadmap planning with detailed steps
- Curriculum alignment for learning outcomes
- Project checklist generation
"""

import logging
import json
import re
import os
from typing import Dict, Any, List, Optional
from datetime import datetime

from langchain_google_vertexai import ChatVertexAI
from langchain_core.messages import SystemMessage, HumanMessage

# Import project type detection
from utils.project_type_detector import detect_project_type
from prompts.research_project_prompts import (
    RESEARCH_IDEAS_SYSTEM_PROMPT,
    RESEARCH_IDEAS_USER_PROMPT_TEMPLATE
)

logger = logging.getLogger(__name__)


class ProjectAssistantService:
    """Service for AI-powered project assistance."""

    def __init__(self):
        """Initialize the project assistant service."""
        # Import settings to ensure credentials are loaded
        from config.settings import settings

        # Ensure credentials are set in environment
        if settings.GOOGLE_APPLICATION_CREDENTIALS:
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = settings.GOOGLE_APPLICATION_CREDENTIALS
            logger.info(f"Set GOOGLE_APPLICATION_CREDENTIALS: {settings.GOOGLE_APPLICATION_CREDENTIALS}")
        else:
            logger.warning("GOOGLE_APPLICATION_CREDENTIALS not set!")

        self.llm = ChatVertexAI(
            model="gemini-2.0-flash-exp",
            temperature=0.7,
            max_tokens=4096,
            project=settings.GOOGLE_CLOUD_PROJECT,
            location=settings.GOOGLE_CLOUD_LOCATION
        )
        logger.info(f"ProjectAssistantService initialized with Gemini 2.0 Flash (Project: {settings.GOOGLE_CLOUD_PROJECT})")

    async def generate_project_ideas(
        self,
        skills: List[str],
        interests: List[str],
        goal: Optional[str] = None,
        reference: Optional[str] = None,
        hours_per_week: Optional[str] = None,
        preferred_difficulty: Optional[str] = "Any",
        preferred_timeframe: Optional[str] = "Any",
        deadline: Optional[str] = None,
        custom_time_period: Optional[str] = None,
        num_ideas: int = 5
    ) -> Dict[str, Any]:
        """
        Generate personalized project ideas based on user profile.

        Args:
            skills: List of user skills
            interests: List of user interests
            goal: Learning goal
            reference: Additional reference information
            hours_per_week: Available hours per week
            preferred_difficulty: Preferred difficulty level
            preferred_timeframe: Preferred project timeframe
            deadline: Project deadline
            custom_time_period: Custom time period
            num_ideas: Number of ideas to generate

        Returns:
            Dictionary with generated project ideas
        """
        try:
            # STEP 1: Detect project type (research vs engineering)
            project_type_info = detect_project_type(
                project_description="",
                goal=goal or "",
                reference=reference or "",
                interests=interests
            )

            project_category = project_type_info['category']
            confidence = project_type_info['confidence']

            logger.info(f"Project type detected: {project_category} (confidence: {confidence})")
            logger.info(f"Detection reasoning: {project_type_info['reasoning']}")

            # Build context from user profile
            context_parts = [
                f"User Skills: {', '.join(skills)}" if skills else "",
                f"User Interests: {', '.join(interests)}" if interests else "",
                f"Learning Goal: {goal}" if goal else "",
                f"Reference/Notes: {reference}" if reference else "",
                f"Available Time: {hours_per_week}" if hours_per_week else "",
                f"Preferred Difficulty: {preferred_difficulty}" if preferred_difficulty and preferred_difficulty != "Any" else "",
                f"Preferred Timeframe: {preferred_timeframe}" if preferred_timeframe and preferred_timeframe != "Any" else "",
                f"Deadline: {deadline}" if deadline else "",
                f"Custom Time Period: {custom_time_period}" if custom_time_period else ""
            ]
            context = "\n".join([part for part in context_parts if part])

            # Determine if goal is provided and should be prioritized
            has_goal = goal and goal.strip()

            # STEP 2: Choose prompts based on project type
            if project_category == 'research':
                # Use research-specific prompts
                system_prompt = RESEARCH_IDEAS_SYSTEM_PROMPT

                # Add rubric section if reference contains requirements
                rubric_section = ""
                if reference and any(keyword in reference.lower() for keyword in ['rubric', 'requirements', 'deliverable', 'grading']):
                    rubric_section = f"""
**CRITICAL - PROJECT REQUIREMENTS:**
The following requirements MUST be strictly followed:
{reference}

Ensure ALL suggested projects:
1. Match the deliverable format exactly (e.g., if "3-5 pages" is specified, mention this in deliverables)
2. Include ALL required sections/components mentioned
3. Align with grading criteria
4. Follow any formatting guidelines (font, page limits, etc.)
5. Respect presentation requirements (slide count, time limits, etc.)
"""

                user_prompt = RESEARCH_IDEAS_USER_PROMPT_TEMPLATE.format(
                    num_ideas=num_ideas,
                    context=context,
                    rubric_section=rubric_section
                )

            elif project_category == 'engineering':
                # Use existing engineering-focused prompts
                if has_goal:
                    goal_emphasis = f"""
🎯 ABSOLUTE PRIORITY: The user's goal is "{goal}"

CRITICAL INSTRUCTION: Generate projects that DIRECTLY help achieve "{goal}".
The user's interests ({', '.join(interests) if interests else 'various topics'}) are ONLY for reference about their background/experience.
Do NOT generate projects about their interests unless those interests are directly relevant to "{goal}".

Example: If goal is "build a trading system" and interests include "IoT, Robotics":
- ✅ CORRECT: Suggest trading algorithms, backtesting systems, market data processing
- ❌ WRONG: Suggest IoT sensor networks or robotic systems (unrelated to trading)
- ✅ CORRECT: You may use Python if they have IoT experience with Python (tool preference)
"""
                    context_to_use = f"""
**TARGET GOAL**: {goal}
**Available Skills**: {', '.join(skills) if skills else 'To be developed'}
**Background/Experience** (for tool selection only): {', '.join(interests) if interests else 'Various'}
**Constraints**: {hours_per_week if hours_per_week else 'Flexible'} hours/week, {preferred_timeframe if preferred_timeframe and preferred_timeframe != 'Any' else 'Flexible'} timeframe
"""
                else:
                    goal_emphasis = ""
                    context_to_use = context

                system_prompt = f"""You are an expert project advisor and educator helping users find the perfect SOFTWARE/ENGINEERING project to work on.

{goal_emphasis}
{context_to_use}

CRITICAL REQUIREMENTS:
1. **GOAL ALIGNMENT (ABSOLUTE PRIORITY)**: {"ALL projects MUST directly help achieve the goal: '" + goal + "'. Ignore any interests/topics that don't relate to this goal. Use interests ONLY as reference for what tools/languages the user might prefer (e.g., Python experience → use Python for the goal)." if has_goal else "Projects should align with user's skills and interests"}
2. **Specificity**: Generate SPECIFIC project ideas, not generic ones. Each project should have a clear, concrete scope.
3. **Relevance Test**: {"Before suggesting a project, ask: 'Does this DIRECTLY help build/achieve '" + goal + "'?' If no, reject it." if has_goal else "Ensure projects match the user's interests"}
4. **Practical Value**: Projects should be practical and have real-world applications.
5. **Progressive Difficulty**: Include projects that build upon each other when possible.
6. **Constraints**: Consider the user's available time and difficulty preferences.

Return your response as a valid JSON object with this EXACT structure:
{{
  "projectIdeas": [
    {{
      "title": "Project Title",
      "description": "Detailed description (2-3 sentences) explaining what the project is about and WHY it helps achieve the user's goal",
      "difficulty": "Beginner|Intermediate|Advanced",
      "estimatedTime": "X weeks/months",
      "estimatedHoursPerWeek": "X-Y hours/week",
      "keyTechnologies": ["Technology 1", "Technology 2", "Technology 3"],
      "keyFeatures": ["Feature 1", "Feature 2", "Feature 3"],
      "learningOutcomes": ["Outcome 1", "Outcome 2", "Outcome 3"]
    }}
  ]
}}

IMPORTANT: Return ONLY valid JSON. Do not include any markdown formatting, code blocks, or explanatory text."""

                if has_goal:
                    user_prompt = f"""Generate {num_ideas} SPECIFIC project ideas for this EXACT goal: "{goal}"

⚠️ ABSOLUTE RULES - NO EXCEPTIONS:
1. Every project MUST be a direct component or milestone toward "{goal}"
2. DO NOT suggest projects about: {', '.join(interests) if interests else 'other topics'}
3. ONLY use the goal: "{goal}" as the topic
4. Use skills/interests ONLY for choosing programming languages/tools, NOT topics

VALIDATION CHECK - Before including ANY project idea, ask yourself:
- "Is this project specifically about {goal}?" → If NO, REJECT IT
- "Would this project exist if the goal was different?" → If YES, REJECT IT
- "Does this directly build a component of {goal}?" → If NO, REJECT IT

Example for goal "build an agentic quant system":
❌ WRONG: "Robotic arm for trading" (mixing robotics interest into trading)
❌ WRONG: "IoT sensors for market data" (mixing IoT interest into trading)
✅ CORRECT: "Market data pipeline" (pure trading component)
✅ CORRECT: "Backtesting engine" (pure trading component)
✅ CORRECT: "RL agent for trading signals" (pure trading component)

Available skills for tool selection: {', '.join(skills) if skills else 'Any'}

Now generate ONLY projects that are 100% about "{goal}" with NO mixing of other topics."""
                else:
                    user_prompt = f"""Generate {num_ideas} personalized project ideas that would be perfect for someone with these skills and interests.
Make the projects exciting, practical, and achievable within their constraints.
Focus on projects that will genuinely help them learn and grow."""

            else:  # hybrid or unknown
                # Default to engineering but with a note about uncertainty
                logger.warning(f"Project category '{project_category}' - using default engineering prompts")
                system_prompt = f"""You are an expert project advisor helping users find the perfect project to work on.

{context}

Generate project ideas that could be either research-focused OR engineering-focused based on the user's needs.
If uncertain, provide a mix of both types.

Return your response as a valid JSON object with this EXACT structure:
{{
  "projectIdeas": [
    {{
      "title": "Project Title",
      "description": "Detailed description (2-3 sentences)",
      "difficulty": "Beginner|Intermediate|Advanced",
      "estimatedTime": "X weeks/months",
      "estimatedHoursPerWeek": "X-Y hours/week",
      "keyTechnologies": ["Technology 1", "Technology 2", "Technology 3"],
      "keyFeatures": ["Feature 1", "Feature 2", "Feature 3"],
      "learningOutcomes": ["Outcome 1", "Outcome 2", "Outcome 3"]
    }}
  ]
}}

IMPORTANT: Return ONLY valid JSON. Do not include any markdown formatting, code blocks, or explanatory text."""

                user_prompt = f"""Generate {num_ideas} personalized project ideas based on the provided context."""

            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ]

            # Get response from LLM
            response = self.llm.invoke(messages)
            content = response.content.strip()

            # Parse JSON response
            project_ideas = self._parse_json_response(content)

            return {
                "response": project_ideas,
                "projectTypeDetection": project_type_info,
                "timestamp": datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(f"Error generating project ideas: {e}")
            return {"error": str(e)}

    async def generate_roadmap_steps(
        self,
        title: str,
        description: str,
        difficulty: str,
        project_type: str = "Personal Project",
        key_features: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        DEPRECATED: Use /ai-api/project-roadmap/generate instead.

        Generate detailed roadmap steps for a project.

        Args:
            title: Project title
            description: Project description
            difficulty: Project difficulty level
            project_type: Type of project
            key_features: List of key features

        Returns:
            Dictionary with roadmap steps
        """
        logger.warning("generate_roadmap_steps is deprecated. Use /ai-api/project-roadmap/generate instead.")
        try:
            features_text = ", ".join(key_features) if key_features else "Not specified"

            system_prompt = f"""You are an expert project manager and software architect creating a detailed project roadmap with comprehensive milestones.

Project Details:
Title: {title}
Description: {description}
Difficulty: {difficulty}
Type: {project_type}
Key Features: {features_text}

Create a comprehensive, step-by-step roadmap that breaks down the project into detailed milestones/phases.

Return your response as a valid JSON object with this EXACT structure:
{{
  "steps": [
    {{
      "title": "Milestone/Phase Title",
      "description": "HIGHLY DETAILED description using **markdown formatting**:\\n\\n**Overview:** Brief summary of this phase.\\n\\n**Key Tasks:**\\n- Specific technical task 1\\n- Specific technical task 2\\n- Specific technical task 3\\n\\n**Technical Details:**\\n- Architecture/design considerations\\n- Technologies and patterns to use\\n- Important decisions to make\\n\\n**Challenges & Solutions:**\\n- Potential challenge 1 and how to address it\\n- Potential challenge 2 and how to address it\\n\\n**Success Criteria:** Clear, measurable outcomes for this milestone.",
      "timeEstimate": "X days/weeks",
      "deliverables": ["Concrete Deliverable 1", "Concrete Deliverable 2", "Concrete Deliverable 3"]
    }}
  ]
}}

CRITICAL GUIDELINES:
1. Create 6-10 logical milestones/phases (more detail = better)
2. Start with planning/requirements and end with deployment/monitoring
3. Each milestone description MUST use markdown formatting with sections and bullet points
4. Use **bold** for section headers and emphasis
5. Use bullet points (-) for lists of tasks, challenges, etc.
6. Add blank lines (\\n\\n) between sections for readability
7. Include what technologies, patterns, or approaches to use
8. Mention testing strategies for each phase
9. Specify 2-4 concrete, measurable deliverables per milestone
10. Time estimates should be realistic for the difficulty level

Example of GOOD markdown formatting:

"**Overview:** Set up the complete development environment and establish project foundations for a modern web application.

**Key Tasks:**
- Install Node.js (v18+) and create Next.js project with TypeScript
- Configure ESLint with Airbnb style guide and Prettier
- Set up PostgreSQL database using Docker
- Create initial database schema with Prisma
- Initialize Git repository with proper .gitignore

**Technical Details:**
- Use Next.js 14 with App Router for better performance
- Implement Prisma ORM for type-safe database access
- Configure environment variables for all sensitive data (database URL, API keys, JWT secret)
- Set up Docker Compose for local database management

**Challenges & Solutions:**
- Version conflicts: Use exact versions in package.json and document Node version in README
- Database connection issues: Provide clear setup instructions and connection troubleshooting guide

**Success Criteria:** Running `npm run dev` displays Next.js welcome page, database migrations execute without errors, and Git repository is properly initialized with initial commit."

IMPORTANT:
- Use \\n\\n for paragraph breaks and \\n for line breaks within lists
- Return ONLY valid JSON (no markdown code blocks around the JSON itself)
- Put all markdown formatting INSIDE the description strings"""

            human_prompt = "Generate a detailed, actionable roadmap for this project."

            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=human_prompt)
            ]

            response = self.llm.invoke(messages)
            content = response.content.strip()

            roadmap = self._parse_json_response(content)

            return {
                "response": roadmap,
                "timestamp": datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(f"Error generating roadmap steps: {e}")
            return {"error": str(e)}

    async def generate_curriculum_alignment(
        self,
        title: str,
        description: str,
        difficulty: str,
        project_type: str = "Personal Project",
        key_features: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        DEPRECATED: This feature has been removed from the enhanced roadmap system.

        Generate curriculum alignment and learning goals for a project.

        Args:
            title: Project title
            description: Project description
            difficulty: Project difficulty level
            project_type: Type of project
            key_features: List of key features

        Returns:
            Dictionary with curriculum alignment
        """
        logger.warning("generate_curriculum_alignment is deprecated and will be removed in a future version.")
        try:
            features_text = ", ".join(key_features) if key_features else "Not specified"

            system_prompt = f"""You are an expert educator creating a curriculum alignment for a project.

Project Details:
Title: {title}
Description: {description}
Difficulty: {difficulty}
Type: {project_type}
Key Features: {features_text}

Analyze this project from an educational perspective and identify:
1. Core topics and concepts covered
2. Learning categories (e.g., Frontend, Backend, DevOps, Data Science)
3. Specific skills developed
4. Detailed learning goals and outcomes

Return your response as a valid JSON object with this EXACT structure:
{{
  "topics": ["Topic 1", "Topic 2", "Topic 3"],
  "categories": ["Category 1", "Category 2"],
  "skills": [
    {{
      "name": "Skill name",
      "level": "Beginner|Intermediate|Advanced",
      "description": "What you'll learn with this skill",
      "relevanceScore": 85
    }}
  ],
  "categoryBreakdown": [
    {{
      "category": "Category Name",
      "topics": ["Topic 1", "Topic 2"],
      "percentage": 40
    }}
  ],
  "learningGoals": [
    {{
      "goal": "Learning goal statement",
      "description": "Detailed description of what will be learned",
      "outcomes": ["Outcome 1", "Outcome 2"]
    }}
  ]
}}

IMPORTANT: Return ONLY valid JSON. Do not include any markdown formatting, code blocks, or explanatory text."""

            human_prompt = "Analyze this project and provide comprehensive curriculum alignment."

            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=human_prompt)
            ]

            response = self.llm.invoke(messages)
            content = response.content.strip()

            curriculum = self._parse_json_response(content)

            return {
                "response": curriculum,
                "timestamp": datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(f"Error generating curriculum alignment: {e}")
            return {"error": str(e)}

    async def generate_project_checklist(
        self,
        title: str,
        description: str,
        difficulty: str,
        project_type: str = "Personal Project",
        key_features: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        DEPRECATED: This feature has been removed from the enhanced roadmap system.

        Generate comprehensive project checklist.

        Args:
            title: Project title
            description: Project description
            difficulty: Project difficulty level
            project_type: Type of project
            key_features: List of key features

        Returns:
            Dictionary with project checklist
        """
        logger.warning("generate_project_checklist is deprecated and will be removed in a future version.")
        try:
            features_text = ", ".join(key_features) if key_features else "Not specified"

            system_prompt = f"""You are an expert project manager creating a comprehensive project checklist.

Project Details:
Title: {title}
Description: {description}
Difficulty: {difficulty}
Type: {project_type}
Key Features: {features_text}

Create a detailed checklist covering all aspects of the project lifecycle.

Return your response as a valid JSON object with this EXACT structure:
{{
  "items": [
    {{
      "description": "Specific, actionable task description",
      "category": "Requirements|Design|Development|Testing|Deployment|Documentation",
      "priority": "High|Medium|Low"
    }}
  ]
}}

Guidelines:
1. Include 15-25 checklist items
2. Cover the entire project lifecycle
3. Include both technical and non-technical tasks
4. Prioritize critical path items as "High"
5. Be specific and actionable
6. Consider setup, development, testing, deployment, and documentation

Categories to cover:
- Requirements: Planning, analysis, specifications
- Design: Architecture, UI/UX, database design
- Development: Implementation tasks
- Testing: Unit tests, integration tests, QA
- Deployment: Environment setup, CI/CD, hosting
- Documentation: README, API docs, user guides

IMPORTANT: Return ONLY valid JSON. Do not include any markdown formatting, code blocks, or explanatory text."""

            human_prompt = "Generate a comprehensive, actionable checklist for this project."

            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=human_prompt)
            ]

            response = self.llm.invoke(messages)
            content = response.content.strip()

            checklist = self._parse_json_response(content)

            return {
                "response": checklist,
                "timestamp": datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(f"Error generating project checklist: {e}")
            return {"error": str(e)}

    def _parse_json_response(self, content: str) -> Any:
        """
        Parse JSON response from LLM, handling various formats.

        Args:
            content: Raw content from LLM

        Returns:
            Parsed JSON object

        Raises:
            ValueError: If JSON cannot be parsed
        """
        # Remove markdown code blocks if present
        content = re.sub(r'```json\s*', '', content)
        content = re.sub(r'```\s*$', '', content)
        content = content.strip()

        try:
            # Try direct parse
            return json.loads(content)
        except json.JSONDecodeError:
            # Try to find JSON in the content
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                try:
                    return json.loads(json_match.group())
                except json.JSONDecodeError:
                    pass

            # Clean up common JSON issues
            cleaned = content.replace('\n', ' ')
            cleaned = re.sub(r',(\s*[}\]])', r'\1', cleaned)  # Remove trailing commas

            try:
                return json.loads(cleaned)
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON: {e}\nContent: {content[:200]}")
                raise ValueError(f"Invalid JSON response from LLM: {str(e)}")
