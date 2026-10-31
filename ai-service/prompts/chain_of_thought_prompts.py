"""
Chain-of-Thought Prompts for Enhanced Onboarding

These prompts enable multi-step reasoning, self-critique, and iterative refinement.
Each prompt guides the AI through structured thinking processes.
"""

# ============================================================================
# ANALYSIS PROMPTS
# ============================================================================

ANALYSIS_PROMPT_TEMPLATE = """You are analyzing requirements for a {project_type} project.

**Context Information:**
{context}

**Additional Knowledge (from RAG):**
{rag_context}

**Your Analysis Task:**
{analysis_steps}

**Output Requirements:**
Return a JSON object with the following structure:
{{
    "summary": "Brief 2-3 sentence summary of the analysis",
    "key_insights": [
        "Insight 1: ...",
        "Insight 2: ...",
        "Insight 3: ..."
    ],
    "priorities": {{
        "must_have": ["requirement 1", "requirement 2"],
        "should_have": ["requirement 3"],
        "nice_to_have": ["requirement 4"]
    }},
    "constraints": {{
        "time": "X weeks - assessment of whether this is tight/comfortable",
        "team": "Analysis of team size and skills",
        "technical": ["constraint 1", "constraint 2"],
        "other": ["constraint 3"]
    }},
    "team_assessment": {{
        "current_skills": ["skill 1", "skill 2"],
        "skills_to_learn": ["skill 3"],
        "skill_gaps": ["gap 1"],
        "confidence_level": "HIGH/MEDIUM/LOW"
    }},
    "feasibility_indicators": {{
        "timeline_realism": "REALISTIC/TIGHT/UNREALISTIC",
        "scope_appropriateness": "APPROPRIATE/TOO_AMBITIOUS/TOO_SIMPLE",
        "technical_complexity": "MANAGEABLE/CHALLENGING/VERY_DIFFICULT",
        "overall_confidence": "HIGH/MEDIUM/LOW"
    }},
    "recommendations": [
        "Focus on X because...",
        "Avoid Y because...",
        "Consider Z as a risk mitigation..."
    ],
    "red_flags": [
        "Potential issue 1",
        "Concern 2"
    ]
}}

Think deeply and systematically. Be honest about challenges and realistic about what's achievable."""

# ============================================================================
# VALIDATION PROMPTS
# ============================================================================

VALIDATION_PROMPT_TEMPLATE = """You are critically evaluating project topic suggestions for a {project_type} project.

**Proposed Topics:**
{topics}

**Original Context:**
{context}

**Analysis from Requirements:**
{analysis}

**Your Validation Task:**
{validation_questions}

**Output Requirements:**
Return a JSON object with this structure:
{{
    "validated_topics": [
        {{
            "topic_id": "t1",
            "topic_name": "...",
            "validation_results": {{
                "feasibility": {{
                    "rating": "HIGH/MEDIUM/LOW",
                    "confidence": "0-100%",
                    "reasoning": "Detailed explanation...",
                    "concerns": ["concern 1", "concern 2"],
                    "strengths": ["strength 1", "strength 2"]
                }},
                "scope": {{
                    "rating": "APPROPRIATE/TOO_AMBITIOUS/TOO_SIMPLE",
                    "reasoning": "Why this rating...",
                    "suggested_adjustments": ["adjustment 1"]
                }},
                "value": {{
                    "rating": "HIGH/MEDIUM/LOW",
                    "reasoning": "Value proposition...",
                    "differentiation": "What makes it special..."
                }},
                "risks": {{
                    "critical_risks": [
                        {{
                            "risk": "Risk description",
                            "likelihood": "HIGH/MEDIUM/LOW",
                            "impact": "CRITICAL/HIGH/MEDIUM/LOW",
                            "mitigation": "How to address it"
                        }}
                    ],
                    "overall_risk_level": "HIGH/MEDIUM/LOW"
                }},
                "honest_critique": {{
                    "weaknesses": ["weakness 1", "weakness 2"],
                    "concerns_for_user": ["concern 1"],
                    "better_alternatives": ["Maybe consider X instead because..."],
                    "overall_recommendation": "RECOMMENDED/RECOMMENDED_WITH_CHANGES/NOT_RECOMMENDED"
                }}
            }},
            "final_score": "0-100",
            "priority_rank": 1
        }}
    ],
    "validation_notes": {{
        "methodology": "How I evaluated these topics...",
        "comparison_insights": "Comparing the topics, I notice...",
        "general_recommendations": ["recommendation 1"]
    }},
    "topics_to_remove": ["topic_id with reason why"],
    "topics_to_modify": [
        {{
            "topic_id": "t2",
            "required_changes": ["change 1", "change 2"]
        }}
    ]
}}

Be brutally honest. It's better to identify issues now than have the project fail later."""

