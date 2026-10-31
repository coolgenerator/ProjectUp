"""Research and analysis workflows."""
from typing import Dict, Any, Optional, List
import logging
import json
from datetime import datetime
from core.workflow_base import BaseWorkflow, ConditionalWorkflow
from core.state import WorkflowState

logger = logging.getLogger(__name__)


class ResearchState(WorkflowState):
    """State for research workflows."""
    
    def __init__(self, **kwargs):
        """Initialize research state."""
        super().__init__(**kwargs)
        
        # Research-specific attributes
        if not hasattr(self, 'research_topic'):
            self.research_topic = ""
        if not hasattr(self, 'research_questions'):
            self.research_questions = []
        if not hasattr(self, 'keywords'):
            self.keywords = []
        if not hasattr(self, 'sources'):
            self.sources = []
        if not hasattr(self, 'findings'):
            self.findings = []
        if not hasattr(self, 'synthesis'):
            self.synthesis = ""
        if not hasattr(self, 'report'):
            self.report = {}
        if not hasattr(self, 'citations'):
            self.citations = []


class ComprehensiveResearchWorkflow(ConditionalWorkflow):
    """Comprehensive research workflow with validation and synthesis."""
    
    name = "comprehensive_research"
    description = "Full research workflow from keywords to final report"
    version = "1.0.0"
    
    def _setup_workflow(self):
        """Set up the research workflow."""
        # Define nodes
        self.add_node("extract_keywords", self.extract_keywords)
        self.add_node("formulate_questions", self.formulate_questions)
        self.add_node("search_sources", self.search_sources)
        self.add_node("validate_sources", self.validate_sources)
        self.add_node("extract_information", self.extract_information)
        self.add_node("synthesize_findings", self.synthesize_findings)
        self.add_node("fact_check", self.fact_check)
        self.add_node("generate_report", self.generate_report)
        self.add_node("quality_review", self.quality_review)
        
        # Define edges
        self.add_edge("extract_keywords", "formulate_questions")
        self.add_edge("formulate_questions", "search_sources")
        self.add_edge("search_sources", "validate_sources")
        
        # Conditional edge from validate_sources
        self.add_conditional_edge(
            "validate_sources",
            lambda state: "insufficient" if len(state.sources) < 3 else "sufficient",
            {
                "insufficient": "search_sources",
                "sufficient": "extract_information"
            }
        )
        
        self.add_edge("extract_information", "synthesize_findings")
        self.add_edge("synthesize_findings", "fact_check")
        
        # Conditional edge from fact_check
        self.add_conditional_edge(
            "fact_check",
            lambda state: "passed" if state.context.get('fact_check_score', 0) >= 0.8 else "failed",
            {
                "passed": "generate_report",
                "failed": "synthesize_findings"
            }
        )
        
        self.add_edge("generate_report", "quality_review")
        self.add_edge("quality_review", "END")
        
        # Set entry point
        self.set_entry_point("extract_keywords")
    
    def get_state_schema(self) -> type[WorkflowState]:
        """Get the state schema."""
        return ResearchState
    
    @staticmethod
    def extract_keywords(state: ResearchState) -> ResearchState:
        """Extract keywords from research topic."""
        topic = state.research_topic.lower()
        
        # Simple keyword extraction (would use NLP in production)
        # Remove common words
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'}
        words = topic.split()
        keywords = [word for word in words if word not in stop_words and len(word) > 2]
        
        # Add compound terms
        if len(words) > 1:
            # Add bigrams
            for i in range(len(words) - 1):
                if words[i] not in stop_words and words[i+1] not in stop_words:
                    keywords.append(f"{words[i]} {words[i+1]}")
        
        state.keywords = list(set(keywords))  # Remove duplicates
        state.context['keyword_count'] = len(state.keywords)
        state.status = 'keywords_extracted'
        return state
    
    @staticmethod
    def formulate_questions(state: ResearchState) -> ResearchState:
        """Formulate research questions."""
        questions = [
            f"What is {state.research_topic}?",
            f"What are the key components of {state.research_topic}?",
            f"How does {state.research_topic} work?",
            f"What are the benefits of {state.research_topic}?",
            f"What are the challenges or limitations of {state.research_topic}?",
            f"What are the current trends in {state.research_topic}?",
            f"What is the future outlook for {state.research_topic}?"
        ]
        
        # Add keyword-specific questions
        for keyword in state.keywords[:3]:  # Top 3 keywords
            questions.append(f"How does {keyword} relate to {state.research_topic}?")
        
        state.research_questions = questions
        state.status = 'questions_formulated'
        return state
    
    @staticmethod
    def search_sources(state: ResearchState) -> ResearchState:
        """Search for relevant sources."""
        # Simulate source discovery (would use actual search APIs in production)
        sources = []
        
        source_templates = [
            {'type': 'academic', 'reliability': 0.9, 'recency': '2023'},
            {'type': 'industry', 'reliability': 0.8, 'recency': '2024'},
            {'type': 'news', 'reliability': 0.7, 'recency': '2024'},
            {'type': 'blog', 'reliability': 0.6, 'recency': '2023'},
            {'type': 'report', 'reliability': 0.85, 'recency': '2023'}
        ]
        
        for i, template in enumerate(source_templates):
            source = {
                'id': f"source_{i+1}",
                'title': f"{template['type'].title()} Source on {state.research_topic}",
                'url': f"https://example.com/{template['type']}/{i+1}",
                'type': template['type'],
                'reliability_score': template['reliability'],
                'publication_date': template['recency'],
                'relevant_keywords': state.keywords[:2],
                'abstract': f"This {template['type']} source provides insights on {state.research_topic}"
            }
            sources.append(source)
        
        # Add sources to existing ones (for retry logic)
        existing_ids = {s['id'] for s in state.sources}
        new_sources = [s for s in sources if s['id'] not in existing_ids]
        state.sources.extend(new_sources)
        
        state.context['sources_found'] = len(new_sources)
        state.status = 'sources_found'
        return state
    
    @staticmethod
    def validate_sources(state: ResearchState) -> ResearchState:
        """Validate and filter sources."""
        valid_sources = []
        
        for source in state.sources:
            # Validation criteria
            is_recent = int(source['publication_date']) >= 2023
            is_reliable = source['reliability_score'] >= 0.7
            has_keywords = any(kw in source['relevant_keywords'] for kw in state.keywords[:2])
            
            if is_recent and is_reliable and has_keywords:
                source['validation_passed'] = True
                valid_sources.append(source)
            else:
                source['validation_passed'] = False
                source['validation_reasons'] = {
                    'recent': is_recent,
                    'reliable': is_reliable,
                    'relevant': has_keywords
                }
        
        state.sources = valid_sources
        state.context['valid_sources'] = len(valid_sources)
        state.status = 'sources_validated'
        return state
    
    @staticmethod
    def extract_information(state: ResearchState) -> ResearchState:
        """Extract information from sources."""
        findings = []
        
        for source in state.sources:
            # Simulate information extraction (would use actual content analysis in production)
            for i, question in enumerate(state.research_questions[:3]):  # Top 3 questions
                finding = {
                    'source_id': source['id'],
                    'source_title': source['title'],
                    'question': question,
                    'answer': f"Based on {source['type']} analysis: Information about {question}",
                    'confidence': source['reliability_score'],
                    'extracted_at': datetime.now().isoformat()
                }
                findings.append(finding)
        
        state.findings = findings
        state.context['total_findings'] = len(findings)
        state.status = 'information_extracted'
        return state
    
    @staticmethod
    def synthesize_findings(state: ResearchState) -> ResearchState:
        """Synthesize findings into coherent insights."""
        # Group findings by question
        findings_by_question = {}
        for finding in state.findings:
            question = finding['question']
            if question not in findings_by_question:
                findings_by_question[question] = []
            findings_by_question[question].append(finding)
        
        # Create synthesis
        synthesis_parts = [f"# Research Synthesis: {state.research_topic}\n"]
        
        for question, question_findings in findings_by_question.items():
            synthesis_parts.append(f"\n## {question}")
            
            # Combine answers with confidence weighting
            combined_answer = "Based on multiple sources:\n"
            for finding in question_findings:
                combined_answer += f"- {finding['answer']} (confidence: {finding['confidence']})\n"
            
            synthesis_parts.append(combined_answer)
        
        # Add overall summary
        synthesis_parts.append("\n## Summary")
        synthesis_parts.append(f"This research examined {len(state.sources)} sources to understand {state.research_topic}.")
        synthesis_parts.append(f"Key findings were extracted for {len(findings_by_question)} research questions.")
        
        state.synthesis = "\n".join(synthesis_parts)
        state.status = 'findings_synthesized'
        return state
    
    @staticmethod
    def fact_check(state: ResearchState) -> ResearchState:
        """Fact-check the synthesized findings."""
        # Simulate fact-checking (would use verification APIs in production)
        fact_checks = {
            'sources_verified': len(state.sources) >= 3,
            'findings_consistent': True,  # Would check for contradictions
            'citations_present': len(state.sources) > 0,
            'recent_information': any(int(s['publication_date']) >= 2023 for s in state.sources),
            'multiple_perspectives': len(set(s['type'] for s in state.sources)) >= 2
        }
        
        # Calculate fact-check score
        passed_checks = sum(1 for check in fact_checks.values() if check)
        fact_check_score = passed_checks / len(fact_checks)
        
        state.context['fact_checks'] = fact_checks
        state.context['fact_check_score'] = fact_check_score
        
        if fact_check_score < 0.8:
            state.add_error("Fact check failed", {
                'score': fact_check_score,
                'failed_checks': [k for k, v in fact_checks.items() if not v]
            })
        
        state.status = 'fact_checked'
        return state
    
    @staticmethod
    def generate_report(state: ResearchState) -> ResearchState:
        """Generate final research report."""
        # Create citations
        citations = []
        for i, source in enumerate(state.sources):
            citation = f"[{i+1}] {source['title']}. {source['type'].title()} Source. {source['publication_date']}. {source['url']}"
            citations.append(citation)
        
        state.citations = citations
        
        # Generate report structure
        report = {
            'title': f"Research Report: {state.research_topic}",
            'date': datetime.now().isoformat(),
            'executive_summary': f"This report presents findings on {state.research_topic} based on {len(state.sources)} validated sources.",
            'methodology': {
                'keywords_used': state.keywords,
                'sources_analyzed': len(state.sources),
                'questions_addressed': len(state.research_questions)
            },
            'findings': state.synthesis,
            'sources': [
                {
                    'title': s['title'],
                    'type': s['type'],
                    'reliability': s['reliability_score'],
                    'url': s['url']
                }
                for s in state.sources
            ],
            'citations': citations,
            'limitations': [
                "This research is based on available online sources",
                "Further primary research may be needed for comprehensive understanding"
            ],
            'recommendations': [
                f"Further investigate specific aspects of {state.research_topic}",
                "Consult domain experts for validation",
                "Monitor emerging trends and updates"
            ]
        }
        
        state.report = report
        state.status = 'report_generated'
        return state
    
    @staticmethod
    def quality_review(state: ResearchState) -> ResearchState:
        """Perform final quality review."""
        quality_criteria = {
            'has_executive_summary': bool(state.report.get('executive_summary')),
            'has_methodology': bool(state.report.get('methodology')),
            'has_findings': bool(state.report.get('findings')),
            'has_citations': len(state.citations) > 0,
            'minimum_sources': len(state.sources) >= 3,
            'addresses_questions': len(state.findings) >= len(state.research_questions) * 0.5
        }
        
        quality_score = sum(1 for criterion in quality_criteria.values() if criterion) / len(quality_criteria)
        
        state.context['quality_criteria'] = quality_criteria
        state.context['quality_score'] = quality_score
        state.metadata['report_quality'] = 'high' if quality_score >= 0.8 else 'medium' if quality_score >= 0.6 else 'low'
        
        state.status = 'completed'
        return state


