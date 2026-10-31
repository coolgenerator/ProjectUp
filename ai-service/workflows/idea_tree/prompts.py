"""
Prompt templates for IdeaTree Workflow
"""

EXPAND_IDEA_PROMPT = """
Expand this idea: {title}
Description: {description}
Additional context: {query}

Please provide:
1. 3-7 sub-ideas with clear titles and descriptions
2. How these sub-ideas connect to the main idea
3. Priority levels for each sub-idea
4. Potential challenges and solutions

Format the response as JSON with the following structure:
{{
    "suggestions": [
        {{
            "title": "Sub-idea title",
            "description": "Detailed description",
            "type": "idea",
            "priority": 1-5,
            "connection": "How it relates to main idea",
            "challenges": ["challenge1", "challenge2"],
            "solutions": ["solution1", "solution2"]
        }}
    ],
    "response": "Natural language summary"
}}
"""

GENERATE_TASKS_PROMPT = """
Generate tasks for: {title}
Description: {description}
Requirements: {query}

Please provide:
1. Specific, actionable tasks with clear outcomes
2. Time estimates for each task
3. Dependencies between tasks
4. Required skills or resources
5. Priority levels

Format as JSON:
{{
    "actions": [
        {{
            "title": "Task title",
            "description": "What needs to be done",
            "priority": 1-5,
            "estimated_hours": number,
            "dependencies": ["task_id"],
            "skills_required": ["skill1", "skill2"],
            "deliverable": "What will be produced"
        }}
    ],
    "response": "Summary of task breakdown"
}}
"""

FIND_RESOURCES_PROMPT = """
Find resources for: {title}
Description: {description}
Specific needs: {query}

Please provide:
1. Tutorials and courses (with difficulty level)
2. Official documentation
3. Useful tools and libraries
4. Community resources and forums
5. Example projects or case studies

Format as JSON:
{{
    "resources": [
        {{
            "title": "Resource name",
            "url": "https://example.com",
            "type": "tutorial|documentation|tool|community|example",
            "description": "What this resource provides",
            "difficulty": "beginner|intermediate|advanced",
            "duration": "estimated time to complete (if applicable)"
        }}
    ],
    "response": "Summary of resources found"
}}
"""

ANALYZE_FEASIBILITY_PROMPT = """
Analyze feasibility of: {title}
Description: {description}
Constraints: {query}

Please provide:
1. Technical feasibility assessment (1-10 scale with justification)
2. Required resources (time, money, people, tools)
3. Main risks and mitigation strategies
4. Success factors and prerequisites
5. Alternative approaches if main approach is challenging
6. Recommended timeline

Format as JSON:
{{
    "metadata": {{
        "feasibility_score": 1-10,
        "estimated_duration": "X weeks/months",
        "team_size": number,
        "budget_range": "low|medium|high",
        "technical_complexity": "low|medium|high"
    }},
    "suggestions": [
        {{
            "title": "Risk or Alternative",
            "description": "Details",
            "type": "risk|alternative|prerequisite",
            "priority": 1-5
        }}
    ],
    "response": "Detailed feasibility analysis"
}}
"""

SUGGEST_MILESTONES_PROMPT = """
Suggest milestones for: {title}
Description: {description}
Timeline constraints: {query}

Please provide:
1. 3-6 key milestones with clear deliverables
2. Success criteria for each milestone
3. Estimated timeline for each
4. Dependencies between milestones
5. Risk factors for each milestone

Format as JSON:
{{
    "suggestions": [
        {{
            "title": "Milestone name",
            "description": "What will be achieved",
            "type": "milestone",
            "priority": 1-5,
            "deliverables": ["item1", "item2"],
            "success_criteria": ["criterion1", "criterion2"],
            "estimated_days": number,
            "dependencies": ["milestone_id"],
            "risks": ["risk1", "risk2"]
        }}
    ],
    "response": "Milestone planning summary"
}}
"""

