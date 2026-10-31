"""
AI-Guided Project Onboarding Prompts (English Version)

This module contains all prompts for the AI-guided project creation flow.
Each project scenario has 3 types of prompts:
1. Topic Suggestion - Generate project ideas based on context
2. Topic Elaboration - Detailed planning for selected topic
3. Project Details - Generate names, descriptions, and tags

Supported Project Types:
- Course Projects (course)
- Hackathon Projects (hackathon)
- Capstone Projects (capstone)
- Research Projects (research)
- Competition Projects (competition)
- Internship Projects (internship)
- Industry Projects (industry)
- Open Source Projects (opensource)
- Portfolio Projects (portfolio)
- Course Note Projects (coursenote)
- Exam Prep Projects (examprep)
"""

# ============================================================================
# COURSE PROJECT PROMPTS
# ============================================================================

COURSE_TOPIC_SUGGESTION_PROMPT = """You are an experienced course project advisor. Based on the following course information, suggest 3-5 suitable project topics.

Course Information:
- Course Name: {course_name}
- School: {school}
- Course Code: {course_code}
- Course Requirements:
{requirements}

Project Constraints:
- Team Size: {team_size} people
- Project Duration: {duration_weeks} weeks
- Required Technologies: {required_tech}

For each project topic, provide:
1. **Project Name**: Concise, attractive, and descriptive
2. **Tagline**: One-sentence pitch that captures the core value
3. **Suggested Tech Stack**: Specific technology choices
4. **Difficulty Level**: beginner/intermediate/advanced, with brief explanation
5. **Estimated Workload**: In weeks
6. **Core Features List**: 3-5 key features that align with course requirements

Requirements:
- Projects should have practical value, not toy projects
- Consider team size and time constraints to ensure feasibility
- Distribute difficulty levels (suggestion: 1 simple, 2-3 moderate, 1 challenging)
- Modern and practical tech stack following industry standards
- Clear project scope, avoid being too broad or too narrow

Return JSON format only (no explanations):
{{
  "topics": [
    {{
      "topic_id": "t1",
      "name": "Project Name",
      "tagline": "One-sentence tagline",
      "suggested_tech": ["React", "Node.js", "MongoDB"],
      "difficulty": "intermediate",
      "difficulty_reason": "Brief difficulty explanation",
      "estimated_weeks": 10,
      "key_features": ["Feature 1", "Feature 2", "Feature 3"]
    }}
  ]
}}"""

COURSE_TOPIC_ELABORATION_PROMPT = """The user selected the project topic: "{topic_name}"

Topic Description: {topic_description}

Course Context:
- Course Name: {course_name}
- Course Requirements: {requirements}
- Time Limit: {duration_weeks} weeks
- Team Size: {team_size} people
- Start Date: {start_date} (if provided)
- Deadline: {deadline} (if provided)
- Team Members: {team_members} (if provided)

Now please elaborate on this project in detail to help the team fully understand the project scope and implementation plan.

**IMPORTANT - Detailed Task Breakdown:**
For EACH milestone, you MUST provide detailed tasks array with:
1. **Tasks**: Break down the phase into specific, actionable tasks (3-6 tasks per milestone)
2. **Task Details**: Each task MUST include all these fields:
   - name: Clear task name
   - description: What needs to be done
   - estimated_hours: Realistic hours (e.g., 8, 16, 24)
   - start_date: Calculate from project start_date if provided, otherwise omit
   - due_date: Calculate based on timeline if deadline provided, otherwise omit
   - assigned_to: Team member name/role if team_members provided, otherwise omit
   - dependencies: Array of task names that must be completed first (can be empty array)
   - priority: "high", "medium", or "low"
   - subtasks: Array of 2-4 subtasks for complex tasks (each with name, estimated_hours, assigned_to)
3. **Assignment Strategy**: If team members are provided, distribute tasks by role:
   - Frontend/React developers → UI/UX/Component tasks
   - Backend/API developers → Server/Database/API tasks
   - Full-stack → Integration/DevOps tasks
   - Admin/PM → Planning/Documentation tasks

**Example Task Structure:**
{{
  "name": "Design Database Schema",
  "description": "Create database schema with tables for users, projects, and tasks",
  "estimated_hours": 8,
  "start_date": "2024-01-15",
  "due_date": "2024-01-17",
  "assigned_to": "John (Backend)",
  "dependencies": [],
  "priority": "high",
  "subtasks": [
    {{"name": "Design user authentication tables", "estimated_hours": 3, "assigned_to": "John (Backend)"}},
    {{"name": "Design project management tables", "estimated_hours": 3, "assigned_to": "John (Backend)"}},
    {{"name": "Create migration scripts", "estimated_hours": 2, "assigned_to": "John (Backend)"}}
  ]
}}

Return JSON format with these exact keys:
{{
  "background": {{
    "problem": "Problem statement...",
    "value": "Value proposition...",
    "target_users": "Target audience..."
  }},
  "objectives": {{
    "primary": ["Primary objective 1", "Primary objective 2"],
    "secondary": ["Secondary objective 1", "Secondary objective 2"],
    "learning": ["Learning goal 1", "Learning goal 2"]
  }},
  "core_features": [
    {{
      "name": "Feature name",
      "description": "Feature description",
      "importance": "Why it's important",
      "implementation_notes": "Implementation guidance"
    }}
  ],
  "enhanced_features": [
    {{
      "name": "Enhanced feature name",
      "description": "Feature description",
      "priority": "high/medium/low",
      "value": "Value it adds"
    }}
  ],
  "technical_architecture": {{
    "frontend": {{
      "stack": ["React", "TypeScript"],
      "rationale": "Why these choices..."
    }},
    "backend": {{
      "stack": ["Node.js", "Express"],
      "rationale": "Why these choices..."
    }},
    "database": {{
      "choice": "PostgreSQL",
      "rationale": "Why this choice..."
    }},
    "other_tools": ["Tool1", "Tool2"],
    "architecture_description": "Overall architecture explanation..."
  }},
  "milestones": [
    {{
      "phase": "Phase name",
      "duration_weeks": 2,
      "goals": ["Goal 1", "Goal 2"],
      "deliverables": ["Deliverable 1", "Deliverable 2"],
      "tasks": [
        {{
          "name": "Task name",
          "description": "What needs to be done",
          "estimated_hours": 8,
          "start_date": "YYYY-MM-DD (calculate from project start date if provided)",
          "due_date": "YYYY-MM-DD (calculate from project deadline if provided)",
          "assigned_to": "Team member name or role (distribute based on skills if team info provided)",
          "dependencies": ["Previous task name"],
          "priority": "high/medium/low",
          "subtasks": [
            {{
              "name": "Subtask name",
              "estimated_hours": 2,
              "assigned_to": "Team member or role"
            }}
          ]
        }}
      ]
    }}
  ],
  "success_criteria": {{
    "functional": ["Criterion 1", "Criterion 2"],
    "code_quality": ["Criterion 1", "Criterion 2"],
    "user_experience": ["Criterion 1", "Criterion 2"],
    "grading": ["Grading criterion 1", "Grading criterion 2"]
  }},
  "challenges_and_risks": [
    {{
      "challenge": "Challenge description",
      "category": "technical/timeline/team",
      "mitigation": "How to mitigate"
    }}
  ]
}}

Output JSON only, no explanations."""

COURSE_PROJECT_DETAILS_PROMPT = """Based on the following detailed project concept, generate specific project details:

Project Concept:
Name: {topic_name}
Background: {background}
Core Features: {core_features}

Please generate:
1. **Project Name Options** (3 options) - Concise (2-4 words), professional and distinctive
2. **Project Description** (Elevator Pitch style) - 2-3 sentences
3. **Project Tags** (3-5 keywords)

Return JSON format:
{{
  "name_options": [
    {{"name": "Project Name", "rationale": "Naming rationale..."}}
  ],
  "description": "Project description text...",
  "tags": ["React", "Social", "Students", "Real-time"]
}}"""

# ============================================================================
# HACKATHON PROJECT PROMPTS
# ============================================================================

