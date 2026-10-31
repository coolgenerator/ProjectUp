"""
Prompt templates for paper analysis
"""

from prompts.formatting_rules import (
    get_mandatory_formatting_header,
    get_compact_formatting_rules
)


def get_outline_generation_prompt(text: str) -> str:
    """
    Generate prompt for extracting paper outline.

    Args:
        text: Extracted text from PDF with page markers

    Returns:
        Formatted prompt for LLM
    """
    return f"""You are analyzing a research paper. Extract a clear, hierarchical outline structure from this paper.

EXTRACTION RULES:
1. Identify ALL major sections as level 1 (Abstract, Introduction, Methods, Results, Discussion, Conclusion, etc.)
2. Identify subsections as level 2 (numbered like "2.1" or "2.2", or unnumbered subsections)
3. Identify sub-subsections as level 3 if they exist
4. Use the "--- Page N ---" markers to determine the EXACT page number for each section
5. Clean up section titles: remove numbering like "2.", "3.1", etc. from the title itself
6. For each section, write a concise 1-2 sentence description of what it covers

FORMATTING RULES:
- Level 1 sections: Main sections (NO numbers in title, just clean names like "Introduction", "Methods")
- Level 2 sections: Subsections (clean names like "Data Collection", "Experimental Setup")
- Level 3 sections: Sub-subsections if they exist

CONSISTENCY REQUIREMENTS:
- ALL sections at the same level should have the same formatting
- Remove section numbers from titles (store them in description if needed)
- Use consistent capitalization (Title Case for section names)
- Each section MUST have a meaningful description based on actual content

Example of GOOD structure:
[
  {{
    "title": "Abstract",
    "page_number": 1,
    "level": 1,
    "description": "Provides a brief summary of the MIMIC-IV dataset, describing it as a publicly available electronic health record database for intensive care research.",
    "subsections": []
  }},
  {{
    "title": "Background",
    "page_number": 1,
    "level": 1,
    "description": "Discusses the value and challenges of using routinely collected clinical data for research, and situates MIMIC-IV in the context of previous MIMIC versions.",
    "subsections": [
      {{
        "title": "Previous MIMIC Versions",
        "page_number": 1,
        "level": 2,
        "description": "Reviews MIMIC-II and MIMIC-III databases and their contributions to critical care research.",
        "subsections": []
      }}
    ]
  }},
  {{
    "title": "Methods",
    "page_number": 2,
    "level": 1,
    "description": "Details the process of creating the MIMIC-IV database, including data acquisition, de-identification, and quality control procedures.",
    "subsections": [
      {{
        "title": "Data Acquisition",
        "page_number": 2,
        "level": 2,
        "description": "Describes how clinical data was extracted from hospital information systems and prepared for inclusion in the database.",
        "subsections": []
      }},
      {{
        "title": "De-identification Process",
        "page_number": 2,
        "level": 2,
        "description": "Explains the HIPAA-compliant de-identification procedures applied to protect patient privacy.",
        "subsections": []
      }}
    ]
  }}
]

Here is the text from the paper with page markers:

{text}

Respond ONLY with the JSON array containing the complete outline structure. NO additional text.
"""


def get_references_extraction_prompt(text: str) -> str:
    """
    Generate prompt for extracting references from paper.

    Args:
        text: Extracted text from references section

    Returns:
        Formatted prompt for LLM
    """
    return f"""Extract ALL references from this paper's reference section into compact JSON format.

For each reference extract: id, title, authors (array), year, venue. Use null for missing fields.

Example format:
[{{"id":"1","title":"Paper Title","authors":["A Smith","B Jones"],"year":2020,"venue":"Conference Name","doi":null,"url":null}}]

CRITICAL INSTRUCTIONS:
- You MUST extract ALL references - if there are 64 references, return all 64
- Use compact JSON (no extra whitespace)
- Abbreviated author names are fine (use exactly as written in reference)
- Keep venue names short but recognizable
- Always close the JSON array properly with ]
- If you reach token limit, still close the array properly

References text:
{text}

Respond with ONLY the complete JSON array containing ALL references:"""


def get_chat_prompt(message: str, text: str, context: str = None) -> str:
    """
    Generate prompt for chatting with paper.

    Args:
        message: User's question
        text: Extracted text from PDF
        context: Optional selected text context

    Returns:
        Formatted prompt for LLM
    """
    context_section = f"\n\nSelected text context:\n{context}" if context else ""

    return f"""{get_mandatory_formatting_header()}
You are a helpful AI research assistant analyzing a research paper.

The user has asked: {message}{context_section}

Based on the paper content below, provide a direct, concise, and accurate response.
Do not use filler phrases like "Okay", "Sure", "I've analyzed", or "Here's a summary".
Start directly with the answer.
If the question asks about specific sections, cite page numbers when relevant.
If you're not certain about something, acknowledge the limitation.

{get_compact_formatting_rules()}

Paper content (first 20 pages):
{text}

Provide a direct answer:"""


