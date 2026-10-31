"""
Extraction Prompts
Centralized prompts for extracting structured data from idea tree nodes
"""

from typing import Optional


class ExtractionPrompts:
    """Prompt templates for extracting tasks, milestones, and resources from node content"""

    @staticmethod
    def get_task_extraction_prompt(
        node_title: str,
        node_description: str,
        conclusion: Optional[str] = None,
        conversation: Optional[str] = None
    ) -> str:
        """
        Generate prompt for extracting actionable tasks from node content

        Args:
            node_title: Title of the node
            node_description: Description/content of the node
            conclusion: Optional refined conclusion from chat
            conversation: Optional chat conversation for additional context

        Returns:
            Formatted prompt for task extraction
        """
        conclusion_section = f"\nDetailed Context: {conclusion}" if conclusion else ""
        conversation_section = f"\n\nChat Conversation:\n{conversation}" if conversation else ""

        return f"""You are a project management expert analyzing a project node to extract actionable tasks.

**Node Title:** {node_title}

**Node Description:**
{node_description}{conclusion_section}{conversation_section}

**Your Task:**
Analyze the content above and extract specific, actionable tasks that need to be done to accomplish the work described in this node.

**Task Extraction Guidelines:**

1. **Be Intelligent & Contextual:**
   - If the node describes a goal, objective, or deliverable, break it down into concrete implementation tasks
   - Consider what ACTUALLY needs to be done to complete this work
   - Use the conversation context (if provided) to understand the full scope
   - Look for implicit work items, not just explicit task lists

2. **Examples of Valid Task Extraction:**
   - "Create a mapping document" → Task: "Create mapping document linking schema fields to sources"
   - "Research best practices" → Task: "Research industry best practices for X"
   - "Implement feature X" → Multiple tasks: "Design feature X", "Implement backend for X", "Write tests for X"
   - "Build API integration" → Tasks: "Set up API authentication", "Implement data fetching", "Handle error cases"

3. **Task Types:**
   - **action**: Implementation, creation, building, coding, configuration
   - **research**: Investigation, analysis, exploration, comparison
   - **learning**: Study, understand, learn a new technology/concept
   - **development**: Writing code, building features, technical implementation

4. **Priority Guidelines:**
   - 1 (Highest): Foundational work, blockers, critical requirements
   - 2 (High): Important features, key deliverables
   - 3 (Medium): Standard tasks, enhancements
   - 4 (Low): Nice-to-haves, optimizations
   - 5 (Lowest): Future considerations, optional items

5. **When to Return Empty Array:**
   - ONLY if the node is purely informational with NO work to be done
   - If it's just documentation or reference material with no actionable items
   - If it's already fully completed work

**Output Format:**
Return ONLY a valid JSON array of tasks with COMPLETE EXECUTION GUIDANCE (no markdown, no explanations):

[
  {{
    "title": "Clear, actionable task title (30-60 chars)",
    "description": "Detailed description explaining what needs to be done and why (100-200 chars)",
    "type": "action" | "learning" | "research" | "development",
    "priority": 1-5,
    "estimated_hours": number (optional, only if you can reasonably estimate),
    "guidance": {{
      "overview": "1-2 sentence overview of what this task accomplishes and why it matters",
      "quick_start": [
        "Step 1: Concrete action to begin",
        "Step 2: Next concrete action",
        "Step 3: Next action",
        "Step 4-6: Additional steps as needed (aim for 5-7 total steps)"
      ],
      "prerequisites": {{
        "skills": ["Skill 1", "Skill 2"],
        "tools": ["Tool 1", "Tool 2"],
        "dependencies": ["What needs to be done first"]
      }},
      "resources": [
        {{"title": "Official Documentation", "url": "https://relevant-docs.com", "type": "documentation"}},
        {{"title": "Tutorial/Guide", "url": "https://tutorial-link.com", "type": "tutorial"}},
        {{"title": "Video Explanation", "url": "https://youtube.com/watch?v=...", "type": "video"}}
      ],
      "common_pitfalls": [
        {{"issue": "Common problem that might occur", "solution": "How to avoid or fix it"}},
        {{"issue": "Another gotcha", "solution": "What to do instead"}}
      ],
      "success_criteria": [
        "Measurable outcome 1",
        "Measurable outcome 2",
        "How you know it's done correctly"
      ],
      "estimated_time": "2-4 hours",
      "complexity": "simple" | "moderate" | "complex"
    }}
  }}
]

**IMPORTANT Guidance Generation Rules:**

1. **Quick Start Steps**: Must be concrete, actionable, and ordered. Not vague ("design the API") but specific ("Create openapi.yaml with user auth endpoints")

2. **Resources**: Provide REAL, helpful URLs when possible:
   - Official documentation (React docs, Node docs, etc.)
   - Well-known tutorials (freeCodeCamp, MDN, etc.)
   - Popular YouTube channels (Traversy Media, Fireship, etc.)
   - If unsure, use generic but helpful categories

3. **Prerequisites**: Be realistic about what skills/tools are actually needed

4. **Common Pitfalls**: Think about what typically goes wrong with this type of task

5. **Success Criteria**: Make it measurable - "works correctly" is too vague, "user can login and see dashboard" is good

6. **Complexity Assessment**:
   - simple: < 2 hours, straightforward, no dependencies
   - moderate: 2-6 hours, requires some problem-solving
   - complex: > 6 hours, multiple dependencies, significant design needed

**Example of GOOD Task with Guidance:**

{{
  "title": "Implement user authentication with JWT",
  "description": "Set up secure JWT-based authentication allowing users to register and login",
  "type": "development",
  "priority": 1,
  "estimated_hours": 4,
  "guidance": {{
    "overview": "Implement JSON Web Token (JWT) authentication to secure API endpoints and manage user sessions. This is foundational security for the application.",
    "quick_start": [
      "Install required packages: express-jwt, jsonwebtoken, bcryptjs",
      "Create auth routes: POST /register, POST /login, POST /refresh",
      "Implement password hashing with bcryptjs (salt rounds: 10)",
      "Generate JWT tokens with user payload and secret key",
      "Create auth middleware to verify tokens on protected routes",
      "Test authentication flow with Postman/curl"
    ],
    "prerequisites": {{
      "skills": ["Node.js/Express", "REST API design", "Async/await"],
      "tools": ["Node.js v16+", "Postman for testing", "Database (PostgreSQL/MongoDB)"],
      "dependencies": ["User model and database setup must be complete"]
    }},
    "resources": [
      {{"title": "JWT.io Introduction", "url": "https://jwt.io/introduction", "type": "documentation"}},
      {{"title": "Express JWT Guide", "url": "https://www.npmjs.com/package/express-jwt", "type": "documentation"}},
      {{"title": "Node.js Auth Tutorial", "url": "https://www.youtube.com/watch?v=mbsmsi7l3r4", "type": "video"}}
    ],
    "common_pitfalls": [
      {{"issue": "Storing passwords in plain text", "solution": "Always hash passwords with bcryptjs before storing in database"}},
      {{"issue": "JWT secret exposed in code", "solution": "Store JWT_SECRET in environment variables (.env file)"}},
      {{"issue": "No token expiration", "solution": "Set expiresIn option when signing tokens (e.g., '24h')"}}
    ],
    "success_criteria": [
      "User can register with email/password",
      "User can login and receive valid JWT token",
      "Protected routes reject requests without valid token",
      "Token refresh works for authenticated users"
    ],
    "estimated_time": "3-4 hours",
    "complexity": "moderate"
  }}
}}

**Generate tasks with comprehensive guidance now:**"""

    @staticmethod
    def get_milestone_extraction_prompt(
        node_title: str,
        node_description: str,
        conclusion: Optional[str] = None,
        conversation: Optional[str] = None
    ) -> str:
        """
        Generate prompt for extracting milestones from node content

        Args:
            node_title: Title of the node
            node_description: Description/content of the node
            conclusion: Optional refined conclusion from chat
            conversation: Optional chat conversation for additional context

        Returns:
            Formatted prompt for milestone extraction
        """
        conclusion_section = f"\nContext: {conclusion}" if conclusion else ""
        conversation_section = f"\n\nChat Conversation:\n{conversation}" if conversation else ""

        return f"""You are a project planning expert analyzing a project node to identify key milestones.

**Node Title:** {node_title}

**Node Description:**
{node_description}{conclusion_section}{conversation_section}

**Your Task:**
Analyze the content and identify significant milestones - major checkpoints or achievements that mark important progress in completing this work.

**Milestone Extraction Guidelines:**

1. **What Qualifies as a Milestone:**
   - Completion of a major phase or deliverable
   - Achievement of a significant goal or objective
   - Key decision points or approval gates
   - Integration of major components
   - Public releases or launches
   - Important deadlines or project checkpoints

2. **Examples:**
   - "Complete data mapping document" (deliverable)
   - "API integration fully tested" (completion)
   - "Production deployment" (launch)
   - "Phase 1 requirements gathered" (phase completion)
   - "Beta version released to testers" (release)

3. **Success Criteria:**
   - Define SPECIFIC, MEASURABLE conditions for completion
   - What needs to be true for this milestone to be considered "done"?
   - Include concrete deliverables or outcomes

4. **Priority Guidelines:**
   - 1: Critical path milestones, project launch
   - 2: Major feature completions, key deliverables
   - 3: Important checkpoints, phase completions
   - 4: Secondary objectives, nice-to-haves
   - 5: Future enhancements, stretch goals

**Output Format:**
Return ONLY a valid JSON array (no markdown, no explanations):

[
  {{
    "title": "Clear milestone name (30-60 chars)",
    "description": "What this milestone represents and its importance (100-200 chars)",
    "success_criteria": "Specific, measurable completion criteria (100-150 chars)",
    "priority": 1-5,
    "target_date": "YYYY-MM-DD" (optional, only if mentioned or can be inferred)
  }}
]

**Important:**
- Generate 2-5 milestones if this is a significant project node
- Focus on MAJOR achievements, not small tasks
- Return [] ONLY if this is a minor task with no significant milestones

Generate the milestones now:"""

    @staticmethod
    def get_resource_extraction_prompt(
        node_title: str,
        node_description: str,
        conclusion: Optional[str] = None,
        conversation: Optional[str] = None
    ) -> str:
        """
        Generate prompt for extracting resources (URLs, links, references) from node content

        Args:
            node_title: Title of the node
            node_description: Description/content of the node
            conclusion: Optional refined conclusion from chat
            conversation: Optional chat conversation for additional context

        Returns:
            Formatted prompt for resource extraction
        """
        conclusion_section = f"\nContext: {conclusion}" if conclusion else ""
        conversation_section = f"\n\nChat Conversation:\n{conversation}" if conversation else ""

        return f"""You are a research expert analyzing a project node to identify useful resources and references.

**Node Title:** {node_title}

**Node Description:**
{node_description}{conclusion_section}{conversation_section}

**Your Task:**
Extract any explicitly mentioned resources (URLs, tools, libraries, documents) OR suggest highly relevant resources that would help complete this work.

**Resource Extraction Guidelines:**

1. **Extract Explicit Resources:**
   - Any URLs mentioned in the content or conversation
   - Specific tools, libraries, or APIs referenced
   - Documents or files mentioned by name
   - Third-party services or platforms discussed

2. **Suggest Relevant Resources (if applicable):**
   - Official documentation for mentioned technologies
   - Industry-standard tools for the task at hand
   - Well-known tutorials or guides for the work described
   - ONLY if the resources are highly relevant and commonly used

3. **Resource Categories:**
   - **documentation**: Official docs, API references, specs
   - **tutorial**: Step-by-step guides, how-to articles
   - **article**: Blog posts, technical articles, case studies
   - **video**: Video tutorials, conference talks, demos
   - **tool**: Software tools, online services, platforms
   - **library**: Code libraries, frameworks, packages
   - **other**: Templates, examples, datasets, other resources

4. **URL Requirements:**
   - Use actual URLs if mentioned in content
   - For suggested resources, use well-known, official URLs
   - Must be complete URLs (http:// or https://)
   - NEVER invent URLs - use real, accessible resources

**Output Format:**
Return ONLY a valid JSON array (no markdown, no explanations):

[
  {{
    "name": "Clear resource name",
    "url": "https://complete.url.here",
    "category": "documentation" | "tutorial" | "article" | "video" | "tool" | "library" | "other",
    "description": "Brief explanation of why this resource is useful (50-100 chars)"
  }}
]

**Important:**
- Extract 2-6 resources if relevant resources exist or are mentioned
- Prioritize explicitly mentioned resources
- Only suggest additional resources if they're highly relevant and well-known
- Return [] if no resources are mentioned AND none are obviously needed

Generate the resources now:"""
