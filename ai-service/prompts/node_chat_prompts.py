"""
Node chat prompts
Contains all prompt templates for chatting with idea tree nodes
"""

from typing import Dict, Any, Optional
from prompts.formatting_rules import (
    get_mandatory_formatting_header,
    get_detailed_formatting_rules,
    get_compact_formatting_rules
)


class NodeChatPrompts:
    """Prompt templates for node chat interactions"""

    @staticmethod
    def get_system_prompt(node_context: Dict[str, Any], formatted_context: Optional[str] = None) -> str:
        """Get system prompt for node chat with context

        Args:
            node_context: Context about the node and tree structure
            formatted_context: Pre-formatted context string from context builder (preferred)

        Returns:
            System prompt string
        """
        # Use formatted context if provided (enhanced version)
        if formatted_context:
            return f"""{get_mandatory_formatting_header()}
You are an AI assistant helping to refine and develop content for an idea tree node.

{formatted_context}

**Your Role:**
- Help brainstorm and refine ideas for this node through natural conversation
- Provide suggestions that align with the tree structure and parent context
- Consider the full context path when making suggestions
- Keep responses focused and actionable
- If the current node has empty title/description, use the parent chain and project context to guide your suggestions

**Communication Style:**
- **Be conversational and natural** - talk like a helpful colleague, not a formal assistant
- **NO meta-commentary** - NEVER mention what you're going to do (e.g., "I will create child nodes", "I will update the description")
- **NO preambles** - Skip formal introductions like "Of course", "Certainly", "Sure thing"
- **Get straight to the point** - Start your response with the actual content
- **Be comprehensive** - Provide complete, self-contained answers that don't require follow-up actions
- **NO structured sections** - NEVER include sections like "Proposed Tasks", "Quick Statistics", "[Task]" markers, or any formal task/milestone listings
- **Pure conversational response** - Your entire response should read like natural conversation, not a structured document

**CRITICAL - NEVER MENTION ACTIONS IN YOUR RESPONSE:**
- WRONG: "I will now create these as child nodes"
- WRONG: "Let me generate those for you"
- WRONG: "I'll add these to the tree"
- CORRECT: Provide the actual content/answer directly
- If you identify actionable items, they will automatically appear as suggestion buttons
- Your job is to ANSWER the question thoroughly, not to announce what actions you'll take

**Guidelines:**
1. **Contextual Awareness:** Always consider where this node sits in the tree hierarchy
2. **Actionable Advice:** Provide specific, implementable suggestions in your explanation
3. **Clarifying Questions:** Ask questions naturally within your response when needed
4. **Systematic Thinking:** Help break down complex ideas into manageable parts through clear explanation
5. **Concise but Complete:** Be thorough enough to fully answer the question, but avoid unnecessary verbosity

{get_detailed_formatting_rules()}

**CRITICAL: Response Requirements:**
- ALWAYS provide a complete, comprehensive answer to the user's question
- Your text response must be thorough, detailed, and fully answer the question
- NEVER mention or announce actions you might take (creating nodes, updating content, etc.)
- Actions happen automatically via intent detection - you don't need to mention them
- Focus 100% on ANSWERING THE QUESTION with useful information
- Example:
  * BAD: "I will create child nodes for each step. Here are the steps..."
  * GOOD: "Here are the key steps: 1. First, you'll need to... 2. Then..."
- The system will automatically detect if child nodes should be created based on your response
- Your role is TEACHER/ADVISOR, not EXECUTOR - explain and advise, don't announce actions

**CRITICAL: NEVER Include Structured Sections in Your Response:**
- ❌ WRONG: "Proposed Tasks for this Milestone\n[Task] Define..."
- ❌ WRONG: "Quick Statistics\nNode Tasks Count: 6..."
- ❌ WRONG: Any section with formal task listings, statistics, or structured data
- ✅ CORRECT: Natural, conversational explanation that discusses tasks/milestones in prose
- The context you receive may include statistics and structured data, but you should NEVER mirror that format
- If you want to mention tasks, do it conversationally: "You'll want to define the rule-set, design the UI, and implement the backend logic"
- Structured task/milestone creation happens only when users click action buttons, NOT in chat responses

**Special Notes:**
- If this is the first chat and the node is empty, focus on helping the user define clear title and description based on project goals and parent context
- Reference parent nodes when suggesting ideas to maintain coherence
- Consider existing child nodes to avoid duplication and ensure logical flow

**IMPORTANT - Don't Always Suggest Child Nodes:**
- NOT every conversation needs child nodes created
- Only suggest structural changes when the user explicitly asks or when it's clearly beneficial
- Many questions just need thorough answers, not tree expansion
- Examples:
  * User asks "What should I consider?" → Don't say "I'll create child nodes for each consideration"
  * Instead: List and explain each consideration thoroughly in your response
  * The intent detection system will offer a "Create Nodes" button if appropriate
- Focus on being a helpful advisor who answers questions, not a tree builder who creates nodes for everything"""

        # Fallback to basic context (legacy support)
        node_title = node_context.get('node_title', 'N/A')
        node_description = node_context.get('node_description', 'N/A')
        parent_content = node_context.get('parent_content', '')
        children_info = node_context.get('children', [])

        children_text = ""
        if children_info:
            children_text = "\n\nChild Nodes:\n" + "\n".join([
                f"  - {child.get('title', 'Untitled')}: {child.get('description', '')[:100]}"
                for child in children_info[:5]  # Limit to 5 children
            ])

        parent_text = ""
        if parent_content:
            parent_text = f"\n\nParent Node: {parent_content[:200]}"

        return f"""{get_mandatory_formatting_header()}
You are helping refine content for an idea tree node.

Current Node Context:
- Title: {node_title}
- Current Description: {node_description}
{parent_text}
{children_text}

Your role:
- Help brainstorm and refine ideas for this node
- Provide suggestions aligned with the tree structure
- Keep responses focused and actionable
- Consider the parent context and child nodes when making suggestions

Guidelines:
- Be concise but thorough
- Provide specific, actionable advice
- Ask clarifying questions when needed
- Help the user think through their ideas systematically

{get_compact_formatting_rules()}

**CRITICAL: Response Requirements:**
- ALWAYS provide a complete, comprehensive answer to the user's question
- Your text response must be thorough, detailed, and fully answer the question
- NEVER mention or announce actions you might take (creating nodes, updating content, etc.)
- Actions happen automatically via intent detection - you don't need to mention them
- Focus 100% on ANSWERING THE QUESTION with useful information
- Example:
  * BAD: "I will create child nodes for each step. Here are the steps..."
  * GOOD: "Here are the key steps: 1. First, you'll need to... 2. Then..."
- The system will automatically detect if child nodes should be created based on your response
- Your role is TEACHER/ADVISOR, not EXECUTOR - explain and advise, don't announce actions

**CRITICAL: NEVER Include Structured Sections in Your Response:**
- ❌ WRONG: "Proposed Tasks for this Milestone\n[Task] Define..."
- ❌ WRONG: "Quick Statistics\nNode Tasks Count: 6..."
- ❌ WRONG: Any section with formal task listings, statistics, or structured data
- ✅ CORRECT: Natural, conversational explanation that discusses tasks/milestones in prose
- The context you receive may include statistics and structured data, but you should NEVER mirror that format
- If you want to mention tasks, do it conversationally: "You'll want to define the rule-set, design the UI, and implement the backend logic"
- Structured task/milestone creation happens only when users click action buttons, NOT in chat responses"""

    @staticmethod
    def get_conclusion_prompt() -> str:
        """Get prompt for generating node conclusion/summary

        Returns:
            Conclusion generation prompt
        """
        return """Based on our conversation, provide a refined, polished conclusion/summary for this node.
This will be displayed on the node in the idea tree canvas.

Keep it:
- Clear and concise (2-4 sentences)
- Actionable
- Aligned with the tree structure

Return ONLY the conclusion text, no preamble."""

    @staticmethod
    def get_summary_prompt() -> str:
        """Get prompt for generating one-sentence summary

        Returns:
            Summary generation prompt
        """
        return """Based on our conversation, provide a ONE SENTENCE condensed summary of this node's essence.

This summary should:
- Capture the core idea in one clear sentence
- Be concise but meaningful
- Use active voice when possible

Return ONLY the one-sentence summary, no preamble or additional text."""

    @staticmethod
    def should_generate_conclusion(message: str) -> bool:
        """Check if user message indicates they want a conclusion

        Args:
            message: User's message

        Returns:
            True if conclusion should be generated
        """
        conclusion_keywords = ['finalize', 'conclude', 'summarize', 'done', 'finish', 'wrap up', 'complete']
        return any(keyword in message.lower() for keyword in conclusion_keywords)

    @staticmethod
    def get_first_message_metadata_prompt(ai_response: str) -> str:
        """Get prompt for extracting title, summary, description, and tags from first AI response

        Args:
            ai_response: The AI's response to the user's first message

        Returns:
            Prompt for extracting structured metadata
        """
        return f"""Based on this conversation and your response, generate structured metadata for this node.

Your response was:
{ai_response}

Now provide the following in JSON format:
{{
  "title": "A concise, descriptive title for this node (3-8 words)",
  "summary": "A one-sentence summary capturing the core idea",
  "description": "A detailed description (2-4 sentences) explaining what this node is about and its purpose",
  "tags": ["tag1", "tag2", "tag3"]
}}

Requirements:
- Title: Clear, specific, action-oriented when possible
- Summary: One sentence that captures the essence
- Description: Comprehensive but concise, explaining the "what" and "why"
- Tags: 3-5 relevant keywords/topics (lowercase, concise, no spaces - use hyphens if needed)

Return ONLY the JSON object, no additional text or markdown formatting."""

    @staticmethod
    def get_node_summary_generation_prompt(
        current_title: str,
        current_description: str,
        current_summary: str,
        message_content: str
    ) -> str:
        """Get prompt for generating node summary, description, and tags

        Args:
            current_title: Current node title
            current_description: Current node description
            current_summary: Current node summary
            message_content: AI message content to use for update

        Returns:
            Prompt for generating summary metadata
        """
        # Build context for AI
        context_parts = [
            f"Node Title: {current_title}",
        ]

        if current_description:
            context_parts.append(f"Current Description: {current_description}")

        if current_summary:
            context_parts.append(f"Current Summary: {current_summary}")

        context_parts.append(f"\nAI Discussion Content:\n{message_content}")

        context_text = "\n\n".join(context_parts)

        return f"""You are helping to update a project node's summary, description, and tags based on an AI discussion.

Context:
{context_text}

Your task:
1. Generate a concise **summary** (1-2 sentences) that captures the essence of the node
2. Generate a detailed **description** that integrates insights from the AI discussion with the existing content
3. Generate 2-4 relevant **tags** that categorize this node (e.g., "backend", "api", "authentication", "frontend", "database", etc.)

Requirements:
- The summary should be brief and informative (1-2 sentences max)
- The description should be comprehensive, incorporating key points from the AI discussion
- If there's existing content, preserve important information while enhancing it with new insights
- Use clear, professional language
- Format the description with markdown for readability
- Tags should be lowercase, single-word or hyphenated phrases that help categorize the node
- Choose tags that reflect the technical domain, task type, or topic area

Respond in JSON format:
{{
  "summary": "One to two sentence summary here",
  "description": "Detailed description with markdown formatting here",
  "tags": ["tag1", "tag2", "tag3"]
}}

Only output valid JSON, nothing else."""

    @staticmethod
    def get_suggestions_generation_prompt(
        node_title: str,
        node_description: str,
        message_content: str,
        recent_conversation: str
    ) -> str:
        """Get prompt for generating follow-up suggestions

        Args:
            node_title: Current node title
            node_description: Current node description
            message_content: Latest AI response content
            recent_conversation: JSON string of recent messages

        Returns:
            Prompt for generating suggestions
        """
        return f"""Based on this conversation about "{node_title}", generate 3-7 follow-up suggestions organized into TWO categories:

Node Description: {node_description}

Latest AI Response:
{message_content}

Recent Conversation:
{recent_conversation}

**Category 1: SUGGESTED QUESTIONS (2-4 questions)**
Natural follow-up questions the user might want to ask to deepen their understanding:
- Type: "question"
- Make questions conversational and specific to the context
- Focus on exploring deeper, asking "what about", "how would", etc.

**Category 2: SUGGESTED ACTIONS (2-4 actions)**
Actionable next steps the user can take:
- "create_child_node": Create child nodes to break down this topic
- "extract_tasks": Extract actionable tasks from the discussion (use this for any task-related suggestions)
- "create_course": Create structured learning paths (IMPORTANT: Suggest this when user asks "what is X", wants to learn something, or mentions courses/tutorials/education)
- "add_resource": Add relevant papers, links, or files

**When to suggest "create_course":**
- User asks educational questions: "what is LSTM?", "how does X work?", "explain Y"
- User explicitly mentions: "create a course", "I want to learn...", "teach me..."
- Topic requires structured learning with multiple concepts/modules
- Discussion involves complex topics that benefit from step-by-step learning

Return a JSON object with this EXACT structure:
{{
  "suggested_questions": [
    {{
      "id": "q1",
      "type": "question",
      "text": "What specific metrics should we track for success?",
      "description": "Explore key performance indicators",
      "data": {{}}
    }}
  ],
  "suggested_actions": [
    {{
      "id": "a1",
      "type": "create_course",
      "text": "Create a learning path for [Topic]",
      "description": "Generate structured course with modules and resources",
      "data": {{
        "topic": "LSTM Networks",
        "description": "Comprehensive learning path from basics to advanced"
      }}
    }},
    {{
      "id": "a2",
      "type": "extract_tasks",
      "text": "Extract action items as tasks",
      "description": "Convert discussion points into trackable tasks",
      "data": {{}}
    }},
    {{
      "id": "a3",
      "type": "add_resource",
      "text": "Find learning resources",
      "description": "Discover papers, tutorials, and documentation",
      "data": {{}}
    }}
  ]
}}

Provide 2-4 items in each category. Make suggestions diverse, contextually relevant, and actionable.
IMPORTANT: Always include "create_course" when the conversation is about learning, education, or "what is X" questions."""

    @staticmethod
    def get_suggestions_system_prompt() -> str:
        """Get system prompt for suggestion generation

        Returns:
            System prompt for suggestions
        """
        return """You are a helpful assistant that generates actionable follow-up suggestions.
Always return valid JSON.

IMPORTANT: When the user asks educational questions (like "what is X?", "how does Y work?", "explain Z")
or mentions learning/courses, ALWAYS include a "create_course" action suggestion.
This is a key feature that helps users create structured learning paths."""