HACKATHON_TOPIC_SUGGESTION_PROMPT = """You are an experienced hackathon mentor. Based on the following hackathon information, suggest 3-5 suitable project ideas.

Hackathon Information:
- Hackathon Name: {hackathon_name}
- Type: {hackathon_type}
- Duration: {duration_hours} hours
- Theme/Challenge: {theme}
- Team Size: {team_size} people
- Team Skills: {team_skills}

**Key Reminders**:
- ⏰ Extremely limited time! Prioritize projects that can complete an MVP within the timeframe
- 🎯 Demo Effect > Product Completeness
- ⚡ Rapid Prototyping > Code Quality
- 💡 Creative Innovation > Technical Complexity

For each project idea, provide:
1. **Project Name**: Short, eye-catching
2. **Tagline**: Immediately grab judges' attention during pitch
3. **Detailed Description**: What problem it solves, how it fits the hackathon theme
4. **Time Feasibility**: Why an MVP can be completed in {duration_hours} hours
5. **Suggested Tech Stack**: Prioritize technologies the team is familiar with and can develop quickly
6. **Demo Highlights**: 3 core demonstration points for presentation
7. **MVP Scope**: Minimum feature set that must be completed (2-3 core features)
8. **Quick Start Suggestions**: What to do in the first 2 hours

Return JSON format:
{{
  "topics": [
    {{
      "topic_id": "h1",
      "name": "Project Name",
      "tagline": "Eye-catching one-liner",
      "description": "Detailed description...",
      "time_feasibility": "Why it can be completed in the given time",
      "suggested_tech": ["React", "Firebase", "Tailwind"],
      "demo_highlights": ["Demo Point 1", "Demo Point 2", "Demo Point 3"],
      "mvp_scope": ["Core Feature 1", "Core Feature 2"],
      "quick_start": "First 2 hours action plan",
      "wow_factor": "What will wow the judges"
    }}
  ],
  "analysis_summary": "Analysis based on hackathon requirements and team capabilities..."
}}"""

HACKATHON_TOPIC_ELABORATION_PROMPT = """The user selected the hackathon project idea: "{topic_name}"

Idea Description: {topic_description}

Hackathon Context:
- Hackathon Name: {hackathon_name}
- Type: {hackathon_type}
- Duration: {duration_hours} hours
- Theme: {theme}
- Team Size: {team_size} people

⏰ **Extreme Time Pressure Reminder**: Only {duration_hours} hours!

Now please create a detailed hackathon project plan.

Return JSON format containing:
1. **Project Background** (problem, why_judges_care, target_users)
2. **Project Goals** (demo_goal, technical_goal, scoring_goal)
3. **Core Features** (name, description, difficulty, estimated_hours)
4. **Enhanced Features** (name, description, priority, estimated_hours)
5. **Technical Architecture** (frontend, backend, data_strategy, deployment)
6. **Timeline Plan** (phase_1, phase_2, phase_3 with hours, goals, deliverables, checkpoints)
7. **Demo Strategy** (pitch_flow, visual_highlights, narrative_angle, backup_plan)
8. **Risk Control** (time_risks, technical_risks, team_division, checkpoints)
9. **Success Criteria** (minimum_viable_demo, ideal_version, must_demonstrate)

Output JSON only, no explanations."""

HACKATHON_PROJECT_DETAILS_PROMPT = """Based on the following hackathon project concept, generate eye-catching project details:

Project Concept:
Name: {topic_name}
Background: {background}
Demo Goal: {demo_goal}

🎯 **Hackathon Naming Characteristics**:
- Short and powerful (1-2 words ideal)
- Easy to remember and pronounce
- Has "story" or "meme" elements
- Sparks curiosity

Please generate:
1. **Project Name Options** (3 options) - Super short (1-3 words), catchy
2. **Project Description** (Pitch style) - 1-2 sentences (must finish in 5 seconds)
3. **Project Tags** (3-5 keywords) - Should be "cool", not too academic

Return JSON format:
{{
  "name_options": [
    {{"name": "Project Name", "rationale": "Naming rationale...", "hook": "Memory hook/highlight"}}
  ],
  "description": "Exciting one-sentence description...",
  "tags": ["AI", "Real-time", "Social Impact"]
}}"""

# ============================================================================
# CAPSTONE PROJECT PROMPTS
# ============================================================================

CAPSTONE_TOPIC_SUGGESTION_PROMPT = """You are an experienced capstone project advisor. Based on the following information, suggest 3-5 suitable capstone/graduation projects.

Project Information:
- School/Major: {school} / {major}
- Project Duration: {duration_months} months
- Defense Requirements: {defense_requirements}
- Academic Requirements: {academic_requirements}
- Team Size: {team_size} people
- Technology Preferences: {preferred_tech}

**Capstone Project Characteristics**:
- 🎓 High Academic Rigor: Requires literature review, theoretical support
- 📊 Multiple Reviews: Proposal defense, mid-term check, final defense
- 📝 Complete Documentation: Detailed docs (proposal, technical docs, thesis)
- 🔬 Innovation: Requires research/innovation points
- ⏳ Long Cycle: 3-9 months, needs good time management

For each project topic, provide:
1. **Project Name**: Academic but not obscure
2. **Tagline**: Reflects both academic and practical value
3. **Detailed Description**: Problem statement, solution, innovation points
4. **Research Value**: Academic contribution or practical application value
5. **Suggested Tech Stack**: Modern and demonstrates technical depth
6. **Difficulty Level**: intermediate/advanced (capstone projects usually not less than intermediate)
7. **Estimated Duration**: Detailed plan for {duration_months} months
8. **Core Modules**: 3-5 major functional modules
9. **Innovation Points**: 1-2 highlights that differentiate from regular projects
10. **Literature Support**: Possible research directions and related fields

Return JSON format:
{{
  "topics": [
    {{
      "topic_id": "c1",
      "name": "Project Name",
      "tagline": "Academic value + Practical value",
      "description": "Detailed description (including problem statement, solution, innovation)",
      "research_value": "Academic contribution and practical application value",
      "suggested_tech": ["React", "Python", "TensorFlow", "PostgreSQL"],
      "difficulty": "advanced",
      "difficulty_reason": "Technical depth and innovation requirements",
      "estimated_months": {duration_months},
      "core_modules": ["Module 1", "Module 2", "Module 3"],
      "innovation_points": ["Innovation 1", "Innovation 2"],
      "literature_support": ["Research Direction 1", "Research Direction 2"]
    }}
  ],
  "analysis_summary": "Analysis based on capstone requirements..."
}}"""

CAPSTONE_TOPIC_ELABORATION_PROMPT = """The user selected the capstone project: "{topic_name}"

Project Description: {topic_description}

Project Context:
- School/Major: {school} / {major}
- Project Duration: {duration_months} months
- Defense Requirements: {defense_requirements}
- Team Size: {team_size} people

Now please create a detailed capstone project implementation plan.

Return JSON format containing:
1. **Research Background and Significance** (research_background, practical_significance, innovation)
2. **Literature Review** (related_work, gap_analysis, theoretical_foundation)
3. **Project Objectives** (overall_objective, specific_goals, expected_outcomes)
4. **Core Functional Modules** (module_name, description, technical_approach, challenges)
5. **Technical Architecture** (frontend, backend, database, ai_ml_components, deployment)
6. **Implementation Plan** (detailed monthly plan including review milestones)
   - Phase 1: Proposal Preparation (literature research, technology selection, proposal defense)
   - Phase 2: System Design (requirements analysis, architecture design, database design)
   - Phase 3: Development (iterative development, code reviews, testing)
   - Phase 4: Testing and Refinement (integration testing, performance optimization, bug fixes)
   - Phase 5: Documentation and Defense Preparation (thesis writing, defense PPT, demo preparation)
7. **Success Criteria** (functionality, academic_quality, documentation, defense_readiness)
8. **Risk Management** (technical_risks, time_risks, resource_risks, mitigation_strategies)

Output JSON only, no explanations."""

CAPSTONE_PROJECT_DETAILS_PROMPT = """Based on the following capstone project concept, generate professional project details:

Project Concept:
Name: {topic_name}
Research Background: {research_background}
Innovation Points: {innovation}

Please generate:
1. **Project Name Options** (3 options) - Academic but accessible (3-5 words)
2. **Project Description** (Academic abstract style) - 3-4 sentences with technical depth
3. **Project Tags** (4-6 keywords) - Balance academic and technical terms

Return JSON format:
{{
  "name_options": [
    {{"name": "Project Name", "rationale": "Naming rationale...", "academic_fit": "Why suitable for thesis"}}
  ],
  "description": "Academic description with technical depth...",
  "tags": ["Machine Learning", "Web Application", "Data Mining", "Healthcare"]
}}"""

# ============================================================================
# RESEARCH PROJECT PROMPTS
# ============================================================================

