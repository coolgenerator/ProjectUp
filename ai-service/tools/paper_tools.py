"""
Paper-specific tools for enhanced paper analysis with ReAct reasoning
"""

from typing import Dict, Any, List, Optional
from langchain_core.tools import Tool
import re


class PaperTools:
    """Collection of tools for analyzing research papers"""

    def __init__(self, paper_text: str = ""):
        """
        Initialize paper tools with paper content

        Args:
            paper_text: Full text of the paper with page markers
        """
        self.paper_text = paper_text
        self.sections = self._extract_sections()

    def _extract_sections(self) -> Dict[str, str]:
        """
        Extract major sections from paper text

        Returns:
            Dictionary mapping section names to their content
        """
        import logging
        logger = logging.getLogger(__name__)

        if not self.paper_text:
            return {}

        sections = {}

        # Common section keywords to look for
        section_keywords = [
            'abstract', 'introduction', 'background', 'related work',
            'methods', 'methodology', 'materials and methods', 'approach',
            'experiments', 'results', 'findings', 'discussion',
            'conclusion', 'conclusions', 'future work',
            'acknowledgements', 'acknowledgments', 'references',
            'data description', 'data records', 'technical validation',
            'usage notes', 'code availability'
        ]

        lines = self.paper_text.split('\n')
        current_section = None
        current_content = []

        # First, extract abstract from first page (between title and first section)
        abstract_lines = []
        in_abstract = False
        for i, line in enumerate(lines[:100]):  # Check first 100 lines
            line_stripped = line.strip()

            # Skip page markers and URLs
            if line_stripped.startswith('---') or 'doi.org' in line_stripped or 'www.' in line_stripped:
                continue

            # Start collecting after we see some content (skip header)
            if not in_abstract and len(line_stripped) > 50:  # Likely content, not header
                in_abstract = True

            if in_abstract:
                # Stop at first section keyword
                line_lower = line_stripped.lower()
                if any(line_lower.startswith(kw) or line_lower == kw for kw in section_keywords):
                    break
                if line_stripped:
                    abstract_lines.append(line)

        if abstract_lines:
            sections['abstract'] = '\n'.join(abstract_lines)
            logger.info(f"[_extract_sections] Extracted abstract from first page: {len(abstract_lines)} lines")

        # Now extract named sections
        for i, line in enumerate(lines):
            line_stripped = line.strip()
            line_lower = line_stripped.lower()

            # Check if this line is a section header
            is_section_header = False
            matched_section = None

            # Pattern 1: Line exactly matches a keyword or starts with it followed by newline
            for keyword in section_keywords:
                # Exact match or match at start followed by space/nothing
                if line_lower == keyword or (line_lower.startswith(keyword) and
                    (len(line_lower) == len(keyword) or line_lower[len(keyword)] in [' ', '\t'])):
                    is_section_header = True
                    matched_section = keyword
                    logger.info(f"[_extract_sections] Found section header at line {i}: '{line_stripped}'")
                    break

            # Pattern 2: Numbered sections like "1 Introduction" or "1. Methods"
            if not is_section_header:
                numbered_match = re.match(r'^\d+\.?\s+(.+)$', line_stripped)
                if numbered_match:
                    potential_section = numbered_match.group(1).lower().strip()
                    for keyword in section_keywords:
                        if potential_section == keyword or potential_section.startswith(keyword):
                            is_section_header = True
                            matched_section = keyword
                            logger.info(f"[_extract_sections] Found numbered section at line {i}: '{line_stripped}'")
                            break

            if is_section_header and matched_section:
                # Save previous section
                if current_section and current_content:
                    sections[current_section] = '\n'.join(current_content)

                # Start new section
                current_section = matched_section
                current_content = [line]
            elif current_section:
                current_content.append(line)

        # Save last section
        if current_section and current_content:
            sections[current_section] = '\n'.join(current_content)

        logger.info(f"[_extract_sections] Extracted {len(sections)} sections: {list(sections.keys())}")
        for section_name, content in sections.items():
            logger.info(f"[_extract_sections] Section '{section_name}': {len(content)} chars, first 100: {content[:100]}")

        return sections

    def search_paper_section(self, section_name: str) -> str:
        """
        Extract a specific section from the paper

        Args:
            section_name: Name of section (e.g., "introduction", "methods", "results")

        Returns:
            Content of the section or error message
        """
        import logging
        logger = logging.getLogger(__name__)

        section_name = section_name.lower().strip()
        logger.info(f"[search_paper_section] Looking for section: '{section_name}'")
        logger.info(f"[search_paper_section] Available sections: {list(self.sections.keys())}")

        # Try exact match first
        if section_name in self.sections:
            logger.info(f"[search_paper_section] Found exact match for '{section_name}'")
            return f"## {section_name.title()}\n\n{self.sections[section_name][:3000]}"

        # Try partial match
        for key in self.sections.keys():
            if section_name in key or key in section_name:
                logger.info(f"[search_paper_section] Found partial match: '{key}' for '{section_name}'")
                return f"## {key.title()}\n\n{self.sections[key][:3000]}"

        available = ", ".join(self.sections.keys())
        logger.warning(f"[search_paper_section] Section '{section_name}' not found. Available: {available}")
        return f"Section '{section_name}' not found. Available sections: {available}"

    def search_paper_by_keyword(self, keyword: str, context_lines: int = 3) -> str:
        """
        Search for a keyword in the paper and return surrounding context

        Args:
            keyword: Keyword to search for
            context_lines: Number of lines of context before/after match

        Returns:
            Matching excerpts with context
        """
        if not self.paper_text:
            return "No paper text available"

        lines = self.paper_text.split('\n')
        matches = []

        for i, line in enumerate(lines):
            if keyword.lower() in line.lower():
                # Get context
                start = max(0, i - context_lines)
                end = min(len(lines), i + context_lines + 1)
                context = '\n'.join(lines[start:end])
                matches.append(f"Match {len(matches) + 1}:\n{context}\n")

                # Limit to 5 matches
                if len(matches) >= 5:
                    break

        if not matches:
            return f"No matches found for keyword '{keyword}'"

        result = f"Found {len(matches)} occurrences of '{keyword}':\n\n"
        result += "\n---\n".join(matches)
        return result[:4000]  # Limit total length

    def get_paper_metadata(self, query: str = "") -> str:
        """
        Extract paper metadata (title, abstract, etc.)

        Args:
            query: Optional query parameter (not used, but required by LangChain)

        Returns:
            Formatted metadata string
        """
        import logging
        logger = logging.getLogger(__name__)

        metadata = []

        # Try to extract title (usually first few lines)
        lines = self.paper_text.split('\n')
        title_candidates = []
        for i, line in enumerate(lines[:20]):
            if line.strip() and not line.startswith('---'):
                title_candidates.append(line.strip())
                if len(title_candidates) >= 3:
                    break

        if title_candidates:
            metadata.append(f"Title: {title_candidates[0]}")
            logger.info(f"[get_paper_metadata] Extracted title: {title_candidates[0][:100]}")

        # Extract abstract if available
        logger.info(f"[get_paper_metadata] Checking for 'abstract' in sections: {'abstract' in self.sections}")
        logger.info(f"[get_paper_metadata] Available sections: {list(self.sections.keys())}")

        if 'abstract' in self.sections:
            abstract = self.sections['abstract'][:500]
            metadata.append(f"\nAbstract:\n{abstract}")
            logger.info(f"[get_paper_metadata] Found abstract: {abstract[:100]}")
        else:
            logger.warning("[get_paper_metadata] Abstract section not found in extracted sections")

        return '\n'.join(metadata) if metadata else "Metadata not available"

    def list_sections(self, query: str = "") -> str:
        """
        List all available sections in the paper

        Args:
            query: Optional query parameter (not used, but required by LangChain)

        Returns:
            Formatted list of section names
        """
        if not self.sections:
            return "No sections extracted from paper"

        section_list = "\n".join([f"- {name.title()}" for name in self.sections.keys()])
        return f"Available sections:\n{section_list}"

    def get_paper_length(self, query: str = "") -> str:
        """
        Get information about paper length

        Args:
            query: Optional query parameter (not used, but required by LangChain)

        Returns:
            Paper length statistics
        """
        # Count page markers
        page_count = self.paper_text.count('--- Page')
        word_count = len(self.paper_text.split())

        return f"Paper statistics:\n- Pages: ~{page_count}\n- Words: ~{word_count:,}\n- Characters: {len(self.paper_text):,}"

    def extract_figures_and_tables(self, query: str = "") -> str:
        """
        Find references to figures and tables in the paper

        Returns:
            List of figures and tables mentioned
        """
        figures = []
        tables = []

        # Find figure references
        fig_pattern = r'(?i)(figure|fig\.?)\s+(\d+)'
        for match in re.finditer(fig_pattern, self.paper_text):
            figures.append(match.group(0))

        # Find table references
        table_pattern = r'(?i)(table)\s+(\d+)'
        for match in re.finditer(table_pattern, self.paper_text):
            tables.append(match.group(0))

        # Get unique references
        figures = list(set(figures))[:10]
        tables = list(set(tables))[:10]

        result = []
        if figures:
            result.append(f"Figures mentioned: {', '.join(figures)}")
        if tables:
            result.append(f"Tables mentioned: {', '.join(tables)}")

        return '\n'.join(result) if result else "No figures or tables found"

    def as_tools(self) -> List[Tool]:
        """
        Convert all paper analysis functions to LangChain tools

        Returns:
            List of LangChain Tool objects
        """
        return [
            Tool(
                name="search_paper_section",
                description="Extract and read a specific section from the paper. Useful for finding Introduction, Methods, Results, Discussion, Conclusion, etc. Input REQUIRED: the section name (e.g., 'introduction', 'methods', 'results').",
                func=self.search_paper_section
            ),
            Tool(
                name="search_paper_keyword",
                description="Search for a specific keyword or phrase in the paper and get surrounding context. Useful for finding specific concepts, terms, or topics mentioned in the paper. Input REQUIRED: the keyword to search for (e.g., 'neural network', 'dataset').",
                func=self.search_paper_by_keyword
            ),
            Tool(
                name="get_paper_metadata",
                description="Get paper metadata including title and abstract. Useful for understanding what the paper is about at a high level. Input: use empty string '' or 'none' (no specific input needed).",
                func=self.get_paper_metadata
            ),
            Tool(
                name="list_paper_sections",
                description="List all available sections in the paper. Useful for understanding the paper's structure before diving into specific sections. Input: use empty string '' or 'none' (no specific input needed).",
                func=self.list_sections
            ),
            Tool(
                name="get_paper_stats",
                description="Get statistics about the paper (length, page count, word count). Useful for understanding the scope of the paper. Input: use empty string '' or 'none' (no specific input needed).",
                func=self.get_paper_length
            ),
            Tool(
                name="find_figures_tables",
                description="Find all figures and tables mentioned in the paper. Useful for locating visual content and data presentations. Input: use empty string '' or 'none' (no specific input needed).",
                func=self.extract_figures_and_tables
            )
        ]


def create_paper_tools(paper_text: str) -> List[Tool]:
    """
    Factory function to create paper analysis tools

    Args:
        paper_text: Full text of the paper

    Returns:
        List of LangChain tools for paper analysis
    """
    paper_tools = PaperTools(paper_text)
    return paper_tools.as_tools()
