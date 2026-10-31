"""
Course Generation Workflow Nodes

Individual node functions for each step of the course generation workflow.
"""

import json
import re
import uuid
import logging
import asyncio
from typing import Dict, Any, List, Optional
from langchain_google_vertexai import ChatVertexAI
from langchain_core.messages import SystemMessage, HumanMessage

from .state import CourseGenerationState, TopicDetail, RoadmapStep, ResourceSource, LearningResource
from prompts.course_prompts import CoursePrompts
from config.settings import settings
from tools.learning.github_roadmap_scraper import GitHubRoadmapScraper
from langchain_community.tools import DuckDuckGoSearchRun

logger = logging.getLogger(__name__)

# Rate limiting configuration
BATCH_SIZE = 3  # Process 3 requests at a time
BATCH_DELAY = 2  # Wait 2 seconds between batches


async def gather_with_batching(tasks: List, batch_size: int = BATCH_SIZE, delay: float = BATCH_DELAY):
    """
    Execute async tasks in batches to avoid rate limiting.

    Args:
        tasks: List of coroutines/tasks to execute
        batch_size: Number of tasks to run concurrently in each batch
        delay: Seconds to wait between batches

    Returns:
        List of results in the same order as input tasks
    """
    results = []
    total_tasks = len(tasks)

    for i in range(0, total_tasks, batch_size):
        batch = tasks[i:i + batch_size]
        batch_num = (i // batch_size) + 1
        total_batches = (total_tasks + batch_size - 1) // batch_size

        logger.info(f"Processing batch {batch_num}/{total_batches} ({len(batch)} tasks)...")

        # Execute batch in parallel
        batch_results = await asyncio.gather(*batch, return_exceptions=True)
        results.extend(batch_results)

        # Wait between batches (except after the last batch)
        if i + batch_size < total_tasks:
            logger.info(f"Waiting {delay}s before next batch...")
            await asyncio.sleep(delay)

    return results


def extract_json_from_response(content: str) -> Dict[str, Any]:
    """
    Extract JSON from AI response, handling markdown code blocks and common JSON errors.

    Args:
        content: Raw response content from AI

    Returns:
        Parsed JSON dictionary

    Raises:
        json.JSONDecodeError: If JSON cannot be parsed
    """
    if not content or len(content.strip()) == 0:
        raise ValueError("Empty content provided to extract_json_from_response")

    # Remove markdown code blocks if present
    # Pattern matches: ```json ... ``` or ``` ... ```
    # More robust: handles both opening and closing backticks separately
    cleaned = content.strip()

    # Remove opening code fence
    if cleaned.startswith('```'):
        # Find the end of the first line (language identifier)
        first_newline = cleaned.find('\n')
        if first_newline != -1:
            cleaned = cleaned[first_newline + 1:]

    # Remove closing code fence
    if cleaned.endswith('```'):
        cleaned = cleaned[:-3].rstrip()

    cleaned = cleaned.strip()

    if not cleaned:
        raise ValueError("Content became empty after removing markdown code blocks")

    # Try to parse directly first
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        logger.debug(f"Direct JSON parse failed: {e}. Trying regex extraction...")

        # Try to extract JSON object/array using regex
        json_match = re.search(r'(\{.*\}|\[.*\])', cleaned, re.DOTALL)
        if json_match:
            json_str = json_match.group(1)

            # Apply common JSON fixes
            # 1. Remove trailing commas before closing braces/brackets
            json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)

            # 2. Fix smart quotes
            json_str = json_str.replace('"', '"').replace('"', '"')
            json_str = json_str.replace(''', "'").replace(''', "'")

            # 3. Fix common JSON value errors
            # Fix boolean values that might be capitalized
            json_str = re.sub(r':\s*True\b', ': true', json_str)
            json_str = re.sub(r':\s*False\b', ': false', json_str)
            json_str = re.sub(r':\s*None\b', ': null', json_str)

            # Fix unquoted true/false/null
            json_str = re.sub(r':\s*true(?=[,\s\}\]])', ': true', json_str)
            json_str = re.sub(r':\s*false(?=[,\s\}\]])', ': false', json_str)

            # 4. Try to fix unclosed objects/arrays
            open_braces = json_str.count('{')
            close_braces = json_str.count('}')
            open_brackets = json_str.count('[')
            close_brackets = json_str.count(']')

            if open_braces > close_braces:
                logger.debug(f"Fixing {open_braces - close_braces} unclosed braces")
                json_str += '}' * (open_braces - close_braces)
            if open_brackets > close_brackets:
                logger.debug(f"Fixing {open_brackets - close_brackets} unclosed brackets")
                json_str += ']' * (open_brackets - close_brackets)

            try:
                return json.loads(json_str)
            except json.JSONDecodeError as e2:
                logger.error(f"JSON parse failed even after fixes: {e2}")
                # Log more context around the error
                error_pos = e2.pos if hasattr(e2, 'pos') else 0
                start = max(0, error_pos - 200)
                end = min(len(json_str), error_pos + 200)
                logger.error(f"JSON around error position (chars {start}-{end}):")
                logger.error(json_str[start:end])
                logger.error("Tip: Check for plain text mixed with JSON structure or missing quotes around keys/values")

                raise
        else:
            logger.error("No JSON pattern found in content")
            logger.error(f"Content preview: {cleaned[:500]}...")
            raise ValueError(f"No JSON pattern found in AI response")


