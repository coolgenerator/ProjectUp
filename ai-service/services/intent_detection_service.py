"""
Intent Detection Service
Analyzes user queries to determine complexity and appropriate processing approach
"""

import logging
from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel
from services.llm.vertex_ai_service import vertex_ai_service
from prompts.routing_prompts import RoutingPrompts
import json
import re

logger = logging.getLogger(__name__)


class QueryComplexity(str, Enum):
    """Query complexity levels"""
    SIMPLE = "simple"           # Direct Q&A, factual questions
    MODERATE = "moderate"       # Requires some analysis or tools
    COMPLEX = "complex"         # Multi-step reasoning needed
    CRITICAL = "critical"       # Needs reflection and high quality


class IntentAnalysis(BaseModel):
    """Result of intent analysis"""
    complexity: QueryComplexity
    confidence: float  # 0.0 to 1.0
    reasoning: str
    suggested_workflow: Optional[str] = None
    estimated_time: int  # seconds
    requires_tools: bool = False
    recommended_mode: str  # "quick" or "deep"


class IntentDetectionService:
    """Analyze user queries to determine processing approach"""

    # Complexity signal keywords
    SIMPLE_SIGNALS = [
        'what is', 'what are', 'when', 'where', 'who',
        'is', 'are', 'show', 'list', 'display',
        'tell me', 'explain briefly'
    ]

    MODERATE_SIGNALS = [
        'how', 'why', 'compare', 'find', 'search',
        'suggest', 'recommend', 'summarize'
    ]

    COMPLEX_SIGNALS = [
        'analyze', 'evaluate', 'assess', 'review',
        'create plan', 'design', 'develop strategy',
        'research', 'investigate', 'explore'
    ]

    CRITICAL_SIGNALS = [
        'comprehensive', 'detailed analysis', 'thorough',
        'strategic', 'complete', 'in-depth',
        'critical decision', 'important'
    ]

    # Multi-part query indicators
    MULTI_PART_INDICATORS = [
        ' and then ', ' after that ', ' followed by ',
        ' also ', ' additionally ', ' furthermore '
    ]

    def __init__(self):
        self.llm_service = vertex_ai_service

    async def analyze_query(
        self,
        query: str,
        context: Dict[str, Any],
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> IntentAnalysis:
        """
        Analyze query complexity using hybrid approach

        Args:
            query: User's question/request
            context: Current node and project context
            conversation_history: Recent conversation for context

        Returns:
            IntentAnalysis with complexity and recommendations
        """
        try:
            # Quick keyword-based classification
            keyword_complexity = self._keyword_classify(query)

            # Check for quality requirements
            requires_high_quality = self._check_quality_requirements(query)

            # Check for multi-step query
            is_multi_step = self._is_multi_step_query(query)

            # Check if query length/depth suggests complexity
            is_lengthy = len(query) > 200 or query.count('\n') > 3

            # Heuristic decision
            if requires_high_quality or is_multi_step or is_lengthy:
                # Use LLM for more accurate classification
                return await self._llm_classify(query, context, conversation_history)

            # Simple heuristic result
            complexity = keyword_complexity
            estimated_time = self._estimate_time(complexity)

            return IntentAnalysis(
                complexity=complexity,
                confidence=0.75,
                reasoning=f"Keyword-based classification: {complexity.value} query",
                suggested_workflow=None,
                estimated_time=estimated_time,
                requires_tools=complexity in [QueryComplexity.MODERATE, QueryComplexity.COMPLEX],
                recommended_mode="quick" if complexity == QueryComplexity.SIMPLE else "deep"
            )

        except Exception as e:
            logger.error(f"Error in intent detection: {e}")
            # Default to simple on error
            return IntentAnalysis(
                complexity=QueryComplexity.SIMPLE,
                confidence=0.5,
                reasoning=f"Error in analysis, defaulting to simple: {str(e)}",
                estimated_time=5,
                requires_tools=False,
                recommended_mode="quick"
            )

    def _keyword_classify(self, query: str) -> QueryComplexity:
        """Quick keyword-based classification"""
        query_lower = query.lower()

        # Count signals for each complexity level
        simple_count = sum(1 for signal in self.SIMPLE_SIGNALS if signal in query_lower)
        moderate_count = sum(1 for signal in self.MODERATE_SIGNALS if signal in query_lower)
        complex_count = sum(1 for signal in self.COMPLEX_SIGNALS if signal in query_lower)
        critical_count = sum(1 for signal in self.CRITICAL_SIGNALS if signal in query_lower)

        # Determine complexity based on signal counts
        if critical_count > 0:
            return QueryComplexity.CRITICAL
        elif complex_count > 0:
            return QueryComplexity.COMPLEX
        elif moderate_count > simple_count:
            return QueryComplexity.MODERATE
        else:
            return QueryComplexity.SIMPLE

    def _check_quality_requirements(self, query: str) -> bool:
        """Check if query explicitly requests high quality"""
        query_lower = query.lower()
        quality_keywords = [
            'thorough', 'comprehensive', 'detailed', 'complete',
            'accurate', 'precise', 'critical', 'important',
            'carefully', 'in-depth', 'extensive'
        ]
        return any(keyword in query_lower for keyword in quality_keywords)

    def _is_multi_step_query(self, query: str) -> bool:
        """Check if query requires multiple steps"""
        query_lower = query.lower()

        # Check for multi-part indicators
        has_indicators = any(indicator in query_lower for indicator in self.MULTI_PART_INDICATORS)

        # Check for multiple questions
        question_count = query.count('?')

        # Check for numbered lists
        has_numbered_list = bool(re.search(r'\d+\.\s+', query))

        # Check for multiple clauses
        clause_count = query.count(',') + query.count(';')

        return has_indicators or question_count > 1 or has_numbered_list or clause_count > 4

    async def _llm_classify(
        self,
        query: str,
        context: Dict[str, Any],
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> IntentAnalysis:
        """Use LLM for more accurate complexity classification"""

        # Build prompt using centralized prompt template
        prompt = RoutingPrompts.get_complexity_analysis_prompt(
            query=query,
            node_title=context.get('node_title'),
            project_id=context.get('project_id'),
            conversation_history=conversation_history
        )

        try:
            response = await self.llm_service.generate_text(
                prompt=prompt,
                temperature=0.1,  # Low temperature for consistent classification
                max_output_tokens=300
            )

            # Extract JSON from response
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())

                return IntentAnalysis(
                    complexity=QueryComplexity(result.get('complexity', 'simple')),
                    confidence=result.get('confidence', 0.8),
                    reasoning=result.get('reasoning', 'LLM classification'),
                    suggested_workflow=result.get('suggested_workflow'),
                    estimated_time=result.get('estimated_time', 10),
                    requires_tools=result.get('requires_tools', False),
                    recommended_mode=result.get('recommended_mode', 'quick')
                )

        except Exception as e:
            logger.error(f"Error in LLM classification: {e}")

        # Fallback to keyword classification
        return IntentAnalysis(
            complexity=self._keyword_classify(query),
            confidence=0.6,
            reasoning="LLM classification failed, using keyword fallback",
            estimated_time=10,
            requires_tools=True,
            recommended_mode="quick"
        )

    def _estimate_time(self, complexity: QueryComplexity) -> int:
        """Estimate response time in seconds based on complexity"""
        time_map = {
            QueryComplexity.SIMPLE: 5,
            QueryComplexity.MODERATE: 10,
            QueryComplexity.COMPLEX: 20,
            QueryComplexity.CRITICAL: 30
        }
        return time_map.get(complexity, 10)