RESEARCH_TOPIC_SUGGESTION_PROMPT = """You are an experienced research advisor. Based on the following research information, suggest 3-5 suitable research project topics.

Research Information:
- Research Area: {research_area}
- Institution: {institution}
- Advisor Name: {advisor_name}
- Research Type: {research_type}
- Research Questions: {research_questions}
- Proposal Status: {proposal_status}
- Duration: {duration_months} months
- Team Size: {team_size} people
- Funding Available: {funding_available}
- Ethics Approval Required: {requires_ethics_approval}
- Required Methods: {required_methods}

**Research Project Characteristics**:
- 🔬 Scientific Rigor: Well-defined hypotheses and methodology
- 📚 Literature Foundation: Built on existing research
- 📊 Data-Driven: Clear data collection and analysis plans
- 📝 Publication-Ready: Publishable research outcomes
- ⏳ Long-Term: Multi-month systematic investigation
- 🎯 Novel Contribution: Adds to field knowledge

For each research topic, provide:
1. **Project Name**: Academic and descriptive
2. **Tagline**: Research contribution in one sentence
3. **Detailed Description**: Research problem, significance, and approach
4. **Research Significance**: Why this matters to the field
5. **Suggested Methodology**: Research methods and techniques
6. **Difficulty Level**: intermediate/advanced with justification
7. **Estimated Duration**: Breakdown for {duration_months} months
8. **Key Research Questions**: 2-3 core questions to investigate
9. **Expected Outcomes**: Publications, findings, contributions
10. **Feasibility**: Why this is achievable with given resources

Return JSON format:
{{
  "topics": [
    {{
      "topic_id": "r1",
      "name": "Research Project Name",
      "tagline": "Novel contribution to the field",
      "description": "Research problem, significance, and approach...",
      "research_significance": "Impact on the field and practical applications",
      "suggested_tech": ["Python", "R", "TensorFlow", "Statistical Analysis"],
      "difficulty": "advanced",
      "difficulty_reason": "Requires deep technical knowledge and novel methodology",
      "estimated_weeks": 52,
      "key_features": ["Research Question 1", "Research Question 2", "Research Question 3"],
      "expected_outcomes": ["Publication", "Novel Algorithm", "Dataset"],
      "feasibility_analysis": "Why achievable with current resources"
    }}
  ],
  "analysis_summary": "Analysis based on research area and available resources..."
}}"""

RESEARCH_TOPIC_ELABORATION_PROMPT = """The user selected the research project: "{topic_name}"

Project Description: {topic_description}

Research Context:
- Research Area: {research_area}
- Institution: {institution}
- Advisor: {advisor_name}
- Duration: {duration_months} months
- Team Size: {team_size} people
- Funding: {funding_available}
- Ethics Approval: {requires_ethics_approval}
- Team Members: {team_members} (if provided)

Now please create a detailed research project plan.

**IMPORTANT - Detailed Task Breakdown:**
For EACH phase in the Research Timeline, you MUST provide a detailed tasks array with:
1. **Tasks**: Break down the phase into specific, actionable research tasks (3-6 tasks per phase)
2. **Task Details**: Each task MUST include all these fields:
   - name: Clear task name
   - description: What needs to be accomplished
   - estimated_hours: Realistic hours (research tasks: 40-160 hours)
   - start_date: Calculate from project start if available, otherwise omit
   - due_date: Calculate based on phase duration, otherwise omit
   - assigned_to: **REQUIRED** - Use ACTUAL team member name from team_members list. Intelligently match tasks to team members based on their role:
     * If team_members is provided, use ACTUAL NAMES (e.g., "John Smith", "Dr. Sarah Johnson")
     * Match role to task type: admin/advisor → supervision/review, member/student → core tasks, collaborator → specialized tasks
     * If no team members provided, use generic role (e.g., "Graduate Student", "Research Assistant")
   - dependencies: Array of task names that must be completed first (can be empty array)
   - priority: "high", "medium", or "low"
   - subtasks: Array of 2-4 subtasks for complex tasks (each with name, estimated_hours, assigned_to using actual team member names)
3. **Assignment Strategy**:
   - **USE ACTUAL TEAM MEMBER NAMES** from the team_members list when available
   - Match team member roles to appropriate tasks:
     * "admin" role → Supervision, review, oversight tasks
     * "member" role → Core research, analysis, implementation tasks
     * "collaborator" role → Specialized methodology, consultation tasks
   - Distribute workload evenly across team members based on their roles
   - For subtasks, also use actual team member names for assignments

**Example Task Structure:**
{{
  "name": "Conduct Comprehensive Literature Review",
  "description": "Review recent papers on RAG and Knowledge Graphs from top conferences (ACL, EMNLP, NeurIPS)",
  "estimated_hours": 80,
  "start_date": "2024-01-15",
  "due_date": "2024-02-15",
  "assigned_to": "Graduate Student",
  "dependencies": [],
  "priority": "high",
  "subtasks": [
    {{"name": "Search and collect relevant papers", "estimated_hours": 20, "assigned_to": "Graduate Student"}},
    {{"name": "Analyze RAG methodologies", "estimated_hours": 30, "assigned_to": "Graduate Student"}},
    {{"name": "Analyze KG integration approaches", "estimated_hours": 20, "assigned_to": "Graduate Student"}},
    {{"name": "Write literature review section", "estimated_hours": 10, "assigned_to": "Graduate Student"}}
  ]
}}

Return JSON format containing:
1. **Research Background and Literature Review** (field_overview, gap_analysis, theoretical_foundation, related_work)
2. **Research Questions and Hypotheses** (primary_question, sub_questions, hypotheses, expected_findings)
3. **Research Methodology** (research_design, data_collection, analysis_methods, validation_approach)
4. **Technical Implementation** (tools, technologies, computational_requirements, infrastructure)
5. **Research Timeline** (phases with duration, objectives, milestones, deliverables, checkpoints, **tasks**)
   - Phase 1: Literature Review and Proposal (1-2 months)
   - Phase 2: Methodology Development (1-2 months)
   - Phase 3: Data Collection and Experiments (3-6 months)
   - Phase 4: Analysis and Validation (2-3 months)
   - Phase 5: Writing and Submission (2-3 months)

   **CRITICAL**: Each phase MUST include a "tasks" array with detailed task breakdown as shown in the example above.

6. **Expected Contributions** (theoretical_contributions, practical_applications, publications)
7. **Success Criteria** (research_quality, publication_readiness, reproducibility, impact)
8. **Risk Management** (methodology_risks, data_risks, timeline_risks, mitigation_strategies)

Output JSON only, no explanations."""

RESEARCH_PROJECT_DETAILS_PROMPT = """Based on the following research project concept, generate professional project details:

Project Concept:
Name: {topic_name}
Background: {background}
Research Focus: {research_background}

Please generate:
1. **Project Name Options** (3 options) - Academic, descriptive (4-6 words)
2. **Project Description** (Abstract style) - Research problem, approach, and contribution in 3-4 sentences
3. **Project Tags** (5-7 keywords) - Research area, methods, and application domain

Return JSON format:
{{
  "name_options": [
    {{"name": "Research Project Name", "rationale": "Academic appropriateness...", "publication_fit": "Why suitable for papers"}}
  ],
  "description": "Academic research description with clear contribution...",
  "tags": ["Machine Learning", "Healthcare", "Deep Learning", "Clinical Data", "Predictive Models"]
}}"""

# ============================================================================
# RESEARCH PROJECT CHUNKED PROMPTS (for handling token limits)
# ============================================================================

RESEARCH_ELABORATION_CHUNK1_PROMPT = """The user selected the research project: "{topic_name}"

Project Description: {topic_description}

Research Context:
- Research Area: {research_area}
- Institution: {institution}
- Advisor: {advisor_name}
- Duration: {duration_months} months
- Team Size: {team_size} people
- Funding: {funding_available}
- Ethics Approval: {requires_ethics_approval}

Create the CORE RESEARCH PLAN (excluding timeline - that will be generated separately).

Return JSON format containing:
1. **Research Background and Literature Review** (field_overview, gap_analysis, theoretical_foundation, related_work)
2. **Research Questions and Hypotheses** (primary_question, sub_questions, hypotheses, expected_findings)
3. **Research Methodology** (research_design, data_collection, analysis_methods, validation_approach)
4. **Technical Implementation** (tools, technologies, computational_requirements, infrastructure)
5. **Expected Contributions** (theoretical_contributions, practical_applications, publications)
6. **Success Criteria** (research_quality, publication_readiness, reproducibility, impact)
7. **Risk Management** (methodology_risks, data_risks, timeline_risks, mitigation_strategies)

Output JSON only, no explanations."""

