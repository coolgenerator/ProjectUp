"""
Smart Paper Chat Workflow with Intelligent Routing
Routes questions to either read the full paper or answer directly based on question type
"""

from typing import Dict, Any, Literal, Optional
from langchain_google_vertexai import ChatVertexAI
from langgraph.graph import StateGraph, END
from typing_extensions import TypedDict
from config.settings import settings
from prompts.paper_prompts import (
    get_routing_prompt,
    get_general_answer_prompt,
    get_paper_specific_answer_prompt
)
import json


class SmartChatState(TypedDict):
    """State for smart paper chat workflow"""
    question: str
    paper_text: str
    context: Optional[str]
    needs_paper: bool
    response: str
    route_reason: str


class SmartPaperChatWorkflow:
    """
    Intelligent paper chat workflow that decides whether to read the paper
    based on the nature of the question.
    """

    def __init__(self):
        self.llm = ChatVertexAI(
            model_name="gemini-2.0-flash-exp",  # Fast model for routing
            project=settings.VERTEX_PROJECT_ID,
            location=settings.VERTEX_LOCATION,
            temperature=0.0,  # Deterministic routing
        )

        self.response_llm = ChatVertexAI(
            model_name="gemini-2.5-pro",  # Better model for responses
            project=settings.VERTEX_PROJECT_ID,
            location=settings.VERTEX_LOCATION,
            temperature=0.7,
            streaming=True,
        )

    def route_question(self, state: SmartChatState) -> SmartChatState:
        """
        Analyze the question and decide if we need to read the paper.

        Questions that DON'T need paper:
        - General methodology questions
        - Common academic concepts
        - General advice
        - Questions about research process

        Questions that NEED paper:
        - Specific results/findings
        - Detailed methods from THIS paper
        - Data analysis questions
        - Questions about figures/tables
        - Questions referencing "this paper"
        """

        prompt = get_routing_prompt(state['question'], state.get('context'))
        response = self.llm.invoke(prompt)

        # Parse JSON response
        try:
            # Extract JSON from response
            content = response.content.strip()
            # Remove markdown code blocks if present
            if content.startswith('```'):
                content = content.split('```')[1]
                if content.startswith('json'):
                    content = content[4:]
            content = content.strip()

            result = json.loads(content)
            state['needs_paper'] = result.get('needs_paper', True)
            state['route_reason'] = result.get('reason', 'Unknown')
        except Exception as e:
            # Default to reading paper if routing fails
            print(f"[Routing] Failed to parse routing decision: {e}")
            state['needs_paper'] = True
            state['route_reason'] = 'Routing failed, defaulting to full paper read'

        print(f"[Routing] Question: {state['question'][:50]}...")
        print(f"[Routing] Needs paper: {state['needs_paper']} - {state['route_reason']}")

        return state

    def answer_without_paper(self, state: SmartChatState) -> SmartChatState:
        """Answer general questions without reading the full paper"""

        prompt = get_general_answer_prompt(state['question'], state.get('context'))
        response = self.response_llm.invoke(prompt)
        state['response'] = response.content

        return state

    def answer_with_paper(self, state: SmartChatState) -> SmartChatState:
        """Answer questions that require reading the full paper"""

        prompt = get_paper_specific_answer_prompt(
            state['question'],
            state['paper_text'],
            state.get('context')
        )
        response = self.response_llm.invoke(prompt)
        state['response'] = response.content

        return state

    def should_read_paper(self, state: SmartChatState) -> Literal["read_paper", "skip_paper"]:
        """Conditional edge function for routing"""
        return "read_paper" if state['needs_paper'] else "skip_paper"

    def create_graph(self) -> StateGraph:
        """Create the smart chat workflow graph with routing"""

        workflow = StateGraph(SmartChatState)

        # Add nodes
        workflow.add_node("route", self.route_question)
        workflow.add_node("answer_without_paper", self.answer_without_paper)
        workflow.add_node("answer_with_paper", self.answer_with_paper)

        # Set entry point
        workflow.set_entry_point("route")

        # Add conditional routing
        workflow.add_conditional_edges(
            "route",
            self.should_read_paper,
            {
                "read_paper": "answer_with_paper",
                "skip_paper": "answer_without_paper"
            }
        )

        # Both answer nodes lead to END
        workflow.add_edge("answer_without_paper", END)
        workflow.add_edge("answer_with_paper", END)

        return workflow.compile()
