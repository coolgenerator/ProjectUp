"""
PDF link search service using arXiv and DuckDuckGo
"""

import urllib.parse
import requests
import re
from typing import List, Optional
from duckduckgo_search import DDGS


def search_pdf_link(title: str, authors: List[str]) -> Optional[str]:
    """
    Search for PDF link using DuckDuckGo, arXiv, and other sources.

    Args:
        title: Paper title
        authors: List of authors

    Returns:
        PDF URL if found, None otherwise
    """
    # First try arXiv search
    try:
        # Search arXiv API
        query = urllib.parse.quote(f"{title} {authors[0] if authors else ''}")
        arxiv_url = f"http://export.arxiv.org/api/query?search_query=ti:{query}&max_results=1"

        response = requests.get(arxiv_url, timeout=5)
        if response.ok and "pdf_url" in response.text:
            # Extract PDF URL from arXiv response
            pdf_match = re.search(r'http://arxiv\.org/pdf/[\d\.]+', response.text)
            if pdf_match:
                return pdf_match.group(0)
    except Exception:
        pass

    # Try DuckDuckGo search for paper URL
    try:
        # Construct search query
        author_str = authors[0] if authors else ''
        search_query = f"{title} {author_str} pdf"

        # Search using DuckDuckGo
        with DDGS() as ddgs:
            results = list(ddgs.text(search_query, max_results=5))

            # Look for PDF links or paper hosting sites
            for result in results:
                url = result.get('href', '')
                # Check for PDF links or academic paper sites
                if any(domain in url for domain in [
                    'arxiv.org/pdf',
                    'arxiv.org/abs',
                    'acm.org',
                    'ieee.org',
                    'springer.com',
                    'sciencedirect.com',
                    'researchgate.net',
                    'semanticscholar.org',
                    '.pdf'
                ]):
                    return url
    except Exception as e:
        print(f"DuckDuckGo search error: {e}")
        pass

    # If no URL found, return None
    return None
