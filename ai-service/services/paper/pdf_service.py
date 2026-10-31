"""
PDF extraction and processing service
"""

import io
import hashlib
import requests
import logging
from typing import Optional, Tuple
from pypdf import PdfReader
from functools import lru_cache

logger = logging.getLogger(__name__)

# In-memory cache for PDF text (keyed by URL hash)
_pdf_cache = {}


def _get_cache_key(pdf_url: str) -> str:
    """Generate a cache key from PDF URL"""
    return hashlib.md5(pdf_url.encode()).hexdigest()


def extract_text_from_pdf(pdf_url: str, token: Optional[str] = None) -> Tuple[str, int]:
    """
    Download and extract text from a PDF file with caching.

    Args:
        pdf_url: URL to the PDF file
        token: Optional authentication token for S3

    Returns:
        Tuple of (extracted text from first pages, total page count)
    """
    # Check cache first
    cache_key = _get_cache_key(pdf_url)
    if cache_key in _pdf_cache:
        print(f"[PDF Cache] Using cached text for {pdf_url[:50]}...")
        return _pdf_cache[cache_key]

    print(f"[PDF Cache] Extracting text from {pdf_url[:50]}...")

    headers = {}
    if token:
        headers['Authorization'] = f'Bearer {token}'

    # Download PDF from S3
    response = requests.get(pdf_url, headers=headers, timeout=30)
    response.raise_for_status()

    # Read PDF content
    pdf_file = io.BytesIO(response.content)
    pdf_reader = PdfReader(pdf_file)

    total_pages = len(pdf_reader.pages)

    # Extract text from all pages (or first 50 if too long)
    text_content = []
    max_pages = min(50, total_pages)

    for i in range(max_pages):
        page = pdf_reader.pages[i]
        text = page.extract_text()
        text_content.append(f"--- Page {i+1} ---\n{text}\n")

    result = ("\n".join(text_content), total_pages)

    # Log first 3000 chars to debug section extraction
    logger.info(f"[PDF Extract] First 3000 chars of extracted text:\n{result[0][:3000]}")

    # Cache the result (limit cache size to 100 PDFs)
    if len(_pdf_cache) > 100:
        # Remove oldest entry (simple FIFO)
        _pdf_cache.pop(next(iter(_pdf_cache)))
    _pdf_cache[cache_key] = result

    return result


def extract_references_from_pdf(pdf_url: str, token: Optional[str] = None) -> str:
    """
    Extract references section from PDF by finding where References section starts.

    Args:
        pdf_url: URL to the PDF file
        token: Optional authentication token

    Returns:
        Text content from references section
    """
    headers = {}
    if token:
        headers['Authorization'] = f'Bearer {token}'

    # Download PDF from S3
    response = requests.get(pdf_url, headers=headers, timeout=30)
    response.raise_for_status()

    # Read PDF content
    pdf_file = io.BytesIO(response.content)
    pdf_reader = PdfReader(pdf_file)

    total_pages = len(pdf_reader.pages)

    # Try to find the page where "References" section starts
    references_start_page = None
    start_search = max(0, total_pages - 50)
    for i in range(start_search, total_pages):  # Search last 50 pages (or entire file if shorter)
        page = pdf_reader.pages[i]
        text = page.extract_text()
        text_upper = text.upper()

        # Look for common reference section headers with more flexible patterns
        if any(header in text_upper for header in [
            'REFERENCES\n', '\nREFERENCES\n', 'REFERENCES\r\n', '\nREFERENCES\r\n',
            'REFERENCES ', ' REFERENCES\n', ' REFERENCES\r\n',
            'BIBLIOGRAPHY\n', '\nBIBLIOGRAPHY\n',
            'WORKS CITED\n', '\nWORKS CITED\n'
        ]) or text.strip().upper().startswith('REFERENCES'):
            references_start_page = i
            print(f"[References] Matched header pattern on page {i + 1}")
            break

    # If we found the references section, start from there; otherwise use last 50 pages
    if references_start_page is not None:
        start_page = references_start_page
        print(f"[References] Found references section at page {references_start_page + 1}, extracting from there to end")
    else:
        start_page = max(0, total_pages - 50)
        print(f"[References] References section not found, extracting last {total_pages - start_page} pages starting at {start_page + 1}")

    text_content = []
    for i in range(start_page, total_pages):
        page = pdf_reader.pages[i]
        text = page.extract_text()
        text_content.append(f"--- Page {i+1} ---\n{text}\n")

    extracted_text = "\n".join(text_content)
    print(f"[References] Extracted {len(extracted_text)} characters from {total_pages - start_page} pages")
    print(f"[References] Text preview (first 500 chars): {extracted_text[:500]}")

    return extracted_text
