"""
Prompts for AI-powered research project planning.

These prompts are specifically designed for academic and research projects
(systematic reviews, quantitative analysis, research papers, etc.)
rather than engineering/software projects.
"""


RESEARCH_IDEAS_SYSTEM_PROMPT = """You are an expert research advisor and academic mentor specializing in helping students and researchers design impactful research projects.

Your expertise includes:
- Systematic literature reviews and meta-analyses
- Quantitative and qualitative research methodologies
- Biomedical informatics and health data analysis
- Research design and study planning
- Academic writing and presentation

CRITICAL: You are helping with RESEARCH projects, NOT software development projects.
- Focus on research questions, hypotheses, and methodologies
- Suggest deliverables like papers, reports, presentations, posters
- Do NOT suggest building apps, websites, or software tools
- Emphasize data analysis, literature review, and research findings

When the user has specific project requirements (like a rubric or assignment guidelines):
- STRICTLY adhere to those requirements
- Match the deliverable format exactly (e.g., "3-5 page paper", "15-minute presentation")
- Include ALL required sections mentioned in the rubric
- Align with grading criteria and evaluation standards"""


RESEARCH_IDEAS_USER_PROMPT_TEMPLATE = """Generate {num_ideas} specific RESEARCH project ideas based on this context:

{context}

ABSOLUTE REQUIREMENTS:
1. **Research Focus**: Every project must be a RESEARCH project, not a software development project
2. **Deliverables**: Suggest research deliverables (papers, reports, presentations), NOT apps or websites
3. **Methodology**: Include appropriate research methodology (systematic review, quantitative analysis, etc.)
4. **Academic Rigor**: Ensure projects meet academic standards with proper structure
5. **Feasibility**: Projects should be achievable within the given constraints

{rubric_section}

Return your response as valid JSON with this EXACT structure:
{{
  "projectIdeas": [
    {{
      "title": "Research Project Title (12 words or less)",
      "description": "Detailed description (2-3 sentences) explaining the research question, methodology, and expected outcomes. Must align with any provided requirements.",
      "researchType": "Systematic Review|Quantitative Analysis|Qualitative Study|Meta-Analysis|Case Study|Mixed Methods",
      "methodology": "Brief description of research approach and methods",
      "difficulty": "Beginner|Intermediate|Advanced",
      "estimatedTime": "X weeks/months",
      "estimatedHoursPerWeek": "X-Y hours/week",
      "requiredSkills": ["Skill 1", "Skill 2", "Skill 3"],
      "deliverables": [
        "Research paper (3-5 pages)",
        "Presentation slides (10-20 slides)",
        "Data analysis files"
      ],
      "keyComponents": [
        "Literature review",
        "Data collection/acquisition",
        "Statistical analysis",
        "Findings interpretation",
        "Discussion and implications"
      ],
      "learningOutcomes": [
        "Outcome 1: Research methodology skill",
        "Outcome 2: Data analysis capability",
        "Outcome 3: Academic writing proficiency"
      ],
      "potentialDatasets": [
        "Dataset/source 1",
        "Dataset/source 2"
      ],
      "impact": "Brief description of potential impact or relevance to broader community"
    }}
  ]
}}

IMPORTANT: Return ONLY valid JSON. Do not include markdown formatting, code blocks, or explanatory text."""


RESEARCH_ROADMAP_SYSTEM_PROMPT = """You are an expert research project manager and academic advisor specializing in breaking down research projects into manageable, structured phases.

Your role is to create comprehensive research roadmaps that include:
- Research design and methodology planning
- Literature review and background research
- Data collection and acquisition strategies
- Analysis and interpretation phases
- Writing and presentation preparation
- Quality assurance and peer review

Key principles for research roadmaps:
1. Start with problem formulation and literature review
2. Include ethics/IRB considerations if applicable
3. Plan for data acquisition, cleaning, and validation
4. Schedule analysis phases with appropriate methods
5. Allocate time for writing, revision, and peer review
6. Include presentation preparation
7. Consider limitations analysis and discussion
8. Plan for proper citation and bibliography management

CRITICAL: This is for RESEARCH projects, not software development.
- Use research terminology (hypothesis, methodology, findings, etc.)
- Focus on research activities (analysis, synthesis, interpretation)
- Do NOT include software development tasks (coding, deployment, APIs)
- Deliverables are papers, reports, presentations, not apps"""


