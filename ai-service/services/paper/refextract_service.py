"""
refextract service for extracting structured references from PDFs

refextract is a library from INSPIRE-HEP for extracting references from academic papers.
It's specifically designed for high-energy physics papers but works well for general academic content.
"""

import io
import requests
import logging
from typing import List, Dict, Optional
from refextract import extract_references_from_file

logger = logging.getLogger(__name__)


class RefextractReference:
    """Structured reference data from refextract"""

    def __init__(
        self,
        title: Optional[str] = None,
        authors: Optional[List[str]] = None,
        year: Optional[str] = None,
        venue: Optional[str] = None,
        doi: Optional[str] = None,
        url: Optional[str] = None,
        raw_text: Optional[str] = None
    ):
        self.title = title
        self.authors = authors or []
        self.year = year
        self.venue = venue
        self.doi = doi
        self.url = url
        self.raw_text = raw_text

    def to_dict(self) -> Dict:
        """Convert to dictionary format"""
        return {
            "title": self.title,
            "authors": self.authors,
            "year": self.year,
            "venue": self.venue,
            "doi": self.doi,
            "url": self.url,
            "raw_text": self.raw_text
        }


def extract_references_with_refextract(
    pdf_url: str,
    token: Optional[str] = None
) -> List[RefextractReference]:
    """
    Extract structured references from a PDF using refextract.

    Args:
        pdf_url: URL to the PDF file
        token: Optional authentication token for PDF download

    Returns:
        List of RefextractReference objects
    """
    try:
        # Step 1: Download the PDF
        logger.info(f"[refextract] Downloading PDF from {pdf_url[:50]}...")
        headers = {}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        pdf_response = requests.get(pdf_url, headers=headers, timeout=60)
        pdf_response.raise_for_status()
        pdf_content = pdf_response.content

        logger.info(f"[refextract] Downloaded PDF, size: {len(pdf_content)} bytes")

        # Step 2: Save temporarily and extract references
        import tempfile
        import os

        # Create a temporary file to store the PDF
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            tmp_file.write(pdf_content)
            tmp_path = tmp_file.name

        try:
            logger.info(f"[refextract] Processing PDF with refextract...")
            # Extract references using refextract
            extracted_refs = extract_references_from_file(tmp_path)

            logger.info(f"[refextract] Raw extraction complete, found {len(extracted_refs)} references")
            logger.debug(f"[refextract] Raw data sample: {extracted_refs[:2] if extracted_refs else 'None'}")

            # Step 3: Parse the extracted references
            references = parse_refextract_output(extracted_refs)

            logger.info(f"[refextract] Extracted and parsed {len(references)} references")
            return references

        finally:
            # Clean up temporary file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
                logger.debug(f"[refextract] Cleaned up temporary file")

    except requests.RequestException as e:
        logger.error(f"[refextract] Network error during PDF download: {e}")
        raise Exception(f"Failed to download PDF: {str(e)}")
    except SystemError as e:
        # Known issue on macOS: mmap.resize() not supported (mremap not available)
        if "mremap" in str(e):
            logger.warning(f"[refextract] macOS mmap limitation detected, refextract cannot process this PDF. Will fall back to LLM extraction.")
            raise Exception("refextract not supported on macOS for this PDF - falling back to LLM")
        else:
            logger.error(f"[refextract] System error during extraction: {e}")
            raise
    except Exception as e:
        logger.error(f"[refextract] Error extracting references: {e}")
        raise


def parse_refextract_output(extracted_refs: List[Dict]) -> List[RefextractReference]:
    """
    Parse refextract output to extract structured references.

    Args:
        extracted_refs: List of reference dictionaries from refextract

    Returns:
        List of RefextractReference objects
    """
    references = []

    try:
        for idx, ref_data in enumerate(extracted_refs):
            logger.debug(f"[refextract] Parsing reference #{idx + 1}: {ref_data}")

            # Extract raw text
            raw_text = ref_data.get('raw_ref', [{}])[0].get('value', '')

            # Extract title
            title = None
            title_data = ref_data.get('title', [])
            if title_data and isinstance(title_data, list) and len(title_data) > 0:
                title = title_data[0].get('title', '')

            # Extract authors
            authors = []
            authors_data = ref_data.get('author', [])
            if authors_data and isinstance(authors_data, list):
                for author in authors_data:
                    if isinstance(author, dict):
                        full_name = author.get('full_name', '')
                        if full_name:
                            authors.append(full_name)

            # Extract year
            year = None
            year_data = ref_data.get('year', [])
            if year_data and isinstance(year_data, list) and len(year_data) > 0:
                year = year_data[0].get('year', '')

            # Extract publication info (journal/venue)
            venue = None
            journal_data = ref_data.get('journal_title', [])
            if journal_data and isinstance(journal_data, list) and len(journal_data) > 0:
                venue = journal_data[0].get('journal_title', '')

            # If no journal, try publication info
            if not venue:
                pub_info = ref_data.get('publication_info', [])
                if pub_info and isinstance(pub_info, list) and len(pub_info) > 0:
                    venue = pub_info[0].get('journal_title', '')

            # Extract DOI
            doi = None
            doi_data = ref_data.get('dois', [])
            if doi_data and isinstance(doi_data, list) and len(doi_data) > 0:
                doi = doi_data[0].get('value', '')

            # Extract URL (arXiv, etc.)
            url = None
            urls_data = ref_data.get('urls', [])
            if urls_data and isinstance(urls_data, list) and len(urls_data) > 0:
                url = urls_data[0].get('value', '')

            # Also check for arXiv ID
            if not url:
                arxiv_data = ref_data.get('arxiv_eprints', [])
                if arxiv_data and isinstance(arxiv_data, list) and len(arxiv_data) > 0:
                    arxiv_id = arxiv_data[0].get('value', '')
                    if arxiv_id:
                        url = f"https://arxiv.org/abs/{arxiv_id}"

            # Create reference object if we have meaningful data
            # Accept references with title OR authors OR raw_text
            if title or authors or raw_text:
                ref = RefextractReference(
                    title=title or "Untitled",
                    authors=authors,
                    year=year,
                    venue=venue,
                    doi=doi,
                    url=url,
                    raw_text=raw_text
                )
                references.append(ref)
                logger.debug(f"[refextract] Created reference: {ref.title[:50] if ref.title else 'No title'}")
            else:
                logger.debug(f"[refextract] Skipped reference with no useful data")

        logger.info(f"[refextract] Successfully parsed {len(references)} references")

    except Exception as e:
        logger.error(f"[refextract] Error parsing refextract output: {e}", exc_info=True)

    return references
