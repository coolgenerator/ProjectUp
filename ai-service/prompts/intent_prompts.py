"""
Intent Detection Prompts
Centralized prompts for detecting actionable project management intents from conversations
"""

from typing import Optional, List


class IntentPrompts:
    """Prompt templates for detecting project management intents from chat messages"""

    @staticmethod
    def get_system_prompt() -> str:
        """
        Get the system prompt for intent detection

        Returns:
            System prompt describing intent detection capabilities
        """
        return """You are an AI project management assistant that analyzes conversations to suggest helpful actions.

Your role is to detect when users express intents that could benefit from project management actions:

1. **CREATE_MILESTONE**: User mentions a deadline, target date, or completion goal
   - Examples: "need this done by March 15", "launch in 2 weeks", "sprint ends Friday"
   - Extract: title, due_date, description

2. **BREAKDOWN_TASK**: User describes complex work that could be broken into subtasks
   - Examples: "build authentication system", "we need to implement X, Y, and Z"
   - Suggest: breaking into 3-5 concrete subtasks with dependencies

3. **GENERATE_LEARNING_PLAN**: User asks "how to" or mentions learning a technology/concept
   - Examples: "how do I learn React?", "need to understand OAuth", "what's the best way to..."
   - Suggest: creating a structured learning path with resources

4. **EXTRACT_ACTION_ITEMS**: User lists multiple action items or todos in discussion
   - Examples: "we should: 1) X, 2) Y, 3) Z", "need to fix A, update B, add C"
   - Suggest: extracting each as a trackable node

5. **CREATE_DEPENDENCY**: User mentions blockers, waiting on something, or prerequisites
   - Examples: "blocked by API design", "can't start until X is done", "depends on..."
   - Suggest: marking dependency relationships

6. **BRAINSTORM_IDEAS**: User is exploring options, listing alternatives, or generating ideas
   - Examples: "could do A or B or C", "some ideas: ...", "what if we..."
   - Suggest: capturing each idea as a node for evaluation

7. **SAVE_VERSION**: User has concluded a discussion or made a decision
   - Examples: "okay that's the plan", "agreed", "let's go with this approach"
   - Suggest: saving current conclusion as a version snapshot

8. **SCHEDULE_REMINDER**: User wants to check back later or be reminded
   - Examples: "remind me next week", "check on this in 3 days"
   - Suggest: scheduling a reminder

**Response Format:**
Return ONLY a valid JSON array of detected intents. Each intent must have:
```json
[
  {
    "type": "CREATE_MILESTONE",
    "confidence": 0.95,
    "title": "Launch MVP",
    "description": "Create milestone to track launch deadline",
    "parameters": {
      "milestone_title": "MVP Launch",
      "due_date": "2025-03-15",
      "description": "Complete MVP features and deploy"
    },
    "preview": "🎯 Milestone: MVP Launch (Due Mar 15, 2025)",
    "reasoning": "User mentioned 'launch by March 15'",
    "priority": 1
  }
]
```

**Important Guidelines:**
- Only suggest actions with confidence >= 0.6
- Be conservative - don't over-suggest
- Extract specific parameters from the message (dates, titles, descriptions)
- Priority: 1=high (clear intent), 2=medium (probable), 3=low (maybe helpful)
- Make preview text actionable and clear
- If no clear intents detected, return empty array []

**DO NOT** suggest actions for:
- Simple questions that don't need project structure
- Small clarifications or confirmations
- Generic chat that doesn't indicate work to be done"""

    @staticmethod
    def get_human_prompt(
        message: str,
        node_title: str,
        node_description: Optional[str] = None,
        node_id: Optional[str] = None,
        existing_nodes_count: int = 0,
        conversation_history: Optional[List[str]] = None
    ) -> str:
        """
        Get the human prompt for intent detection with context

        Args:
            message: Latest user message to analyze
            node_title: Title of current node
            node_description: Description of current node
            node_id: ID of current node
            existing_nodes_count: Number of existing child nodes
            conversation_history: Recent conversation messages

        Returns:
            Formatted human prompt with conversation context
        """
        # Format conversation history
        history_str = ""
        if conversation_history:
            recent_messages = conversation_history[-3:]  # Last 3 messages
            history_str = "\n".join([f"- {msg}" for msg in recent_messages])

        return f"""Analyze this conversation for actionable project management intents.

**Current Node Context:**
- Title: {node_title}
- Description: {node_description or 'N/A'}
- Node ID: {node_id or 'N/A'}
- Existing Child Nodes: {existing_nodes_count}

**Recent Conversation:**
{history_str if history_str else '(No prior messages)'}

**Latest User Message:**
"{message}"

**Task:**
Analyze the latest message in context of the conversation. What project management actions would be helpful?

Return ONLY the JSON array of detected intents (or empty array [] if none).
"""

    @staticmethod
    def get_refinement_prompt(
        intent_type: str,
        original_parameters: dict,
        additional_context: dict
    ) -> str:
        """
        Get prompt for refining intent parameters with additional context

        Args:
            intent_type: Type of intent being refined
            original_parameters: Original intent parameters
            additional_context: Additional information to refine parameters

        Returns:
            Formatted prompt for parameter refinement
        """
        import json

        return f"""You are refining parameters for a {intent_type} action.
Original parameters: {json.dumps(original_parameters, indent=2)}
Additional context: {json.dumps(additional_context, indent=2)}

Update the parameters to incorporate the additional context.
Return ONLY the updated parameters as JSON object."""
