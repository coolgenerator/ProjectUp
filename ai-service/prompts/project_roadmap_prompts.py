"""
Prompts for AI-powered project roadmap generation.
"""


GENERATE_ROADMAP_SYSTEM_PROMPT = """You are an expert project planning assistant specializing in creating comprehensive, actionable project roadmaps. Your role is to break down projects into well-structured sections, milestones, tasks, and subtasks with realistic time estimates and dependencies.

Key principles:
1. Create clear, hierarchical structure (Sections → Milestones → Tasks → Subtasks)
2. Identify task dependencies to ensure proper sequencing
3. Provide realistic time estimates based on project complexity
4. Include both technical and non-technical tasks (planning, testing, documentation)
5. Consider team collaboration and workflow
6. Balance detail with actionability"""


GENERATE_ROADMAP_USER_PROMPT = """Generate a comprehensive project roadmap:

**Project:** {project_title}
**Description:** {project_description}
**Type:** {project_type} | **Difficulty:** {difficulty_level} | **Duration:** {duration_weeks} weeks | **Team:** {team_size}
**Features:** {key_features}
**Stack:** {tech_stack}

Structure (JSON format) - MUST BE COMPLETE:
- **3-5 Sections** (major phases: Planning, Development, Testing, Deployment)
  - **2-4 Milestones** per section (significant achievements)
    - **3-8 Tasks** per milestone (actionable items with hours, priority 1-5, dependencies, tags)
      - **2-5 Subtasks** per task (concrete steps)

CRITICAL REQUIREMENTS:
1. Generate ALL sections (3-5), NOT just one
2. Each section MUST have 2-4 milestones
3. Each milestone MUST have 3-8 tasks
4. Keep descriptions concise (1-2 sentences) to fit within token limits
5. Total hours ≈ duration_weeks × team_size × 40 (accounting for overhead)
6. Dependencies reference earlier tasks only
7. Include: requirements, design, implementation, testing, docs, deployment
8. Priority: P1=urgent/critical, P2=essential, P3=standard, P4=nice-to-have, P5=backlog

Return valid JSON with this structure:
{{
  "sections": [
    {{
      "name": "Section Name",
      "description": "Section description",
      "order": 0,
      "color": "#8B5CF6",
      "milestones": [
        {{
          "title": "Milestone Title",
          "description": "Milestone description",
          "estimated_hours": 20,
          "priority": 2,
          "start_offset_days": 0,
          "duration_days": 7,
          "status": "pending",
          "tasks": [
            {{
              "title": "Task Title",
              "description": "Detailed task description",
              "estimated_hours": 5,
              "priority": 3,
              "dependencies": ["Previous Task Title"],
              "tags": ["backend", "api"],
              "subtasks": [
                {{
                  "title": "Subtask title",
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
- You MUST generate 3-5 sections, each with 2-4 milestones, each with 3-8 tasks
- Do NOT generate only 1 section or 1 milestone - this is incomplete
- Keep descriptions brief (1-2 sentences) to ensure ALL sections fit within token limits
- Ensure the JSON is valid and complete
- Generate the ENTIRE roadmap structure, not just the beginning"""


