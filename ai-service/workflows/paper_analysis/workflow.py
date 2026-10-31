"""Paper Analysis Workflows for AI Agent"""

import json
from typing import Dict, Any, List
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import BaseMessage
from langgraph.graph import StateGraph, END
from core.workflow_base import WorkflowState
from core.llm_adapter import LLMManager


class PaperAnalysisWorkflow:
    """Workflow for analyzing academic papers"""
    
    def __init__(self, llm_manager: LLMManager):
        self.llm_manager = llm_manager
        self.llm = llm_manager.get_llm()
        
    def create_graph(self) -> StateGraph:
        """Create the paper analysis workflow graph"""
        workflow = StateGraph(WorkflowState)
        
        # Add nodes
        workflow.add_node("extract_content", self.extract_content)
        workflow.add_node("analyze_innovation", self.analyze_innovation)
        workflow.add_node("extract_contributions", self.extract_contributions)
        workflow.add_node("assess_technical", self.assess_technical)
        workflow.add_node("identify_limitations", self.identify_limitations)
        workflow.add_node("compile_analysis", self.compile_analysis)
        
        # Add edges
        workflow.add_edge("extract_content", "analyze_innovation")
        workflow.add_edge("analyze_innovation", "extract_contributions")
        workflow.add_edge("extract_contributions", "assess_technical")
        workflow.add_edge("assess_technical", "identify_limitations")
        workflow.add_edge("identify_limitations", "compile_analysis")
        workflow.add_edge("compile_analysis", END)
        
        # Set entry point
        workflow.set_entry_point("extract_content")
        
        return workflow.compile()
    
    def extract_content(self, state: WorkflowState) -> Dict[str, Any]:
        """Extract key content from paper"""
        prompt = ChatPromptTemplate.from_template("""
        Extract and summarize the key content from this paper:
        Title: {title}
        Abstract: {abstract}
        
        Provide:
        1. Main research question
        2. Methodology overview
        3. Key findings
        4. Technical approach
        """)
        
        response = self.llm.invoke(prompt.format_messages(
            title=state["params"].get("paper_title", ""),
            abstract=state["params"].get("abstract", "")
        ))
        
        state["results"]["content_summary"] = response.content
        return state
    
    def analyze_innovation(self, state: WorkflowState) -> Dict[str, Any]:
        """Analyze innovation and novelty"""
        prompt = ChatPromptTemplate.from_template("""
        Based on the paper content, assess the innovation level:
        {content_summary}
        
        Rate the innovation score from 1-10 and explain why.
        Consider:
        - Novelty of approach
        - Originality of ideas
        - Advancement over existing work
        """)
        
        response = self.llm.invoke(prompt.format_messages(
            content_summary=state["results"].get("content_summary", "")
        ))
        
        # Parse score from response
        try:
            import re
            score_match = re.search(r'\b([1-9]|10)\b', response.content)
            score = int(score_match.group()) if score_match else 7
        except:
            score = 7
            
        state["results"]["innovation_score"] = score
        state["results"]["innovation_analysis"] = response.content
        return state
    
    def extract_contributions(self, state: WorkflowState) -> Dict[str, Any]:
        """Extract key contributions"""
        prompt = ChatPromptTemplate.from_template("""
        List the key contributions of this paper:
        {content_summary}
        
        Provide 3-5 main contributions in a clear, concise format.
        """)
        
        response = self.llm.invoke(prompt.format_messages(
            content_summary=state["results"].get("content_summary", "")
        ))
        
        # Parse contributions into list
        contributions = [line.strip() for line in response.content.split('\n') 
                        if line.strip() and (line.strip()[0].isdigit() or line.strip().startswith('-'))]
        
        state["results"]["contributions"] = contributions[:5]  # Limit to 5
        return state
    
    def assess_technical(self, state: WorkflowState) -> Dict[str, Any]:
        """Assess technical approach and difficulty"""
        prompt = ChatPromptTemplate.from_template("""
        Assess the technical aspects of this paper:
        {content_summary}
        
        Provide:
        1. Technical approach summary
        2. Implementation difficulty (Easy/Medium/Hard/Very Hard)
        3. Reproducibility assessment (Poor/Fair/Good/Excellent)
        4. Potential impact (Low/Medium/High/Very High)
        """)
        
        response = self.llm.invoke(prompt.format_messages(
            content_summary=state["results"].get("content_summary", "")
        ))
        
        # Parse response
        content = response.content.lower()
        
        # Extract difficulty
        if "very hard" in content:
            difficulty = "Very Hard"
        elif "hard" in content:
            difficulty = "Hard"
        elif "easy" in content:
            difficulty = "Easy"
        else:
            difficulty = "Medium"
            
        # Extract reproducibility
        if "excellent" in content:
            reproducibility = "Excellent"
        elif "good" in content:
            reproducibility = "Good"
        elif "poor" in content:
            reproducibility = "Poor"
        else:
            reproducibility = "Fair"
            
        # Extract impact
        if "very high" in content:
            impact = "Very High"
        elif "high" in content:
            impact = "High"
        elif "low" in content:
            impact = "Low"
        else:
            impact = "Medium"
        
        state["results"]["technical_approach"] = response.content.split('\n')[0] if '\n' in response.content else response.content[:200]
        state["results"]["difficulty"] = difficulty
        state["results"]["reproducibility"] = reproducibility
        state["results"]["impact"] = impact
        
        return state
    
    def identify_limitations(self, state: WorkflowState) -> Dict[str, Any]:
        """Identify limitations and future work"""
        prompt = ChatPromptTemplate.from_template("""
        Identify limitations and areas for improvement in this paper:
        {content_summary}
        
        List 3-5 key limitations or areas that could be improved.
        """)
        
        response = self.llm.invoke(prompt.format_messages(
            content_summary=state["results"].get("content_summary", "")
        ))
        
        # Parse limitations into list
        limitations = [line.strip() for line in response.content.split('\n') 
                      if line.strip() and (line.strip()[0].isdigit() or line.strip().startswith('-'))]
        
        state["results"]["limitations"] = limitations[:5]  # Limit to 5
        return state
    
    def compile_analysis(self, state: WorkflowState) -> Dict[str, Any]:
        """Compile final analysis report"""
        prompt = ChatPromptTemplate.from_template("""
        Compile a brief results summary for this paper analysis:
        Innovation Score: {innovation_score}/10
        Contributions: {contributions}
        Technical Difficulty: {difficulty}
        
        Provide a 2-3 sentence summary of the key findings and value of this paper.
        """)
        
        response = self.llm.invoke(prompt.format_messages(
            innovation_score=state["results"].get("innovation_score", 7),
            contributions=", ".join(state["results"].get("contributions", [])),
            difficulty=state["results"].get("difficulty", "Medium")
        ))
        
        state["results"]["results_summary"] = response.content
        
        # Clean up final results
        final_results = {
            "innovation_score": state["results"].get("innovation_score", 7),
            "difficulty": state["results"].get("difficulty", "Medium"),
            "reproducibility": state["results"].get("reproducibility", "Good"),
            "impact": state["results"].get("impact", "Medium"),
            "contributions": state["results"].get("contributions", []),
            "technical_approach": state["results"].get("technical_approach", ""),
            "results_summary": state["results"].get("results_summary", ""),
            "limitations": state["results"].get("limitations", [])
        }
        
        state["results"] = final_results
        return state


