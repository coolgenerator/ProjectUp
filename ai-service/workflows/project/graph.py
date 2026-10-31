"""Project planning and management workflows."""
from typing import Dict, Any, Optional, List
import logging
import json
from core.workflow_base import BaseWorkflow, ConditionalWorkflow
from core.state import WorkflowState
from utils.project_type_detector import detect_project_type

logger = logging.getLogger(__name__)


class ProjectState(WorkflowState):
    """State for project workflows."""
    
    def __init__(self, **kwargs):
        """Initialize project state."""
        super().__init__(**kwargs)
        
        # Project-specific attributes
        if not hasattr(self, 'project_description'):
            self.project_description = ""
        if not hasattr(self, 'project_type'):
            self.project_type = "general"
        if not hasattr(self, 'ideas'):
            self.ideas = []
        if not hasattr(self, 'roadmap'):
            self.roadmap = {}
        if not hasattr(self, 'resources'):
            self.resources = []
        if not hasattr(self, 'requirements'):
            self.requirements = {}
        if not hasattr(self, 'final_project'):
            self.final_project = {}


class ProjectPlanningWorkflow(ConditionalWorkflow):
    """Comprehensive project planning workflow."""
    
    name = "project_planning"
    description = "End-to-end project planning with ideas, roadmap, and resources"
    version = "1.0.0"
    
    def _setup_workflow(self):
        """Set up the project planning workflow."""
        # Define nodes
        self.add_node("analyze_requirements", self.analyze_requirements)
        self.add_node("generate_ideas", self.generate_ideas)
        self.add_node("validate_ideas", self.validate_ideas)
        self.add_node("create_roadmap", self.create_roadmap)
        self.add_node("identify_resources", self.identify_resources)
        self.add_node("compile_project", self.compile_project)
        self.add_node("quality_check", self.quality_check)
        
        # Define edges
        self.add_edge("analyze_requirements", "generate_ideas")
        self.add_edge("generate_ideas", "validate_ideas")
        
        # Conditional edge from validate_ideas
        self.add_conditional_edge(
            "validate_ideas",
            lambda state: "regenerate" if len(state.ideas) < 3 else "continue",
            {
                "regenerate": "generate_ideas",
                "continue": "create_roadmap"
            }
        )
        
        self.add_edge("create_roadmap", "identify_resources")
        self.add_edge("identify_resources", "compile_project")
        self.add_edge("compile_project", "quality_check")
        
        # Conditional edge from quality_check
        self.add_conditional_edge(
            "quality_check",
            lambda state: "pass" if state.context.get('quality_score', 0) >= 0.7 else "revise",
            {
                "pass": "END",
                "revise": "compile_project"
            }
        )
        
        # Set entry point
        self.set_entry_point("analyze_requirements")
    
    def get_state_schema(self) -> type[WorkflowState]:
        """Get the state schema."""
        return ProjectState
    
    @staticmethod
    def analyze_requirements(state: ProjectState) -> ProjectState:
        """Analyze project requirements and detect project type."""
        # Extract key information from project description
        description = state.project_description.lower()

        # Detect project type (research vs engineering)
        project_type_info = detect_project_type(
            project_description=state.project_description,
            goal="",
            reference="",
            interests=[]
        )

        project_category = project_type_info['category']
        logger.info(f"Workflow detected project type: {project_category}")

        requirements = {
            'technical': [],
            'functional': [],
            'constraints': [],
            'goals': [],
            'project_category': project_category,
            'detection_info': project_type_info
        }

        # Type-specific requirement analysis
        if project_category == 'research':
            # Research project requirements
            if any(word in description for word in ['systematic review', 'literature review', 'meta-analysis']):
                requirements['technical'].append('Literature search and synthesis')
            if any(word in description for word in ['quantitative', 'statistical', 'data analysis']):
                requirements['technical'].append('Statistical analysis')
            if any(word in description for word in ['qualitative', 'interviews', 'surveys']):
                requirements['technical'].append('Qualitative research methods')
            if any(word in description for word in ['paper', 'report', 'manuscript']):
                requirements['functional'].append('Academic writing')
            if any(word in description for word in ['presentation', 'slides', 'poster']):
                requirements['functional'].append('Research presentation')

        elif project_category == 'engineering':
            # Engineering project requirements
            if any(word in description for word in ['web', 'app', 'software', 'api']):
                requirements['technical'].append('Software development')
            if any(word in description for word in ['user', 'customer', 'client']):
                requirements['functional'].append('User-focused design')
            if any(word in description for word in ['database', 'data', 'storage']):
                requirements['technical'].append('Data persistence')
            if any(word in description for word in ['deploy', 'cloud', 'production']):
                requirements['technical'].append('Deployment infrastructure')

        else:  # hybrid or unknown
            # Try to capture both types
            requirements['technical'].append('Hybrid project - analyze further')

        # Common constraints
        if any(word in description for word in ['budget', 'cost', 'deadline']):
            requirements['constraints'].append('Resource constraints')

        # Update project type in state
        state.project_type = project_category
        state.requirements = requirements
        state.context['project_category'] = project_category
        state.context['detection_confidence'] = project_type_info['confidence']
        state.status = 'requirements_analyzed'

        return state
    
    @staticmethod
    def generate_ideas(state: ProjectState) -> ProjectState:
        """Generate project ideas based on detected project type."""
        # Get project category from requirements or default to engineering
        project_category = state.requirements.get('project_category', 'engineering')

        # Research project ideas
        research_ideas = {
            'research': [
                {
                    'title': 'Systematic Literature Review',
                    'description': 'Comprehensive review of existing research on the topic',
                    'complexity': 'medium',
                    'innovation_score': 0.7,
                    'type': 'research'
                },
                {
                    'title': 'Quantitative Data Analysis Study',
                    'description': 'Statistical analysis of publicly available datasets',
                    'complexity': 'high',
                    'innovation_score': 0.8,
                    'type': 'research'
                },
                {
                    'title': 'Comparative Analysis Research',
                    'description': 'Compare different methodologies or approaches in the field',
                    'complexity': 'medium',
                    'innovation_score': 0.6,
                    'type': 'research'
                }
            ]
        }

        # Engineering project ideas
        engineering_ideas = {
            'web': [
                {
                    'title': 'Progressive Web Application',
                    'description': 'Build a PWA with offline capabilities',
                    'complexity': 'medium',
                    'innovation_score': 0.7,
                    'type': 'engineering'
                },
                {
                    'title': 'Real-time Collaboration Platform',
                    'description': 'Create a platform for real-time team collaboration',
                    'complexity': 'high',
                    'innovation_score': 0.8,
                    'type': 'engineering'
                }
            ],
            'mobile': [
                {
                    'title': 'Cross-platform Mobile App',
                    'description': 'Develop using React Native or Flutter',
                    'complexity': 'medium',
                    'innovation_score': 0.6,
                    'type': 'engineering'
                },
                {
                    'title': 'Native Performance App',
                    'description': 'Build native apps for iOS and Android',
                    'complexity': 'high',
                    'innovation_score': 0.7,
                    'type': 'engineering'
                }
            ],
            'general': [
                {
                    'title': 'Modular Architecture Solution',
                    'description': 'Design a scalable, modular system',
                    'complexity': 'medium',
                    'innovation_score': 0.6,
                    'type': 'engineering'
                },
                {
                    'title': 'Automated Workflow System',
                    'description': 'Create automated processes for efficiency',
                    'complexity': 'low',
                    'innovation_score': 0.5,
                    'type': 'engineering'
                }
            ]
        }

        # Select appropriate ideas based on category
        if project_category == 'research':
            new_ideas = research_ideas['research']
        elif project_category in engineering_ideas:
            new_ideas = engineering_ideas[project_category]
        else:
            # Default to general engineering
            new_ideas = engineering_ideas['general']

        # Add a custom idea based on description
        custom_type = 'research' if project_category == 'research' else project_category
        new_ideas = list(new_ideas)  # Make a copy to avoid modifying the original
        new_ideas.append({
            'title': f'Custom {custom_type.title()} Solution',
            'description': f'Tailored solution for: {state.project_description[:100]}',
            'complexity': 'variable',
            'innovation_score': 0.8,
            'type': project_category
        })

        state.ideas.extend(new_ideas)
        state.context['ideas_generated'] = len(new_ideas)
        state.context['ideas_category'] = project_category
        state.status = 'ideas_generated'
        return state
    
    @staticmethod
    def validate_ideas(state: ProjectState) -> ProjectState:
        """Validate generated ideas."""
        # Filter and score ideas
        valid_ideas = []
        
        for idea in state.ideas:
            # Simple validation (would be more sophisticated in production)
            if idea.get('innovation_score', 0) >= 0.5:
                idea['validation_score'] = idea['innovation_score'] * 0.8 + 0.2
                valid_ideas.append(idea)
        
        state.ideas = valid_ideas
        state.context['valid_ideas_count'] = len(valid_ideas)
        state.status = 'ideas_validated'
        return state
    
    @staticmethod
    def create_roadmap(state: ProjectState) -> ProjectState:
        """Create project roadmap."""
        roadmap = {
            'phases': [],
            'milestones': [],
            'timeline': {},
            'dependencies': []
        }
        
        # Create phases based on selected ideas
        phases = [
            {
                'name': 'Planning & Design',
                'duration': '2 weeks',
                'deliverables': ['Requirements document', 'Design mockups']
            },
            {
                'name': 'Development',
                'duration': '8 weeks',
                'deliverables': ['Core features', 'Testing suite']
            },
            {
                'name': 'Testing & Deployment',
                'duration': '2 weeks',
                'deliverables': ['Bug fixes', 'Deployment scripts']
            }
        ]
        
        roadmap['phases'] = phases
        
        # Add milestones
        roadmap['milestones'] = [
            {'name': 'Project Kickoff', 'phase': 0, 'week': 1},
            {'name': 'Design Approval', 'phase': 0, 'week': 2},
            {'name': 'Alpha Release', 'phase': 1, 'week': 6},
            {'name': 'Beta Release', 'phase': 1, 'week': 10},
            {'name': 'Final Launch', 'phase': 2, 'week': 12}
        ]
        
        state.roadmap = roadmap
        state.status = 'roadmap_created'
        return state
    
    @staticmethod
    def identify_resources(state: ProjectState) -> ProjectState:
        """Identify required resources."""
        resources = []
        
        # Determine resources based on project complexity
        if state.ideas:
            max_complexity = max(idea.get('complexity', 'low') for idea in state.ideas)
            
            # Team resources
            if max_complexity == 'high':
                resources.extend([
                    {'type': 'human', 'role': 'Project Manager', 'quantity': 1},
                    {'type': 'human', 'role': 'Senior Developer', 'quantity': 2},
                    {'type': 'human', 'role': 'Developer', 'quantity': 3},
                    {'type': 'human', 'role': 'QA Engineer', 'quantity': 2}
                ])
            else:
                resources.extend([
                    {'type': 'human', 'role': 'Developer', 'quantity': 2},
                    {'type': 'human', 'role': 'QA Engineer', 'quantity': 1}
                ])
        
        # Technical resources
        resources.extend([
            {'type': 'infrastructure', 'name': 'Cloud hosting', 'provider': 'AWS/GCP'},
            {'type': 'tool', 'name': 'Version control', 'provider': 'GitHub'},
            {'type': 'tool', 'name': 'CI/CD pipeline', 'provider': 'GitHub Actions'}
        ])
        
        state.resources = resources
        state.context['total_resources'] = len(resources)
        state.status = 'resources_identified'
        return state
    
    @staticmethod
    def compile_project(state: ProjectState) -> ProjectState:
        """Compile final project plan."""
        final_project = {
            'title': f"Project Plan: {state.project_description[:50]}",
            'description': state.project_description,
            'selected_ideas': state.ideas[:3],  # Top 3 ideas
            'roadmap': state.roadmap,
            'resources': state.resources,
            'requirements': state.requirements,
            'estimated_duration': '12 weeks',
            'risk_assessment': {
                'technical_risk': 'medium',
                'resource_risk': 'low',
                'timeline_risk': 'medium'
            }
        }
        
        state.final_project = final_project
        state.status = 'project_compiled'
        return state
    
    @staticmethod
    def quality_check(state: ProjectState) -> ProjectState:
        """Perform quality check on the project plan."""
        quality_score = 0.0
        checks = {
            'has_ideas': len(state.ideas) >= 3,
            'has_roadmap': bool(state.roadmap.get('phases')),
            'has_resources': len(state.resources) >= 3,
            'has_milestones': len(state.roadmap.get('milestones', [])) >= 3,
            'complete_requirements': all(state.requirements.values())
        }
        
        # Calculate quality score
        passed_checks = sum(1 for check in checks.values() if check)
        quality_score = passed_checks / len(checks)
        
        state.context['quality_checks'] = checks
        state.context['quality_score'] = quality_score
        state.context['quality_passed'] = quality_score >= 0.7
        
        if quality_score < 0.7:
            state.add_error("Quality check failed", {
                'score': quality_score,
                'failed_checks': [k for k, v in checks.items() if not v]
            })
        
        state.status = 'quality_checked'
        return state


