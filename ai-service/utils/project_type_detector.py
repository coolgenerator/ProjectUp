"""
Project Type Detection Utility

Intelligently detects whether a project is:
- Research (academic, analysis, systematic review)
- Engineering (software development, application building)
"""

from typing import Dict, List, Literal
import re

ProjectCategory = Literal["research", "engineering", "hybrid", "unknown"]


class ProjectTypeDetector:
    """Detects project type based on description, goal, and context."""

    # Keywords indicating research projects
    RESEARCH_KEYWORDS = {
        # Academic/Research terms
        'research', 'study', 'analysis', 'systematic review', 'literature review',
        'meta-analysis', 'survey', 'investigation', 'evaluation', 'assessment',
        'quantitative analysis', 'qualitative analysis', 'statistical analysis',

        # Academic deliverables
        'paper', 'report', 'publication', 'thesis', 'dissertation', 'manuscript',
        'journal', 'conference', 'presentation', 'poster', 'abstract',

        # Research methodology
        'hypothesis', 'methodology', 'methods', 'data collection', 'dataset',
        'statistical', 'empirical', 'experiment', 'observational', 'cohort',
        'case study', 'case-control', 'randomized', 'clinical trial',

        # Academic context
        'biomedical informatics', 'bioinformatics', 'computational biology',
        'health informatics', 'medical informatics', 'clinical informatics',
        'findings', 'results', 'discussion', 'conclusion', 'limitations',
        'systematic', 'comprehensive review', 'evidence-based',

        # Course/Assignment indicators
        'course project', 'class project', 'assignment', 'final project',
        'rubric', 'grading', 'deliverable', 'academic', 'semester',

        # Research specifics
        'citation', 'bibliography', 'references', 'deidentification',
        'IRB', 'ethics approval', 'peer review'
    }

    # Keywords indicating engineering/software projects
    ENGINEERING_KEYWORDS = {
        # Software development
        'app', 'application', 'software', 'website', 'web app', 'mobile app',
        'platform', 'system', 'tool', 'dashboard', 'interface', 'portal',

        # Technical terms
        'api', 'backend', 'frontend', 'database', 'server', 'client',
        'microservices', 'architecture', 'deployment', 'ci/cd', 'devops',

        # Development activities
        'build', 'develop', 'implement', 'code', 'programming', 'engineering',
        'feature', 'functionality', 'integration', 'testing', 'debugging',

        # Technologies
        'react', 'angular', 'vue', 'node', 'python', 'java', 'javascript',
        'typescript', 'docker', 'kubernetes', 'aws', 'cloud', 'serverless',

        # Product terms
        'user interface', 'ui', 'ux', 'design', 'prototype', 'mvp',
        'product', 'service', 'automation', 'workflow'
    }

    # Phrases that strongly indicate research (weighted higher)
    STRONG_RESEARCH_PHRASES = [
        r'systematic review',
        r'literature review',
        r'quantitative analysis',
        r'qualitative analysis',
        r'meta-analysis',
        r'research project',
        r'course project',
        r'final project evaluation',
        r'biomedical informatics',
        r'health-related question',
        r'research findings',
        r'data analysis',
        r'statistical analysis',
        r'clinical trial',
        r'observational study',
        r'case-control study'
    ]

    # Phrases that strongly indicate engineering
    STRONG_ENGINEERING_PHRASES = [
        r'build an? (app|application|website|platform|system)',
        r'develop an? (app|application|website|platform|system)',
        r'create an? (app|application|website|platform|system)',
        r'software development',
        r'web development',
        r'mobile development',
        r'full-stack',
        r'user interface',
        r'api development',
        r'microservices'
    ]

    @classmethod
    def detect(
        cls,
        project_description: str = "",
        goal: str = "",
        reference: str = "",
        interests: List[str] = None
    ) -> Dict[str, any]:
        """
        Detect project type based on all available information.

        Args:
            project_description: Main project description
            goal: User's stated goal
            reference: Additional reference/context
            interests: List of user interests

        Returns:
            Dictionary with:
                - category: 'research' | 'engineering' | 'hybrid' | 'unknown'
                - confidence: 0.0 to 1.0
                - reasoning: List of detection factors
                - suggestions: Recommended deliverable types
        """
        # Combine all text for analysis
        all_text = " ".join([
            project_description or "",
            goal or "",
            reference or "",
            " ".join(interests or [])
        ]).lower()

        if not all_text.strip():
            return {
                'category': 'unknown',
                'confidence': 0.0,
                'reasoning': ['No input provided'],
                'suggestions': []
            }

        # Score calculation
        research_score = 0.0
        engineering_score = 0.0
        reasoning = []

        # 1. Check for strong phrases (weight: 3.0)
        for phrase in cls.STRONG_RESEARCH_PHRASES:
            if re.search(phrase, all_text, re.IGNORECASE):
                research_score += 3.0
                reasoning.append(f"Strong research indicator: '{phrase}'")

        for phrase in cls.STRONG_ENGINEERING_PHRASES:
            if re.search(phrase, all_text, re.IGNORECASE):
                engineering_score += 3.0
                reasoning.append(f"Strong engineering indicator: '{phrase}'")

        # 2. Count keyword matches (weight: 1.0 each)
        research_matches = sum(1 for keyword in cls.RESEARCH_KEYWORDS if keyword in all_text)
        engineering_matches = sum(1 for keyword in cls.ENGINEERING_KEYWORDS if keyword in all_text)

        research_score += research_matches
        engineering_score += engineering_matches

        if research_matches > 0:
            reasoning.append(f"Research keywords: {research_matches} matches")
        if engineering_matches > 0:
            reasoning.append(f"Engineering keywords: {engineering_matches} matches")

        # 3. Special detection for course/academic projects (strong research signal)
        if any(term in all_text for term in ['rubric', 'final project evaluation', 'grading', 'course project']):
            research_score += 5.0
            reasoning.append("Academic/course project context detected")

        # 4. Check for deliverable mentions
        research_deliverables = ['paper', 'report', 'presentation', 'slides', 'poster', 'abstract']
        engineering_deliverables = ['app', 'website', 'application', 'platform', 'dashboard']

        research_deliv_count = sum(1 for d in research_deliverables if d in all_text)
        engineering_deliv_count = sum(1 for d in engineering_deliverables if d in all_text)

        research_score += research_deliv_count * 2
        engineering_score += engineering_deliv_count * 2

        # 5. Determine category based on scores
        total_score = research_score + engineering_score

        if total_score == 0:
            category = 'unknown'
            confidence = 0.0
        elif research_score > engineering_score * 2:
            category = 'research'
            confidence = min(0.95, research_score / (research_score + engineering_score))
        elif engineering_score > research_score * 2:
            category = 'engineering'
            confidence = min(0.95, engineering_score / (research_score + engineering_score))
        else:
            category = 'hybrid'
            confidence = 0.6

        # 6. Generate suggestions based on category
        suggestions = cls._get_suggestions(category)

        return {
            'category': category,
            'confidence': round(confidence, 2),
            'reasoning': reasoning,
            'suggestions': suggestions,
            'scores': {
                'research': round(research_score, 1),
                'engineering': round(engineering_score, 1)
            }
        }

    @staticmethod
    def _get_suggestions(category: ProjectCategory) -> List[str]:
        """Get recommended deliverable types based on category."""
        if category == 'research':
            return [
                'Research paper (3-5 pages)',
                'Literature review',
                'Data analysis report',
                'Presentation slides (10-20 slides)',
                'Research poster',
                'Systematic review',
                'Quantitative analysis',
                'Statistical analysis report',
                'Findings presentation',
                'Research methodology document'
            ]
        elif category == 'engineering':
            return [
                'Web application',
                'Mobile application',
                'API/Backend service',
                'Dashboard/Analytics platform',
                'Automation tool',
                'Software library/package',
                'CLI tool',
                'Progressive Web App (PWA)',
                'Chrome extension',
                'Desktop application'
            ]
        elif category == 'hybrid':
            return [
                'Data analysis tool with research report',
                'Interactive visualization with paper',
                'Software prototype with evaluation study',
                'Analysis dashboard with findings report',
                'Research platform (tool + paper)',
                'Simulation tool with methodology paper'
            ]
        else:  # unknown
            return [
                'Please provide more context about your project goals',
                'Specify if this is for research, development, or both',
                'Include details about expected deliverables'
            ]


# Convenience function for quick detection
def detect_project_type(
    project_description: str = "",
    goal: str = "",
    reference: str = "",
    interests: List[str] = None
) -> Dict[str, any]:
    """Quick project type detection."""
    return ProjectTypeDetector.detect(
        project_description=project_description,
        goal=goal,
        reference=reference,
        interests=interests
    )
