"""
Smart Router Service
Routes queries to appropriate processing pipeline based on complexity analysis
"""

import logging
from typing import Dict, Any, Optional, List
from services.intent_detection_service import IntentDetectionService, QueryComplexity, IntentAnalysis

logger = logging.getLogger(__name__)


class SmartRouterService:
    """Route queries to appropriate processing pipeline"""

    def __init__(self):
        self.intent_detector = IntentDetectionService()

    async def route_query(
        self,
        query: str,
        context: Dict[str, Any],
        conversation_history: Optional[List[Dict[str, str]]] = None,
        user_preference: str = "auto"  # auto, quick, deep
    ) -> Dict[str, Any]:
        """
        Analyze query and determine routing

        Args:
            query: User's question/request
            context: Current node and project context
            conversation_history: Recent conversation messages
            user_preference: User's preferred mode (auto, quick, deep)

        Returns:
            Routing decision with options or direct execution info
        """
        try:
            # Analyze intent
            analysis = await self.intent_detector.analyze_query(
                query=query,
                context=context,
                conversation_history=conversation_history
            )

            logger.info(f"Intent analysis: {analysis.complexity.value} (confidence: {analysis.confidence})")

            # User preference override
            if user_preference == "quick":
                return {
                    "route": "simple",
                    "mode": "quick",
                    "analysis": analysis.dict(),
                    "message": "Using quick mode as requested"
                }
            elif user_preference == "deep":
                return {
                    "route": "reflection",
                    "mode": "deep",
                    "analysis": analysis.dict(),
                    "message": "Using deep analysis mode as requested"
                }

            # Auto-routing based on complexity
            if analysis.complexity == QueryComplexity.SIMPLE:
                # Direct simple chat
                return {
                    "route": "simple",
                    "mode": "quick",
                    "analysis": analysis.dict(),
                    "message": "Simple query detected, using quick response"
                }

            elif analysis.complexity == QueryComplexity.MODERATE:
                # Simple chat with tools enabled
                return {
                    "route": "simple",
                    "mode": "quick",
                    "analysis": analysis.dict(),
                    "enable_tools": True,
                    "message": "Moderate complexity, using quick mode with tools"
                }

            elif analysis.complexity in [QueryComplexity.COMPLEX, QueryComplexity.CRITICAL]:
                # Offer user choice
                return {
                    "route": "user_choice_required",
                    "analysis": analysis.dict(),
                    "options": [
                        {
                            "mode": "quick",
                            "label": "Quick Answer",
                            "time": "~5 seconds",
                            "description": "Fast response with standard quality",
                            "icon": "zap"
                        },
                        {
                            "mode": "deep",
                            "label": "Deep Analysis",
                            "time": f"~{analysis.estimated_time} seconds",
                            "description": "Thorough analysis with reflection and validation",
                            "icon": "sparkles",
                            "recommended": True
                        }
                    ],
                    "message": f"Complex query detected. Choose your preferred mode."
                }

            # Default fallback
            return {
                "route": "simple",
                "mode": "quick",
                "analysis": analysis.dict(),
                "message": "Using default quick mode"
            }

        except Exception as e:
            logger.error(f"Error in smart routing: {e}")
            # Fallback to simple on error
            return {
                "route": "simple",
                "mode": "quick",
                "error": str(e),
                "message": "Error in routing, defaulting to quick mode"
            }

    def should_use_reflection(self, analysis: IntentAnalysis) -> bool:
        """Determine if reflection workflow should be used"""
        # Use reflection for critical queries or when confidence is low
        return (
            analysis.complexity == QueryComplexity.CRITICAL or
            (analysis.complexity == QueryComplexity.COMPLEX and analysis.confidence > 0.8)
        )

    def get_workflow_config(self, analysis: IntentAnalysis) -> Dict[str, Any]:
        """Get workflow configuration based on analysis"""
        config = {
            "max_iterations": 2,
            "quality_threshold": 0.8,
            "enable_tools": analysis.requires_tools
        }

        if analysis.complexity == QueryComplexity.CRITICAL:
            config["max_iterations"] = 3
            config["quality_threshold"] = 0.9

        return config
