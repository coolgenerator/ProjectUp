"""
Roadmap Repository Extractor

This tool extracts detailed learning paths, modules, and resources from
dedicated roadmap repositories like kamranahmedse/developer-roadmap.
"""

import requests
from bs4 import BeautifulSoup
import json
import re
import time
import os
from typing import Dict, List, Optional, Tuple
from urllib.parse import quote, urljoin
import base64
import yaml
from pathlib import Path


class RoadmapExtractor:
    """Extract detailed roadmaps from GitHub roadmap repositories."""
    
    def __init__(self, github_token: Optional[str] = None):
        """Initialize the roadmap extractor."""
        self.base_url = "https://github.com"
        self.api_base_url = "https://api.github.com"
        self.raw_base_url = "https://raw.githubusercontent.com"
        
        # Well-known roadmap repositories with their structure
        self.roadmap_repos = {
            'frontend': {
                'repo': 'kamranahmedse/developer-roadmap',
                'path': 'src/data/roadmaps/frontend',
                'type': 'roadmap.sh'
            },
            'backend': {
                'repo': 'kamranahmedse/developer-roadmap',
                'path': 'src/data/roadmaps/backend',
                'type': 'roadmap.sh'
            },
            'devops': {
                'repo': 'kamranahmedse/developer-roadmap',
                'path': 'src/data/roadmaps/devops',
                'type': 'roadmap.sh'
            },
            'fullstack': {
                'repo': 'kamranahmedse/developer-roadmap',
                'path': 'src/data/roadmaps/full-stack',
                'type': 'roadmap.sh'
            },
            'react': {
                'repo': 'kamranahmedse/developer-roadmap',
                'path': 'src/data/roadmaps/react',
                'type': 'roadmap.sh'
            },
            'angular': {
                'repo': 'kamranahmedse/developer-roadmap',
                'path': 'src/data/roadmaps/angular',
                'type': 'roadmap.sh'
            },
            'vue': {
                'repo': 'kamranahmedse/developer-roadmap',
                'path': 'src/data/roadmaps/vue',
                'type': 'roadmap.sh'
            },
            'javascript': {
                'repo': 'kamranahmedse/developer-roadmap',
                'path': 'src/data/roadmaps/javascript',
                'type': 'roadmap.sh'
            },
            'nodejs': {
                'repo': 'kamranahmedse/developer-roadmap',
                'path': 'src/data/roadmaps/nodejs',
                'type': 'roadmap.sh'
            },
            'python': {
                'repo': 'kamranahmedse/developer-roadmap',
                'path': 'src/data/roadmaps/python',
                'type': 'roadmap.sh'
            },
            'golang': {
                'repo': 'kamranahmedse/developer-roadmap',
                'path': 'src/data/roadmaps/golang',
                'type': 'roadmap.sh'
            },
            'java': {
                'repo': 'kamranahmedse/developer-roadmap',
                'path': 'src/data/roadmaps/java',
                'type': 'roadmap.sh'
            },
            'blockchain': {
                'repo': 'kamranahmedse/developer-roadmap',
                'path': 'src/data/roadmaps/blockchain',
                'type': 'roadmap.sh'
            },
            'qa': {
                'repo': 'kamranahmedse/developer-roadmap',
                'path': 'src/data/roadmaps/qa',
                'type': 'roadmap.sh'
            },
            'software-design': {
                'repo': 'kamranahmedse/developer-roadmap',
                'path': 'src/data/roadmaps/software-design-architecture',
                'type': 'roadmap.sh'
            },
            'ai-data-scientist': {
                'repo': 'kamranahmedse/developer-roadmap',
                'path': 'src/data/roadmaps/ai-data-scientist',
                'type': 'roadmap.sh'
            },
            'mlops': {
                'repo': 'kamranahmedse/developer-roadmap',
                'path': 'src/data/roadmaps/mlops',
                'type': 'roadmap.sh'
            },
            'cyber-security': {
                'repo': 'kamranahmedse/developer-roadmap',
                'path': 'src/data/roadmaps/cyber-security',
                'type': 'roadmap.sh'
            },
            'ux-design': {
                'repo': 'kamranahmedse/developer-roadmap',
                'path': 'src/data/roadmaps/ux-design',
                'type': 'roadmap.sh'
            },
            'game-developer': {
                'repo': 'kamranahmedse/developer-roadmap',
                'path': 'src/data/roadmaps/game-developer',
                'type': 'roadmap.sh'
            },
            'computer-science': {
                'repo': 'ossu/computer-science',
                'path': '',
                'type': 'ossu'
            },
            'data-science-ossu': {
                'repo': 'ossu/data-science',
                'path': '',
                'type': 'ossu'
            },
            'ai-expert': {
                'repo': 'AMAI-GmbH/AI-Expert-Roadmap',
                'path': '',
                'type': 'ai-expert'
            },
            'android': {
                'repo': 'mobile-roadmap/android-developer-roadmap',
                'path': '',
                'type': 'mobile'
            },
            'ios': {
                'repo': 'BohdanOrlov/iOS-Developer-Roadmap',
                'path': '',
                'type': 'mobile'
            },
            'defi': {
                'repo': 'OffcierCia/DeFi-Developer-Road-Map',
                'path': '',
                'type': 'defi'
            }
        }
        
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'application/vnd.github.v3+json'
        }
        
        if github_token:
            self.headers['Authorization'] = f'token {github_token}'
        
        self.session = requests.Session()
        self.session.headers.update(self.headers)
    
    def list_available_roadmaps(self) -> List[str]:
        """List all available roadmap topics."""
        return list(self.roadmap_repos.keys())
    
    def get_roadmap(self, topic: str) -> Dict:
        """
        Get a specific roadmap by topic.
        
        Args:
            topic: The roadmap topic (e.g., 'frontend', 'backend', 'devops')
            
        Returns:
            Dictionary containing the roadmap data
        """
        topic_lower = topic.lower().replace(' ', '-')
        
        # Check if topic exists in predefined roadmaps
        if topic_lower not in self.roadmap_repos:
            # Try to find a matching topic
            for key in self.roadmap_repos.keys():
                if topic_lower in key or key in topic_lower:
                    topic_lower = key
                    break
            else:
                print(f"Topic '{topic}' not found. Available topics:")
                for t in sorted(self.roadmap_repos.keys()):
                    print(f"  - {t}")
                return {}
        
        roadmap_info = self.roadmap_repos[topic_lower]
        print(f"\nExtracting roadmap: {topic_lower}")
        print(f"Repository: {roadmap_info['repo']}")
        print(f"Type: {roadmap_info['type']}")
        
        # Extract based on repository type
        if roadmap_info['type'] == 'roadmap.sh':
            return self._extract_roadmap_sh(roadmap_info, topic_lower)
        elif roadmap_info['type'] == 'ossu':
            return self._extract_ossu_roadmap(roadmap_info, topic_lower)
        elif roadmap_info['type'] == 'ai-expert':
            return self._extract_ai_expert_roadmap(roadmap_info, topic_lower)
        elif roadmap_info['type'] == 'defi':
            return self._extract_defi_roadmap(roadmap_info, topic_lower)
        else:
            return self._extract_generic_roadmap(roadmap_info, topic_lower)
    
    def _extract_roadmap_sh(self, info: Dict, topic: str) -> Dict:
        """Extract roadmap from roadmap.sh style repository."""
        print(f"Extracting roadmap.sh style roadmap...")
        
        roadmap = {
            'topic': topic,
            'repository': info['repo'],
            'type': 'roadmap.sh',
            'title': topic.replace('-', ' ').title() + ' Developer Roadmap',
            'description': '',
            'modules': [],
            'resources': [],
            'metadata': {}
        }
        
        try:
            # Get the roadmap meta file
            meta_url = f"{self.api_base_url}/repos/{info['repo']}/contents/{info['path']}/meta.json"
            response = self.session.get(meta_url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                content = base64.b64decode(data['content']).decode('utf-8')
                meta_data = json.loads(content)
                
                roadmap['title'] = meta_data.get('title', roadmap['title'])
                roadmap['description'] = meta_data.get('description', '')
                roadmap['metadata'] = meta_data
            
            # Get content directory
            content_url = f"{self.api_base_url}/repos/{info['repo']}/contents/{info['path']}/content"
            response = self.session.get(content_url, timeout=10)
            
            if response.status_code == 200:
                contents = response.json()
                
                # Group content files by category
                modules = {}
                
                for item in contents:
                    if item['type'] == 'file' and item['name'].endswith('.md'):
                        # Extract module information from file
                        module_data = self._extract_module_from_file(info['repo'], item['path'])
                        if module_data:
                            # Group by category
                            category = module_data.get('category', 'General')
                            if category not in modules:
                                modules[category] = {
                                    'name': category,
                                    'topics': []
                                }
                            modules[category]['topics'].append(module_data)
                
                roadmap['modules'] = list(modules.values())
            
            # Try to get the main roadmap JSON structure
            roadmap_json_url = f"{self.api_base_url}/repos/{info['repo']}/contents/{info['path']}/{topic}.json"
            response = self.session.get(roadmap_json_url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                content = base64.b64decode(data['content']).decode('utf-8')
                roadmap_structure = json.loads(content)
                
                # Extract learning path from JSON structure
                if 'nodes' in roadmap_structure:
                    roadmap['learning_path'] = self._extract_learning_path_from_nodes(roadmap_structure['nodes'])
            
            # Get links/resources
            links_url = f"{self.api_base_url}/repos/{info['repo']}/contents/{info['path']}/links.json"
            response = self.session.get(links_url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                content = base64.b64decode(data['content']).decode('utf-8')
                links_data = json.loads(content)
                roadmap['resources'] = self._process_resources(links_data)
            
        except Exception as e:
            print(f"Error extracting roadmap.sh roadmap: {e}")
        
        return roadmap
    
    def _extract_module_from_file(self, repo: str, file_path: str) -> Optional[Dict]:
        """Extract module information from a markdown file."""
        try:
            api_url = f"{self.api_base_url}/repos/{repo}/contents/{file_path}"
            response = self.session.get(api_url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                content = base64.b64decode(data['content']).decode('utf-8')
                
                # Parse markdown content
                lines = content.split('\n')
                module = {
                    'file': file_path.split('/')[-1].replace('.md', ''),
                    'title': '',
                    'description': '',
                    'topics': [],
                    'resources': [],
                    'category': 'General'
                }
                
                # Extract title (first # heading)
                for line in lines:
                    if line.startswith('# '):
                        module['title'] = line.replace('#', '').strip()
                        break
                
                # Extract description (first paragraph)
                in_paragraph = False
                for line in lines:
                    if not line.startswith('#') and line.strip() and not in_paragraph:
                        module['description'] = line.strip()
                        in_paragraph = True
                    elif in_paragraph and not line.strip():
                        break
                
                # Extract topics (## headings)
                current_topic = None
                for line in lines:
                    if line.startswith('## '):
                        topic_title = line.replace('##', '').strip()
                        current_topic = {
                            'title': topic_title,
                            'items': []
                        }
                        module['topics'].append(current_topic)
                    elif line.startswith('- ') and current_topic:
                        item = line.replace('- ', '').strip()
                        current_topic['items'].append(item)
                
                # Extract links/resources
                link_pattern = r'\[([^\]]+)\]\(([^)]+)\)'
                for match in re.finditer(link_pattern, content):
                    module['resources'].append({
                        'title': match.group(1),
                        'url': match.group(2)
                    })
                
                return module if module['title'] else None
                
        except Exception as e:
            print(f"Error extracting module from {file_path}: {e}")
            return None
    
    def _extract_learning_path_from_nodes(self, nodes: Dict) -> List[Dict]:
        """Extract learning path from roadmap.sh node structure."""
        learning_path = []
        
        # Group nodes by their group/category
        groups = {}
        
        for node_id, node_data in nodes.items():
            group = node_data.get('group', 'Core')
            if group not in groups:
                groups[group] = []
            
            groups[group].append({
                'id': node_id,
                'title': node_data.get('title', node_data.get('label', '')),
                'description': node_data.get('description', ''),
                'isCore': node_data.get('isCore', False),
                'children': node_data.get('children', [])
            })
        
        # Convert groups to learning path
        for group_name, items in groups.items():
            path_section = {
                'section': group_name,
                'items': sorted(items, key=lambda x: x.get('isCore', False), reverse=True)
            }
            learning_path.append(path_section)
        
        return learning_path
    
    def _extract_ossu_roadmap(self, info: Dict, topic: str) -> Dict:
        """Extract OSSU (Open Source Society University) style roadmap."""
        print(f"Extracting OSSU style roadmap...")
        
        roadmap = {
            'topic': topic,
            'repository': info['repo'],
            'type': 'ossu',
            'title': topic.replace('-', ' ').title(),
            'description': '',
            'modules': [],
            'resources': [],
            'metadata': {}
        }
        
        try:
            # Get README
            readme_url = f"{self.api_base_url}/repos/{info['repo']}/readme"
            response = self.session.get(readme_url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                content = base64.b64decode(data['content']).decode('utf-8')
                
                # Extract curriculum from README
                roadmap['modules'] = self._extract_ossu_curriculum(content)
                roadmap['description'] = self._extract_description_from_readme(content)
                
                # Extract resources
                roadmap['resources'] = self._extract_resources_from_markdown(content)
        
        except Exception as e:
            print(f"Error extracting OSSU roadmap: {e}")
        
        return roadmap
    
    def _extract_ossu_curriculum(self, content: str) -> List[Dict]:
        """Extract curriculum structure from OSSU README."""
        modules = []
        lines = content.split('\n')
        
        current_module = None
        current_course = None
        
        for line in lines:
            # Module heading (## or ###)
            if line.startswith('## ') and 'curriculum' in line.lower():
                continue  # Skip main curriculum heading
            elif line.startswith('## '):
                if current_module:
                    modules.append(current_module)
                
                module_name = line.replace('##', '').strip()
                current_module = {
                    'name': module_name,
                    'courses': [],
                    'description': ''
                }
                current_course = None
                
            # Course heading (### or table row)
            elif line.startswith('### ') and current_module:
                course_name = line.replace('###', '').strip()
                current_course = {
                    'name': course_name,
                    'topics': [],
                    'resources': [],
                    'duration': '',
                    'effort': ''
                }
                current_module['courses'].append(current_course)
            
            # Parse table rows for course information
            elif '|' in line and current_module:
                parts = [p.strip() for p in line.split('|') if p.strip()]
                
                # Check if this is a course row (not header)
                if len(parts) >= 2 and not any(h in parts[0].lower() for h in ['course', 'name', '---']):
                    # Extract course information
                    course_info = {
                        'name': parts[0],
                        'duration': parts[1] if len(parts) > 1 else '',
                        'effort': parts[2] if len(parts) > 2 else '',
                        'prerequisites': parts[3] if len(parts) > 3 else '',
                        'topics': []
                    }
                    
                    # Extract link if present
                    link_match = re.search(r'\[([^\]]+)\]\(([^)]+)\)', parts[0])
                    if link_match:
                        course_info['name'] = link_match.group(1)
                        course_info['url'] = link_match.group(2)
                    
                    if current_module:
                        current_module['courses'].append(course_info)
        
        # Add last module
        if current_module:
            modules.append(current_module)
        
        return modules
    
    def _extract_ai_expert_roadmap(self, info: Dict, topic: str) -> Dict:
        """Extract AI Expert roadmap."""
        print(f"Extracting AI Expert roadmap...")
        
        roadmap = {
            'topic': topic,
            'repository': info['repo'],
            'type': 'ai-expert',
            'title': 'AI Expert Roadmap',
            'description': 'Roadmap to becoming an Artificial Intelligence Expert',
            'modules': [],
            'resources': [],
            'metadata': {}
        }
        
        try:
            # AI Expert roadmap has images and structured markdown
            readme_url = f"{self.api_base_url}/repos/{info['repo']}/readme"
            response = self.session.get(readme_url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                content = base64.b64decode(data['content']).decode('utf-8')
                
                # Extract roadmap sections
                roadmap['modules'] = self._extract_ai_roadmap_sections(content)
                roadmap['resources'] = self._extract_resources_from_markdown(content)
                
        except Exception as e:
            print(f"Error extracting AI Expert roadmap: {e}")
        
        return roadmap
    
    def _extract_ai_roadmap_sections(self, content: str) -> List[Dict]:
        """Extract sections from AI Expert roadmap."""
        modules = []
        lines = content.split('\n')
        
        # Look for roadmap sections
        roadmap_sections = [
            'Fundamentals',
            'Data Science Roadmap',
            'Machine Learning Roadmap',
            'Deep Learning Roadmap',
            'Data Engineer Roadmap',
            'Big Data Engineer Roadmap'
        ]
        
        for section in roadmap_sections:
            module = {
                'name': section,
                'description': '',
                'topics': [],
                'resources': []
            }
            
            # Find section in content
            section_found = False
            for i, line in enumerate(lines):
                if section in line and line.startswith('#'):
                    section_found = True
                    # Get description (next non-empty line)
                    for j in range(i+1, min(i+10, len(lines))):
                        if lines[j].strip() and not lines[j].startswith('#'):
                            module['description'] = lines[j].strip()
                            break
                    
                    # Get topics (bullet points after section)
                    for j in range(i+1, min(i+50, len(lines))):
                        if lines[j].startswith('- '):
                            topic = lines[j].replace('- ', '').strip()
                            module['topics'].append(topic)
                        elif lines[j].startswith('#') and j > i:
                            break  # Next section
            
            if section_found and module['topics']:
                modules.append(module)
        
        return modules
    
    def _extract_defi_roadmap(self, info: Dict, topic: str) -> Dict:
        """Extract DeFi Developer roadmap."""
        print(f"Extracting DeFi roadmap...")
        
        roadmap = {
            'topic': topic,
            'repository': info['repo'],
            'type': 'defi',
            'title': 'DeFi Developer Roadmap',
            'description': 'A curated Developer handbook for DApps development',
            'modules': [],
            'resources': [],
            'metadata': {}
        }
        
        try:
            readme_url = f"{self.api_base_url}/repos/{info['repo']}/readme"
            response = self.session.get(readme_url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                content = base64.b64decode(data['content']).decode('utf-8')
                
                # Extract DeFi specific sections
                roadmap['modules'] = self._extract_defi_sections(content)
                roadmap['resources'] = self._extract_resources_from_markdown(content)
                
        except Exception as e:
            print(f"Error extracting DeFi roadmap: {e}")
        
        return roadmap
    
    def _extract_defi_sections(self, content: str) -> List[Dict]:
        """Extract sections from DeFi roadmap."""
        modules = []
        lines = content.split('\n')
        
        current_module = None
        
        for line in lines:
            # Main sections (##)
            if line.startswith('## ') and not any(skip in line.lower() for skip in ['table', 'content', 'translation']):
                if current_module:
                    modules.append(current_module)
                
                module_name = line.replace('##', '').strip()
                # Clean emoji and special characters
                module_name = re.sub(r'[^\w\s-]', '', module_name).strip()
                
                current_module = {
                    'name': module_name,
                    'topics': [],
                    'resources': []
                }
            
            # Topics (### or bullet points)
            elif current_module:
                if line.startswith('### '):
                    topic = line.replace('###', '').strip()
                    current_module['topics'].append({
                        'title': topic,
                        'items': []
                    })
                elif line.startswith('- ') and current_module['topics']:
                    item = line.replace('- ', '').strip()
                    if current_module['topics']:
                        if isinstance(current_module['topics'][-1], dict):
                            current_module['topics'][-1]['items'].append(item)
                        else:
                            current_module['topics'].append(item)
                    else:
                        current_module['topics'].append(item)
        
        # Add last module
        if current_module:
            modules.append(current_module)
        
        return modules
    
    def _extract_generic_roadmap(self, info: Dict, topic: str) -> Dict:
        """Extract generic roadmap from repository."""
        print(f"Extracting generic roadmap...")
        
        roadmap = {
            'topic': topic,
            'repository': info['repo'],
            'type': 'generic',
            'title': topic.replace('-', ' ').title() + ' Roadmap',
            'description': '',
            'modules': [],
            'resources': [],
            'metadata': {}
        }
        
        try:
            # Get README
            readme_url = f"{self.api_base_url}/repos/{info['repo']}/readme"
            response = self.session.get(readme_url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                content = base64.b64decode(data['content']).decode('utf-8')
                
                roadmap['modules'] = self._extract_generic_modules(content)
                roadmap['resources'] = self._extract_resources_from_markdown(content)
                roadmap['description'] = self._extract_description_from_readme(content)
                
        except Exception as e:
            print(f"Error extracting generic roadmap: {e}")
        
        return roadmap
    
    def _extract_generic_modules(self, content: str) -> List[Dict]:
        """Extract modules from generic markdown content."""
        modules = []
        lines = content.split('\n')
        
        current_module = None
        
        for line in lines:
            if line.startswith('## ') and not any(skip in line.lower() for skip in ['license', 'contributing', 'table']):
                if current_module:
                    modules.append(current_module)
                
                module_name = line.replace('##', '').strip()
                current_module = {
                    'name': module_name,
                    'topics': [],
                    'description': ''
                }
            elif line.startswith('### ') and current_module:
                topic = line.replace('###', '').strip()
                current_module['topics'].append({
                    'title': topic,
                    'items': []
                })
            elif line.startswith('- ') and current_module:
                item = line.replace('- ', '').strip()
                if current_module['topics'] and isinstance(current_module['topics'][-1], dict):
                    current_module['topics'][-1]['items'].append(item)
                else:
                    current_module['topics'].append(item)
        
        if current_module:
            modules.append(current_module)
        
        return modules
    
    def _extract_resources_from_markdown(self, content: str) -> List[Dict]:
        """Extract all links/resources from markdown content."""
        resources = []
        
        link_pattern = r'\[([^\]]+)\]\(([^)]+)\)'
        for match in re.finditer(link_pattern, content):
            title = match.group(1)
            url = match.group(2)
            
            # Skip internal links and images
            if url.startswith('#') or url.endswith(('.png', '.jpg', '.gif', '.svg')):
                continue
            
            # Categorize resource
            resource_type = 'other'
            if 'youtube' in url or 'video' in title.lower():
                resource_type = 'video'
            elif 'github.com' in url:
                resource_type = 'repository'
            elif any(course in url for course in ['coursera', 'udemy', 'udacity', 'edx']):
                resource_type = 'course'
            elif 'book' in title.lower() or 'pdf' in url:
                resource_type = 'book'
            elif any(doc in url for doc in ['docs', 'documentation', 'wiki']):
                resource_type = 'documentation'
            
            resources.append({
                'title': title,
                'url': url,
                'type': resource_type
            })
        
        # Remove duplicates
        seen = set()
        unique_resources = []
        for r in resources:
            if r['url'] not in seen:
                seen.add(r['url'])
                unique_resources.append(r)
        
        return unique_resources[:100]  # Limit to 100 resources
    
    def _extract_description_from_readme(self, content: str) -> str:
        """Extract description from README content."""
        lines = content.split('\n')
        
        # Look for first paragraph after title
        found_title = False
        for line in lines:
            if line.startswith('# '):
                found_title = True
            elif found_title and line.strip() and not line.startswith('#'):
                return line.strip()[:500]
        
        return ""
    
    def _process_resources(self, links_data: any) -> List[Dict]:
        """Process and categorize resources."""
        resources = []
        
        if isinstance(links_data, list):
            for item in links_data:
                if isinstance(item, dict):
                    resources.append({
                        'title': item.get('title', item.get('name', '')),
                        'url': item.get('url', item.get('link', '')),
                        'type': item.get('type', 'other')
                    })
        elif isinstance(links_data, dict):
            for key, value in links_data.items():
                if isinstance(value, list):
                    for item in value:
                        if isinstance(item, dict):
                            resources.append({
                                'title': item.get('title', key),
                                'url': item.get('url', ''),
                                'type': key
                            })
        
        return resources
    
    def extract_multiple_roadmaps(self, topics: List[str]) -> List[Dict]:
        """Extract multiple roadmaps."""
        roadmaps = []
        
        for topic in topics:
            print(f"\n{'='*60}")
            print(f"Extracting: {topic}")
            print(f"{'='*60}")
            
            roadmap = self.get_roadmap(topic)
            if roadmap:
                roadmaps.append(roadmap)
                
                # Print summary
                modules_count = len(roadmap.get('modules', []))
                resources_count = len(roadmap.get('resources', []))
                
                print(f"✓ Modules: {modules_count}")
                print(f"✓ Resources: {resources_count}")
                
                # Add delay to respect rate limits
                time.sleep(1)
        
        return roadmaps
    
    def save_roadmap(self, roadmap: Dict, filename: str):
        """Save roadmap to JSON file."""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(roadmap, f, indent=2, ensure_ascii=False)
        print(f"✅ Roadmap saved to {filename}")
    
    def generate_markdown_report(self, roadmap: Dict) -> str:
        """Generate a markdown report from roadmap."""
        report = []
        
        report.append(f"# {roadmap.get('title', 'Roadmap')}")
        report.append(f"\n**Repository**: [{roadmap['repository']}](https://github.com/{roadmap['repository']})")
        report.append(f"**Type**: {roadmap.get('type', 'unknown')}")
        
        if roadmap.get('description'):
            report.append(f"\n## Description\n{roadmap['description']}")
        
        # Modules/Curriculum
        if roadmap.get('modules'):
            report.append("\n## Learning Modules\n")
            
            for i, module in enumerate(roadmap['modules'], 1):
                report.append(f"### {i}. {module.get('name', 'Module')}")
                
                if module.get('description'):
                    report.append(f"\n{module['description']}\n")
                
                # Topics
                if module.get('topics'):
                    report.append("\n**Topics:**")
                    for topic in module['topics']:
                        if isinstance(topic, dict):
                            report.append(f"- **{topic.get('title', '')}**")
                            for item in topic.get('items', []):
                                report.append(f"  - {item}")
                        else:
                            report.append(f"- {topic}")
                
                # Courses (for OSSU style)
                if module.get('courses'):
                    report.append("\n**Courses:**")
                    for course in module['courses']:
                        course_line = f"- {course.get('name', 'Course')}"
                        if course.get('duration'):
                            course_line += f" ({course['duration']})"
                        if course.get('url'):
                            course_line = f"- [{course.get('name', 'Course')}]({course['url']})"
                        report.append(course_line)
                
                report.append("")  # Empty line between modules
        
        # Learning Path (for roadmap.sh style)
        if roadmap.get('learning_path'):
            report.append("\n## Learning Path\n")
            for section in roadmap['learning_path']:
                report.append(f"### {section.get('section', 'Section')}")
                for item in section.get('items', []):
                    core_marker = "⭐" if item.get('isCore') else "○"
                    report.append(f"- {core_marker} {item.get('title', '')}")
                report.append("")
        
        # Resources
        if roadmap.get('resources'):
            report.append("\n## Resources\n")
            
            # Group by type
            by_type = {}
            for resource in roadmap['resources']:
                res_type = resource.get('type', 'other')
                if res_type not in by_type:
                    by_type[res_type] = []
                by_type[res_type].append(resource)
            
            for res_type, resources in by_type.items():
                report.append(f"\n### {res_type.title()}")
                for resource in resources[:10]:  # Limit to 10 per type
                    report.append(f"- [{resource['title']}]({resource['url']})")
        
        return "\n".join(report)


def main():
    """Main function to test the roadmap extractor."""
    import sys
    
    # Get topic from command line
    if len(sys.argv) > 1:
        topics = sys.argv[1:]
    else:
        # Default topics to extract
        topics = ['frontend', 'backend', 'ai-data-scientist']
    
    # Create extractor
    github_token = os.environ.get('GITHUB_TOKEN')
    extractor = RoadmapExtractor(github_token=github_token)
    
    print("\n" + "="*60)
    print("ROADMAP EXTRACTOR")
    print("="*60)
    print(f"Extracting roadmaps for: {', '.join(topics)}")
    
    # Show available roadmaps
    print("\nAvailable roadmaps:")
    available = extractor.list_available_roadmaps()
    for i in range(0, len(available), 5):
        print("  " + ", ".join(available[i:i+5]))
    
    # Extract roadmaps
    roadmaps = extractor.extract_multiple_roadmaps(topics)
    
    # Save results
    for roadmap in roadmaps:
        if roadmap:
            topic = roadmap['topic']
            
            # Save JSON
            json_file = f"roadmap_{topic}.json"
            extractor.save_roadmap(roadmap, json_file)
            
            # Save markdown report
            report = extractor.generate_markdown_report(roadmap)
            md_file = f"roadmap_{topic}.md"
            with open(md_file, 'w', encoding='utf-8') as f:
                f.write(report)
            print(f"✅ Report saved to {md_file}")
    
    # Print summary
    print("\n" + "="*60)
    print("EXTRACTION COMPLETE")
    print("="*60)
    print(f"Total roadmaps extracted: {len(roadmaps)}")
    
    for roadmap in roadmaps:
        if roadmap:
            print(f"\n{roadmap['topic']}:")
            print(f"  - Modules: {len(roadmap.get('modules', []))}")
            print(f"  - Resources: {len(roadmap.get('resources', []))}")
            
            # Count total topics
            total_topics = 0
            for module in roadmap.get('modules', []):
                total_topics += len(module.get('topics', []))
            print(f"  - Total topics: {total_topics}")
    
    return roadmaps


if __name__ == "__main__":
    main()