class CourseGenerationNodes:
    """Node functions for course generation workflow."""

    def __init__(self, llm_provider: str = "vertex_ai"):
        """Initialize with LLM provider."""
        # Use Vertex AI by default - increased max_output_tokens for resource gathering
        self.llm = ChatVertexAI(
            model_name=settings.default_llm_model,  # Use gemini-2.5-pro from settings
            project=settings.VERTEX_PROJECT_ID,
            location=settings.VERTEX_LOCATION,
            temperature=settings.vertex_ai_temperature,
            max_output_tokens=16384  # Increased from 8192 for larger responses
        )
        self.prompts = CoursePrompts()
        # Initialize GitHub scraper (lazy loading to avoid token issues if not set)
        self._github_scraper: Optional[GitHubRoadmapScraper] = None

    def _get_github_scraper(self) -> GitHubRoadmapScraper:
        """Get or create GitHub scraper instance (lazy loading)."""
        if self._github_scraper is None:
            import os
            github_token = os.getenv('GITHUB_TOKEN')
            self._github_scraper = GitHubRoadmapScraper(github_token=github_token, verbose=False)
        return self._github_scraper

    async def _fetch_github_sources(
        self,
        topic: str,
        max_roadmaps: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Fetch high-quality GitHub roadmap sources for the topic.

        RUNS IN PARALLEL: Uses asyncio.to_thread() to avoid blocking the event loop
        with synchronous GitHub API calls.

        Args:
            topic: The main course topic
            max_roadmaps: Maximum number of GitHub roadmaps to fetch (default: 3)

        Returns:
            List of source dictionaries compatible with ResourceSource format
        """
        logger.info(f"🔍 Searching GitHub for roadmaps on: {topic}")

        try:
            scraper = self._get_github_scraper()

            # Run synchronous GitHub search in a thread pool to avoid blocking
            # This allows true parallelism with AI source identification
            roadmaps = await asyncio.to_thread(scraper.search_roadmaps, topic)

            if not roadmaps:
                logger.info("No GitHub roadmaps found for this topic")
                return []

            logger.info(f"Found {len(roadmaps)} GitHub roadmaps")

            # Convert to source format
            github_sources = []
            for i, roadmap in enumerate(roadmaps[:max_roadmaps], 1):
                source_id = f"github_{i}_{roadmap['repo'].replace('/', '_')}"

                # Calculate relevance score based on metadata
                relevance_score = 0.85  # Base score for GitHub roadmaps
                if roadmap.get('type') == 'curated':
                    relevance_score = 0.95  # Higher for known curated roadmaps
                elif roadmap.get('stars', 0) > 1000:
                    relevance_score = 0.90  # High stars = high quality

                github_sources.append({
                    'source_id': source_id,
                    'name': f"GitHub: {roadmap['name']}",
                    'type': 'repository',
                    'url': roadmap['url'],
                    'relevance_score': relevance_score,
                    'free': True,
                    'metadata': {
                        'repo': roadmap['repo'],
                        'stars': roadmap.get('stars', 0),
                        'description': roadmap.get('description', ''),
                        'roadmap_type': roadmap.get('type', 'discovered')
                    }
                })

                logger.info(f"  ✓ Added: {roadmap['name']} ({roadmap['repo']}) - {roadmap.get('stars', 0)} stars")

            logger.info(f"✅ Added {len(github_sources)} GitHub sources")
            return github_sources

        except Exception as e:
            logger.warning(f"Failed to fetch GitHub sources: {e}")
            # Don't fail the entire workflow if GitHub fetch fails
            return []

    async def _search_for_github_roadmaps(
        self,
        topic: str,
        max_results: int = 10
    ) -> List[str]:
        """
        Use web search to find the most recommended GitHub roadmaps.

        RUNS IN PARALLEL: Uses asyncio.to_thread() for non-blocking search.

        Args:
            topic: The course topic
            max_results: Maximum number of results to return

        Returns:
            List of GitHub repository URLs
        """
        logger.info(f"🔍 Searching web for best GitHub roadmaps on: {topic}")

        try:
            # Search queries to find recommended roadmaps
            search_queries = [
                f"best github roadmap for {topic} 2025",
                f"github {topic} learning path awesome",
                f"{topic} study guide github repository"
            ]

            github_urls = []

            # Run search in thread pool to avoid blocking
            search_tool = DuckDuckGoSearchRun()

            for query in search_queries[:2]:  # First 2 queries
                try:
                    # Run blocking search in thread pool
                    search_results = await asyncio.to_thread(search_tool.run, query)

                    # Extract GitHub URLs from results
                    import re
                    github_pattern = r'https?://github\.com/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+'
                    found_urls = re.findall(github_pattern, search_results)

                    # Add unique URLs
                    for url in found_urls:
                        # Clean URL (remove fragments, queries)
                        clean_url = url.split('#')[0].split('?')[0]
                        if clean_url not in github_urls:
                            github_urls.append(clean_url)

                    logger.info(f"  Found {len(found_urls)} GitHub URLs in search results")

                except Exception as e:
                    logger.warning(f"Search query failed: {e}")
                    continue

            logger.info(f"✅ Discovered {len(github_urls)} GitHub repositories via web search")
            return github_urls[:max_results]

        except Exception as e:
            logger.warning(f"Web search for GitHub roadmaps failed: {e}")
            return []

    async def _extract_roadmap_details(
        self,
        repo_url: str
    ) -> Optional[Dict[str, Any]]:
        """
        Extract detailed content from a GitHub roadmap.

        RUNS IN PARALLEL: Uses asyncio.to_thread() for non-blocking extraction.

        Args:
            repo_url: GitHub repository URL

        Returns:
            Dictionary with extracted roadmap details including learning_path, resources, topics
        """
        try:
            # Extract repo owner/name from URL
            import re
            match = re.search(r'github\.com/([^/]+)/([^/]+)', repo_url)
            if not match:
                return None

            repo = f"{match.group(1)}/{match.group(2)}"
            logger.info(f"📥 Extracting content from: {repo}")

            scraper = self._get_github_scraper()

            # Run blocking extraction in thread pool
            roadmap_content = await asyncio.to_thread(
                scraper.get_roadmap_content,
                repo
            )

            # Log what we got
            learning_path_count = len(roadmap_content.get('learning_path', []))
            resources_count = len(roadmap_content.get('resources', []))
            topics_count = len(roadmap_content.get('topics', []))

            logger.info(f"  ✓ Extracted: {learning_path_count} sections, {resources_count} resources, {topics_count} topics")

            return roadmap_content

        except Exception as e:
            logger.warning(f"Failed to extract from {repo_url}: {e}")
            return None

    async def extract_github_roadmap_content(self, state: CourseGenerationState) -> Dict[str, Any]:
        """
        NEW NODE: Extract detailed content from GitHub roadmaps.

        This node:
        1. Uses web search to find the most recommended GitHub repos
        2. Extracts detailed learning paths and resources from top repos
        3. Runs everything in parallel for maximum speed

        Returns enriched resources with hundreds of curated links from the community.
        """
        logger.info("🎯 Extracting detailed content from GitHub roadmaps")

        try:
            topic = state['topic']

            # Step 1: Search for recommended GitHub repos (in parallel with existing sources)
            logger.info("📡 Step 1: Searching web for recommended GitHub roadmaps...")
            discovered_urls = await self._search_for_github_roadmaps(topic, max_results=5)

            # Step 2: Get existing GitHub sources from identify_sources
            existing_github_sources = [
                s for s in state.get('sources', [])
                if s.get('type') == 'repository'
            ]

            # Combine: discovered URLs + existing sources
            all_github_urls = discovered_urls[:]
            for source in existing_github_sources:
                url = source.get('url', '')
                if url and url not in all_github_urls:
                    all_github_urls.append(url)

            logger.info(f"📚 Processing {len(all_github_urls)} total GitHub roadmaps")

            if not all_github_urls:
                logger.warning("No GitHub roadmaps found to extract from")
                return {
                    "github_roadmap_resources": [],
                    "github_learning_paths": [],
                    "current_step": "extract_github_content",
                    "progress": 70
                }

            # Step 3: Extract content from all repos IN PARALLEL
            logger.info(f"⚡ Step 2: Extracting content from {len(all_github_urls[:3])} top roadmaps in parallel...")

            extraction_tasks = [
                self._extract_roadmap_details(url)
                for url in all_github_urls[:3]  # Top 3 to avoid overwhelming
            ]

            roadmap_contents = await asyncio.gather(*extraction_tasks, return_exceptions=True)

            # Step 4: Process extracted content
            all_resources = []
            all_learning_paths = []

            for i, content in enumerate(roadmap_contents):
                if isinstance(content, Exception):
                    logger.warning(f"Extraction {i+1} failed: {content}")
                    continue

                if not content:
                    continue

                repo_name = content.get('repository', f'roadmap_{i+1}')

                # Extract resources
                for resource in content.get('resources', []):
                    all_resources.append({
                        'resource_id': f"gh_roadmap_{i+1}_{uuid.uuid4().hex[:8]}",
                        'title': resource.get('title', 'Resource'),
                        'url': resource.get('url', ''),
                        'type': resource.get('type', 'other'),
                        'source': f"GitHub Roadmap: {repo_name}",
                        'description': f"Curated resource from {repo_name}",
                        'quality_score': 0.9,  # High quality from curated roadmaps
                        'free': True,
                        'from_github_roadmap': True
                    })

                # Extract learning paths
                for section in content.get('learning_path', []):
                    all_learning_paths.append({
                        'roadmap': repo_name,
                        'section': section.get('title', ''),
                        'description': section.get('description', ''),
                        'subtopics': section.get('subtopics', []),
                        'items': section.get('items', [])
                    })

            logger.info(f"✅ Extracted {len(all_resources)} resources and {len(all_learning_paths)} learning sections")

            # Merge with existing resources
            existing_resources = state.get('resources', [])
            merged_resources = all_resources + existing_resources

            return {
                "resources": merged_resources,  # Add to existing resources
                "github_roadmap_resources": all_resources,  # Keep separate for tracking
                "github_learning_paths": all_learning_paths,
                "current_step": "extract_github_content",
                "progress": 72
            }

        except Exception as e:
            logger.error(f"Error in extract_github_roadmap_content: {e}", exc_info=True)
            return {
                "github_roadmap_resources": [],
                "github_learning_paths": [],
                "error": f"GitHub extraction failed: {str(e)}",
                "current_step": "extract_github_content",
                "progress": 70
            }

    async def analyze_topics(self, state: CourseGenerationState) -> Dict[str, Any]:
        """
        Node 1: Analyze the main topic and break it down into detailed subtopics.

        This node identifies what specific topics the learner needs to master.
        """
        logger.info(f"Analyzing topics for: {state['topic']}")

        # Get prompts from CoursePrompts
        prompt = self.prompts.get_analyze_topics_prompt(
            topic=state['topic'],
            goals=state['goals'],
            user_experience=state['user_experience'],
            difficulty=state['difficulty'],
            estimated_weeks=state['estimated_weeks'],
            time_commitment=state['time_commitment']
        )
        system_prompt = self.prompts.get_analyze_topics_system_prompt()

        try:
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=prompt)
            ]

            response = await self.llm.ainvoke(messages)

            # Parse JSON response (handles markdown code blocks)
            topics_data = extract_json_from_response(response.content)

            # Add unique IDs if not present
            for i, topic in enumerate(topics_data):
                if 'topic_id' not in topic or not topic['topic_id']:
                    topic['topic_id'] = f"topic_{i+1}"

            return {
                "topics": topics_data,
                "analysis_complete": True,
                "current_step": "analyze_topics",
                "progress": 25
            }

        except Exception as e:
            logger.error(f"Error in analyze_topics: {e}")
            return {
                "error": f"Failed to analyze topics: {str(e)}",
                "current_step": "analyze_topics",
                "progress": 0
            }

    async def build_roadmap(self, state: CourseGenerationState) -> Dict[str, Any]:
        """
        Node 2: Build a learning roadmap with prerequisites.

        Creates a structured path through the topics with proper sequencing.
        """
        logger.info("Building learning roadmap")

        topics_json = json.dumps(state['topics'], indent=2)

        # Get prompts from CoursePrompts
        prompt = self.prompts.get_build_roadmap_prompt(
            topics_json=topics_json,
            estimated_weeks=state['estimated_weeks'],
            time_commitment=state['time_commitment']
        )
        system_prompt = self.prompts.get_build_roadmap_system_prompt()

        try:
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=prompt)
            ]

            response = await self.llm.ainvoke(messages)
            roadmap_data = extract_json_from_response(response.content)

            # Build prerequisite graph
            roadmap_graph = {}
            for step in roadmap_data:
                step_id = step['step_id']
                prerequisites = step.get('prerequisites', [])
                roadmap_graph[step_id] = prerequisites

            return {
                "roadmap": roadmap_data,
                "roadmap_graph": roadmap_graph,
                "roadmap_complete": True,
                "current_step": "build_roadmap",
                "progress": 40
            }

        except Exception as e:
            logger.error(f"Error in build_roadmap: {e}")
            return {
                "error": f"Failed to build roadmap: {str(e)}",
                "current_step": "build_roadmap",
                "progress": 25
            }

    async def identify_sources(self, state: CourseGenerationState) -> Dict[str, Any]:
        """
        Node 3: Identify the best free learning sources for each topic.

        Determines which platforms and sources to search for resources.
        NOW INCLUDES: High-quality GitHub roadmap sources!
        """
        logger.info("Identifying learning sources")

        topics_list = [t['name'] for t in state['topics']]

        # Get prompts from CoursePrompts
        prompt = self.prompts.get_identify_sources_prompt(
            topics_list=topics_list,
            main_topic=state['topic']
        )
        system_prompt = self.prompts.get_identify_sources_system_prompt()

        try:
            # Run AI source identification and GitHub search in parallel
            logger.info("🚀 Running AI source identification and GitHub search in parallel...")

            ai_task = self.llm.ainvoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=prompt)
            ])
            github_task = self._fetch_github_sources(state['topic'], max_roadmaps=3)

            # Wait for both to complete
            ai_response, github_sources = await asyncio.gather(ai_task, github_task, return_exceptions=True)

            # Handle AI sources
            sources_data = []
            if isinstance(ai_response, Exception):
                logger.error(f"AI source identification failed: {ai_response}")
            else:
                try:
                    sources_data = extract_json_from_response(ai_response.content)

                    # Validate that we got an array
                    if not isinstance(sources_data, list):
                        logger.warning(f"Expected array but got {type(sources_data)}. Wrapping in array.")
                        sources_data = [sources_data] if sources_data else []

                except (json.JSONDecodeError, ValueError) as parse_error:
                    logger.error(f"Failed to parse sources JSON: {parse_error}")
                    logger.warning("Continuing with empty AI sources list")
                    sources_data = []

            # Handle GitHub sources
            if isinstance(github_sources, Exception):
                logger.error(f"GitHub source fetch failed: {github_sources}")
                github_sources = []
            elif not github_sources:
                logger.info("No GitHub sources found")
                github_sources = []

            # Merge AI sources and GitHub sources
            # GitHub sources go first (higher priority due to community validation)
            all_sources = github_sources + sources_data

            logger.info(f"📊 Total sources: {len(all_sources)} ({len(github_sources)} from GitHub, {len(sources_data)} from AI)")

            # Build sources_by_topic mapping
            # For GitHub sources, associate them with all topics (they're comprehensive roadmaps)
            sources_by_topic = {}
            for topic in state['topics']:
                topic_id = topic['topic_id']
                sources_by_topic[topic_id] = []

                # Add all GitHub sources to every topic (they're comprehensive)
                for github_source in github_sources:
                    sources_by_topic[topic_id].append(github_source['source_id'])

                # Add AI sources that specifically cover this topic
                for source in sources_data:
                    if topic_id in source.get('topics_covered', []):
                        sources_by_topic[topic_id].append(source['source_id'])

            return {
                "sources": all_sources,
                "sources_by_topic": sources_by_topic,
                "sources_complete": True,
                "current_step": "identify_sources",
                "progress": 60
            }

        except Exception as e:
            logger.error(f"Error in identify_sources: {e}")
            # Return empty sources to allow workflow to continue
            return {
                "sources": [],
                "sources_by_topic": {},
                "sources_complete": True,  # Mark as complete to allow workflow to proceed
                "current_step": "identify_sources",
                "progress": 60,
                "warning": f"Source identification failed: {str(e)}"
            }

    async def _gather_resources_single_batch(
        self,
        batch: List[Dict],
        sources: List[Dict],
        batch_number: int
    ) -> List[Dict]:
        """
        Helper method to gather resources for a single batch of steps.

        Args:
            batch: List of roadmap steps in this batch
            sources: List of learning sources
            batch_number: Batch number for logging

        Returns:
            List of resources for this batch
        """
        batch_json = json.dumps(batch, indent=2)
        sources_json = json.dumps(sources, indent=2)

        logger.info(f"Processing batch {batch_number} ({len(batch)} steps)")

        prompt = self.prompts.get_gather_resources_prompt(
            roadmap_json=batch_json,
            sources_json=sources_json
        )
        system_prompt = self.prompts.get_gather_resources_system_prompt()

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=prompt)
        ]

        response = await self.llm.ainvoke(messages)

        if response.content and len(response.content.strip()) > 0:
            batch_resources = extract_json_from_response(response.content)
            logger.info(f"Batch {batch_number}: Got {len(batch_resources)} resources")
            return batch_resources
        else:
            logger.warning(f"Batch {batch_number}: Empty response, returning empty list")
            return []

    async def _gather_resources_batch(
        self,
        roadmap_steps: List[Dict],
        sources: List[Dict],
        batch_size: int = 3
    ) -> List[Dict]:
        """
        Helper method to gather resources in batches IN PARALLEL.

        Args:
            roadmap_steps: List of roadmap steps
            sources: List of learning sources
            batch_size: Number of steps to process per batch

        Returns:
            Combined list of resources from all batches
        """
        import asyncio

        # Create batches
        batches = []
        for i in range(0, len(roadmap_steps), batch_size):
            batch = roadmap_steps[i:i + batch_size]
            batches.append((batch, i // batch_size + 1))

        logger.info(f"🚀 Processing {len(batches)} batches in parallel...")

        # Process all batches in parallel
        batch_tasks = [
            self._gather_resources_single_batch(batch, sources, batch_num)
            for batch, batch_num in batches
        ]

        results = await asyncio.gather(*batch_tasks, return_exceptions=True)

        # Combine all resources
        all_resources = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Batch {i + 1} failed: {result}")
                continue
            if result:
                all_resources.extend(result)

        logger.info(f"✅ Gathered {len(all_resources)} total resources from {len(batches)} parallel batches")
        return all_resources

    async def gather_resources(self, state: CourseGenerationState) -> Dict[str, Any]:
        """
        Node 4: Gather specific learning resources for each roadmap step.

        Finds actual videos, tutorials, articles, etc. with links.
        Uses dynamic batching based on input size to avoid token limits.
        """
        logger.info("Gathering learning resources")

        roadmap_json = json.dumps(state['roadmap'], indent=2)
        sources_json = json.dumps(state['sources'], indent=2)
        num_steps = len(state['roadmap'])

        # Log input sizes to diagnose potential token limit issues
        logger.info(f"Roadmap JSON size: {len(roadmap_json)} chars")
        logger.info(f"Sources JSON size: {len(sources_json)} chars")
        logger.info(f"Number of roadmap steps: {num_steps}")

        # Calculate prompt size
        test_prompt = self.prompts.get_gather_resources_prompt(
            roadmap_json=roadmap_json,
            sources_json=sources_json
        )
        total_prompt_size = len(test_prompt)
        logger.info(f"Full prompt size: {total_prompt_size} chars (~{total_prompt_size // 4} tokens)")

        # Dynamic batching decision based on input size and number of steps
        # Approximate: 1 token ≈ 4 characters
        # Safe input limit: ~30k tokens (~120k chars) to leave room for output
        SAFE_PROMPT_LIMIT = 100000  # chars

        should_batch = False
        batch_size = 3  # default

        if total_prompt_size > SAFE_PROMPT_LIMIT:
            should_batch = True
            # Calculate optimal batch size: larger inputs need smaller batches
            batch_size = max(2, min(3, num_steps // 4))
            logger.warning(f"Prompt size ({total_prompt_size} chars) exceeds safe limit ({SAFE_PROMPT_LIMIT})")
            logger.info(f"Using PROACTIVE batching with batch_size={batch_size}")
        elif num_steps > 8:
            # If many steps, batch proactively even if prompt size is okay
            should_batch = True
            batch_size = 3
            logger.info(f"Many steps ({num_steps}), using PROACTIVE batching with batch_size={batch_size}")

        try:
            if should_batch:
                # Use batching from the start
                logger.info("🔄 Using batched resource gathering")
                resources_data = await self._gather_resources_batch(
                    state['roadmap'],
                    state['sources'],
                    batch_size=batch_size
                )

                if not resources_data:
                    raise ValueError("Batched resource gathering returned no results")
            else:
                # Try full request for smaller courses
                logger.info("📦 Using full resource gathering (no batching)")

                prompt = self.prompts.get_gather_resources_prompt(
                    roadmap_json=roadmap_json,
                    sources_json=sources_json
                )
                system_prompt = self.prompts.get_gather_resources_system_prompt()

                messages = [
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=prompt)
                ]

                response = await self.llm.ainvoke(messages)

                # Log response details for debugging
                logger.info(f"Response content length: {len(response.content) if response.content else 0}")

                if not response.content or len(response.content.strip()) == 0:
                    logger.warning("Empty response from LLM - falling back to batched approach")
                    # Fall back to batched processing
                    resources_data = await self._gather_resources_batch(
                        state['roadmap'],
                        state['sources'],
                        batch_size=2  # Use smaller batches for fallback
                    )

                    if not resources_data:
                        raise ValueError("LLM returned empty response even with batching - possible content filtering issue")
                else:
                    logger.info(f"Response preview (first 200 chars): {response.content[:200]}...")
                    resources_data = extract_json_from_response(response.content)

            # Build resources_by_step mapping
            resources_by_step = {}
            for step in state['roadmap']:
                step_id = step['step_id']
                resources_by_step[step_id] = []

            for resource in resources_data:
                step_id = resource.get('for_step')
                if step_id and step_id in resources_by_step:
                    resources_by_step[step_id].append(resource['resource_id'])

            logger.info(f"✅ Successfully gathered {len(resources_data)} resources for {num_steps} steps")

            return {
                "resources": resources_data,
                "resources_by_step": resources_by_step,
                "resources_complete": True,
                "current_step": "gather_resources",
                "progress": 85
            }

        except Exception as e:
            logger.error(f"Error in gather_resources: {e}")
            logger.exception("Full exception traceback:")
            return {
                "error": f"Failed to gather resources: {str(e)}",
                "current_step": "gather_resources",
                "progress": 60
            }

    async def generate_learning_content(self, state: CourseGenerationState) -> Dict[str, Any]:
        """
        Node 4.5: Generate AI-written learning content for each roadmap step.

        Creates comprehensive markdown/latex content explaining each subtopic.
        """
        logger.info("Generating AI learning content for roadmap steps")

        try:
            roadmap_steps = state['roadmap']
            all_topics = {t['topic_id']: t for t in state['topics']}
            generated_content = []

            logger.info(f"Generating content for {len(roadmap_steps)} steps")

            # Generate content for each step
            for i, step in enumerate(roadmap_steps):
                step_id = step['step_id']
                step_title = step['title']
                step_description = step['description']
                estimated_hours = step.get('estimated_hours', 2)

                # Gather concepts from topics in this step
                concepts = []
                for topic_id in step.get('topics', []):
                    topic = all_topics.get(topic_id)
                    if topic:
                        key_concepts = topic.get('key_concepts', [])
                        # Flatten concepts if nested and ensure they're strings
                        for concept in key_concepts:
                            if isinstance(concept, list):
                                # Handle nested lists
                                concepts.extend([str(c) for c in concept])
                            else:
                                concepts.append(str(concept))

                # Use first topic's difficulty if available, otherwise use course difficulty
                difficulty = state['difficulty']
                if step.get('topics'):
                    first_topic = all_topics.get(step['topics'][0])
                    if first_topic:
                        difficulty = first_topic.get('difficulty', difficulty)

                logger.info(f"Generating content for step {i+1}/{len(roadmap_steps)}: {step_title}")

                # Get prompts
                prompt = self.prompts.get_generate_learning_content_prompt(
                    step_title=step_title,
                    step_description=step_description,
                    concepts=concepts,
                    difficulty=difficulty,
                    estimated_hours=estimated_hours
                )
                system_prompt = self.prompts.get_generate_learning_content_system_prompt()

                # Generate content
                messages = [
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=prompt)
                ]

                response = await self.llm.ainvoke(messages)
                content = response.content.strip()

                # Store the generated content
                generated_content.append({
                    'step_id': step_id,
                    'content': content
                })

                logger.info(f"Generated {len(content)} characters of content for {step_title}")

            logger.info(f"✅ Successfully generated learning content for {len(generated_content)} steps")

            return {
                "learning_content": generated_content,
                "content_generation_complete": True,
                "current_step": "generate_learning_content",
                "progress": 75
            }

        except Exception as e:
            logger.error(f"Error in generate_learning_content: {e}")
            logger.exception("Full exception traceback:")
            return {
                "learning_content": [],
                "content_generation_complete": False,
                "error": f"Failed to generate learning content: {str(e)}",
                "current_step": "generate_learning_content",
                "progress": 60
            }

    async def _validate_youtube_video(self, url: str) -> tuple[bool, str]:
        """
        Validate YouTube video using oEmbed API (no API key needed).

        Args:
            url: YouTube video URL

        Returns:
            Tuple of (is_valid, status_message)
        """
        import re
        import aiohttp
        from aiohttp import ClientTimeout

        # Extract video ID from various YouTube URL formats
        youtube_regex = r'(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})'
        match = re.search(youtube_regex, url)

        if not match:
            return False, "invalid_url_format"

        video_id = match.group(1)

        # Use YouTube oEmbed API to check if video exists and is accessible
        oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"

        try:
            timeout = ClientTimeout(total=5)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(oembed_url) as response:
                    if response.status == 200:
                        data = await response.json()
                        # Video exists and is accessible
                        return True, "success"
                    elif response.status == 404:
                        return False, "video_not_found"
                    elif response.status == 401 or response.status == 403:
                        return False, "video_private_or_restricted"
                    else:
                        return False, f"http_error_{response.status}"
        except asyncio.TimeoutError:
            return False, "timeout"
        except Exception as e:
            logger.warning(f"YouTube validation error for {video_id}: {e}")
            return False, "validation_error"

    async def _validate_single_resource(self, resource: Dict[str, Any]) -> Dict[str, Any]:
        """
        Helper method to validate a single resource IN PARALLEL.

        Validates URL accessibility with enhanced YouTube-specific validation.
        """
        import aiohttp
        from aiohttp import ClientTimeout

        url = resource.get('url', '')
        resource_title = resource.get('title', 'Unknown')
        resource_type = resource.get('type', '')

        # YouTube-specific validation for video resources
        if resource_type == 'video' and ('youtube.com' in url or 'youtu.be' in url):
            is_valid, status_message = await self._validate_youtube_video(url)

            if is_valid:
                logger.info(f"✅ YouTube video validated: {resource_title}")
                return {
                    **resource,
                    "validated": True,
                    "validation_status": "success",
                    "status_code": 200,
                    "summary": resource.get('description', f"Learn {resource.get('title', 'this topic')} through this video")
                }
            else:
                logger.warning(f"❌ YouTube video invalid ({status_message}): {resource_title}")
                return {
                    **resource,
                    "validated": False,
                    "validation_status": status_message,
                    "status_code": None,
                    "summary": resource.get('description', f"Video unavailable: {status_message}")
                }

        # Standard HTTP validation for non-YouTube resources
        validated_status = "success"
        status_code = None

        try:
            # Actual URL validation (with short timeout)
            timeout = ClientTimeout(total=3)  # 3 second timeout (fast fail)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.head(url, allow_redirects=True) as response:
                    status_code = response.status
                    if 200 <= status_code < 400:
                        validated_status = "success"
                    else:
                        validated_status = "warning"
                        logger.warning(f"Resource {resource_title} returned status {status_code}")

        except asyncio.TimeoutError:
            validated_status = "timeout"
            logger.warning(f"Resource {resource_title} validation timed out")
        except Exception as e:
            validated_status = "error"
            logger.warning(f"Could not validate {resource_title}: {e}")

        # Add validation info
        return {
            **resource,
            "validated": validated_status == "success",
            "validation_status": validated_status,
            "status_code": status_code,
            "summary": resource.get('description', f"Learn {resource.get('title', 'this topic')} through this resource")
        }

    async def parallel_validation_and_extraction(self, state: CourseGenerationState) -> Dict[str, Any]:
        """
        Combined node: Run validate_resources and extract_content IN PARALLEL.

        Both operations work on resources but are independent:
        - Validation checks URL accessibility
        - Extraction pulls educational content
        They can run simultaneously to save time.
        """
        import asyncio

        logger.info("🚀 Running validation and content extraction in parallel...")

        # Run both operations concurrently
        validation_task = self.validate_resources(state)
        extraction_task = self.extract_content(state)

        validation_result, extraction_result = await asyncio.gather(
            validation_task,
            extraction_task,
            return_exceptions=True
        )

        # Merge results
        combined_result = {}

        # Process validation result
        if isinstance(validation_result, Exception):
            logger.error(f"Validation failed: {validation_result}")
            combined_result.update({
                "resources": state.get('resources', []),
                "validation_complete": False,
                "error": f"Validation failed: {str(validation_result)}"
            })
        else:
            combined_result.update(validation_result)

        # Process extraction result
        if isinstance(extraction_result, Exception):
            logger.error(f"Content extraction failed: {extraction_result}")
            combined_result.update({
                "extracted_content_by_resource": {},
                "github_resources": [],
                "extraction_complete": False
            })
            if "error" in combined_result:
                combined_result["error"] += f"; Extraction: {str(extraction_result)}"
            else:
                combined_result["error"] = f"Content extraction failed: {str(extraction_result)}"
        else:
            # Merge extraction results
            combined_result.update({
                "extracted_content_by_resource": extraction_result.get("extracted_content_by_resource", {}),
                "github_resources": extraction_result.get("github_resources", []),
                "extraction_complete": extraction_result.get("extraction_complete", False)
            })

        # Set overall progress
        combined_result["progress"] = 70
        combined_result["current_step"] = "parallel_validation_and_extraction"

        logger.info("✅ Completed validation and extraction in parallel")
        return combined_result

    async def validate_resources(self, state: CourseGenerationState) -> Dict[str, Any]:
        """
        Node 5: Validate resource links IN PARALLEL and add content summaries.

        Validates URLs concurrently and generates brief summaries for each resource.
        """
        logger.info("Validating resources and generating summaries (in parallel)")

        try:
            import asyncio

            resources = state.get('resources', [])

            if not resources:
                logger.info("No resources to validate")
                return {
                    "resources": [],
                    "validation_complete": True,
                    "current_step": "validate_resources",
                    "progress": 90
                }

            # Separate GitHub roadmap resources (already trusted) from others
            github_roadmap_resources = [
                r for r in resources
                if r.get('from_github_roadmap', False)
            ]
            other_resources = [
                r for r in resources
                if not r.get('from_github_roadmap', False)
            ]

            logger.info(f"📚 Found {len(github_roadmap_resources)} GitHub roadmap resources (skip validation)")
            logger.info(f"🚀 Validating {len(other_resources)} other resources in parallel...")

            # Skip validation for trusted GitHub resources, validate others
            validation_tasks = [
                self._validate_single_resource(resource)
                for resource in other_resources
            ]

            # Use semaphore to limit concurrent requests (max 50 at a time)
            semaphore = asyncio.Semaphore(50)

            async def validate_with_semaphore(resource):
                async with semaphore:
                    return await self._validate_single_resource(resource)

            validation_tasks = [
                validate_with_semaphore(resource)
                for resource in other_resources
            ]

            validated_resources = await asyncio.gather(*validation_tasks, return_exceptions=True)

            # Add GitHub resources without validation (they're pre-validated/trusted)
            for gh_resource in github_roadmap_resources:
                validated_resources.append({
                    **gh_resource,
                    "validated": True,
                    "validation_status": "trusted_source",
                    "summary": gh_resource.get('description', f"Curated resource from GitHub roadmap")
                })

            # Process results and filter out failed validations
            final_resources = []
            excluded_count = 0

            for i, result in enumerate(validated_resources):
                if isinstance(result, Exception):
                    logger.error(f"❌ Validation exception for resource {i}: {result}")
                    excluded_count += 1
                    # Skip resources that threw exceptions during validation
                    continue

                # Only include successfully validated resources
                if result.get('validated', False):
                    final_resources.append(result)
                    logger.info(f"✅ Included: {result.get('title', 'Unknown')} ({result.get('type', 'unknown')})")
                else:
                    excluded_count += 1
                    validation_status = result.get('validation_status', 'unknown')
                    logger.warning(f"❌ Excluded: {result.get('title', 'Unknown')} - Status: {validation_status}")

            successful = len(final_resources)
            total_checked = len(resources)

            logger.info(f"✅ Validation complete: {successful}/{total_checked} resources passed")
            logger.info(f"   ✓ Included: {successful} valid resources")
            logger.info(f"   ✗ Excluded: {excluded_count} invalid/unavailable resources")

            return {
                "resources": final_resources,
                "validation_complete": True,
                "validation_stats": {
                    "total": total_checked,
                    "passed": successful,
                    "excluded": excluded_count
                },
                "current_step": "validate_resources",
                "progress": 90
            }

        except Exception as e:
            logger.error(f"Error in validate_resources: {e}")
            logger.exception("Full exception traceback:")
            # On error, return resources without validation
            return {
                "resources": state.get('resources', []),
                "validation_complete": False,
                "error": f"Resource validation failed: {str(e)}",
                "current_step": "validate_resources",
                "progress": 85
            }

    async def _extract_single_resource(self, resource: Dict[str, Any]) -> Dict[str, Any]:
        """
        Helper method to extract content from a single resource.

        Returns:
            Dict with extraction results or None if skipped/failed
        """
        resource_id = resource.get('resource_id')
        resource_type = resource.get('type', '')
        resource_url = resource.get('url', '')
        resource_title = resource.get('title', '')

        # Skip video resources (they don't need extraction)
        if resource_type == 'video':
            return None

        # Check if it's a GitHub repo
        if 'github.com' in resource_url and resource_type in ['code', 'repository', 'tutorial']:
            logger.info(f"Extracting from GitHub repo: {resource_title}")

            try:
                prompt = self.prompts.get_extract_github_resources_prompt(repo_url=resource_url)
                messages = [
                    SystemMessage(content="You are a learning resource expert. Extract useful learning materials."),
                    HumanMessage(content=prompt)
                ]

                response = await self.llm.ainvoke(messages)
                github_data = extract_json_from_response(response.content)

                return {
                    'type': 'github',
                    'resource_id': resource_id,
                    'repo_url': resource_url,
                    'extracted_resources': github_data.get('extracted_resources', []),
                    'readme_content': github_data.get('readme_content', '')
                }

            except Exception as e:
                logger.warning(f"Failed to extract from GitHub repo {resource_url}: {e}")
                return None

        # For text-based resources (articles, docs, tutorials)
        elif resource_type in ['article', 'documentation', 'tutorial']:
            logger.info(f"Extracting from text resource: {resource_title}")

            try:
                prompt = self.prompts.get_extract_text_content_prompt(
                    url=resource_url,
                    resource_title=resource_title
                )
                messages = [
                    SystemMessage(content="You are an expert at extracting key educational content."),
                    HumanMessage(content=prompt)
                ]

                response = await self.llm.ainvoke(messages)
                extracted_text = response.content.strip()

                return {
                    'type': 'text',
                    'resource_id': resource_id,
                    'content': extracted_text
                }

            except Exception as e:
                logger.warning(f"Failed to extract from text resource {resource_url}: {e}")
                return None

        return None

    async def extract_content(self, state: CourseGenerationState) -> Dict[str, Any]:
        """
        Node 4.5: Extract content from text-based resources and GitHub repos IN PARALLEL.

        For text/docs/tutorials: Extract key educational content
        For GitHub repos: Extract useful links and resources

        Uses asyncio.gather() for parallel processing to save time.
        """
        logger.info("Extracting content from resources (in parallel)")

        try:
            import asyncio

            resources = state.get('resources', [])
            extracted_content_by_resource = {}
            github_resources = []

            logger.info(f"Analyzing {len(resources)} resources for content extraction")

            # Filter resources that need extraction
            resources_to_extract = [
                r for r in resources
                if r.get('type', '') != 'video'  # Skip videos
            ]

            if not resources_to_extract:
                logger.info("No resources require content extraction")
                return {
                    "extracted_content_by_resource": {},
                    "github_resources": [],
                    "extraction_complete": True,
                    "current_step": "extract_content",
                    "progress": 70
                }

            logger.info(f"🚀 Extracting content from {len(resources_to_extract)} resources in parallel...")

            # Process all resources in parallel using asyncio.gather
            extraction_tasks = [
                self._extract_single_resource(resource)
                for resource in resources_to_extract
            ]

            results = await asyncio.gather(*extraction_tasks, return_exceptions=True)

            # Process results
            for result in results:
                if result is None:
                    continue  # Skipped or failed

                if isinstance(result, Exception):
                    logger.warning(f"Extraction task failed with exception: {result}")
                    continue

                if result.get('type') == 'github':
                    github_resources.append({
                        'original_resource_id': result['resource_id'],
                        'repo_url': result['repo_url'],
                        'extracted_resources': result['extracted_resources'],
                        'readme_content': result['readme_content']
                    })
                    extracted_content_by_resource[result['resource_id']] = result['readme_content']

                elif result.get('type') == 'text':
                    extracted_content_by_resource[result['resource_id']] = result['content']

            logger.info(f"✅ Extracted content from {len(extracted_content_by_resource)} resources in parallel")
            logger.info(f"✅ Found {len(github_resources)} GitHub repos with additional resources")

            return {
                "extracted_content_by_resource": extracted_content_by_resource,
                "github_resources": github_resources,
                "extraction_complete": True,
                "current_step": "extract_content",
                "progress": 70
            }

        except Exception as e:
            logger.error(f"Error in extract_content: {e}")
            logger.exception("Full exception traceback:")
            return {
                "extracted_content_by_resource": {},
                "github_resources": [],
                "extraction_complete": False,
                "error": f"Failed to extract content: {str(e)}",
                "current_step": "extract_content",
                "progress": 65
            }

    async def _generate_single_step_content(
        self,
        step: Dict[str, Any],
        step_index: int,
        total_steps: int,
        all_topics: Dict[str, Any],
        resources_by_step: Dict[str, List[str]],
        all_resources: Dict[str, Any],
        extracted_content: Dict[str, str],
        state_difficulty: str
    ) -> Dict[str, Any]:
        """
        Helper method to generate content for a single roadmap step.

        Returns:
            Dict with step_id, content, and reference_ids
        """
        step_id = step['step_id']
        step_title = step['title']
        step_description = step['description']
        estimated_hours = step.get('estimated_hours', 2)

        # Gather concepts from topics
        concepts = []
        for topic_id in step.get('topics', []):
            topic = all_topics.get(topic_id)
            if topic:
                key_concepts = topic.get('key_concepts', [])
                # Flatten concepts if nested and ensure they're strings
                for concept in key_concepts:
                    if isinstance(concept, list):
                        concepts.extend([str(c) for c in concept])
                    else:
                        concepts.append(str(concept))

        # Get difficulty
        difficulty = state_difficulty
        if step.get('topics'):
            first_topic = all_topics.get(step['topics'][0])
            if first_topic:
                difficulty = first_topic.get('difficulty', difficulty)

        # Get resources for this step
        resource_ids = resources_by_step.get(step_id, [])
        step_resources = [all_resources.get(rid) for rid in resource_ids if rid in all_resources]

        # Collect extracted content for references
        reference_content = []
        reference_resource_ids = []
        for resource in step_resources:
            if resource:
                res_id = resource.get('resource_id')
                if res_id in extracted_content:
                    reference_content.append({
                        'title': resource.get('title'),
                        'type': resource.get('type'),
                        'content': extracted_content[res_id][:2000]
                    })
                    reference_resource_ids.append(res_id)

        logger.info(f"Generating content for step {step_index + 1}/{total_steps}: {step_title}")
        logger.info(f"  Using {len(reference_content)} extracted references")

        # Build enhanced prompt with references
        base_prompt = self.prompts.get_generate_learning_content_prompt(
            step_title=step_title,
            step_description=step_description,
            concepts=concepts,
            difficulty=difficulty,
            estimated_hours=estimated_hours
        )

        # Ensure base_prompt is a string
        if not isinstance(base_prompt, str):
            logger.error(f"base_prompt is {type(base_prompt)}, converting to string")
            base_prompt = str(base_prompt)

        # Add reference content if available
        if reference_content:
            refs_text = "\n\n**Reference Materials**:\n"
            for ref in reference_content:
                refs_text += f"\n**{ref['title']}** ({ref['type']}):\n{ref['content']}\n"
            enhanced_prompt = base_prompt + f"\n\n{refs_text}\n\nIncorporate insights from these reference materials in your teaching content."
        else:
            enhanced_prompt = base_prompt

        system_prompt = self.prompts.get_generate_learning_content_system_prompt()

        # Generate content
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=enhanced_prompt)
        ]

        response = await self.llm.ainvoke(messages)

        # Handle both string and list responses
        if isinstance(response.content, list):
            # If content is a list (e.g., from some LLM providers), join it
            content = ' '.join(str(item) for item in response.content).strip()
        else:
            content = response.content.strip()

        # Add references section to content
        if step_resources:
            references_md = "\n\n## References\n\n"
            for resource in step_resources:
                if resource:
                    references_md += f"- **{resource.get('title')}** - {resource.get('description', '')} ([Link]({resource.get('url')}))\n"
            content += references_md

        logger.info(f"✅ Generated {len(content)} characters of content for {step_title}")

        return {
            'step_id': step_id,
            'content': content,
            'reference_ids': reference_resource_ids
        }

    async def generate_learning_content_with_refs(self, state: CourseGenerationState) -> Dict[str, Any]:
        """
        Node 4.6: Generate AI-written learning content using extracted source content IN PARALLEL.

        Creates comprehensive markdown/latex content explaining each subtopic,
        incorporating insights from extracted resources.

        Uses asyncio.gather() for parallel processing to save time.
        """
        logger.info("Generating AI learning content with source references (in parallel)")

        try:
            import asyncio

            roadmap_steps = state['roadmap']
            all_topics = {t['topic_id']: t for t in state['topics']}
            resources_by_step = state.get('resources_by_step', {})
            all_resources = {r['resource_id']: r for r in state.get('resources', [])}
            extracted_content = state.get('extracted_content_by_resource', {})

            total_steps = len(roadmap_steps)
            logger.info(f"🚀 Generating content for {total_steps} steps in batches (batch size: {BATCH_SIZE})...")

            # Create tasks for all steps
            content_tasks = [
                self._generate_single_step_content(
                    step=step,
                    step_index=i,
                    total_steps=total_steps,
                    all_topics=all_topics,
                    resources_by_step=resources_by_step,
                    all_resources=all_resources,
                    extracted_content=extracted_content,
                    state_difficulty=state['difficulty']
                )
                for i, step in enumerate(roadmap_steps)
            ]

            # Execute content generation tasks in batches to avoid rate limiting
            results = await gather_with_batching(content_tasks)

            # Process results
            generated_content = []
            content_references = {}

            for result in results:
                if isinstance(result, Exception):
                    logger.error(f"Content generation task failed: {result}")
                    continue

                if result:
                    generated_content.append({
                        'step_id': result['step_id'],
                        'content': result['content']
                    })
                    content_references[result['step_id']] = result['reference_ids']

            logger.info(f"✅ Successfully generated learning content for {len(generated_content)}/{total_steps} steps")

            return {
                "learning_content": generated_content,
                "content_references": content_references,
                "content_generation_complete": True,
                "current_step": "generate_learning_content",
                "progress": 75
            }

        except Exception as e:
            logger.error(f"Error in generate_learning_content_with_refs: {e}")
            logger.exception("Full exception traceback:")
            return {
                "learning_content": [],
                "content_references": {},
                "content_generation_complete": False,
                "error": f"Failed to generate learning content: {str(e)}",
                "current_step": "generate_learning_content",
                "progress": 70
            }

    async def parallel_grouping_and_syllabus(self, state: CourseGenerationState) -> Dict[str, Any]:
        """
        Combined node: Run group_topics and generate_syllabus IN PARALLEL.

        Both operations are independent and can be executed simultaneously to save time.
        """
        import asyncio

        logger.info("🚀 Running grouping and syllabus generation in parallel...")

        # Run both operations concurrently
        grouping_task = self.group_topics(state)
        syllabus_task = self.generate_syllabus(state)

        grouping_result, syllabus_result = await asyncio.gather(
            grouping_task,
            syllabus_task,
            return_exceptions=True
        )

        # Merge results
        combined_result = {}

        # Process grouping result
        if isinstance(grouping_result, Exception):
            logger.error(f"Grouping failed: {grouping_result}")
            combined_result.update({
                "grouped_modules": [],
                "grouping_complete": False,
                "error": f"Grouping failed: {str(grouping_result)}"
            })
        else:
            combined_result.update(grouping_result)

        # Process syllabus result
        if isinstance(syllabus_result, Exception):
            logger.error(f"Syllabus generation failed: {syllabus_result}")
            combined_result.update({
                "syllabus_content": None,
                "syllabus_complete": False
            })
            if "error" in combined_result:
                combined_result["error"] += f"; Syllabus: {str(syllabus_result)}"
            else:
                combined_result["error"] = f"Syllabus generation failed: {str(syllabus_result)}"
        else:
            combined_result.update(syllabus_result)

        # Set overall progress (average of both)
        combined_result["progress"] = 85
        combined_result["current_step"] = "parallel_grouping_and_syllabus"

        logger.info("✅ Completed grouping and syllabus generation in parallel")
        return combined_result

    async def group_topics(self, state: CourseGenerationState) -> Dict[str, Any]:
        """
        Node 5: Group similar topics into larger modules.

        Organizes small topics into logical learning modules.
        """
        logger.info("Grouping topics into modules")

        try:
            roadmap_steps = state['roadmap']

            # Prepare topics list for grouping
            topics_list = [{'title': step['title'], 'description': step.get('description', ''), 'step_id': step['step_id']}
                          for step in roadmap_steps]

            prompt = self.prompts.get_group_topics_prompt(topics_list=topics_list)

            messages = [
                SystemMessage(content="You are a curriculum organization expert. Always return valid JSON."),
                HumanMessage(content=prompt)
            ]

            response = await self.llm.ainvoke(messages)
            grouping_data = extract_json_from_response(response.content)

            # Extract topics (the prompt asks for 'topics', not 'modules')
            grouped_topics = grouping_data.get('topics', [])

            logger.info(f"✅ Grouped {len(roadmap_steps)} topics into {len(grouped_topics)} topic groups")

            return {
                "grouped_modules": grouped_topics,  # Keep key as grouped_modules for compatibility
                "grouping_complete": True,
                "current_step": "group_topics",
                "progress": 80
            }

        except Exception as e:
            logger.error(f"Error in group_topics: {e}")
            logger.exception("Full exception traceback:")
            # On error, return no grouping (topics remain ungrouped)
            return {
                "grouped_modules": [],
                "grouping_complete": False,
                "error": f"Failed to group topics: {str(e)}",
                "current_step": "group_topics",
                "progress": 75
            }

    async def generate_syllabus(self, state: CourseGenerationState) -> Dict[str, Any]:
        """
        Node 6: Generate course syllabus/overview page.

        Creates a comprehensive course overview with goals, prerequisites, and structure.
        """
        logger.info("Generating course syllabus")

        try:
            # Gather all topics for overview
            roadmap_steps = state['roadmap']
            all_topic_titles = [step['title'] for step in roadmap_steps]

            # Determine prerequisites (can be customized)
            prerequisites = []  # Could be extracted from user input or inferred

            prompt = self.prompts.get_generate_syllabus_prompt(
                topic=state['topic'],
                goals=state['goals'],
                prerequisites=prerequisites,
                all_topics=all_topic_titles,
                difficulty=state['difficulty'],
                estimated_weeks=state['estimated_weeks']
            )

            messages = [
                SystemMessage(content="You are an expert course designer. Create engaging, informative syllabi."),
                HumanMessage(content=prompt)
            ]

            response = await self.llm.ainvoke(messages)
            syllabus_content = response.content.strip()

            logger.info(f"✅ Generated syllabus ({len(syllabus_content)} characters)")

            return {
                "syllabus_content": syllabus_content,
                "syllabus_complete": True,
                "current_step": "generate_syllabus",
                "progress": 85
            }

        except Exception as e:
            logger.error(f"Error in generate_syllabus: {e}")
            logger.exception("Full exception traceback:")
            return {
                "syllabus_content": None,
                "syllabus_complete": False,
                "error": f"Failed to generate syllabus: {str(e)}",
                "current_step": "generate_syllabus",
                "progress": 80
            }

    async def format_output(self, state: CourseGenerationState) -> Dict[str, Any]:
        """
        Node 7: Format the complete course for the frontend.

        Creates the final JSON structure with all information organized including
        grouped modules and syllabus.
        """
        logger.info("Formatting final course output")

        try:
            # Build content mapping from learning_content list
            content_by_step = {}
            for content_item in state.get('learning_content', []):
                step_id = content_item.get('step_id')
                content = content_item.get('content')
                if step_id and content:
                    content_by_step[step_id] = content

            # Build the complete course structure
            final_course = {
                "course_id": state['request_id'],
                "title": f"Complete {state['topic']} Learning Path",
                "description": f"A comprehensive {state['estimated_weeks']}-week learning path",
                "metadata": {
                    "difficulty": state['difficulty'],
                    "estimated_weeks": state['estimated_weeks'],
                    "hours_per_week": state['time_commitment'],
                    "total_hours": state['estimated_weeks'] * state['time_commitment'],
                    "created_at": None  # Will be set by service
                },
                "syllabus": {
                    "content": state.get('syllabus_content'),
                    "goals": state.get('goals', []),
                    "prerequisites": []  # Can be extended
                },
                "topics": state['topics'],
                "modules": state.get('grouped_modules', []),  # Grouped topics/modules
                "roadmap": {
                    "steps": state['roadmap'],
                    "prerequisite_graph": state['roadmap_graph']
                },
                "resources": {
                    "all_resources": state['resources'],
                    "by_step": state['resources_by_step'],
                    "sources_used": state['sources'],
                    "extracted_content": state.get('extracted_content_by_resource', {}),
                    "github_resources": state.get('github_resources', []),
                    "github_roadmap_resources": state.get('github_roadmap_resources', []),
                    "github_learning_paths": state.get('github_learning_paths', [])
                },
                "learning_content": {
                    "by_step": content_by_step,
                    "references": state.get('content_references', {})
                },
                "statistics": {
                    "total_topics": len(state['topics']),
                    "total_steps": len(state['roadmap']),
                    "total_modules": len(state.get('grouped_modules', [])),
                    "total_resources": len(state['resources']),
                    "github_roadmap_resources_count": len(state.get('github_roadmap_resources', [])),
                    "github_learning_paths_count": len(state.get('github_learning_paths', [])),
                    "free_resources": len([r for r in state['resources'] if r.get('free', True)]),
                    "video_resources": len([r for r in state['resources'] if r.get('type') == 'video']),
                    "text_resources": len([r for r in state['resources'] if r.get('type') in ['article', 'documentation', 'tutorial']]),
                    "github_resources_count": len([r for r in state['resources'] if r.get('from_github_roadmap', False)]),
                    "content_generated": len(content_by_step),
                    "extracted_content_count": len(state.get('extracted_content_by_resource', {}))
                }
            }

            return {
                "final_course": final_course,
                "current_step": "format_output",
                "progress": 100
            }

        except Exception as e:
            logger.error(f"Error in format_output: {e}")
            return {
                "error": f"Failed to format output: {str(e)}",
                "current_step": "format_output",
                "progress": 85
            }