class QuickResearchWorkflow(BaseWorkflow):
    """Quick research workflow for rapid information gathering."""
    
    name = "quick_research"
    description = "Fast research workflow for quick insights"
    version = "1.0.0"
    
    def _setup_workflow(self):
        """Set up the quick research workflow."""
        # Define nodes
        self.add_node("parse_topic", self.parse_topic)
        self.add_node("quick_search", self.quick_search)
        self.add_node("summarize_findings", self.summarize_findings)
        self.add_node("format_results", self.format_results)
        
        # Define edges
        self.add_edge("parse_topic", "quick_search")
        self.add_edge("quick_search", "summarize_findings")
        self.add_edge("summarize_findings", "format_results")
        self.add_edge("format_results", "END")
        
        # Set entry point
        self.set_entry_point("parse_topic")
    
    def get_state_schema(self) -> type[WorkflowState]:
        """Get the state schema."""
        return ResearchState
    
    @staticmethod
    def parse_topic(state: ResearchState) -> ResearchState:
        """Parse research topic quickly."""
        # Extract main concepts
        words = state.research_topic.split()
        state.keywords = [w for w in words if len(w) > 3][:5]  # Top 5 meaningful words
        
        # Generate 3 key questions
        state.research_questions = [
            f"What is {state.research_topic}?",
            f"Why is {state.research_topic} important?",
            f"How is {state.research_topic} used?"
        ]
        
        state.status = 'topic_parsed'
        return state
    
    @staticmethod
    def quick_search(state: ResearchState) -> ResearchState:
        """Perform quick search for information."""
        # Simulate quick search results
        findings = []
        
        for i, question in enumerate(state.research_questions):
            finding = {
                'question': question,
                'answer': f"Quick answer for: {question}",
                'source': f"Quick source {i+1}",
                'confidence': 0.7
            }
            findings.append(finding)
        
        state.findings = findings
        state.status = 'search_completed'
        return state
    
    @staticmethod
    def summarize_findings(state: ResearchState) -> ResearchState:
        """Create quick summary of findings."""
        summary_parts = [f"Quick Research Summary: {state.research_topic}\n"]
        
        for finding in state.findings:
            summary_parts.append(f"\n{finding['question']}")
            summary_parts.append(f"→ {finding['answer']}")
        
        state.synthesis = "\n".join(summary_parts)
        state.status = 'findings_summarized'
        return state
    
    @staticmethod
    def format_results(state: ResearchState) -> ResearchState:
        """Format results for quick consumption."""
        state.metadata['quick_results'] = {
            'topic': state.research_topic,
            'key_points': [f['answer'] for f in state.findings],
            'summary': state.synthesis,
            'search_time': 'rapid',
            'confidence': 'medium'
        }
        
        state.status = 'completed'
        return state

# Default ResearchWorkflow alias
ResearchWorkflow = ComprehensiveResearchWorkflow