class QuickProjectIdeaWorkflow(BaseWorkflow):
    """Quick workflow for generating project ideas only."""
    
    name = "quick_project_ideas"
    description = "Fast project idea generation"
    version = "1.0.0"
    
    def _setup_workflow(self):
        """Set up the quick ideas workflow."""
        # Define nodes
        self.add_node("parse_input", self.parse_input)
        self.add_node("generate_ideas", self.generate_ideas)
        self.add_node("rank_ideas", self.rank_ideas)
        self.add_node("format_output", self.format_output)
        
        # Define edges
        self.add_edge("parse_input", "generate_ideas")
        self.add_edge("generate_ideas", "rank_ideas")
        self.add_edge("rank_ideas", "format_output")
        self.add_edge("format_output", "END")
        
        # Set entry point
        self.set_entry_point("parse_input")
    
    def get_state_schema(self) -> type[WorkflowState]:
        """Get the state schema."""
        return ProjectState
    
    @staticmethod
    def parse_input(state: ProjectState) -> ProjectState:
        """Parse input to extract project details."""
        # Extract project type from description
        description = state.project_description.lower()
        
        if 'web' in description or 'website' in description:
            state.project_type = 'web'
        elif 'mobile' in description or 'app' in description:
            state.project_type = 'mobile'
        elif 'ai' in description or 'machine learning' in description:
            state.project_type = 'ai'
        else:
            state.project_type = 'general'
        
        state.status = 'input_parsed'
        return state
    
    @staticmethod
    def generate_ideas(state: ProjectState) -> ProjectState:
        """Generate multiple project ideas quickly."""
        # Generate 5-7 ideas
        ideas = []
        
        # Base templates for different project types
        templates = {
            'web': ['E-commerce Platform', 'Social Network', 'SaaS Dashboard', 'Portfolio Site'],
            'mobile': ['Fitness Tracker', 'Social App', 'Productivity Tool', 'Game'],
            'ai': ['Chatbot', 'Image Classifier', 'Recommendation Engine', 'Data Analyzer'],
            'general': ['Automation Tool', 'Management System', 'Integration Platform', 'Analytics Dashboard']
        }
        
        project_templates = templates.get(state.project_type, templates['general'])
        
        for i, template in enumerate(project_templates):
            ideas.append({
                'title': f'{template} for {state.project_description[:30]}',
                'description': f'A {template.lower()} solution tailored to your needs',
                'unique_features': [
                    f'Feature {j+1} specific to your use case'
                    for j in range(3)
                ],
                'technical_stack': ['Frontend', 'Backend', 'Database'],
                'estimated_effort': f'{(i+1)*2} weeks'
            })
        
        state.ideas = ideas
        state.status = 'ideas_generated'
        return state
    
    @staticmethod
    def rank_ideas(state: ProjectState) -> ProjectState:
        """Rank ideas by relevance and feasibility."""
        # Simple ranking based on position (would use AI in production)
        for i, idea in enumerate(state.ideas):
            idea['rank'] = i + 1
            idea['score'] = 1.0 - (i * 0.1)  # Decreasing score
            idea['feasibility'] = 'high' if i < 2 else 'medium' if i < 4 else 'low'
        
        # Sort by score
        state.ideas.sort(key=lambda x: x['score'], reverse=True)
        state.status = 'ideas_ranked'
        return state
    
    @staticmethod
    def format_output(state: ProjectState) -> ProjectState:
        """Format ideas for output."""
        state.metadata['output'] = {
            'project_type': state.project_type,
            'total_ideas': len(state.ideas),
            'top_ideas': state.ideas[:3],
            'all_ideas': state.ideas
        }
        
        state.status = 'completed'
        return state

# Default ProjectWorkflow alias
ProjectWorkflow = ProjectPlanningWorkflow