RESEARCH_ROADMAP_USER_PROMPT = """Generate a comprehensive research project roadmap:

**Project:** {project_title}
**Description:** {project_description}
**Research Type:** {research_type} | **Difficulty:** {difficulty_level} | **Duration:** {duration_weeks} weeks | **Team:** {team_size}
**Required Components:** {required_components}
**Deliverables:** {deliverables}
**Methodology:** {methodology}

Structure (JSON format) - MUST BE COMPLETE:
- **4-6 Sections** (major research phases: Planning, Literature Review, Data Analysis, Writing, Presentation)
  - **2-4 Milestones** per section (significant research achievements)
    - **3-8 Tasks** per milestone (specific research activities with hours, priority 1-5, dependencies)
      - **2-5 Subtasks** per task (concrete steps)

CRITICAL REQUIREMENTS:
1. Generate ALL sections (4-6), NOT just one
2. Each section MUST have 2-4 milestones
3. Each milestone MUST have 3-8 tasks
4. Keep descriptions concise (1-2 sentences) to fit within token limits
5. Focus on RESEARCH activities (analysis, writing, synthesis), NOT software development

Research Phase Guidelines:
1. **Planning & Design Phase**:
   - Problem formulation and research questions
   - Hypothesis development
   - Methodology selection and justification
   - Ethics review/IRB if applicable
   - Data source identification

2. **Literature Review Phase**:
   - Systematic literature search
   - Paper screening and selection
   - Evidence synthesis
   - Gap analysis
   - Background section writing

3. **Data Acquisition & Preparation Phase**:
   - Dataset acquisition and documentation
   - Data cleaning and validation
   - Deidentification (if applicable)
   - Exploratory data analysis
   - Variable selection

4. **Analysis Phase**:
   - Statistical/quantitative analysis
   - Results generation
   - Validation and verification
   - Sensitivity analysis
   - Findings interpretation

5. **Writing & Documentation Phase**:
   - Draft all required sections (title, abstract, introduction, methods, results, discussion, limitations, references)
   - Peer review and revision
   - Citation management
   - Format compliance
   - Quality check

6. **Presentation Phase** (if applicable):
   - Slide deck creation
   - Visual aids and figures
   - Speaker notes
   - Practice and timing
   - Q&A preparation

Priority Guidelines:
- P1 = Critical path items (problem formulation, data acquisition, core analysis)
- P2 = Essential components (literature review, methodology documentation)
- P3 = Important but flexible (additional analyses, supplementary materials)
- P4 = Nice-to-have (extended discussion, future work)
- P5 = Optional (exploratory analyses beyond scope)

Return valid JSON with this structure:
{{
  "sections": [
    {{
      "name": "Research Phase Name",
      "description": "Phase description focused on research activities",
      "order": 0,
      "color": "#8B5CF6",
      "milestones": [
        {{
          "title": "Research Milestone",
          "description": "Milestone description (research achievement, not development task)",
          "estimated_hours": 20,
          "priority": 2,
          "start_offset_days": 0,
          "duration_days": 7,
          "status": "pending",
          "tasks": [
            {{
              "title": "Research Task Title",
              "description": "Detailed research task description",
              "estimated_hours": 5,
              "priority": 3,
              "dependencies": ["Previous Task Title"],
              "tags": ["literature-review", "data-analysis", "writing"],
              "subtasks": [
                {{
                  "title": "Specific research subtask",
                  "description": "Subtask description",
                  "estimated_hours": 1
                }}
              ]
            }}
          ]
        }}
      ]
    }}
  ]
}}

FINAL REMINDERS:
- You MUST generate 4-6 sections, each with 2-4 milestones, each with 3-8 tasks
- Do NOT generate only 1 section or 1 milestone - this is incomplete
- Keep descriptions brief (1-2 sentences) to ensure ALL sections fit within token limits
- All tasks should be RESEARCH-focused (not software development)
- Ensure the JSON is valid and complete
- Generate the ENTIRE roadmap structure, not just the beginning"""


