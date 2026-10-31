"""
LLM-based paper analysis services
"""

import json
from typing import List
from langchain_google_vertexai import ChatVertexAI
from config.settings import settings
from prompts.paper_prompts import (
    get_outline_generation_prompt,
    get_references_extraction_prompt,
    get_title_generation_prompt,
    get_chat_title_generation_prompt,
)


# Define Pydantic models for type safety
from pydantic import BaseModel
from typing import Optional


class OutlineSection(BaseModel):
    title: str
    page_number: int
    level: int
    description: Optional[str] = None
    subsections: Optional[List['OutlineSection']] = []


class Reference(BaseModel):
    id: str
    title: str
    authors: List[str]
    year: Optional[int] = None
    venue: Optional[str] = None
    doi: Optional[str] = None
    url: Optional[str] = None


def generate_outline_with_llm(text: str) -> List[OutlineSection]:
    """
    Use LLM to generate structured outline from PDF text.

    Args:
        text: Extracted text from PDF

    Returns:
        List of outline sections with hierarchy
    """
    # Use Gemini via Vertex AI
    llm = ChatVertexAI(
        model_name="gemini-2.5-pro",
        project=settings.VERTEX_PROJECT_ID,
        location=settings.VERTEX_LOCATION,
        temperature=0.1
    )

    # Get prompt from prompts module
    prompt = get_outline_generation_prompt(text)

    # Get LLM response
    response = llm.invoke(prompt)

    # Parse response
    try:
        # Extract JSON from response
        content = response.content
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]

        outline_data = json.loads(content.strip())

        # Convert to Pydantic models
        outline_sections = []
        for section_data in outline_data:
            section = OutlineSection(**section_data)
            outline_sections.append(section)

        return outline_sections
    except Exception as e:
        print(f"Error parsing outline: {e}")
        # Fallback: basic outline extraction
        return [
            OutlineSection(title="Abstract", page_number=1, level=1, subsections=[]),
            OutlineSection(title="Introduction", page_number=1, level=1, subsections=[]),
            OutlineSection(title="Methods", page_number=2, level=1, subsections=[]),
            OutlineSection(title="Results", page_number=3, level=1, subsections=[]),
            OutlineSection(title="Discussion", page_number=4, level=1, subsections=[]),
            OutlineSection(title="Conclusion", page_number=5, level=1, subsections=[]),
            OutlineSection(title="References", page_number=6, level=1, subsections=[]),
        ]


def generate_references_with_llm(text: str) -> List[Reference]:
    """
    Use LLM to extract references from PDF text with chunking for large lists.

    Args:
        text: Extracted text from references section

    Returns:
        List of references with metadata
    """
    print(f"[LLM] Starting reference extraction from {len(text)} characters of text")

    # Split references by common numbering patterns
    import re
    # Match patterns like [1], (1), 1., etc.
    ref_pattern = r'(?:^|\n)[\[\(]?\d+[\]\)]?\.?\s+'
    ref_splits = re.split(ref_pattern, text)
    ref_splits = [r.strip() for r in ref_splits if r.strip()]

    print(f"[LLM] Detected approximately {len(ref_splits)} individual references")

    # Process in chunks of ~20 references to stay within token limits
    chunk_size = 20
    all_references = []

    for chunk_idx in range(0, len(ref_splits), chunk_size):
        chunk = ref_splits[chunk_idx:chunk_idx + chunk_size]
        chunk_text = "\n\n".join([f"[{i+chunk_idx+1}] {ref}" for i, ref in enumerate(chunk)])

        print(f"[LLM] Processing chunk {chunk_idx//chunk_size + 1} (refs {chunk_idx+1}-{min(chunk_idx+chunk_size, len(ref_splits))})")

        # Use Gemini via Vertex AI
        llm = ChatVertexAI(
            model_name="gemini-2.5-pro",
            project=settings.VERTEX_PROJECT_ID,
            location=settings.VERTEX_LOCATION,
            temperature=0.1,
            max_output_tokens=8192
        )

        # Get prompt from prompts module
        prompt = get_references_extraction_prompt(chunk_text)

        # Get LLM response
        response = llm.invoke(prompt)

        # Parse response
        try:
            content = response.content
            print(f"[LLM Chunk {chunk_idx//chunk_size + 1}] Raw response length: {len(content)} characters")

            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]

            references_data = json.loads(content.strip())
            print(f"[LLM Chunk {chunk_idx//chunk_size + 1}] Parsed {len(references_data)} references")

            # Convert to Pydantic models
            for ref_data in references_data:
                reference = Reference(**ref_data)
                all_references.append(reference)

        except Exception as e:
            print(f"[LLM Chunk {chunk_idx//chunk_size + 1}] Error: {e}")
            print(f"[LLM Chunk {chunk_idx//chunk_size + 1}] Response preview: {response.content[:300]}")
            continue

    print(f"[LLM] Successfully created {len(all_references)} Reference objects total")
    return all_references


def generate_title_with_llm(node_content: str, node_description: str = None) -> str:
    """
    Generate a concise title for an idea tree.

    Args:
        node_content: Content of the first node
        node_description: Optional description of the node

    Returns:
        Generated title string
    """
    # Use Gemini via Vertex AI
    llm = ChatVertexAI(
        model_name="gemini-2.5-pro",
        project=settings.VERTEX_PROJECT_ID,
        location=settings.VERTEX_LOCATION,
        temperature=0.3
    )

    # Get prompt from prompts module
    prompt = get_title_generation_prompt(node_content, node_description)

    # Get LLM response
    response = llm.invoke(prompt)
    title = response.content.strip().strip('"\'')

    # Fallback if title is too long or empty
    if len(title) > 50:
        title = ' '.join(title.split()[:5])
    elif not title:
        title = "New Tree"

    return title


def generate_chat_title_with_llm(user_message: str, ai_response: str) -> str:
    """
    Generate a concise title for a chat session based on the conversation content.

    Args:
        user_message: The user's first message
        ai_response: The AI's first response

    Returns:
        Generated title string
    """
    # Use Gemini via Vertex AI with higher temperature for creativity
    llm = ChatVertexAI(
        model_name="gemini-2.5-pro",
        project=settings.VERTEX_PROJECT_ID,
        location=settings.VERTEX_LOCATION,
        temperature=0.3
    )

    # Get prompt from prompts module
    prompt = get_chat_title_generation_prompt(user_message, ai_response)

    # Get LLM response
    response = llm.invoke(prompt)
    title = response.content.strip().strip('"\'')

    # Fallback if title is too long or empty
    if len(title) > 60:
        title = ' '.join(title.split()[:6])
    elif not title:
        title = "New Chat"

    return title


# Update forward reference for OutlineSection
OutlineSection.model_rebuild()