class PaperChatWorkflow:
    """Workflow for chatting about papers"""
    
    def __init__(self, llm_manager: LLMManager):
        self.llm_manager = llm_manager
        self.llm = llm_manager.get_llm()
        
    def create_graph(self) -> StateGraph:
        """Create the paper chat workflow graph"""
        workflow = StateGraph(WorkflowState)
        
        # Add nodes
        workflow.add_node("process_question", self.process_question)
        workflow.add_node("generate_response", self.generate_response)
        
        # Add edges
        workflow.add_edge("process_question", "generate_response")
        workflow.add_edge("generate_response", END)
        
        # Set entry point
        workflow.set_entry_point("process_question")
        
        return workflow.compile()
    
    def process_question(self, state: WorkflowState) -> Dict[str, Any]:
        """Process user question about the paper"""
        state["results"]["processed_question"] = state["params"].get("message", "")
        state["results"]["context"] = state["params"].get("context", "")
        return state
    
    def generate_response(self, state: WorkflowState) -> Dict[str, Any]:
        """Generate response to user question"""
        prompt = ChatPromptTemplate.from_template("""
        You are an AI assistant helping a researcher understand a paper.
        
        Paper Title: {title}
        Paper Abstract: {abstract}
        
        Context (selected text): {context}
        
        User Question: {question}
        
        Provide a helpful, detailed response. If the question is about specific content,
        reference the paper appropriately. Be academic but accessible in tone.
        """)
        
        response = self.llm.invoke(prompt.format_messages(
            title=state["params"].get("paper_title", ""),
            abstract=state["params"].get("abstract", ""),
            context=state["results"].get("context", ""),
            question=state["results"].get("processed_question", "")
        ))
        
        state["results"]["response"] = response.content
        return state