GENERATE_LEARNING_PATH_PROMPT = """
Create learning path for: {title}
Description: {description}
Learning preferences: {query}

Please provide:
1. Structured modules with clear learning objectives
2. Resources for each module (videos, articles, exercises)
3. Practical projects to apply knowledge
4. Assessment methods
5. Time estimates for completion

Format as JSON:
{{
    "metadata": {{
        "total_duration": "X weeks",
        "difficulty_progression": "gradual|steep",
        "learning_style": "theoretical|practical|mixed"
    }},
    "resources": [
        {{
            "title": "Module/Resource name",
            "url": "https://example.com (if applicable)",
            "type": "course|video|article|exercise|project",
            "description": "What you'll learn",
            "duration": "X hours",
            "module": "Module name",
            "prerequisites": ["prerequisite1"]
        }}
    ],
    "response": "Learning path overview"
}}
"""

GENERATE_PLAN_PROMPT = """
Generate a comprehensive project plan for: {title}
Description: {description}
Plan requirements: {query}

Please create a detailed plan with the following structure:

Format as JSON:
{{
    "plan": {{
        "title": "Plan title",
        "description": "Plan overview",
        "plan_type": "roadmap|curriculum|sprint|custom",
        "content": {{
            "markdown": "# Main Plan Content in Markdown\\n\\n## Overview\\n...detailed plan content..."
        }},
        "tags": ["tag1", "tag2"],
        "category": "Plan category"
    }},
    "suggestions": [
        {{
            "title": "Related task or milestone",
            "description": "Details",
            "type": "task|milestone|resource",
            "priority": 1-5
        }}
    ],
    "resources": [
        {{
            "title": "Resource name",
            "url": "URL if applicable",
            "type": "documentation|tutorial|tool",
            "description": "Resource description"
        }}
    ],
    "metadata": {{
        "estimated_duration": "X weeks/months",
        "difficulty": "beginner|intermediate|advanced",
        "prerequisites": ["prerequisite1"]
    }},
    "response": "Natural language summary of the plan"
}}
"""

ANALYZE_PLAN_PROMPT = """
Analyze the existing project plan: {title}
Description: {description}
Current plan content: {query}

Please provide:
1. Strengths and weaknesses of the current plan
2. Missing components or gaps
3. Suggestions for improvement
4. Risk assessment
5. Feasibility analysis

Format as JSON:
{{
    "metadata": {{
        "completeness_score": 1-10,
        "feasibility_score": 1-10,
        "clarity_score": 1-10,
        "overall_score": 1-10
    }},
    "suggestions": [
        {{
            "title": "Improvement suggestion",
            "description": "What to add or change",
            "type": "improvement|gap|risk",
            "priority": 1-5,
            "category": "content|structure|timeline|resources"
        }}
    ],
    "actions": [
        {{
            "title": "Action to take",
            "description": "How to improve the plan",
            "priority": 1-5
        }}
    ],
    "response": "Detailed analysis and recommendations"
}}
"""

EXPAND_PLAN_PROMPT = """
Expand the project plan: {title}
Description: {description}
Section to expand: {query}

Please provide:
1. Additional detailed sections for the plan
2. Subsections with specific content
3. Implementation details
4. Related tasks and milestones
5. Resource recommendations

Format as JSON:
{{
    "plan_sections": [
        {{
            "section_title": "Section name",
            "markdown_content": "# Section Title\\n\\nDetailed content...",
            "order": 1,
            "metadata": {{
                "estimated_effort": "X hours/days",
                "priority": 1-5
            }}
        }}
    ],
    "suggestions": [
        {{
            "title": "Related task or milestone",
            "description": "Details",
            "type": "task|milestone",
            "priority": 1-5
        }}
    ],
    "resources": [
        {{
            "title": "Resource name",
            "url": "URL if applicable",
            "type": "documentation|tutorial|tool",
            "description": "Resource description"
        }}
    ],
    "response": "Summary of plan expansion"
}}
"""

# Export all prompts as a dictionary
PROMPTS = {
    "expand_idea": EXPAND_IDEA_PROMPT,
    "generate_tasks": GENERATE_TASKS_PROMPT,
    "find_resources": FIND_RESOURCES_PROMPT,
    "analyze_feasibility": ANALYZE_FEASIBILITY_PROMPT,
    "suggest_milestones": SUGGEST_MILESTONES_PROMPT,
    "generate_learning_path": GENERATE_LEARNING_PATH_PROMPT,
    "generate_plan": GENERATE_PLAN_PROMPT,
    "analyze_plan": ANALYZE_PLAN_PROMPT,
    "expand_plan": EXPAND_PLAN_PROMPT
}