RESEARCH_ELABORATION_CHUNK2_PROMPT = """The user selected the research project: "{topic_name}"

Project Description: {topic_description}

Research Context:
- Duration: {duration_months} months
- Team Size: {team_size} people
- Team Members: {team_members}

Create a DETAILED RESEARCH TIMELINE with milestone-based task breakdown.

**STRUCTURE: Section → Milestones → Tasks**
- Each PHASE (section) contains multiple MILESTONES
- Each MILESTONE contains multiple TASKS
- Tasks are grouped under their parent milestone

**IMPORTANT - Assignment Rules:**
1. **Only tasks have assignees** - milestones are project-level items
2. **EQUAL WORKLOAD DISTRIBUTION**: Distribute hours EVENLY across all team members within each phase
3. Use ACTUAL team member names from team_members list

**Task Details**: Each task MUST include:
- name: Clear task name
- description: What needs to be accomplished
- estimated_hours: Realistic hours (20-80 hours per task)
- assigned_to: Use ACTUAL team member name
- priority: "high", "medium", or "low"
- subtasks: Array of 2-3 subtasks (optional)

Return JSON format:
{{
  "Research Timeline": {{
    "phases": [
      {{
        "name": "Phase 1: Literature Review and Proposal",
        "duration": "1-2 months",
        "objectives": "Complete literature review and finalize research proposal",
        "milestones": [
          {{
            "name": "Literature Review Complete",
            "description": "Comprehensive review of existing research",
            "tasks": [
              {{
                "name": "Review RAG Pipeline Literature",
                "description": "Survey papers on RAG architectures and implementations",
                "estimated_hours": 40,
                "assigned_to": "Member A",
                "priority": "high",
                "subtasks": [
                  {{"name": "Search academic databases", "estimated_hours": 10, "assigned_to": "Member A"}},
                  {{"name": "Analyze methodologies", "estimated_hours": 20, "assigned_to": "Member A"}},
                  {{"name": "Document findings", "estimated_hours": 10, "assigned_to": "Member A"}}
                ]
              }},
              {{
                "name": "Review Rank Fusion Algorithms",
                "description": "Study different rank fusion techniques",
                "estimated_hours": 40,
                "assigned_to": "Member B",
                "priority": "high",
                "subtasks": [...]
              }}
            ]
          }},
          {{
            "name": "Research Proposal Approved",
            "description": "Formal proposal document reviewed and approved",
            "tasks": [
              {{
                "name": "Draft Research Proposal",
                "description": "Write initial proposal document",
                "estimated_hours": 30,
                "assigned_to": "Member A",
                "priority": "high"
              }},
              {{
                "name": "Proposal Review and Revision",
                "description": "Incorporate feedback and finalize",
                "estimated_hours": 20,
                "assigned_to": "Member B",
                "priority": "medium"
              }}
            ]
          }}
        ]
      }},
      {{
        "name": "Phase 2: Methodology Development",
        "duration": "1-2 months",
        "objectives": "Design and validate research methodology",
        "milestones": [
          {{
            "name": "Methodology Defined",
            "description": "...",
            "tasks": [...]
          }},
          {{
            "name": "Baseline Implementation",
            "description": "...",
            "tasks": [...]
          }}
        ]
      }},
      {{
        "name": "Phase 3: Data Collection and Experiments",
        "duration": "2-3 months",
        "objectives": "...",
        "milestones": [...]
      }},
      {{
        "name": "Phase 4: Analysis and Validation",
        "duration": "1-2 months",
        "objectives": "...",
        "milestones": [...]
      }},
      {{
        "name": "Phase 5: Writing and Submission",
        "duration": "1-2 months",
        "objectives": "...",
        "milestones": [...]
      }}
    ]
  }}
}}

Output JSON only, no explanations."""

# ============================================================================
# COMPETITION PROJECT PROMPTS
# ============================================================================

COMPETITION_TOPIC_SUGGESTION_PROMPT = """You are an experienced competition strategy advisor. Based on the following competition information, suggest 3-5 competitive project proposals.

Competition Information:
- Competition Name: {competition_name}
- Competition Type: {competition_type}
- Submission Deadline: {deadline}
- Judging Criteria: {judging_criteria}
- Team Size: {team_size} people
- Participant Background: {participant_background}

**Competition Project Key Elements**:
- 🏆 Winning-Oriented: Optimized for judging criteria
- 📊 Data-Driven: Quantifiable metrics and evidence support
- 💡 Innovation: Differentiated competitive advantage
- 🎯 Clear Positioning: Stand out from competitors
- 📋 Submission Excellence: Professional documentation and presentation

For each project proposal, provide:
1. **Project Name**: Professional and memorable
2. **Tagline**: Competitive advantage in one sentence
3. **Detailed Description**: Problem + Solution + Innovation
4. **Competitive Analysis**: Why this beats typical submissions
5. **Suggested Tech Stack**: Technologies that demonstrate capability
6. **Judging Alignment**: How it meets each judging criterion
7. **Evidence Plan**: What data/results will prove success
8. **Differentiation**: Unique selling points
9. **Submission Strategy**: Documentation and presentation highlights

Return JSON format:
{{
  "topics": [
    {{
      "topic_id": "comp1",
      "name": "Proposal Name",
      "tagline": "Core competitive advantage",
      "description": "Detailed description (problem + solution + innovation)",
      "competitive_analysis": "Why this proposal stands out",
      "suggested_tech": ["Technology choices that impress judges"],
      "judging_alignment": {{"criterion1": "How we meet it", "criterion2": "..."}},
      "evidence_plan": ["Metric 1", "Metric 2", "Metric 3"],
      "differentiation": ["USP 1", "USP 2"],
      "submission_strategy": "Documentation and presentation approach"
    }}
  ],
  "analysis_summary": "Strategic analysis based on competition requirements..."
}}"""

COMPETITION_TOPIC_ELABORATION_PROMPT = """The user selected the competition proposal: "{topic_name}"

Proposal Description: {topic_description}

Competition Context:
- Competition Name: {competition_name}
- Competition Type: {competition_type}
- Judging Criteria: {judging_criteria}
- Submission Deadline: {deadline}
- Team Size: {team_size} people

Now please create a detailed competition project plan.

Return JSON format containing:
1. **Executive Summary** (problem_statement, proposed_solution, expected_impact, key_metrics)
2. **Competitive Positioning** (market_analysis, competitor_analysis, our_differentiation)
3. **Technical Solution** (architecture, key_technologies, implementation_approach, innovation_points)
4. **Evidence and Validation** (success_metrics, validation_plan, pilot_results, data_sources)
5. **Implementation Roadmap** (timeline, milestones, deliverables, risk_management)
6. **Judging Criteria Alignment** (detailed mapping of how project meets each criterion)
7. **Submission Package** (documentation_plan, presentation_strategy, visual_materials, demo_plan)
8. **Risk Mitigation** (technical_risks, timeline_risks, competitive_risks, contingency_plans)

Output JSON only, no explanations."""

COMPETITION_PROJECT_DETAILS_PROMPT = """Based on the following competition project concept, generate winning project details:

Project Concept:
Name: {topic_name}
Solution: {proposed_solution}
Differentiation: {differentiation}

Please generate:
1. **Project Name Options** (3 options) - Professional, memorable, reflects innovation
2. **Project Description** (Competition pitch style) - Clear problem, solution, and impact in 3-4 sentences
3. **Project Tags** (4-6 keywords) - Strategic mix of technical, industry, and impact terms

Return JSON format:
{{
  "name_options": [
    {{"name": "Project Name", "rationale": "Why this wins...", "memorability": "What makes it stick"}}
  ],
  "description": "Winning pitch description...",
  "tags": ["Innovation", "Scalable", "Social Impact", "AI-Powered"]
}}"""

# ============================================================================
# INTERNSHIP PROJECT PROMPTS
# ============================================================================

INTERNSHIP_TOPIC_SUGGESTION_PROMPT = """You are a professional project manager. Based on the following internship information, suggest 3-5 suitable internship projects.

Internship Information:
- Company Name: {company_name}
- Project/Team: {project_name}
- Manager/Mentor: {mentor_name}
- Business Objectives: {business_objectives}
- Duration: {duration_months} months
- Required Technologies: {required_tech}

**Internship Project Characteristics**:
- 💼 Real Business Environment: Actual production impact
- 🎯 Deliverable-Focused: Clear, measurable outcomes
- 👥 Stakeholder Management: Multiple stakeholders involved
- ⏱️ Professional Standards: Production-quality code and documentation
- 📈 Career Development: Skills that enhance your profile

For each project suggestion, provide:
1. **Project Name**: Professional and business-oriented
2. **Tagline**: Business value in one sentence
3. **Detailed Description**: Business problem, technical solution, expected impact
4. **Business Value**: How it benefits the company/team
5. **Suggested Tech Stack**: Technologies aligned with company stack
6. **Deliverables**: Concrete outputs expected
7. **Learning Opportunities**: Skills you'll develop
8. **Success Metrics**: How project success will be measured
9. **Stakeholder Impact**: Who benefits and how

Return JSON format:
{{
  "topics": [
    {{
      "topic_id": "int1",
      "name": "Project Name",
      "tagline": "Business value proposition",
      "description": "Business problem + technical solution + impact",
      "business_value": "How this helps the company",
      "suggested_tech": ["Company-relevant technologies"],
      "deliverables": ["Deliverable 1", "Deliverable 2", "Deliverable 3"],
      "learning_opportunities": ["Skill 1", "Skill 2", "Skill 3"],
      "success_metrics": ["Metric 1", "Metric 2"],
      "stakeholder_impact": "Who benefits and how"
    }}
  ],
  "analysis_summary": "Analysis based on business objectives and internship context..."
}}"""

