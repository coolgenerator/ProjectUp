"""
Course generation prompts
Contains all prompt templates for course creation and learning path generation
"""

from typing import List
from prompts.formatting_rules import (
    get_code_formatting_rules_detailed,
    get_code_formatting_rules_compact,
    get_mermaid_formatting_rules
)


class CoursePrompts:
    """Prompt templates for course generation"""

    @staticmethod
    def get_structure_generation_prompt(
        topic: str,
        user_experience: str,
        goals: List[str],
        time_commitment: int,
        difficulty: str,
        num_modules: int
    ) -> str:
        """Generate prompt for creating course structure/syllabus

        Args:
            topic: Course topic
            user_experience: User's experience level
            goals: Learning goals
            time_commitment: Hours per week
            difficulty: Difficulty level
            num_modules: Number of major topics (not weeks)

        Returns:
            Formatted prompt string
        """
        goals_list = '\n'.join([f"  - {goal}" for goal in goals])

        return f"""You are an expert curriculum designer. Create a comprehensive topic-based learning curriculum for: "{topic}"

Student Profile:
- Experience Level: {user_experience}
- Learning Goals:
{goals_list}
- Time Available: {time_commitment} hours/week
- Difficulty: {difficulty}

Create a TOPIC-BASED learning structure (NOT week-based). Organize by major topics, each with 3-6 subtopics.
Focus on structure and learning objectives. NO learning materials/resources yet.

Return ONLY valid JSON (no markdown) in this format:
{{
  "course_title": "Specific, engaging course title",
  "course_description": "2-3 sentence overview of the course",
  "topics": [
    {{
      "topic_id": "topic_1",
      "title": "Major Topic Title (e.g., 'JavaScript Fundamentals', 'React Core Concepts')",
      "description": "What this topic covers and why it's important (2-3 sentences)",
      "estimated_hours": 10,
      "order": 1,
      "subtopics": [
        {{
          "subtopic_id": "topic_1_sub_1",
          "title": "Specific Subtopic Title",
          "description": "What you'll learn in this subtopic (1-2 sentences)",
          "duration": "2-3 hours",
          "key_concepts": ["concept 1", "concept 2", "concept 3"],
          "learning_objectives": ["objective 1", "objective 2", "objective 3"],
          "order": 1
        }},
        {{
          "subtopic_id": "topic_1_sub_2",
          "title": "Another Subtopic Title",
          "description": "What you'll learn in this subtopic",
          "duration": "2-3 hours",
          "key_concepts": ["concept 1", "concept 2", "concept 3"],
          "learning_objectives": ["objective 1", "objective 2"],
          "order": 2
        }}
      ]
    }}
  ]
}}

IMPORTANT REQUIREMENTS:
1. Create {num_modules} major topics
2. Each topic MUST have 3-6 subtopics (aim for 4-5)
3. Organize topics in logical learning order (prerequisites first)
4. Make titles specific to {topic} (no generic names)
5. Each subtopic should be focused and achievable
6. Include clear learning objectives for each subtopic"""

    @staticmethod
    def get_resource_generation_prompt(
        lesson_title: str,
        lesson_description: str,
        lesson_objectives: List[str],
        user_experience: str,
        difficulty: str
    ) -> str:
        """Generate prompt for finding learning resources for a lesson

        Args:
            lesson_title: Title of the lesson
            lesson_description: Description of lesson content
            lesson_objectives: Learning objectives
            user_experience: User's experience level
            difficulty: Difficulty level

        Returns:
            Formatted prompt string
        """
        objectives_list = '\n'.join([f"  - {obj}" for obj in lesson_objectives])

        return f"""Find the best learning resources for this lesson:

Lesson: {lesson_title}
Description: {lesson_description}
Objectives:
{objectives_list}

Student Level: {user_experience}
Difficulty: {difficulty}

Return ONLY valid JSON (no markdown) with 3-5 high-quality resources:
{{
  "resources": [
    {{
      "title": "Resource title",
      "type": "article|video|tutorial|documentation|course",
      "url": "https://...",
      "description": "Why this resource is valuable (1 sentence)",
      "difficulty": "beginner|intermediate|advanced",
      "estimated_time": "X minutes/hours"
    }}
  ]
}}

Focus on free, accessible, high-quality resources."""

    @staticmethod
    def get_refinement_prompt(
        refinement_type: str,
        description: str,
        current_structure: dict
    ) -> str:
        """Generate prompt for refining course structure

        Args:
            refinement_type: Type of refinement requested
            description: User's refinement request
            current_structure: Current course structure

        Returns:
            Formatted prompt string
        """
        return f"""You are refining a learning path based on user feedback.

Refinement Type: {refinement_type}
User Request: {description}

Current Structure:
{current_structure}

Apply the requested changes and return the COMPLETE updated structure in the same JSON format.
Make sure to preserve all existing content unless specifically asked to change it."""

    @staticmethod
    def get_comprehensive_course_structure_prompt(
        topic: str,
        goals: List[str],
        user_experience: str,
        skills: List[str],
        interests: List[str],
        time_commitment: int,
        estimated_weeks: int,
        difficulty: str,
        preferred_learning_style: str
    ) -> str:
        """Generate prompt for comprehensive course structure generation

        Args:
            topic: Course topic
            goals: Learning goals
            user_experience: User's experience level
            skills: Existing skills
            interests: User interests
            time_commitment: Hours per week
            estimated_weeks: Course duration in weeks
            difficulty: Difficulty level
            preferred_learning_style: Preferred learning style

        Returns:
            Formatted prompt string
        """
        goals_text = "\n".join([f"- {goal}" for goal in goals])
        skills_text = ", ".join(skills) if skills else "None specified"
        interests_text = ", ".join(interests) if interests else "None specified"

        return f"""You are an expert course designer and educational consultant. Create a comprehensive, structured learning course based on the following requirements:

**Topic**: {topic}

**Learning Goals**:
{goals_text}

**Learner Profile**:
- Current Experience Level: {user_experience}
- Existing Skills: {skills_text}
- Interests: {interests_text}
- Time Commitment: {time_commitment} hours per week
- Duration: {estimated_weeks} weeks
- Difficulty Level: {difficulty}
- Preferred Learning Style: {preferred_learning_style}

Create a detailed course structure with the following sections:

1. **Course Overview**
   - Brief description (2-3 sentences)
   - Key skills and knowledge to be acquired
   - Prerequisites (if any)

2. **Weekly/Module Breakdown** (for {estimated_weeks} weeks)
   For each week, provide:
   - Week title
   - Learning objectives for that week
   - Topics covered
   - Estimated study time

3. **Learning Milestones**
   - Key checkpoints throughout the course
   - Skills assessment points
   - Project or assignment suggestions

4. **Recommended Resource Types**
   - Types of resources needed (videos, articles, books, practice exercises, etc.)
   - Suggested platforms or tools

Return the response as a well-structured JSON object with clear sections."""

    @staticmethod
    def get_analyze_topics_prompt(
        topic: str,
        goals: List[str],
        user_experience: str,
        difficulty: str,
        estimated_weeks: int,
        time_commitment: int
    ) -> str:
        """Generate prompt for analyzing and breaking down topics

        Args:
            topic: Main course topic
            goals: Learning goals
            user_experience: User's experience level
            difficulty: Difficulty level
            estimated_weeks: Course duration in weeks
            time_commitment: Hours per week

        Returns:
            Formatted prompt string
        """
        goals_text = ', '.join(goals)

        # Optimize: fewer, more focused topics to save tokens
        target_topics = min(12, max(8, estimated_weeks // 2))  # 8-12 topics instead of 10-20

        return f"""Break **{topic}** into {target_topics} specific subtopics ({difficulty} level, {estimated_weeks}w).

Goals: {goals_text}
User: {user_experience}

Requirements:
- Each subtopic: 2-6h, specific skill/concept
- Progress from basic → advanced
- Specific names (not "Introduction to X")

JSON format:
[{{"topic_id":"t1","name":"Specific Name","description":"Brief desc","difficulty":"{difficulty}","estimated_hours":4,"key_concepts":["c1","c2","c3"]}}]"""

    @staticmethod
    def get_analyze_topics_system_prompt() -> str:
        """Get system prompt for topic analysis"""
        return "You are a curriculum design expert. Always return valid JSON."

    @staticmethod
    def get_build_roadmap_prompt(
        topics_json: str,
        estimated_weeks: int,
        time_commitment: int
    ) -> str:
        """Generate prompt for building learning roadmap

        Args:
            topics_json: JSON string of analyzed topics
            estimated_weeks: Course duration in weeks
            time_commitment: Hours per week

        Returns:
            Formatted prompt string
        """
        total_hours = estimated_weeks * time_commitment

        return f"""Create learning roadmap ({estimated_weeks}w, {time_commitment}h/w = {total_hours}h total):

{topics_json}

Create steps: specific titles, 2-8h each, logical order (basic→advanced), prerequisite links.

JSON:
[{{"step_id":"s1","topic_id":"t1","title":"Action-Oriented Title","description":"Brief what/how","prerequisites":[],"topics":["t1"],"estimated_hours":4,"order":1}}]

1 topic = 1 step typically. Prerequisites=[] for first steps."""

    @staticmethod
    def get_build_roadmap_system_prompt() -> str:
        """Get system prompt for roadmap building"""
        return "You are a learning path expert. Always return valid JSON with proper prerequisite dependencies."

    @staticmethod
    def get_identify_sources_prompt(
        topics_list: List[str],
        main_topic: str
    ) -> str:
        """Generate prompt for identifying learning sources

        Args:
            topics_list: List of topic names
            main_topic: Main subject area

        Returns:
            Formatted prompt string
        """
        topics_text = ', '.join(topics_list)

        return f"""You are an expert at finding free online learning resources. Identify the best platforms and sources for learning these topics:

Topics: {topics_text}

Main Subject Area: {main_topic}

Task: Identify 5-10 high-quality FREE sources where learners can find materials. Focus on:
- YouTube channels (specific channels for this topic)
- GitHub repositories (tutorials, awesome lists, learning paths)
- Free documentation sites
- Free tutorial platforms (freeCodeCamp, MDN, W3Schools, etc.)
- Free course platforms (Khan Academy, Coursera free courses, etc.)

CRITICAL: Return ONLY valid JSON. No markdown code blocks, no explanations, no plain text descriptions. Just pure JSON array.

JSON FORMAT RULES (MUST FOLLOW EXACTLY):
1. Return a JSON array starting with [ and ending with ]
2. Each object must have ALL required fields: source_id, name, type, url, relevance_score, free, topics_covered
3. Use lowercase true/false (NOT True/False)
4. ALL strings must be in double quotes
5. NO trailing commas after last array item or object property
6. NO plain text outside JSON structure

Example of CORRECT format:
[
  {{
    "source_id": "youtube_freecodecamp",
    "name": "FreeCodeCamp YouTube Channel",
    "type": "video_platform",
    "url": "https://www.youtube.com/freecodecamp",
    "relevance_score": 0.95,
    "free": true,
    "topics_covered": ["python_basics", "web_development"]
  }},
  {{
    "source_id": "mdn_docs",
    "name": "MDN Web Docs",
    "type": "documentation",
    "url": "https://developer.mozilla.org",
    "relevance_score": 0.90,
    "free": true,
    "topics_covered": ["javascript", "html", "css"]
  }}
]

Return ONLY the JSON array, nothing else."""

    @staticmethod
    def get_identify_sources_system_prompt() -> str:
        """Get system prompt for source identification"""
        return """You are a learning resource expert. You MUST return ONLY valid JSON - no markdown, no explanations, no plain text.
Your entire response must be parseable by JSON.parse(). Use lowercase true/false, double quotes for all strings, and no trailing commas."""

    @staticmethod
    def get_gather_resources_prompt(
        roadmap_json: str,
        sources_json: str
    ) -> str:
        """Generate prompt for gathering specific resources

        Args:
            roadmap_json: JSON string of roadmap steps
            sources_json: JSON string of identified sources

        Returns:
            Formatted prompt string
        """
        return f"""You are an expert at curating free learning resources. Find specific high-quality resources for this learning roadmap.

Roadmap Steps:
{roadmap_json}

Recommended Sources:
{sources_json}

Task: For each roadmap step, find 3-5 specific FREE resources. Include:
- YouTube videos (with specific video titles and links if known, or channel links)
- GitHub repositories (awesome lists, tutorials, projects)
- Documentation links
- Free articles/tutorials
- Free courses

CRITICAL: Return ONLY valid JSON. No markdown code blocks, no explanations, just pure JSON.

JSON FORMAT (use lowercase true/false, null for missing values, no trailing commas):
[
  {{
    "resource_id": "unique_id",
    "title": "Specific Resource Title",
    "description": "What this teaches",
    "url": "https://example.com",
    "type": "video",
    "source": "Platform Name",
    "duration": "30 min",
    "difficulty": "beginner",
    "quality_score": 0.85,
    "free": true,
    "topics": ["topic_id1"],
    "for_step": "step_id"
  }}
]

JSON RULES (MUST FOLLOW):
1. Use lowercase true/false/null (NOT True/False/None)
2. NO trailing commas after last item
3. ALL strings in double quotes
4. Type must be EXACTLY one of: "video", "documentation", "article", "tutorial", "code", "course"
5. Difficulty must be EXACTLY one of: "beginner", "intermediate", "advanced"
6. Duration must be a string (like "30 min") or null
7. Quality score must be a decimal number (0.0-1.0)
8. Free must be lowercase true or false

Important:
- Provide REAL resources with actual URLs
- For YouTube, include popular tutorials (e.g., "FreeCodeCamp Full Course")
- For GitHub, include awesome-lists and learning repos
- Quality score reflects known quality (popular tutorials get higher scores)
- Duration realistic (use null if unknown)
- Ensure 'for_step' matches a step_id from the roadmap

RETURN ONLY THE JSON ARRAY - NO OTHER TEXT"""

    @staticmethod
    def get_gather_resources_system_prompt() -> str:
        """Get system prompt for resource gathering"""
        return "You are a learning resource curator. Return valid JSON with real, accessible resources."

    @staticmethod
    def get_generate_learning_content_prompt(
        step_title: str,
        step_description: str,
        concepts: List[str],
        difficulty: str,
        estimated_hours: int
    ) -> str:
        """Generate prompt for creating AI-written learning material (OPTIMIZED)"""
        concepts_text = ', '.join(concepts[:5])  # Limit to 5 concepts to save tokens

        return f"""Create {difficulty}-level educational content in Markdown for: **{step_title}**

{step_description}

**Cover**: {concepts_text}
**Time**: ~{estimated_hours}h

Include:
- Introduction (why it matters)
- Main sections with examples
- Code snippets where relevant
- Mermaid diagrams for visual concepts (follow strict syntax rules below)
- LaTeX for equations ($inline$ or $$block$$)
- Summary with key takeaways

Format: Markdown with ##/### headings. ~{800 + estimated_hours * 150} words.

{get_mermaid_formatting_rules()}

Return markdown only (no wrapper)."""

    @staticmethod
    def get_generate_learning_content_system_prompt() -> str:
        """Get system prompt for learning content generation"""
        return """You are an expert educational content creator. You write clear, comprehensive, and engaging learning materials in Markdown format with LaTeX support for equations. Always provide detailed explanations with examples."""

    @staticmethod
    def get_extract_text_content_prompt(url: str, resource_title: str) -> str:
        """Generate prompt for extracting content from text-based resources

        Args:
            url: URL of the resource
            resource_title: Title of the resource

        Returns:
            Formatted prompt string
        """
        return f"""Extract the key educational content from this resource:

**Resource**: {resource_title}
**URL**: {url}

Extract and summarize the main educational points, concepts, and examples. Focus on:
1. Core concepts and definitions
2. Key examples or code snippets
3. Important formulas or equations
4. Practical tips and best practices
5. Common pitfalls to avoid

**Formatting Rules**:
- Use proper headings (##, ###) and bullet points
- Use **bold** for emphasis

{get_code_formatting_rules_compact()}

Return a well-structured summary in markdown format. Keep it comprehensive but concise."""

    @staticmethod
    def get_extract_github_resources_prompt(repo_url: str) -> str:
        """Generate prompt for extracting useful resources from GitHub repos

        Args:
            repo_url: GitHub repository URL

        Returns:
            Formatted prompt string
        """
        return f"""Analyze this GitHub repository and extract useful learning resources:

**Repository**: {repo_url}

Identify and extract:
1. README content with learning materials
2. Documentation links
3. Tutorial files or guides
4. Example code or sample projects
5. Links to external resources (videos, articles, courses)
6. Awesome-list entries if applicable

Return ONLY valid JSON in this format:
{{
  "extracted_resources": [
    {{
      "type": "documentation|tutorial|example|external_link",
      "title": "Resource title",
      "url": "Full URL",
      "description": "Brief description"
    }}
  ],
  "readme_content": "Key educational content from README"
}}"""

    @staticmethod
    def get_generate_syllabus_prompt(
        topic: str,
        goals: list,
        prerequisites: list,
        all_topics: list,
        difficulty: str,
        estimated_weeks: int
    ) -> str:
        """Generate prompt for creating course syllabus/overview page

        Args:
            topic: Course topic
            goals: Learning goals
            prerequisites: Prerequisites
            all_topics: List of all topics covered
            difficulty: Difficulty level
            estimated_weeks: Course duration

        Returns:
            Formatted prompt string
        """
        goals_text = '\n'.join([f"- {goal}" for goal in goals])
        prereqs_text = '\n'.join([f"- {prereq}" for prereq in prerequisites]) if prerequisites else "None"
        topics_text = '\n'.join([f"- {t}" for t in all_topics])

        # Limit topics list to save tokens
        topics_summary = ', '.join(all_topics[:8]) + ('...' if len(all_topics) > 8 else '')

        return f"""Create Markdown syllabus for **{topic}** ({difficulty}, {estimated_weeks}w):

Goals: {goals_text}
Prerequisites: {prereqs_text}
Topics: {topics_summary}

Include:
## Course Overview
Brief intro (why it matters, what you'll learn)

## Learning Objectives
Key skills & applications

## Structure
Topic-based organization, progression

## Prerequisites & Time Commitment

## Getting Started
Tips for success

~400 words. Return markdown only."""

    @staticmethod
    def get_group_topics_prompt(topics_list: list) -> str:
        """Generate prompt for organizing topics into a hierarchical structure

        Args:
            topics_list: List of topic dictionaries with titles, descriptions, and step_ids

        Returns:
            Formatted prompt string
        """
        # Include step_id in the output so AI can reference them
        topics_text = '\n'.join([f"- [{t.get('step_id', '')}] {t.get('name', t.get('title', ''))}: {t.get('description', '')}" for t in topics_list])

        return f"""Group these learning steps into 4-6 major topics. Each major topic should contain 3-5 subtopics.

**CRITICAL**: Each subtopic's `related_topic_ids` array MUST contain the step_ids (shown in brackets []) of the related input topics.

Input topics with their step_ids:
{topics_text}

Return JSON with this EXACT structure:
{{"topics":[{{"topic_id":"t1","title":"Major Topic","description":"Brief","estimated_hours":12,"order":1,"subtopics":[{{"subtopic_id":"t1_s1","title":"Subtopic Title","description":"Brief","duration":"2-3h","key_concepts":["concept1","concept2"],"related_topic_ids":["s1","s2"],"order":1}}]}}]}}

**IMPORTANT RULES**:
1. `related_topic_ids` must contain step_ids (like ["s1","s2"]) from the input list
2. Each subtopic should reference 1-3 related step_ids
3. Every input topic MUST be assigned to a subtopic
4. Organize prerequisites → fundamentals → advanced
5. Estimate total hours per major topic

Return ONLY the JSON object."""

