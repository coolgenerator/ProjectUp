"""Firecrawl integration for web content extraction and summarization"""

import os
import logging
import asyncio
from typing import Dict, List, Optional, Any
import aiohttp
import json
from urllib.parse import urlparse

logger = logging.getLogger(__name__)


class FirecrawlTool:
    """Tool for extracting and processing web content using Firecrawl API"""
    
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        """Initialize Firecrawl tool
        
        Args:
            api_key: Firecrawl API key (or from environment)
            base_url: Base URL for Firecrawl API (or from environment)
        """
        self.api_key = api_key or os.getenv("FIRECRAWL_API_KEY", "")
        self.base_url = base_url or os.getenv("FIRECRAWL_BASE_URL", "http://localhost:3002/v0")
        
        # For self-hosted Firecrawl, API key might not be required
        self.is_self_hosted = "localhost" in self.base_url or "127.0.0.1" in self.base_url
        
        if self.is_self_hosted:
            self.available = True
            logger.info(f"Firecrawl tool initialized with self-hosted instance at {self.base_url}")
        elif not self.api_key:
            logger.warning("Firecrawl API key not found for cloud instance. Web extraction will be limited.")
            self.available = False
        else:
            self.available = True
            logger.info(f"Firecrawl tool initialized with cloud instance")
    
    async def scrape_url(self, url: str, options: Optional[Dict] = None) -> Dict[str, Any]:
        """Scrape a single URL and extract its content
        
        Args:
            url: URL to scrape
            options: Optional scraping options
            
        Returns:
            Extracted content including markdown, metadata, and structured data
        """
        if not self.available:
            logger.warning("Firecrawl not available, returning empty result")
            return {"error": "Firecrawl API key not configured"}
        
        # Build headers - self-hosted might not need authorization
        headers = {"Content-Type": "application/json"}
        if self.api_key and not self.is_self_hosted:
            headers["Authorization"] = f"Bearer {self.api_key}"
        
        # Simplified payload for self-hosted Firecrawl
        if self.is_self_hosted:
            payload = {
                "url": url,
                "pageOptions": {
                    "onlyMainContent": True,
                    "includeHtml": False
                }
            }
        else:
            # Full payload for cloud Firecrawl
            payload = {
                "url": url,
                "pageOptions": {
                    "onlyMainContent": True,
                    "includeHtml": False,
                    "screenshot": False,
                    "waitFor": 1000
                },
                "extractorOptions": {
                    "mode": "llm-extraction",
                    "extractionPrompt": "Extract the main educational content, key concepts, prerequisites, and learning objectives from this page.",
                    "extractionSchema": {
                        "type": "object",
                        "properties": {
                            "title": {"type": "string"},
                            "main_topics": {"type": "array", "items": {"type": "string"}},
                            "prerequisites": {"type": "array", "items": {"type": "string"}},
                            "key_concepts": {"type": "array", "items": {"type": "string"}},
                            "learning_objectives": {"type": "array", "items": {"type": "string"}},
                            "difficulty_level": {"type": "string"},
                            "estimated_time": {"type": "string"},
                            "summary": {"type": "string"}
                        }
                    }
                }
            }
        
        if options:
            payload.update(options)
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/scrape",
                    headers=headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        
                        # Handle different response formats
                        if self.is_self_hosted:
                            # Self-hosted Firecrawl might have simpler response structure
                            data = result if "markdown" in result else result.get("data", {})
                            return {
                                "success": True,
                                "url": url,
                                "markdown": data.get("markdown", ""),
                                "metadata": data.get("metadata", {}),
                                "content": data.get("content", data.get("markdown", "")),
                                "llm_extraction": {}  # Self-hosted might not have LLM extraction
                            }
                        else:
                            # Cloud Firecrawl response
                            return {
                                "success": True,
                                "url": url,
                                "markdown": result.get("data", {}).get("markdown", ""),
                                "metadata": result.get("data", {}).get("metadata", {}),
                                "llm_extraction": result.get("data", {}).get("llm_extraction", {}),
                                "content": result.get("data", {}).get("content", "")
                            }
                    else:
                        error_text = await response.text()
                        logger.error(f"Firecrawl API error for {url}: {response.status} - {error_text}")
                        return {
                            "success": False,
                            "url": url,
                            "error": f"API error: {response.status}"
                        }
        except asyncio.TimeoutError:
            logger.error(f"Timeout scraping {url}")
            return {
                "success": False,
                "url": url,
                "error": "Timeout"
            }
        except Exception as e:
            logger.error(f"Error scraping {url}: {e}")
            return {
                "success": False,
                "url": url,
                "error": str(e)
            }
    
    async def scrape_multiple_urls(self, urls: List[str], max_concurrent: int = 3) -> List[Dict[str, Any]]:
        """Scrape multiple URLs concurrently with rate limiting
        
        Args:
            urls: List of URLs to scrape
            max_concurrent: Maximum concurrent requests
            
        Returns:
            List of extraction results
        """
        if not self.available:
            logger.warning("Firecrawl not available, returning empty results")
            return []
        
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def scrape_with_limit(url: str) -> Dict[str, Any]:
            async with semaphore:
                return await self.scrape_url(url)
        
        tasks = [scrape_with_limit(url) for url in urls]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Handle exceptions in results
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Error scraping {urls[i]}: {result}")
                processed_results.append({
                    "success": False,
                    "url": urls[i],
                    "error": str(result)
                })
            else:
                processed_results.append(result)
        
        return processed_results
    
    async def extract_learning_content(self, urls: List[str], topic: str) -> Dict[str, Any]:
        """Extract and consolidate learning content from multiple URLs
        
        Args:
            urls: List of URLs to process
            topic: The main topic for context
            
        Returns:
            Consolidated learning content structure
        """
        if not urls:
            return {
                "extracted_content": [],
                "consolidated": {}
            }
        
        # Limit to top URLs for efficiency
        urls_to_process = urls[:5]
        logger.info(f"Extracting content from {len(urls_to_process)} URLs for topic: {topic}")
        
        # Scrape all URLs
        results = await self.scrape_multiple_urls(urls_to_process)
        
        # Process and consolidate results
        extracted_content = []
        all_prerequisites = set()
        all_concepts = set()
        all_topics = set()
        all_objectives = set()
        
        for result in results:
            if result.get("success"):
                content_item = {
                    "url": result["url"],
                    "title": "",
                    "summary": "",
                    "key_points": []
                }
                
                # Extract from LLM extraction if available (cloud Firecrawl)
                if "llm_extraction" in result and result["llm_extraction"]:
                    extraction = result["llm_extraction"]
                    content_item["title"] = extraction.get("title", "")
                    content_item["summary"] = extraction.get("summary", "")
                    
                    # Collect all prerequisites
                    for prereq in extraction.get("prerequisites", []):
                        all_prerequisites.add(prereq)
                    
                    # Collect all concepts
                    for concept in extraction.get("key_concepts", []):
                        all_concepts.add(concept)
                    
                    # Collect all topics
                    for topic_item in extraction.get("main_topics", []):
                        all_topics.add(topic_item)
                    
                    # Collect learning objectives
                    for objective in extraction.get("learning_objectives", []):
                        all_objectives.add(objective)
                    
                    content_item["extraction"] = extraction
                
                # Use markdown content (self-hosted or fallback)
                if result.get("markdown"):
                    markdown = result["markdown"][:2000]  # Limit content size
                    content_item["summary"] = markdown[:500]
                    
                    # Extract key points from markdown
                    lines = markdown.split('\n')
                    for line in lines[:10]:  # First 10 lines
                        if line.strip() and not line.startswith('#'):
                            content_item["key_points"].append(line.strip()[:200])
                
                extracted_content.append(content_item)
        
        # Consolidate all extracted information
        consolidated = {
            "prerequisites": list(all_prerequisites),
            "key_concepts": list(all_concepts),
            "main_topics": list(all_topics),
            "learning_objectives": list(all_objectives),
            "sources_processed": len([r for r in results if r.get("success")]),
            "sources_failed": len([r for r in results if not r.get("success")])
        }
        
        return {
            "extracted_content": extracted_content,
            "consolidated": consolidated
        }
    
    def is_available(self) -> bool:
        """Check if Firecrawl is available"""
        return self.available