INTERNSHIP_TOPIC_ELABORATION_PROMPT = """The user selected the internship project: "{topic_name}"

Project Description: {topic_description}

Internship Context:
- Company: {company_name}
- Duration: {duration_months} months
- Business Objectives: {business_objectives}
- Deliverables: {deliverables}

Now please create a detailed internship project plan.

Return JSON format containing:
1. **Project Charter** (background, business_case, stakeholders, success_criteria)
2. **Requirements Analysis** (functional_requirements, non_functional_requirements, constraints)
3. **Technical Design** (architecture, technology_stack, integration_points, data_flow)
4. **Implementation Plan** (sprints/phases, deliverables_per_phase, review_points)
5. **Quality Assurance** (testing_strategy, code_review_process, documentation_standards)
6. **Stakeholder Communication** (status_reporting, demo_schedule, feedback_loops)
7. **Risk Management** (technical_risks, timeline_risks, dependency_risks, mitigation_plans)
8. **Knowledge Transfer** (documentation_plan, handoff_strategy, training_needs)

Output JSON only, no explanations."""

INTERNSHIP_PROJECT_DETAILS_PROMPT = """Based on the following internship project concept, generate professional project details:

Project Concept:
Name: {topic_name}
Business Case: {business_case}
Deliverables: {deliverables}

Please generate:
1. **Project Name Options** (3 options) - Professional, clear business purpose
2. **Project Description** (Business brief style) - Problem, solution, value in 3 sentences
3. **Project Tags** (4-5 keywords) - Business and technical terms

Return JSON format:
{{
  "name_options": [
    {{"name": "Project Name", "rationale": "Why this fits the business...", "professional_tone": "How it sounds professional"}}
  ],
  "description": "Business-focused description...",
  "tags": ["Automation", "Analytics", "Production", "Scalability"]
}}"""

# ============================================================================
# INDUSTRY PROJECT PROMPTS
# ============================================================================

INDUSTRY_TOPIC_SUGGESTION_PROMPT = """You are an industry collaboration and consulting project expert with deep expertise in {industry_sector}. Based on the following industry partnership information, suggest 3-5 suitable project approaches.

Industry Partnership Information:
- Client/Partner Company: {client_company_name}
- Industry Sector: {industry_sector}
- Project Type: {project_type}
- Business Challenge: {business_challenge}
- Project Scope: {project_scope}
- Deliverables: {deliverables}
- Success Metrics: {success_metrics}
- Duration: {duration_months} months
- Team Size: {team_size} people
- Required Expertise: {required_expertise}
- Compliance Requirements: {compliance}

**Industry-Specific Context**:
Consider domain-specific best practices, common challenges, and proven solutions for {industry_sector}. Your suggestions should reflect:
- Industry-standard methodologies and frameworks
- Relevant regulatory and compliance requirements
- Common technology stacks used in this sector
- Typical project patterns and success factors
- Key stakeholder concerns in this domain

**Industry Project Characteristics**:
- 💼 Business-Driven: Clear ROI and business value expected
- 🤝 Stakeholder Management: Multiple parties to coordinate
- 📊 Measurable Outcomes: KPIs and success metrics defined
- 🏢 Professional Standards: Production-quality deliverables
- 📈 Strategic Impact: Potential for long-term partnership
- 🔒 Compliance-Aware: Meets industry regulatory standards

For each project approach, provide:
1. **Project Name**: Professional, business-focused
2. **Tagline**: Business value proposition in one sentence
3. **Detailed Description**: Solution approach and expected business impact
4. **Strategic Alignment**: How it addresses the business challenge
5. **Suggested Methodology**: Project management and execution approach
6. **Technology Stack**: Industry-standard, proven technologies
7. **Difficulty Level**: beginner/intermediate/advanced with justification
8. **Estimated Timeline**: In months with key milestones
9. **Success Indicators**: How success will be measured
10. **Risk Factors**: Potential challenges and mitigation strategies

Requirements:
- Focus on practical, implementable solutions with clear business value
- Consider industry-specific constraints and compliance requirements
- Ensure scope is achievable within timeline and team capacity
- Emphasize scalability and maintainability
- Include stakeholder communication and change management considerations

Return JSON format only (no explanations):
{{
  "topics": [
    {{
      "topic_id": "t1",
      "name": "Project Name",
      "tagline": "Business value proposition...",
      "description": "Solution approach and impact...",
      "strategic_alignment": "How it solves the business challenge...",
      "suggested_methodology": "Agile/Waterfall/Hybrid approach...",
      "suggested_tech": ["Python", "AWS", "React"],
      "difficulty": "intermediate",
      "difficulty_reason": "Technical complexity and stakeholder management...",
      "estimated_months": 6,
      "key_milestones": ["Discovery & Planning", "MVP Development", "Testing & Deployment"],
      "success_indicators": ["KPI 1", "KPI 2", "KPI 3"],
      "risk_factors": [{{"risk": "Risk description", "mitigation": "Mitigation strategy"}}]
    }}
  ],
  "analysis_summary": "Analysis of business challenge and recommended approach..."
}}"""

INDUSTRY_TOPIC_ELABORATION_PROMPT = """The client selected the project approach: "{topic_name}"

Approach Description: {topic_description}

Industry Partnership Context:
- Client Company: {client_company_name}
- Industry Sector: {industry_sector}
- Business Challenge: {business_challenge}
- Success Metrics: {success_metrics}
- Timeline: {duration_months} months
- Team Size: {team_size} people
- Stakeholders: {stakeholders}
- Compliance Requirements: {compliance}

**Industry Expertise Applied**:
As an expert in {industry_sector}, consider:
- Domain-specific success patterns and best practices
- Industry-standard quality assurance approaches
- Regulatory compliance and risk management strategies
- Typical stakeholder dynamics in this sector
- Technology choices proven in this industry

Now please create a comprehensive project execution plan suitable for an industry partnership in {industry_sector}.

Return JSON format containing:
1. **Executive Summary** (business_case, expected_value, strategic_fit, roi_projection)
2. **Project Objectives** (primary_objectives, secondary_objectives, success_criteria, constraints)
3. **Scope Definition** (in_scope, out_of_scope, assumptions, dependencies)
4. **Solution Architecture** (technical_approach, system_components, integration_points, scalability_plan)
5. **Implementation Phases** (phase_name, duration_months, objectives, deliverables, milestones, risks)
6. **Stakeholder Management** (stakeholder_groups, communication_plan, decision_points, approval_gates)
7. **Risk Management** (risk_category, description, probability, impact, mitigation_strategy)
8. **Quality Assurance** (quality_standards, testing_strategy, acceptance_criteria, compliance_requirements)
9. **Budget & Resources** (resource_allocation, technology_costs, training_needs, contingency_plan)
10. **Post-Delivery Plan** (handover_process, training_plan, support_structure, maintenance_strategy)

Output JSON only, no explanations."""

INDUSTRY_PROJECT_DETAILS_PROMPT = """Based on the following industry project concept, generate professional project details:

Project Concept:
Name: {topic_name}
Business Case: {business_case}
Expected Value: {expected_value}
Client: {client_company_name}

Please generate:
1. **Project Name Options** (3 options) - Professional, conveys business value, industry-appropriate
2. **Project Description** (Executive brief style) - Challenge, solution, value, impact in 3-4 sentences
3. **Project Tags** (4-6 keywords) - Industry sector, technology, business value, methodology

Return JSON format:
{{
  "name_options": [
    {{"name": "Project Name", "rationale": "Why it fits the business context...", "client_appeal": "How it resonates with stakeholders"}}
  ],
  "description": "Executive-level project description emphasizing business value and strategic impact...",
  "tags": ["FinTech", "Data Analytics", "ROI Optimization", "Cloud Migration", "Agile"]
}}"""

# ============================================================================
# FREELANCE/CLIENT PROJECT PROMPTS
# ============================================================================