# ============================================================================
# REFINEMENT PROMPTS
# ============================================================================

REFINEMENT_PROMPT_TEMPLATE = """You are refining project topics based on validation feedback for a {project_type} project.

**Validated Topics with Feedback:**
{validated_topics}

**Original Context:**
{context}

**Your Refinement Task:**
{refinement_instructions}

**Output Requirements:**
Return a JSON object with this structure:
{{
    "topics": [
        {{
            "topic_id": "t1",
            "name": "Refined project name",
            "tagline": "Refined tagline",
            "description": "Enhanced description incorporating feedback",
            "alignment_reason": "Why this fits requirements",
            "suggested_tech": ["Updated tech stack"],
            "difficulty": "intermediate",
            "difficulty_reason": "Adjusted difficulty assessment",
            "estimated_weeks": 10,
            "key_features": [
                {{
                    "feature": "Feature name",
                    "priority": "MUST_HAVE/SHOULD_HAVE/NICE_TO_HAVE",
                    "complexity": "SIMPLE/MODERATE/COMPLEX",
                    "estimated_hours": 20
                }}
            ],
            "scope_adjustments": {{
                "removed": ["What was removed and why"],
                "added": ["What was added and why"],
                "modified": ["What was changed and why"]
            }},
            "risk_mitigation": [
                {{
                    "risk": "Identified risk",
                    "mitigation_strategy": "How to address it",
                    "contingency_plan": "Plan B if it fails"
                }}
            ],
            "phased_approach": [
                {{
                    "phase": "MVP (Weeks 1-4)",
                    "goals": ["goal 1", "goal 2"],
                    "deliverables": ["deliverable 1"],
                    "success_criteria": ["How to know it's done"]
                }},
                {{
                    "phase": "Enhancement (Weeks 5-8)",
                    "goals": ["goal 1"],
                    "deliverables": ["deliverable 1"],
                    "success_criteria": ["How to know it's done"]
                }}
            ],
            "first_steps": [
                "Concrete first action 1",
                "Concrete first action 2",
                "Concrete first action 3"
            ],
            "fallback_options": [
                "If X doesn't work, try Y because..."
            ],
            "confidence_rating": "HIGH/MEDIUM/LOW",
            "why_choose_this": "Clear, compelling reason to choose this topic"
        }}
    ],
    "refinements": {{
        "major_changes": ["What significantly changed and why"],
        "scope_reductions": ["What was descoped for feasibility"],
        "risk_mitigations_added": ["New risk strategies"],
        "improvements_made": ["Other enhancements"]
    }},
    "selection_guidance": {{
        "recommended_topic": "topic_id",
        "reasoning": "Why this is the best choice...",
        "alternatives": [
            {{
                "topic_id": "t2",
                "when_to_choose": "Choose this if..."
            }}
        ]
    }}
}}

Make topics more actionable, realistic, and user-friendly. Balance ambition with achievability."""

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_analysis_prompt(project_type: str) -> str:
    """Get chain-of-thought analysis prompt for project type."""
    return ANALYSIS_PROMPT_TEMPLATE.replace("{project_type}", project_type)


def get_validation_prompt(project_type: str) -> str:
    """Get validation prompt for project type."""
    return VALIDATION_PROMPT_TEMPLATE.replace("{project_type}", project_type)


def get_refinement_prompt(project_type: str) -> str:
    """Get refinement prompt for project type."""
    return REFINEMENT_PROMPT_TEMPLATE.replace("{project_type}", project_type)


# ============================================================================
# SPECIALIZED PROMPTS FOR DOCUMENT ANALYSIS
# ============================================================================