RESEARCH_PROPOSALS_PROMPT = """Based on the research roadmap we created for "{project_title}", generate ONE comprehensive research implementation plan.

**Project Context:**
{project_description}

**Research Type:** {research_type}
**Methodology:** {methodology}

**CRITICAL FORMATTING REQUIREMENTS:**
- ALL content MUST be formatted in proper Markdown
- ALWAYS separate paragraphs with blank lines (two newlines: \\n\\n)
- Use headers (##, ###) to structure content
- Use **bold** for key terms and *italic* for emphasis
- Use numbered or bulleted lists for clarity
- Use tables for comparisons when appropriate
- Never write wall-of-text paragraphs

Provide a thorough research plan covering:

**1. Research Approach & Methodology** (4-6 well-structured paragraphs):
- Research design and rationale
- Study type (systematic review, quantitative analysis, etc.)
- Data sources and selection criteria
- Analysis methods and tools
- Quality assurance procedures

**2. Benefits & Expected Outcomes** (6-10 specific benefits):
- Scientific contribution and knowledge gaps addressed
- Practical applications and real-world impact
- Learning and skill development opportunities
- Publication potential
- Future research directions enabled
- Community/field relevance

**3. Challenges & Mitigation Strategies** (6-10 pairs):
- Data availability and quality issues
- Time and resource constraints
- Methodological limitations
- Analysis complexity
- Writing and presentation challenges
- Each with specific, actionable mitigation plan

**4. Success Metrics** (8-12 measurable criteria):
- Research quality metrics (e.g., "Complete literature review of 30+ papers")
- Analysis completeness (e.g., "Analyze dataset with N > 1000 samples")
- Writing quality (e.g., "Draft paper meeting journal guidelines")
- Presentation quality (e.g., "15-minute presentation with <20 slides")
- Learning outcomes achieved
- Timeline adherence

**5. Decision Framework**:
- **Best suited for**: Describe ideal conditions for this research approach
- **Choose this if**: 5-7 specific conditions favoring this approach
- **Avoid this if**: 3-5 scenarios where alternative approaches are better

**6. Alternative Approaches Considered**:
- 3-4 alternative research methodologies evaluated
- For each: description, advantages, disadvantages, why not chosen
- Markdown-formatted with headers

**7. Resources Needed**:
- Research team roles (if applicable)
- Data sources and datasets
- Analysis tools and software
- References and literature access
- Computing resources (if needed)
- Time allocation by phase

**8. Research Timeline**:
- Phase-by-phase timeline with key milestones
- Use markdown headers (### Phase 1, etc.)
- Bullet lists for activities
- Dependencies clearly marked
- Buffer time for revisions

Return ONLY valid JSON (no markdown code blocks):
{{
  "proposals": [
    {{
      "title": "Research Implementation Plan for {project_title}",
      "description": "Comprehensive research strategy covering methodology, analysis, writing, and presentation.",
      "approach": "[Markdown-formatted methodology and approach - use \\n\\n for paragraph breaks]",
      "benefits": [
        "Benefit 1 with specific details",
        "Benefit 2 with measurable outcomes",
        ...
      ],
      "challenges_with_mitigation": [
        {{"challenge": "Specific challenge", "mitigation": "Detailed mitigation strategy"}},
        ...
      ],
      "success_metrics": [
        "Metric 1 with specific target",
        "Metric 2 with measurement method",
        ...
      ],
      "decision_framework": {{
        "best_for": "Comprehensive description of ideal scenarios",
        "choose_if": "Detailed conditions (1) ... (2) ... (3) ...",
        "avoid_if": "Specific scenarios where alternatives are better"
      }},
      "alternatives_considered": "[Markdown-formatted alternatives with headers and sections]",
      "timeline": "[Markdown-formatted timeline with phases, milestones, and activities]",
      "resources_needed": [
        "Resource category 1: Details",
        "Resource category 2: Details",
        ...
      ],
      "status": "draft"
    }}
  ]
}}"""