FREELANCE_TOPIC_SUGGESTION_PROMPT = """You are a freelance project consultant with expertise in {project_category}. Based on the following client project information, suggest 3-5 suitable project approaches that balance client needs with practical delivery.

Client Project Information:
- Client Name: {client_name}
- Client Industry: {client_industry}
- Project Category: {project_category}
- Project Brief: {project_brief}
- Requested Deliverables: {deliverables}
- Payment Structure: {payment_structure}
- Budget/Rate: {budget_or_rate}
- Timeline: {timeline_weeks} weeks
- Team Size: {team_size} people
- Required Skills: {required_skills}
- Communication Preferences: {communication_preferences}
- Specific Requirements: {specific_requirements}

**Freelance Project Characteristics**:
- 💰 Clear Pricing: Fixed scope with defined payment milestones
- 📅 Time-Bound: Specific deadline with buffer for revisions
- 🎯 Deliverable-Focused: Concrete outputs the client can use
- 💬 Client Communication: Regular updates and feedback loops
- 🔄 Revision-Friendly: Plan for client feedback and iterations
- 📝 Well-Documented: Clear handoff and documentation

For each project approach, provide:
1. **Project Name**: Professional, client-friendly name
2. **Tagline**: Value proposition for the client in one sentence
3. **Detailed Description**: What you'll build and how it solves their needs
4. **Key Features**: 4-6 main features or components
5. **Deliverables Breakdown**: Specific items the client will receive
6. **Suggested Tech Stack**: Appropriate for scope and maintainability
7. **Difficulty Level**: beginner/intermediate/advanced with justification
8. **Timeline Breakdown**: Phase-by-phase breakdown fitting the timeline
9. **Milestone Payments**: If applicable, suggested payment schedule
10. **Client Benefits**: Clear value for the client's business

Requirements:
- Scope must be achievable within stated timeline and budget
- Focus on practical, proven solutions over experimental approaches
- Include time buffers for client feedback and revisions
- Ensure deliverables are clearly defined and measurable
- Consider ongoing maintenance and support needs

Return JSON format only (no explanations):
{{
  "topics": [
    {{
      "topic_id": "t1",
      "name": "Project Name",
      "tagline": "Value proposition for client...",
      "description": "What you'll deliver and how it helps...",
      "key_features": ["Feature 1", "Feature 2", "Feature 3", "Feature 4"],
      "deliverables_breakdown": ["Deliverable 1", "Deliverable 2", "Deliverable 3"],
      "suggested_tech": ["Technology", "Framework", "Tool"],
      "difficulty": "intermediate",
      "difficulty_reason": "Complexity justification...",
      "timeline_weeks": 8,
      "timeline_phases": [
        {{"phase": "Discovery & Planning", "weeks": 1}},
        {{"phase": "Development", "weeks": 5}},
        {{"phase": "Testing & Revisions", "weeks": 1}},
        {{"phase": "Deployment & Handoff", "weeks": 1}}
      ],
      "milestone_payments": [
        {{"milestone": "Initial deposit", "percentage": 30}},
        {{"milestone": "MVP delivery", "percentage": 40}},
        {{"milestone": "Final delivery", "percentage": 30}}
      ],
      "client_benefits": ["Benefit 1", "Benefit 2", "Benefit 3"]
    }}
  ],
  "analysis_summary": "Analysis of client needs and recommended approach..."
}}"""

FREELANCE_TOPIC_ELABORATION_PROMPT = """The client selected the project approach: "{topic_name}"

Approach Description: {topic_description}

Client Project Context:
- Client Name: {client_name}
- Project Category: {project_category}
- Client Industry: {client_industry}
- Project Brief: {project_brief}
- Timeline: {timeline_weeks} weeks
- Budget/Rate: {budget_or_rate}
- Payment Structure: {payment_structure}
- Team Size: {team_size} people
- Communication Preferences: {communication_preferences}

**Freelance Project Expertise Applied**:
As a freelance {project_category} expert, consider:
- Client communication and expectation management best practices
- Proven project structures that minimize scope creep
- Clear milestone definitions for progress tracking
- Realistic timelines with built-in revision cycles
- Documentation that enables smooth handoff
- Support and maintenance considerations

Now please create a detailed project execution plan suitable for a freelance client engagement.

Return JSON format containing:
1. **Project Overview** (problem_statement, solution_approach, client_value, success_definition)
2. **Scope of Work** (included_features, excluded_items, assumptions, change_request_process)
3. **Deliverables** (deliverable_name, description, format, acceptance_criteria)
4. **Technical Approach** (architecture_overview, technology_stack, third_party_services, security_considerations)
5. **Project Timeline** (phase_name, duration_weeks, activities, deliverables, client_involvement)
6. **Communication Plan** (update_frequency, meeting_schedule, reporting_format, feedback_loops)
7. **Payment Schedule** (milestone_name, description, amount_percentage, expected_date, trigger_condition)
8. **Risk Management** (risk_description, likelihood, impact, mitigation_plan, contingency)
9. **Quality Assurance** (testing_approach, quality_checks, client_approval_points, revision_policy)
10. **Handoff & Support** (documentation_provided, training_plan, support_period, maintenance_options)

Output JSON only, no explanations."""

FREELANCE_PROJECT_DETAILS_PROMPT = """Based on the following freelance project concept, generate professional project details:

Project Concept:
Name: {topic_name}
Problem Statement: {problem_statement}
Solution: {solution_approach}
Client: {client_name}

Please generate:
1. **Project Name Options** (3 options) - Professional, client-friendly, describes value
2. **Project Description** (Client-facing pitch style) - Problem, solution, benefits in 3-4 sentences
3. **Project Tags** (4-6 keywords) - Category, technologies, client industry, key features

Return JSON format:
{{
  "name_options": [
    {{"name": "Project Name", "rationale": "Why it resonates with client needs...", "memorability": "How it stands out"}}
  ],
  "description": "Client-facing description emphasizing value and benefits...",
  "tags": ["Web Development", "E-commerce", "React", "Payment Integration", "Mobile-Responsive"]
}}"""

# ============================================================================
# OPEN SOURCE PROJECT PROMPTS
# ============================================================================

OPENSOURCE_TOPIC_SUGGESTION_PROMPT = """You are an open source community expert. Based on the following information, suggest 3-5 suitable open source contribution opportunities.

Contributor Information:
- Project Name/Area: {project_name}
- Repository: {repository_url}
- Contribution Area: {contribution_area}
- Skill Level: {skill_level}
- Time Commitment: {time_commitment_hours} hours/week
- Programming Languages: {languages}

**Open Source Contribution Characteristics**:
- 🌍 Community-Driven: Collaboration with global developers
- 📖 Documentation Important: Clear communication essential
- 🔍 Issue-Based: Work on existing issues or propose new features
- ✅ Code Review: Learn from maintainer feedback
- 🎯 Strategic Contributions: Build reputation and skills

For each contribution opportunity, provide:
1. **Contribution Name**: Clear what you're working on
2. **Tagline**: Impact in one sentence
3. **Detailed Description**: What problem it solves, why it matters to the community
4. **Difficulty Assessment**: Why it matches the contributor's skill level
5. **Estimated Effort**: Time commitment per week and total duration
6. **Learning Outcomes**: Skills and knowledge gained
7. **Community Impact**: How it benefits the project and users
8. **Getting Started**: First steps to take
9. **Success Criteria**: How to know you've completed it successfully

Return JSON format:
{{
  "topics": [
    {{
      "topic_id": "os1",
      "name": "Contribution Name",
      "tagline": "Community impact",
      "description": "Problem + Solution + Community benefit",
      "difficulty_assessment": "Why this matches skill level",
      "estimated_effort": "{time_commitment_hours} hrs/week for X weeks",
      "learning_outcomes": ["Skill 1", "Skill 2", "Skill 3"],
      "community_impact": "How it helps the project and users",
      "getting_started": "First steps to take",
      "success_criteria": ["Criterion 1", "Criterion 2"]
    }}
  ],
  "analysis_summary": "Analysis based on contributor profile and project needs..."
}}"""

OPENSOURCE_TOPIC_ELABORATION_PROMPT = """The user selected the open source contribution: "{topic_name}"

Contribution Description: {topic_description}

Project Context:
- Project: {project_name}
- Repository: {repository_url}
- Contribution Area: {contribution_area}
- Skill Level: {skill_level}
- Time Available: {time_commitment_hours} hours/week

Now please create a detailed contribution plan.

Return JSON format containing:
1. **Contribution Overview** (problem_statement, proposed_solution, expected_outcome, community_benefit)
2. **Technical Approach** (implementation_strategy, technologies_used, coding_standards, testing_requirements)
3. **Contribution Workflow** (setup_environment, development_process, code_review_cycle, merge_strategy)
4. **Timeline** (weeks_breakdown, milestones, checkpoints, deliverables)
5. **Community Engagement** (discussion_plan, documentation_updates, communication_channels, mentorship)
6. **Learning Plan** (knowledge_areas, resources, practice_exercises, skill_checkpoints)
7. **Quality Standards** (code_quality, testing_coverage, documentation_quality, contribution_guidelines)
8. **Contingency Plan** (blockers_handling, alternative_approaches, help_resources, backup_contributions)

Output JSON only, no explanations."""

