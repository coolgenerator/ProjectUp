"""
Routing Prompts
Centralized prompts for query complexity analysis and smart routing
"""

from typing import Optional, List, Dict


class RoutingPrompts:
    """Prompt templates for analyzing query complexity and routing decisions"""

    @staticmethod
    def get_complexity_analysis_prompt(
        query: str,
        node_title: Optional[str] = None,
        project_id: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """
        Generate prompt for analyzing query complexity using LLM

        Args:
            query: User's question/request
            node_title: Current node title for context
            project_id: Project ID for context
            conversation_history: Recent conversation messages

        Returns:
            Formatted prompt for complexity analysis
        """
        # Build conversation context
        conv_context = ""
        if conversation_history and len(conversation_history) > 0:
            recent = conversation_history[-3:]  # Last 3 messages
            conv_context = "\n".join([
                f"{msg.get('role', 'unknown')}: {msg.get('content', '')[:100]}"
                for msg in recent
            ])

        return f"""Analyze this user query and classify its complexity:

Query: "{query}"

Recent Conversation:
{conv_context if conv_context else "No previous conversation"}

Current Context:
- Node: {node_title or 'N/A'}
- Project: {project_id or 'N/A'}

Classify the query complexity as one of:
1. **simple**: Direct factual questions, basic lookups, simple clarifications
   - Example: "What is the project status?"
   - Time: ~5 seconds

2. **moderate**: Requires some analysis, tool use, or synthesis
   - Example: "How can I improve the performance?"
   - Time: ~10 seconds

3. **complex**: Multi-step reasoning, planning, or detailed analysis
   - Example: "Create a implementation plan with timeline and resources"
   - Time: ~20 seconds

4. **critical**: Requires reflection, validation, and highest quality
   - Example: "Analyze all approaches and recommend the best strategy"
   - Time: ~30 seconds

Consider:
- Is it a single question or multiple steps?
- Does it require research, analysis, or planning?
- Does the user explicitly request thoroughness?
- Is this a critical decision point?

Respond in JSON format:
{{
  "complexity": "simple" | "moderate" | "complex" | "critical",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of why this complexity",
  "estimated_time": seconds,
  "requires_tools": true/false,
  "suggested_workflow": "workflow name" or null,
  "recommended_mode": "quick" or "deep"
}}"""