DOCUMENT_ANALYSIS_PROMPT = """Analyze the following uploaded documents and extract actionable insights:

**Documents:**
{documents}

**Analysis Goals:**
1. Extract all explicit requirements
2. Identify implicit expectations
3. Find deadlines and milestones
4. Understand evaluation criteria
5. Identify constraints
6. Extract key concepts and topics

**Think Step by Step:**

1. First, identify document types:
   - Is this a syllabus, research paper, requirements doc, or other?
   - What is the primary purpose of each document?

2. Extract explicit information:
   - What requirements are clearly stated?
   - What dates/deadlines are mentioned?
   - What deliverables are specified?
   - What evaluation criteria exist?

3. Infer implicit expectations:
   - What's implied but not stated?
   - What are typical expectations for this type of project?
   - What quality standards are expected?

4. Identify key concepts:
   - What topics/technologies are mentioned?
   - What methodologies are suggested?
   - What prior knowledge is assumed?

5. Assess constraints:
   - Time constraints
   - Resource constraints
   - Technical constraints
   - Policy/compliance constraints

**Output Format:**
Return detailed JSON analysis with all extracted information organized by category."""

# ============================================================================
# PROMPTS FOR SPECIALIZED WORKFLOWS
# ============================================================================

RESEARCH_PROJECT_ANALYSIS_PROMPT = """Analyze this research project with academic rigor:

**Project Information:**
{project_info}

**Research Context:**
{research_context}

**Deep Analysis:**

1. NOVELTY ASSESSMENT:
   - What's the research gap being addressed?
   - How does this differ from existing work?
   - What's the contribution to the field?
   - Is this truly novel or incremental?

2. METHODOLOGY VALIDATION:
   - Is the proposed methodology sound?
   - Are research methods appropriate?
   - Can results be validated?
   - What are the limitations?

3. FEASIBILITY FOR STUDENT RESEARCH:
   - Can this be completed in the timeframe?
   - Are resources available (data, equipment, etc.)?
   - Is the scope appropriate for the degree level?
   - What supervision/expertise is needed?

4. PUBLICATION POTENTIAL:
   - Could this lead to a publication?
   - What venues would be appropriate?
   - What additional work would be needed?

5. RISK ASSESSMENT:
   - What if the hypothesis is wrong?
   - What if data is unavailable?
   - What are the technical risks?
   - What are the timeline risks?

Return comprehensive academic assessment in JSON format."""

HACKATHON_OPTIMIZATION_PROMPT = """Optimize this project idea for hackathon success:

**Project Idea:**
{project_idea}

**Hackathon Details:**
{hackathon_details}

**Optimization Strategy:**

1. DEMO IMPACT:
   - What makes the demo impressive?
   - How can we maximize "wow factor"?
   - What's the visual/interactive element?
   - What makes it memorable?

2. RAPID PROTOTYPING:
   - What's the absolute MVP?
   - What can be mocked/faked for demo?
   - What's the critical path?
   - What can be done in parallel?

3. TIME BOXING:
   - Hour-by-hour breakdown
   - Sleep/break strategy
   - Milestone checkpoints
   - Buffer time for issues

4. JUDGING CRITERIA ALIGNMENT:
   - How does this score on each criterion?
   - Where can we optimize for points?
   - What's the pitch narrative?
   - What's the competitive advantage?

5. RISK MITIGATION:
   - What's Plan B if tech doesn't work?
   - What features can be cut if needed?
   - What's the fallback demo?
   - How to handle APIs breaking?

Return optimized hackathon strategy in JSON format."""

INDUSTRY_PROJECT_ANALYSIS_PROMPT = """Analyze this industry collaboration project professionally:

**Project Proposal:**
{project_proposal}

**Industry Context:**
{industry_context}

**Professional Analysis:**

1. BUSINESS VALUE:
   - What's the ROI for the partner company?
   - How does this solve a real business problem?
   - What metrics demonstrate success?
   - What's the competitive advantage?

2. STAKEHOLDER ALIGNMENT:
   - Who are the key stakeholders?
   - What does each stakeholder care about?
   - How to manage expectations?
   - What's the communication strategy?

3. PROFESSIONAL STANDARDS:
   - What industry standards apply?
   - What documentation is needed?
   - What security/privacy concerns exist?
   - What's the compliance landscape?

4. DELIVERABLE QUALITY:
   - What quality level is expected?
   - What's production-ready vs prototype?
   - What testing is required?
   - What handoff documentation is needed?

5. RISK MANAGEMENT:
   - What could damage the partnership?
   - How to handle missed deadlines?
   - What's the escalation process?
   - How to maintain professional relationships?

Return professional project assessment in JSON format."""