OPENSOURCE_PROJECT_DETAILS_PROMPT = """Based on the following open source contribution concept, generate clear project details:

Contribution Concept:
Name: {topic_name}
Proposed Solution: {proposed_solution}
Community Benefit: {community_benefit}

Please generate:
1. **Contribution Name Options** (3 options) - Clear, descriptive, community-friendly
2. **Contribution Description** (Open source brief style) - What, why, and impact in 2-3 sentences
3. **Project Tags** (4-5 keywords) - Technical and contribution type tags

Return JSON format:
{{
  "name_options": [
    {{"name": "Contribution Name", "rationale": "Why this is clear...", "community_appeal": "Why contributors care"}}
  ],
  "description": "Community-focused description...",
  "tags": ["Feature", "Documentation", "Bug Fix", "Performance"]
}}"""

# ============================================================================
# PORTFOLIO PROJECT PROMPTS
# ============================================================================

PORTFOLIO_TOPIC_SUGGESTION_PROMPT = """You are a career advisor specializing in developer portfolios. Based on the following information, suggest 3-5 impressive portfolio projects.

Career Information:
- Career Goal: {career_goal}
- Target Audience: {target_audience}
- Skills to Showcase: {skills_to_showcase}
- Project Complexity: {project_complexity}
- Duration: {duration_weeks} weeks
- Project Type: {project_type}

**Portfolio Project Characteristics**:
- 🎯 Showcase-Focused: Highlights your best skills
- 💼 Professional Quality: Production-ready appearance
- 📱 Demo-Ready: Easy to demonstrate and share
- 🌟 Unique: Stands out from typical portfolio projects
- 📝 Well-Documented: Clear README and documentation

For each project suggestion, provide:
1. **Project Name**: Professional and memorable
2. **Tagline**: Your unique value proposition
3. **Detailed Description**: What it does, who it's for, why it's impressive
4. **Skills Demonstrated**: Specific technical skills showcased
5. **Suggested Tech Stack**: Modern, in-demand technologies
6. **Unique Selling Points**: What makes it stand out
7. **Complexity Level**: Matches desired project complexity
8. **Portfolio Impact**: How it strengthens your portfolio
9. **Demo Strategy**: How to present it effectively

Return JSON format:
{{
  "topics": [
    {{
      "topic_id": "p1",
      "name": "Project Name",
      "tagline": "Your unique value",
      "description": "What it does + who it's for + why impressive",
      "skills_demonstrated": ["Skill 1", "Skill 2", "Skill 3"],
      "suggested_tech": ["Modern tech stack"],
      "unique_selling_points": ["USP 1", "USP 2"],
      "complexity_level": "{project_complexity}",
      "portfolio_impact": "How this strengthens your profile",
      "demo_strategy": "How to present this effectively"
    }}
  ],
  "analysis_summary": "Analysis based on career goals and target audience..."
}}"""

PORTFOLIO_TOPIC_ELABORATION_PROMPT = """The user selected the portfolio project: "{topic_name}"

Project Description: {topic_description}

Career Context:
- Career Goal: {career_goal}
- Target Audience: {target_audience}
- Skills to Showcase: {skills_to_showcase}
- Duration: {duration_weeks} weeks

Now please create a detailed portfolio project plan.

Return JSON format containing:
1. **Project Vision** (problem_statement, target_users, unique_value, portfolio_positioning)
2. **Feature Set** (mvp_features, showcase_features, optional_enhancements, feature_prioritization)
3. **Technical Implementation** (architecture, technology_choices, best_practices, code_organization)
4. **Design and UX** (design_approach, user_flows, visual_identity, responsive_design)
5. **Development Roadmap** (weekly_breakdown, milestones, deliverables, time_allocation)
6. **Portfolio Presentation** (readme_structure, demo_preparation, case_study_outline, screenshots_plan)
7. **Code Quality** (testing_strategy, documentation, code_standards, deployment)
8. **Career Impact** (skills_highlighted, talking_points, interview_preparation, linkedin_showcase)

Output JSON only, no explanations."""

PORTFOLIO_PROJECT_DETAILS_PROMPT = """Based on the following portfolio project concept, generate impressive project details:

Project Concept:
Name: {topic_name}
Unique Value: {unique_value}
Skills Demonstrated: {skills_demonstrated}

Please generate:
1. **Project Name Options** (3 options) - Memorable, professional, reflects purpose
2. **Project Description** (Portfolio pitch style) - Value proposition and tech highlights in 2-3 sentences
3. **Project Tags** (4-6 keywords) - Technical skills and project type

Return JSON format:
{{
  "name_options": [
    {{"name": "Project Name", "rationale": "Why this is memorable...", "career_fit": "How it aligns with goals"}}
  ],
  "description": "Impressive portfolio description...",
  "tags": ["React", "Full-Stack", "Real-time", "Production-Ready"]
}}"""

# ============================================================================
# COURSE NOTE PROJECT PROMPTS
# ============================================================================

COURSENOTE_TOPIC_SUGGESTION_PROMPT = """You are an educational content expert. Based on the following information, suggest 3-5 course note/study guide project ideas.

Course Information:
- Course Name: {course_name}
- School: {school}
- Instructor: {instructor}
- Target Audience: {target_audience}
- Content Format: {content_format}
- Coverage: {coverage}
- Duration: {duration_weeks} weeks

**Course Note Project Characteristics**:
- 📚 Educational Value: Helps others learn effectively
- 📝 Well-Structured: Organized for easy navigation
- 🎯 Targeted: Meets specific learning needs
- 💡 Engaging: Makes complex topics accessible
- 🔄 Iterative: Can be updated and improved

For each project suggestion, provide:
1. **Project Name**: Clear what course/topic it covers
2. **Tagline**: Learning value proposition
3. **Detailed Description**: Scope, format, unique approach
4. **Educational Approach**: How it facilitates learning
5. **Content Structure**: Organization and navigation
6. **Unique Features**: What makes these notes special
7. **Target Learners**: Who will benefit most
8. **Creation Strategy**: How to develop the content efficiently
9. **Distribution Plan**: How to share and maintain it

Return JSON format:
{{
  "topics": [
    {{
      "topic_id": "cn1",
      "name": "Project Name",
      "tagline": "Learning value",
      "description": "Scope + Format + Unique approach",
      "educational_approach": "How it helps students learn",
      "content_structure": "Organization strategy",
      "unique_features": ["Feature 1", "Feature 2"],
      "target_learners": "Who benefits most",
      "creation_strategy": "Efficient content development approach",
      "distribution_plan": "How to share and maintain"
    }}
  ],
  "analysis_summary": "Analysis based on course content and learner needs..."
}}"""

COURSENOTE_TOPIC_ELABORATION_PROMPT = """The user selected the course note project: "{topic_name}"

Project Description: {topic_description}

Course Context:
- Course Name: {course_name}
- Target Audience: {target_audience}
- Content Format: {content_format}
- Coverage: {coverage}
- Duration: {duration_weeks} weeks

Now please create a detailed course note project plan.

Return JSON format containing:
1. **Content Overview** (scope, objectives, learning_outcomes, differentiation)
2. **Content Structure** (topic_outline, chapter_breakdown, cross_references, navigation_design)
3. **Content Creation Plan** (source_materials, note_taking_strategy, synthesis_approach, quality_checks)
4. **Educational Features** (examples, exercises, summaries, visual_aids, interactive_elements)
5. **Production Schedule** (weekly_content_goals, review_cycles, updates, final_editing)
6. **Platform and Tools** (publishing_platform, authoring_tools, collaboration_tools, version_control)
7. **Quality Assurance** (peer_review, accuracy_checks, clarity_testing, feedback_incorporation)
8. **Distribution and Maintenance** (sharing_strategy, update_plan, community_building, analytics)

Output JSON only, no explanations."""