class PaperOutlineWorkflow:
    """Workflow for extracting paper outline"""
    
    def __init__(self, llm_manager: LLMManager):
        self.llm_manager = llm_manager
        self.llm = llm_manager.get_llm()
        
    def create_graph(self) -> StateGraph:
        """Create the outline extraction workflow graph"""
        workflow = StateGraph(WorkflowState)
        
        # Add nodes
        workflow.add_node("extract_sections", self.extract_sections)
        
        # Add edges
        workflow.add_edge("extract_sections", END)
        
        # Set entry point
        workflow.set_entry_point("extract_sections")
        
        return workflow.compile()
    
    def extract_sections(self, state: WorkflowState) -> Dict[str, Any]:
        """Extract paper sections and structure"""
        # In a real implementation, this would parse the PDF
        # For now, return a typical paper structure
        sections = [
            {"title": "Abstract", "page_number": 1, "level": 1},
            {"title": "1. Introduction", "page_number": 1, "level": 1},
            {"title": "2. Related Work", "page_number": 3, "level": 1},
            {"title": "2.1 Previous Approaches", "page_number": 3, "level": 2},
            {"title": "2.2 Current State of Art", "page_number": 4, "level": 2},
            {"title": "3. Methodology", "page_number": 5, "level": 1},
            {"title": "3.1 Problem Formulation", "page_number": 5, "level": 2},
            {"title": "3.2 Proposed Approach", "page_number": 6, "level": 2},
            {"title": "4. Experiments", "page_number": 8, "level": 1},
            {"title": "4.1 Experimental Setup", "page_number": 8, "level": 2},
            {"title": "4.2 Results", "page_number": 9, "level": 2},
            {"title": "5. Discussion", "page_number": 11, "level": 1},
            {"title": "6. Conclusion", "page_number": 12, "level": 1},
            {"title": "References", "page_number": 13, "level": 1}
        ]
        
        state["results"]["sections"] = sections
        return state


class PaperReferencesWorkflow:
    """Workflow for extracting references"""
    
    def __init__(self, llm_manager: LLMManager):
        self.llm_manager = llm_manager
        self.llm = llm_manager.get_llm()
        
    def create_graph(self) -> StateGraph:
        """Create the references extraction workflow graph"""
        workflow = StateGraph(WorkflowState)
        
        # Add nodes
        workflow.add_node("extract_references", self.extract_references)
        
        # Add edges
        workflow.add_edge("extract_references", END)
        
        # Set entry point
        workflow.set_entry_point("extract_references")
        
        return workflow.compile()
    
    def extract_references(self, state: WorkflowState) -> Dict[str, Any]:
        """Extract references from paper"""
        # In a real implementation, this would parse the PDF references section
        # For now, return sample references
        references = [
            {
                "id": "ref1",
                "title": "Attention Is All You Need",
                "authors": ["Vaswani, A.", "Shazeer, N.", "Parmar, N."],
                "year": 2017,
                "venue": "NeurIPS",
                "doi": "10.5555/3295222.3295349"
            },
            {
                "id": "ref2",
                "title": "BERT: Pre-training of Deep Bidirectional Transformers",
                "authors": ["Devlin, J.", "Chang, M.W.", "Lee, K.", "Toutanova, K."],
                "year": 2019,
                "venue": "NAACL",
                "doi": "10.18653/v1/N19-1423"
            },
            {
                "id": "ref3",
                "title": "Language Models are Few-Shot Learners",
                "authors": ["Brown, T.", "Mann, B.", "Ryder, N."],
                "year": 2020,
                "venue": "NeurIPS",
                "doi": "10.5555/3495724.3495883"
            }
        ]
        
        state["results"]["references"] = references
        return state