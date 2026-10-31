"""
GitHub Roadmap Scraper Tool

This tool scrapes learning roadmaps from popular GitHub repositories
and extracts detailed learning paths with resources.
"""

import requests
from bs4 import BeautifulSoup
import json
import re
import time
from typing import Dict, List, Optional, Tuple
from urllib.parse import quote, urljoin, urlparse
import base64
import yaml
import os

class GitHubRoadmapScraper:
    """Scraper for GitHub learning roadmaps and tech paths."""
    
    def __init__(self, github_token: Optional[str] = None, verbose: bool = True):
        """
        Initialize the scraper.
        
        Args:
            github_token: Optional GitHub personal access token for higher rate limits
            verbose: Whether to output verbose logs
        """
        self.github_token = github_token or os.getenv('GITHUB_TOKEN')
        self.verbose = verbose
        self.base_url = "https://github.com"
        self.api_base_url = "https://api.github.com"
        self.raw_base_url = "https://raw.githubusercontent.com"
        
        # Popular roadmap repositories
        self.roadmap_repos = {
            'developer-roadmap': 'kamranahmedse/developer-roadmap',
            'awesome-roadmaps': 'liuchong/awesome-roadmaps',
            'computer-science': 'ossu/computer-science',
            'data-science': 'ossu/data-science',
            'ai-roadmap': 'AMAI-GmbH/AI-Expert-Roadmap',
            'game-dev': 'utilForever/game-developer-roadmap',
            'golang': 'Alikhll/golang-developer-roadmap',
            'react': 'adam-golab/react-developer-roadmap',
            'vue': 'flaviocopes/vue-developer-roadmap',
            'nodejs': 'aliyr/Nodejs-Developer-Roadmap',
            'python': 'ErdemOzgen/Python-developer-roadmap',
            'devops': 'milanm/DevOps-Roadmap',
            'android': 'mobile-roadmap/android-developer-roadmap',
            'ios': 'BohdanOrlov/iOS-Developer-Roadmap',
            'blockchain': 'OffcierCia/DeFi-Developer-Road-Map',
            'security': 'helloexp/0day',
            'ml-engineer': 'chris-chris/ml-engineer-roadmap',
            'backend': 'zhashkevych/awesome-backend',
            'frontend': 'Z8264/frontend-developer-roadmap'
        }
        
        # Headers for requests
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'application/vnd.github.v3+json'
        }
        
        if self.github_token:
            self.headers['Authorization'] = f'token {self.github_token}'
        
        self.session = requests.Session()
        self.session.headers.update(self.headers)
    
    def search_courses(self, topic: str, limit: int = 5) -> List[Dict]:
        """
        Wrapper method for compatibility with aggregator.
        Maps to search_roadmaps functionality.
        """
        roadmaps = self.search_roadmaps(topic)
        # Convert roadmap format to course format for compatibility
        courses = []
        for roadmap in roadmaps[:limit]:
            courses.append({
                'id': roadmap.get('repo', '').replace('/', '-'),
                'name': roadmap.get('name', 'Unknown Roadmap'),
                'url': roadmap.get('url', ''),
                'type': 'roadmap',
                'description': roadmap.get('description', '')
            })
        return courses
    
    def get_course_outline(self, course_url: str) -> Dict:
        """
        Wrapper method for compatibility with aggregator.
        Maps to get_roadmap_content functionality.
        """
        # Extract repo from URL
        if 'github.com' in course_url:
            parts = course_url.replace('https://github.com/', '').split('/')
            if len(parts) >= 2:
                repo = f"{parts[0]}/{parts[1]}"
                return self.get_roadmap_content(repo)
        
        return {
            'title': 'Roadmap not available',
            'description': '',
            'url': course_url,
            'modules': [],
            'learning_path': []
        }
    
    def search_roadmaps(self, topic: str) -> List[Dict]:
        """
        Search for roadmap repositories on GitHub.
        
        Args:
            topic: The topic to search for
            
        Returns:
            List of roadmap repositories
        """
        print(f"Searching GitHub for roadmaps on: {topic}")
        
        roadmaps = []
        
        # Check if topic matches known roadmaps
        topic_lower = topic.lower()
        for key, repo in self.roadmap_repos.items():
            if any(keyword in topic_lower for keyword in key.split('-')):
                roadmaps.append({
                    'name': key,
                    'repo': repo,
                    'url': f"{self.base_url}/{repo}",
                    'type': 'curated'
                })
        
        # Search GitHub for additional roadmaps
        search_queries = [
            f"{topic} roadmap",
            f"{topic} learning path",
            f"{topic} curriculum",
            f"awesome {topic}"
        ]
        
        for query in search_queries:
            try:
                api_url = f"{self.api_base_url}/search/repositories"
                params = {
                    'q': f"{query} in:readme stars:>100",
                    'sort': 'stars',
                    'order': 'desc',
                    'per_page': 5
                }
                
                response = self.session.get(api_url, params=params, timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    for item in data.get('items', [])[:3]:
                        repo_full_name = item['full_name']
                        
                        # Avoid duplicates
                        if not any(r['repo'] == repo_full_name for r in roadmaps):
                            roadmaps.append({
                                'name': item['name'],
                                'repo': repo_full_name,
                                'url': item['html_url'],
                                'description': item.get('description', ''),
                                'stars': item.get('stargazers_count', 0),
                                'type': 'discovered'
                            })
                
                # Respect rate limits
                if 'X-RateLimit-Remaining' in response.headers:
                    remaining = int(response.headers['X-RateLimit-Remaining'])
                    if remaining < 10:
                        print(f"Rate limit low ({remaining} remaining), waiting...")
                        time.sleep(2)
                
            except Exception as e:
                print(f"Error searching GitHub: {e}")
                continue
        
        # Sort by relevance (curated first, then by stars)
        roadmaps.sort(key=lambda x: (x['type'] != 'curated', -x.get('stars', 0)))
        
        return roadmaps[:10]  # Return top 10 roadmaps
    
    def get_roadmap_content(self, repo: str) -> Dict:
        """
        Get detailed content from a roadmap repository.
        
        Args:
            repo: Repository in format 'owner/name'
            
        Returns:
            Dictionary containing roadmap content
        """
        print(f"Fetching roadmap content from: {repo}")
        
        roadmap = {
            'repository': repo,
            'url': f"{self.base_url}/{repo}",
            'title': repo.split('/')[-1].replace('-', ' ').title(),
            'description': '',
            'learning_path': [],
            'resources': [],
            'topics': [],
            'metadata': {}
        }
        
        try:
            # Get repository information
            api_url = f"{self.api_base_url}/repos/{repo}"
            response = self.session.get(api_url, timeout=10)
            
            if response.status_code == 200:
                repo_data = response.json()
                roadmap['title'] = repo_data.get('name', roadmap['title'])
                roadmap['description'] = repo_data.get('description', '')
                roadmap['metadata'] = {
                    'stars': repo_data.get('stargazers_count', 0),
                    'forks': repo_data.get('forks_count', 0),
                    'language': repo_data.get('language', ''),
                    'updated': repo_data.get('updated_at', ''),
                    'topics': repo_data.get('topics', [])
                }
            
            # Get README content
            readme_content = self._get_readme_content(repo)
            if readme_content:
                roadmap['learning_path'] = self._extract_learning_path(readme_content)
                roadmap['resources'] = self._extract_resources(readme_content)
                roadmap['topics'] = self._extract_topics(readme_content)
            
            # Check for structured data files
            structured_data = self._get_structured_roadmap_data(repo)
            if structured_data:
                roadmap['structured_data'] = structured_data
            
            # Get additional markdown files that might contain roadmap details
            additional_content = self._get_additional_content(repo)
            if additional_content:
                roadmap['additional_content'] = additional_content
            
        except Exception as e:
            print(f"Error fetching roadmap content: {e}")
        
        return roadmap
    
    def _get_readme_content(self, repo: str) -> Optional[str]:
        """Get README content from repository."""
        try:
            # Try different README filenames
            readme_files = ['README.md', 'readme.md', 'README.MD', 'README.rst', 'README.txt']
            
            for readme_file in readme_files:
                api_url = f"{self.api_base_url}/repos/{repo}/contents/{readme_file}"
                response = self.session.get(api_url, timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    content = data.get('content', '')
                    
                    # Decode base64 content
                    if content:
                        decoded = base64.b64decode(content).decode('utf-8')
                        return decoded
            
            return None
            
        except Exception as e:
            print(f"Error getting README: {e}")
            return None
    
    def _extract_learning_path(self, content: str) -> List[Dict]:
        """Extract structured learning path from markdown content."""
        learning_path = []
        
        # Parse markdown structure
        lines = content.split('\n')
        current_section = None
        current_subsection = None
        
        for line in lines:
            line = line.strip()
            
            # Main section (## heading)
            if line.startswith('## ') and not line.startswith('## Table'):
                section_title = line.replace('##', '').strip()
                
                # Filter out non-learning sections
                if not any(skip in section_title.lower() for skip in 
                          ['license', 'contributing', 'credits', 'acknowledgments', 'faq']):
                    current_section = {
                        'title': section_title,
                        'description': '',
                        'subtopics': [],
                        'resources': []
                    }
                    learning_path.append(current_section)
                    current_subsection = None
            
            # Subsection (### heading)
            elif line.startswith('### ') and current_section:
                subsection_title = line.replace('###', '').strip()
                current_subsection = {
                    'title': subsection_title,
                    'items': []
                }
                current_section['subtopics'].append(current_subsection)
            
            # List items (potential learning items)
            elif line.startswith(('- ', '* ', '+ ', '1. ')) and (current_section or current_subsection):
                # Extract item text and links
                item_text = re.sub(r'^[-*+\d.]\s+', '', line)
                
                # Extract links
                links = re.findall(r'\[([^\]]+)\]\(([^)]+)\)', item_text)
                
                # Clean item text
                clean_text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', item_text).strip()
                
                if clean_text:
                    item = {
                        'text': clean_text,
                        'links': [{'title': link[0], 'url': link[1]} for link in links]
                    }
                    
                    if current_subsection:
                        current_subsection['items'].append(item)
                    elif current_section:
                        if 'items' not in current_section:
                            current_section['items'] = []
                        current_section['items'].append(item)
            
            # Description paragraphs
            elif line and not line.startswith('#') and current_section and not current_section['description']:
                current_section['description'] = line[:200]
        
        # Filter out empty sections
        learning_path = [s for s in learning_path if s.get('subtopics') or s.get('items')]
        
        return learning_path
    
    def _extract_resources(self, content: str) -> List[Dict]:
        """Extract learning resources from content."""
        resources = []
        
        # Find all links in the content
        link_pattern = r'\[([^\]]+)\]\(([^)]+)\)'
        matches = re.findall(link_pattern, content)
        
        # Categorize resources
        categories = {
            'courses': ['course', 'tutorial', 'class', 'mooc', 'coursera', 'udemy', 'edx'],
            'books': ['book', 'pdf', 'ebook', 'guide', 'manual'],
            'videos': ['video', 'youtube', 'watch', 'playlist'],
            'articles': ['article', 'blog', 'post', 'medium'],
            'tools': ['tool', 'github', 'repository', 'library', 'framework'],
            'documentation': ['docs', 'documentation', 'reference', 'api']
        }
        
        for title, url in matches:
            # Skip internal links
            if url.startswith('#'):
                continue
            
            # Determine resource type
            resource_type = 'other'
            title_lower = title.lower()
            url_lower = url.lower()
            
            for cat, keywords in categories.items():
                if any(kw in title_lower or kw in url_lower for kw in keywords):
                    resource_type = cat
                    break
            
            # Add to resources if not duplicate
            if not any(r['url'] == url for r in resources):
                resources.append({
                    'title': title,
                    'url': url,
                    'type': resource_type
                })
        
        return resources[:50]  # Limit to 50 resources
    
    def _extract_topics(self, content: str) -> List[str]:
        """Extract main topics covered in the roadmap."""
        topics = []
        
        # Extract from headings
        heading_pattern = r'^#{1,3}\s+(.+)$'
        headings = re.findall(heading_pattern, content, re.MULTILINE)
        
        # Filter and clean topics
        skip_words = ['table', 'content', 'license', 'contributing', 'credits', 
                     'acknowledgment', 'faq', 'about', 'introduction', 'getting started']
        
        for heading in headings:
            heading_clean = heading.strip().lower()
            
            if not any(skip in heading_clean for skip in skip_words):
                # Extract meaningful topic
                topic = heading.strip()
                
                # Remove common prefixes
                topic = re.sub(r'^\d+\.?\s*', '', topic)  # Remove numbering
                topic = re.sub(r'^(Learn|Study|Master|Understand)\s+', '', topic, flags=re.I)
                
                if topic and len(topic) > 3:
                    topics.append(topic)
        
        # Remove duplicates while preserving order
        seen = set()
        unique_topics = []
        for topic in topics:
            if topic.lower() not in seen:
                seen.add(topic.lower())
                unique_topics.append(topic)
        
        return unique_topics[:30]  # Limit to 30 topics
    
    def _get_structured_roadmap_data(self, repo: str) -> Optional[Dict]:
        """Look for structured roadmap data files (JSON, YAML)."""
        structured_data = {}
        
        # Common structured data files
        data_files = [
            'roadmap.json',
            'roadmap.yaml',
            'roadmap.yml',
            'curriculum.json',
            'curriculum.yaml',
            'path.json',
            'data/roadmap.json',
            'content/roadmap.json'
        ]
        
        for file_path in data_files:
            try:
                api_url = f"{self.api_base_url}/repos/{repo}/contents/{file_path}"
                response = self.session.get(api_url, timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    content = data.get('content', '')
                    
                    if content:
                        decoded = base64.b64decode(content).decode('utf-8')
                        
                        # Parse based on file extension
                        if file_path.endswith('.json'):
                            structured_data[file_path] = json.loads(decoded)
                        elif file_path.endswith(('.yaml', '.yml')):
                            structured_data[file_path] = yaml.safe_load(decoded)
                        
                        print(f"Found structured data: {file_path}")
                        
            except Exception as e:
                continue
        
        return structured_data if structured_data else None
    
    def _get_additional_content(self, repo: str) -> List[Dict]:
        """Get additional markdown files that might contain roadmap details."""
        additional_content = []
        
        try:
            # Get repository contents
            api_url = f"{self.api_base_url}/repos/{repo}/contents"
            response = self.session.get(api_url, timeout=10)
            
            if response.status_code == 200:
                contents = response.json()
                
                # Look for relevant markdown files
                relevant_patterns = ['roadmap', 'curriculum', 'path', 'guide', 'learn']
                
                for item in contents:
                    if item['type'] == 'file' and item['name'].endswith('.md'):
                        name_lower = item['name'].lower()
                        
                        # Check if file might contain roadmap content
                        if any(pattern in name_lower for pattern in relevant_patterns):
                            try:
                                # Get file content
                                file_response = self.session.get(item['url'], timeout=10)
                                if file_response.status_code == 200:
                                    file_data = file_response.json()
                                    content = file_data.get('content', '')
                                    
                                    if content:
                                        decoded = base64.b64decode(content).decode('utf-8')
                                        additional_content.append({
                                            'file': item['name'],
                                            'path': item['path'],
                                            'content_preview': decoded[:500],
                                            'learning_path': self._extract_learning_path(decoded)
                                        })
                                        print(f"Found additional content: {item['name']}")
                            except:
                                continue
        except Exception as e:
            print(f"Error getting additional content: {e}")
        
        return additional_content
    
    def scrape_topic(self, topic: str, max_roadmaps: int = 3) -> List[Dict]:
        """
        Main method to scrape roadmaps for a topic.
        
        Args:
            topic: The topic to search for
            max_roadmaps: Maximum number of roadmaps to scrape
            
        Returns:
            List of roadmap dictionaries with detailed information
        """
        print(f"\n{'='*60}")
        print(f"GitHub Roadmap Scraper")
        print(f"{'='*60}")
        print(f"Topic: {topic}")
        print(f"Max roadmaps: {max_roadmaps}")
        print(f"{'='*60}\n")
        
        # Search for roadmaps
        roadmaps = self.search_roadmaps(topic)
        
        if not roadmaps:
            print("No roadmaps found for this topic")
            return []
        
        print(f"Found {len(roadmaps)} potential roadmaps")
        
        # Get detailed content for each roadmap
        detailed_roadmaps = []
        
        for i, roadmap in enumerate(roadmaps[:max_roadmaps], 1):
            print(f"\n[{i}/{min(len(roadmaps), max_roadmaps)}] Processing: {roadmap['name']}")
            print(f"  Repository: {roadmap['repo']}")
            
            # Get detailed content
            content = self.get_roadmap_content(roadmap['repo'])
            
            # Merge with search metadata
            content['search_metadata'] = roadmap
            detailed_roadmaps.append(content)
            
            # Print summary
            path_count = len(content.get('learning_path', []))
            resource_count = len(content.get('resources', []))
            topic_count = len(content.get('topics', []))
            
            print(f"  ✓ Learning sections: {path_count}")
            print(f"  ✓ Resources: {resource_count}")
            print(f"  ✓ Topics covered: {topic_count}")
            
            if content.get('metadata'):
                stars = content['metadata'].get('stars', 0)
                print(f"  ✓ GitHub stars: {stars:,}")
            
            # Rate limiting
            if i < min(len(roadmaps), max_roadmaps):
                time.sleep(1)
        
        return detailed_roadmaps
    
    def save_to_json(self, data: List[Dict], filename: str):
        """Save scraped data to JSON file."""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"\n✅ Data saved to {filename}")
    
    def generate_learning_report(self, roadmaps: List[Dict]) -> str:
        """Generate a human-readable learning report from roadmaps."""
        report = []
        
        report.append("=" * 60)
        report.append("GITHUB LEARNING ROADMAP REPORT")
        report.append("=" * 60)
        
        for roadmap in roadmaps:
            report.append(f"\n## {roadmap['title']}")
            report.append(f"Repository: {roadmap['repository']}")
            report.append(f"URL: {roadmap['url']}")
            
            if roadmap.get('description'):
                report.append(f"\nDescription: {roadmap['description']}")
            
            # Learning Path
            if roadmap.get('learning_path'):
                report.append("\n### Learning Path:")
                for i, section in enumerate(roadmap['learning_path'], 1):
                    report.append(f"\n{i}. **{section['title']}**")
                    
                    if section.get('description'):
                        report.append(f"   {section['description']}")
                    
                    if section.get('subtopics'):
                        for subtopic in section['subtopics'][:5]:
                            report.append(f"   - {subtopic['title']}")
                            if subtopic.get('items'):
                                for item in subtopic['items'][:3]:
                                    report.append(f"     • {item['text']}")
            
            # Top Resources
            if roadmap.get('resources'):
                report.append("\n### Top Resources:")
                
                # Group by type
                by_type = {}
                for resource in roadmap['resources']:
                    resource_type = resource['type']
                    if resource_type not in by_type:
                        by_type[resource_type] = []
                    by_type[resource_type].append(resource)
                
                for resource_type, resources in list(by_type.items())[:5]:
                    report.append(f"\n**{resource_type.title()}:**")
                    for resource in resources[:3]:
                        report.append(f"- [{resource['title']}]({resource['url']})")
            
            # Topics
            if roadmap.get('topics'):
                report.append("\n### Topics Covered:")
                topics_line = ", ".join(roadmap['topics'][:15])
                report.append(topics_line)
            
            # Metadata
            if roadmap.get('metadata'):
                meta = roadmap['metadata']
                report.append("\n### Repository Stats:")
                report.append(f"- Stars: {meta.get('stars', 0):,}")
                report.append(f"- Forks: {meta.get('forks', 0):,}")
                if meta.get('language'):
                    report.append(f"- Language: {meta['language']}")
            
            report.append("\n" + "-" * 60)
        
        return "\n".join(report)


def main():
    """Main function to test the GitHub roadmap scraper."""
    import sys
    import os
    
    # Get topic from command line or use default
    topic = sys.argv[1] if len(sys.argv) > 1 else "machine learning"
    max_roadmaps = int(sys.argv[2]) if len(sys.argv) > 2 else 3
    
    # Optional: Get GitHub token from environment
    github_token = os.environ.get('GITHUB_TOKEN')
    
    # Create scraper
    scraper = GitHubRoadmapScraper(github_token=github_token)
    
    # Scrape roadmaps
    results = scraper.scrape_topic(topic, max_roadmaps=max_roadmaps)
    
    if results:
        # Save to JSON
        filename = f"github_{topic.replace(' ', '_')}_roadmap.json"
        scraper.save_to_json(results, filename)
        
        # Generate and save report
        report = scraper.generate_learning_report(results)
        report_filename = f"github_{topic.replace(' ', '_')}_roadmap_report.md"
        with open(report_filename, 'w', encoding='utf-8') as f:
            f.write(report)
        print(f"✅ Report saved to {report_filename}")
        
        # Print summary
        print(f"\n{'='*60}")
        print("SUMMARY")
        print(f"{'='*60}")
        print(f"Total roadmaps scraped: {len(results)}")
        
        total_sections = sum(len(r.get('learning_path', [])) for r in results)
        total_resources = sum(len(r.get('resources', [])) for r in results)
        total_topics = sum(len(r.get('topics', [])) for r in results)
        
        print(f"Total learning sections: {total_sections}")
        print(f"Total resources: {total_resources}")
        print(f"Total topics: {total_topics}")
        print(f"{'='*60}\n")
    else:
        print("No roadmaps found")
    
    return results


if __name__ == "__main__":
    main()