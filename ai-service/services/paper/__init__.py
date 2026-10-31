"""
Paper analysis services
"""

from .pdf_service import extract_text_from_pdf, extract_references_from_pdf
from .llm_service import (
    generate_outline_with_llm,
    generate_references_with_llm,
    generate_title_with_llm,
    generate_chat_title_with_llm,
)
from .search_service import search_pdf_link
from .persistence_service import PaperPersistenceService
from .refextract_service import (
    extract_references_with_refextract,
    RefextractReference
)

__all__ = [
    "extract_text_from_pdf",
    "extract_references_from_pdf",
    "generate_outline_with_llm",
    "generate_references_with_llm",
    "generate_title_with_llm",
    "generate_chat_title_with_llm",
    "search_pdf_link",
    "PaperPersistenceService",
    "extract_references_with_refextract",
    "RefextractReference",
]