GENERATE_PROPOSALS_PROMPT = """Based on the project roadmap we just created for "{project_title}", generate ONE comprehensive strategic implementation plan with extensive detail across all key areas.

**Project Context:**
{project_description}

**CRITICAL FORMATTING REQUIREMENTS:**
- ALL content MUST be formatted in proper Markdown
- ALWAYS separate paragraphs with blank lines (two newlines: \n\n)
- Use headers to structure content (## for major sections, ### for subsections)
- Break long paragraphs into shorter, readable chunks (3-5 sentences max per paragraph)
- Use **bold** for key terms and *italic* for emphasis
- Use numbered or bulleted lists to break up dense information
- Add code blocks with language specification when showing code
- Use tables for comparisons when appropriate
- Use blockquotes (>) for important callouts or quotes
- Never write wall-of-text paragraphs - readability is critical!

Provide a thorough strategic analysis covering:

**1. Approach & Methodology** (4-6 well-structured paragraphs with headers):
- Start with a clear ## header (e.g., "## Development Methodology")
- Break content into subsections with ### headers (e.g., "### Implementation Phases", "### Technology Stack")
- Each paragraph should be 3-5 sentences MAX, separated by blank lines
- Cover: development methodology, implementation phases, technology choices, architecture, team structure, development practices
- Use **bold** for key technologies, *italic* for emphasis, and `code` for technical terms
- Include bulleted or numbered lists to break up dense information
- Example structure:
  ```
  ## Development Methodology

  We will adopt an **Agile** approach with 2-week sprints. This allows for iterative development and quick feedback cycles.

  ### Implementation Phases

  The project is divided into three key phases:

  1. **Phase 1**: Data setup and infrastructure (2 weeks)
  2. **Phase 2**: Core development (4 weeks)
  3. **Phase 3**: Testing and deployment (2 weeks)

  ### Technology Stack

  We chose **Python** for its robust data science libraries. The backend uses `Flask` for API development...
  ```

**2. Benefits** (6-10 specific advantages with details):
- Time-to-market benefits with specific estimates
- Cost efficiency and resource optimization details
- Quality improvements and technical advantages
- Risk reduction and mitigation benefits
- Learning opportunities and skill development
- Scalability and maintainability advantages
- Business value and ROI projections
- User experience improvements
- Each benefit should include measurable outcomes

**3. Challenges & Risk Mitigation** (6-10 comprehensive pairs):
- For EACH challenge, provide detailed, actionable mitigation strategy
- Cover technical risks (architecture, integration, performance, security)
- Resource challenges (team size, skills, budget constraints)
- Timeline and scheduling risks with contingency plans
- Quality and technical debt concerns
- Security and compliance issues
- Deployment and operations risks
- User adoption and change management
- Each mitigation should be specific and comprehensive

**4. Success Metrics** (8-12 measurable KPIs across categories):
- Technical metrics: "Deploy MVP within 4 weeks", "API response time <200ms", "Achieve 95% test coverage"
- Code quality: "Maintainability score >8/10", "Zero critical vulnerabilities", "Technical debt ratio <10%"
- Business outcomes: "Reduce costs by 30%", "Increase efficiency by 50%", "User acquisition rate"
- User experience: "User satisfaction >4.5/5", "Task completion rate >90%", "Page load time <2s"
- Team productivity: "Velocity increase by 25%", "Bug resolution time <24h"
- Include target values and measurement methods for each

**5. Decision Framework** (Comprehensive analysis):
- **Best suited for**: Detailed description of ideal scenarios (team size, budget, timeline, expertise, business context)
- **Choose this if**: 5-7 specific conditions that favor this approach (technical, business, organizational factors)
- **Avoid this if**: 3-5 scenarios where alternative approaches would be better with rationale

**6. Alternative Approaches Considered** (4-6 detailed markdown sections):
- Use markdown headers (### Alternative 1, ### Alternative 2, etc.)
- Describe 3-4 alternative approaches that were evaluated
- For each: what it is, **Advantages**, **Disadvantages**, why not chosen
- Provide specific comparison criteria in lists or tables
- Conclude with markdown-formatted section on why the chosen approach is optimal

**7. Resources Needed** (Comprehensive categorized list):
- Team roles and skills: Frontend, Backend, DevOps, QA, PM, Designer
- Development tools and software licenses
- Infrastructure and cloud services with cost estimates
- Third-party services and APIs
- Budget estimates by category
- Training and documentation needs

**8. Implementation Timeline** (Detailed markdown phase breakdown):
- Use markdown headers for each phase (### Phase 1, ### Phase 2, etc.)
- Phase-by-phase timeline with key milestones in bold
- Use bullet lists for activities and deliverables
- Dependencies between phases clearly marked
- Critical path items highlighted with **bold** or tables
- Buffer time for risk management
- Go-live and post-launch activities

**FINAL REMINDER BEFORE GENERATING:**
- Break ALL long paragraphs into shorter ones (3-5 sentences max)
- ALWAYS use \\n\\n to separate paragraphs in JSON strings
- Use headers (##, ###) to structure your content
- Make content scannable with lists, bold, and proper spacing
- The example below shows proper formatting - follow this pattern!

Return ONLY valid JSON (no markdown, no code blocks):
{{
  "proposals": [
    {{
      "title": "Strategic Implementation Plan for {project_title}",
      "description": "Comprehensive execution strategy covering methodology, risks, metrics, and resources for successful project delivery.",
      "approach": "## Development Methodology\\n\\nWe will adopt an **Agile** development methodology with 2-week sprints. This iterative approach enables rapid feedback and continuous improvement. Each sprint will include planning, development, testing, and review phases.\\n\\nThe team will follow **Scrum** practices with daily stand-ups and sprint retrospectives. This ensures transparency and quick problem resolution.\\n\\n### Implementation Phases\\n\\nThe project is structured in three distinct phases:\\n\\n1. **Phase 1: Foundation** (Weeks 1-2) - Environment setup, architecture design, and initial scaffolding\\n2. **Phase 2: Core Development** (Weeks 3-6) - Feature implementation and integration\\n3. **Phase 3: Refinement** (Weeks 7-8) - Testing, optimization, and deployment\\n\\n### Technology Stack\\n\\nWe selected **Python** for backend development due to its extensive ecosystem. Key libraries include `Flask` for APIs, `SQLAlchemy` for database ORM, and `pytest` for testing.\\n\\nThe frontend uses **React** with `TypeScript` for type safety. State management is handled by `Redux Toolkit`.\\n\\n### Architecture & Team Structure\\n\\nThe architecture follows a modular microservices pattern. This allows independent scaling and easier maintenance. The team includes a project manager, two developers, and a QA engineer working in close collaboration.",
      "benefits": [
        "Time-to-market: Specific benefit with timeline estimate",
        "Cost efficiency: Details on resource optimization",
        "Quality improvement: Technical advantages explained",
        "Risk reduction: How risks are mitigated",
        "Learning opportunity: Skill development details",
        "Scalability: How solution scales with growth",
        "Business value: ROI projections and value",
        "User experience: UX improvements detailed"
      ],
      "challenges_with_mitigation": [
        {{"challenge": "Technical architecture challenge with specific details", "mitigation": "Comprehensive mitigation strategy with actionable steps"}},
        {{"challenge": "Resource or budget constraint with details", "mitigation": "Detailed action plan for resource optimization"}},
        {{"challenge": "Timeline or scheduling risk with specifics", "mitigation": "Contingency plan with buffer time"}},
        {{"challenge": "Quality or technical debt concern", "mitigation": "Prevention and resolution strategy detailed"}},
        {{"challenge": "Security or compliance issue", "mitigation": "Security measures and compliance steps"}},
        {{"challenge": "Integration or deployment challenge", "mitigation": "Integration strategy and deployment plan"}},
        {{"challenge": "User adoption or change management", "mitigation": "Training and change management plan"}}
      ],
      "success_metrics": [
        "Technical: Deploy MVP within X weeks with specific milestones",
        "Technical: API response time <200ms measured via monitoring",
        "Quality: Test coverage >95% measured via CI/CD",
        "Quality: Maintainability score >8/10 via code analysis",
        "Quality: Zero critical vulnerabilities via security scans",
        "Business: Reduce operational costs by X% within Y months",
        "Business: User acquisition rate of X users per month",
        "UX: User satisfaction >4.5/5 via surveys",
        "UX: Task completion rate >90% via analytics",
        "Productivity: Team velocity increase by 25% over 3 months"
      ],
      "decision_framework": {{
        "best_for": "Comprehensive description: This approach is best suited for teams of X-Y people, with budgets in the $Z range, timelines of N weeks, requiring expertise in [technologies], working in [business context], with organizational maturity level of [details].",
        "choose_if": "Detailed conditions: (1) You have expertise in the tech stack; (2) Your team size is adequate; (3) Budget allows for necessary tools and services; (4) Timeline aligns with phased delivery; (5) Business goals prioritize [specific goals]; (6) Risk tolerance is [level]; (7) You need [specific capability].",
        "avoid_if": "Specific scenarios: (1) Severe resource constraints exist; (2) Timeline is extremely compressed; (3) Team lacks necessary expertise; (4) Different technical requirements needed; (5) Organizational factors prevent adoption."
      }},
      "alternatives_considered": "## Alternative Approaches Evaluated\n\n### Alternative 1: [Name]\n\nThis approach involves [description]. **Advantages:** [pros]. **Disadvantages:** [cons]. We decided against this because [reason].\n\n### Alternative 2: [Name]\n\nThis method focuses on [description]. **Benefits:** [pros]. **Drawbacks:** [cons]. Not chosen because [reason].\n\n### Alternative 3: [Name]\n\nThis strategy emphasizes [description]. **Strengths:** [pros]. **Weaknesses:** [cons]. Rejected because [reason].\n\n### Why the Chosen Approach is Optimal\n\n[Comprehensive markdown-formatted explanation with bullet points, emphasis, and clear reasoning]",
      "timeline": "## Implementation Timeline\n\n### Phase 1: Project Setup (Weeks 1-2)\n\n- Project setup and environment configuration\n- Team onboarding and role assignment\n\n**Key Milestones:**\n- Development environment ready\n- Initial architecture approved\n\n### Phase 2: Core Development (Weeks 3-6)\n\n- Backend API implementation\n- Frontend UI component development\n- Database schema design and implementation\n\n**Key Milestones:**\n- Backend API complete\n- Frontend UI components ready\n- Database schema finalized\n\n### Phase 3: Integration & Testing (Weeks 7-8)\n\n- End-to-end testing\n- Performance optimization\n- Security audit\n\n**Key Milestones:**\n- E2E tests passing\n- Performance benchmarks met\n- Security audit complete\n\n### Phase 4: Deployment (Week 9+)\n\n- Production deployment\n- Monitoring setup\n- User feedback collection\n- Iterative improvements\n\n**Critical Path:** [Key dependencies]\n\n**Buffer Time:** 15-20% for risk management",
      "resources_needed": [
        "Team: Full-stack developer (senior), Backend engineer (mid-level), Frontend developer (junior-mid), DevOps engineer (contractor), QA tester (part-time), Project manager (20% allocation)",
        "Development Tools: IntelliJ IDEA licenses ($150/year), GitHub Team ($4/user/month), CI/CD platform (CircleCI $70/month), Testing frameworks (Jest, Pytest - free)",
        "Infrastructure: AWS services ($500-1000/month), PostgreSQL RDS ($150/month), S3 storage ($50/month), CloudFront CDN ($100/month), Load balancer ($20/month)",
        "Third-party Services: Auth0 authentication ($240/year), Stripe payment processing (2.9% + $0.30), SendGrid email ($15/month), Google Analytics (free), Sentry error tracking ($26/month)",
        "Budget Estimates: Development tools ($2000/year), Infrastructure ($8000-12000/year), Services ($4000/year), Training and docs ($3000), Total: $17000-21000/year",
        "Training: React workshop ($500), AWS certification prep ($300), Team documentation wiki setup, Onboarding materials development"
      ],
      "status": "draft"
    }}
  ]
}}"""


EXPAND_MILESTONE_PROMPT = """Expand the following milestone with more detailed tasks and subtasks:

**Milestone:** {milestone_title}
**Project Context:** {project_context}
**Additional Requirements:** {additional_requirements}

Create 5-10 detailed tasks for this milestone, each with:
- Clear, actionable title
- Detailed description
- Realistic time estimate
- Priority (1-5)
- Dependencies on other tasks
- 2-5 subtasks breaking down the work

Return as valid JSON following the same structure as the original roadmap."""


REGENERATE_SECTION_PROMPT = """Regenerate the "{section_name}" section of the project roadmap with fresh perspective.

**Project Context:** {project_context}
**Current Progress:** {additional_context}

Create 2-4 milestones for this section with comprehensive tasks and subtasks.
Consider lessons learned and any new requirements.

Return as valid JSON following the section structure from the original roadmap."""