COURSENOTE_PROJECT_DETAILS_PROMPT = """Based on the following course note project concept, generate clear project details:

Project Concept:
Name: {topic_name}
Educational Approach: {educational_approach}
Unique Features: {unique_features}

Please generate:
1. **Project Name Options** (3 options) - Clear course/topic reference, student-friendly
2. **Project Description** (Educational pitch style) - What's covered and learning value in 2-3 sentences
3. **Project Tags** (4-5 keywords) - Subject area and content type

Return JSON format:
{{
  "name_options": [
    {{"name": "Project Name", "rationale": "Why students will find this...", "clarity": "How clear the scope is"}}
  ],
  "description": "Student-focused description...",
  "tags": ["Study Guide", "Computer Science", "Visual", "Comprehensive"]
}}"""

# ============================================================================
# EXAM PREP PROJECT PROMPTS
# ============================================================================

EXAMPREP_TOPIC_SUGGESTION_PROMPT = """You are an exam preparation specialist. Based on the following information, suggest 3-5 effective exam preparation project approaches.

Exam Information:
- Exam Name: {exam_name}
- Exam Date: {exam_date}
- Current Level: {current_level}
- Target Goal: {target_goal}
- Study Hours/Week: {study_hours_per_week}
- Weak Areas: {weak_areas}
- Available Resources: {available_resources}

**Exam Prep Project Characteristics**:
- 🎯 Goal-Oriented: Focused on achieving target score
- 📊 Structured: Systematic coverage of all topics
- 📈 Progress-Tracked: Measurable improvements
- 🔄 Adaptive: Adjusts based on performance
- ⏰ Time-Efficient: Optimizes study time

For each preparation approach, provide:
1. **Approach Name**: Clear study strategy title
2. **Tagline**: Core benefit of this approach
3. **Detailed Description**: Study methodology and rationale
4. **Coverage Plan**: What topics/areas are covered
5. **Study Schedule**: Weekly breakdown
6. **Practice Strategy**: How to apply and test knowledge
7. **Progress Metrics**: How to track improvement
8. **Resource Recommendations**: Materials and tools to use
9. **Success Indicators**: Signs you're on track

Return JSON format:
{{
  "topics": [
    {{
      "topic_id": "ep1",
      "name": "Approach Name",
      "tagline": "Core study benefit",
      "description": "Methodology + Rationale",
      "coverage_plan": "Topics and areas covered",
      "study_schedule": "Weekly breakdown for {study_hours_per_week} hrs/week",
      "practice_strategy": "How to practice and test",
      "progress_metrics": ["Metric 1", "Metric 2"],
      "resource_recommendations": ["Resource 1", "Resource 2"],
      "success_indicators": ["Indicator 1", "Indicator 2"]
    }}
  ],
  "analysis_summary": "Analysis based on exam requirements and current level..."
}}"""

EXAMPREP_TOPIC_ELABORATION_PROMPT = """The user selected the exam prep approach: "{topic_name}"

Approach Description: {topic_description}

Exam Context:
- Exam Name: {exam_name}
- Exam Date: {exam_date}
- Target Goal: {target_goal}
- Study Hours Available: {study_hours_per_week} hrs/week
- Weak Areas: {weak_areas}

Now please create a detailed exam preparation plan.

Return JSON format containing:
1. **Study Plan Overview** (timeline, total_hours, phases, milestones)
2. **Content Coverage** (topic_breakdown, priority_levels, time_allocation, weak_area_focus)
3. **Daily/Weekly Schedule** (study_blocks, practice_sessions, review_cycles, rest_days)
4. **Practice Regimen** (practice_test_schedule, problem_sets, timing_practice, review_strategy)
5. **Resource Organization** (study_materials, practice_resources, reference_materials, tools)
6. **Progress Tracking** (checkpoints, assessment_schedule, score_tracking, adjustment_triggers)
7. **Weak Area Strategy** (targeted_practice, additional_resources, understanding_builders, mastery_indicators)
8. **Final Preparation** (last_week_plan, review_priorities, test_day_preparation, mindset_strategies)

Output JSON only, no explanations."""

EXAMPREP_PROJECT_DETAILS_PROMPT = """Based on the following exam prep project concept, generate motivating project details:

Project Concept:
Name: {topic_name}
Study Methodology: {methodology}
Target Goal: {target_goal}

Please generate:
1. **Project Name Options** (3 options) - Motivating, clear exam reference, goal-oriented
2. **Project Description** (Prep plan style) - Strategy and target in 2-3 sentences
3. **Project Tags** (3-5 keywords) - Exam type and study approach

Return JSON format:
{{
  "name_options": [
    {{"name": "Project Name", "rationale": "Why this motivates...", "goal_clarity": "How clear the goal is"}}
  ],
  "description": "Motivating study plan description...",
  "tags": ["GRE Prep", "Structured Study", "Score 320+"]
}}"""

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_topic_suggestion_prompt(project_type: str) -> str:
    """Get the topic suggestion prompt template for a given project type."""
    prompts = {
        "course": COURSE_TOPIC_SUGGESTION_PROMPT,
        "hackathon": HACKATHON_TOPIC_SUGGESTION_PROMPT,
        "capstone": CAPSTONE_TOPIC_SUGGESTION_PROMPT,
        "research": RESEARCH_TOPIC_SUGGESTION_PROMPT,
        "competition": COMPETITION_TOPIC_SUGGESTION_PROMPT,
        "internship": INTERNSHIP_TOPIC_SUGGESTION_PROMPT,
        "industry": INDUSTRY_TOPIC_SUGGESTION_PROMPT,
        "freelance": FREELANCE_TOPIC_SUGGESTION_PROMPT,
        "opensource": OPENSOURCE_TOPIC_SUGGESTION_PROMPT,
        "portfolio": PORTFOLIO_TOPIC_SUGGESTION_PROMPT,
        "coursenote": COURSENOTE_TOPIC_SUGGESTION_PROMPT,
        "examprep": EXAMPREP_TOPIC_SUGGESTION_PROMPT,
    }
    return prompts.get(project_type, COURSE_TOPIC_SUGGESTION_PROMPT)


def get_topic_elaboration_prompt(project_type: str) -> str:
    """Get the topic elaboration prompt template for a given project type."""
    prompts = {
        "course": COURSE_TOPIC_ELABORATION_PROMPT,
        "hackathon": HACKATHON_TOPIC_ELABORATION_PROMPT,
        "capstone": CAPSTONE_TOPIC_ELABORATION_PROMPT,
        "research": RESEARCH_TOPIC_ELABORATION_PROMPT,
        "competition": COMPETITION_TOPIC_ELABORATION_PROMPT,
        "internship": INTERNSHIP_TOPIC_ELABORATION_PROMPT,
        "industry": INDUSTRY_TOPIC_ELABORATION_PROMPT,
        "freelance": FREELANCE_TOPIC_ELABORATION_PROMPT,
        "opensource": OPENSOURCE_TOPIC_ELABORATION_PROMPT,
        "portfolio": PORTFOLIO_TOPIC_ELABORATION_PROMPT,
        "coursenote": COURSENOTE_TOPIC_ELABORATION_PROMPT,
        "examprep": EXAMPREP_TOPIC_ELABORATION_PROMPT,
    }
    return prompts.get(project_type, COURSE_TOPIC_ELABORATION_PROMPT)


def get_research_elaboration_chunked_prompts() -> tuple:
    """Get the chunked prompts for research elaboration to handle token limits.

    Returns:
        tuple: (chunk1_prompt, chunk2_prompt)
            - chunk1: Core research plan (background, methodology, etc.)
            - chunk2: Timeline with detailed tasks
    """
    return (RESEARCH_ELABORATION_CHUNK1_PROMPT, RESEARCH_ELABORATION_CHUNK2_PROMPT)


def get_project_details_prompt(project_type: str) -> str:
    """Get the project details generation prompt template for a given project type."""
    prompts = {
        "course": COURSE_PROJECT_DETAILS_PROMPT,
        "hackathon": HACKATHON_PROJECT_DETAILS_PROMPT,
        "capstone": CAPSTONE_PROJECT_DETAILS_PROMPT,
        "research": RESEARCH_PROJECT_DETAILS_PROMPT,
        "competition": COMPETITION_PROJECT_DETAILS_PROMPT,
        "internship": INTERNSHIP_PROJECT_DETAILS_PROMPT,
        "industry": INDUSTRY_PROJECT_DETAILS_PROMPT,
        "freelance": FREELANCE_PROJECT_DETAILS_PROMPT,
        "opensource": OPENSOURCE_PROJECT_DETAILS_PROMPT,
        "portfolio": PORTFOLIO_PROJECT_DETAILS_PROMPT,
        "coursenote": COURSENOTE_PROJECT_DETAILS_PROMPT,
        "examprep": EXAMPREP_PROJECT_DETAILS_PROMPT,
    }
    return prompts.get(project_type, COURSE_PROJECT_DETAILS_PROMPT)