def get_routing_prompt(question: str, context: str = None) -> str:
    """
    Generate prompt for routing decisions (needs paper vs general knowledge)

    Args:
        question: The user's question
        context: Optional selected text context

    Returns:
        Formatted routing prompt
    """
    context_info = f"\nSelected Context: {context}" if context else "\nSelected Context: None"

    return f"""Analyze this question about a research paper and determine if we need to read the full paper text to answer it.

Question: {question}{context_info}

Respond with ONLY a JSON object in this exact format:
{{
    "needs_paper": true/false,
    "reason": "brief explanation"
}}

Guidelines:
- Set needs_paper=false for: general methodology questions, common concepts, research advice, general academic questions
- Set needs_paper=true for: specific results, detailed methods, data analysis, figures/tables, questions about "this paper"
- If context is provided and relevant, set needs_paper=false
- If question mentions "this paper", "the authors", "their results", set needs_paper=true

Examples:
- "What is a convolutional neural network?" -> needs_paper=false (general concept)
- "What were the main findings?" -> needs_paper=true (specific to this paper)
- "How does backpropagation work?" -> needs_paper=false (general concept)
- "What dataset did they use?" -> needs_paper=true (specific to this paper)
- "Can you explain the methodology in section 3?" -> needs_paper=true (specific section)
"""


def get_general_answer_prompt(question: str, context: str = None) -> str:
    """
    Generate prompt for answering general questions without the full paper

    Args:
        question: The user's question
        context: Optional selected text context

    Returns:
        Formatted answer prompt
    """
    context_info = f"\n\nUser's selected context from paper:\n{context}" if context else ""

    return f"""{get_mandatory_formatting_header()}
You are an expert AI research assistant. Answer this question about academic research:

Question: {question}{context_info}

Provide a clear, detailed, and helpful answer. Since this is a general question, you can draw from your knowledge of research methodology, common practices, and academic concepts. Be professional and academic in tone.

If the question requires specific information from a particular paper that you don't have, politely explain that you'd need to read the paper to provide those specific details.

{get_compact_formatting_rules()}
"""


def get_paper_specific_answer_prompt(question: str, paper_text: str, context: str = None) -> str:
    """
    Generate prompt for answering questions that require reading the full paper

    Args:
        question: The user's question
        paper_text: Full extracted paper text
        context: Optional selected text context

    Returns:
        Formatted answer prompt
    """
    context_info = f"\n\nUser's selected text context:\n{context}" if context else ""

    return f"""{get_mandatory_formatting_header()}
You are an AI assistant helping a researcher understand a research paper.

Full Paper Content:
{paper_text}
{context_info}

User Question: {question}

Based on the paper content above, provide a detailed and helpful answer. Reference specific sections, results, or findings from the paper when relevant. Be academic but accessible in tone.

{get_compact_formatting_rules()}
"""


def get_title_generation_prompt(node_content: str, node_description: str = None) -> str:
    """
    Generate prompt for creating a tree title.

    Args:
        node_content: Content of the first node
        node_description: Optional description of the node

    Returns:
        Formatted prompt for LLM
    """
    description_part = f"\nDescription: {node_description}" if node_description else ""

    return f"""You are helping to generate a concise, descriptive title based on the following content.

Content: {node_content}{description_part}

Generate a short, clear title (2-5 words) that captures the essence of this topic. The title should be:
- Concise and memorable
- Descriptive of the main topic/theme
- Suitable for a brainstorming session or project
- In title case

Examples of good titles:
- "MVP Features"
- "Marketing Strategy 2024"
- "Product Redesign Ideas"
- "Technical Architecture"
- "User Onboarding Flow"

Respond with ONLY the title, nothing else."""


def get_chat_title_generation_prompt(user_message: str, ai_response: str) -> str:
    """
    Generate prompt for creating a chat session title based on conversation content.

    Args:
        user_message: The user's first message
        ai_response: The AI's first response

    Returns:
        Formatted prompt for LLM
    """
    return f"""You are helping to generate a concise, descriptive title for a chat conversation about a research paper.

User's First Question: {user_message}

AI's Response Summary: {ai_response[:500]}...

Generate a short, clear title (3-6 words max) that captures the main topic of this conversation. The title should be:
- Highly concise and specific
- Descriptive of what was discussed
- Professional and academic in tone
- In title case

Examples of good titles:
- "CNN Architecture Explanation"
- "Dataset Preprocessing Methods"
- "Key Paper Findings"
- "Methodology Overview"
- "Transformer Attention Mechanism"
- "Results and Limitations"

Respond with ONLY the title, nothing else."""
