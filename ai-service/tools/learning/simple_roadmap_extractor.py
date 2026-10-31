#!/usr/bin/env python3
"""
Simple Roadmap Extractor - Direct web scraping version
Extracts roadmaps from roadmap.sh and other sources via web scraping
"""

import requests
from bs4 import BeautifulSoup
import json
import time
from typing import Dict, List, Optional

class SimpleRoadmapExtractor:
    """Extract roadmaps from roadmap.sh and similar websites."""
    
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)
    
    def get_roadmap_sh(self, topic: str) -> Dict:
        """Get roadmap from roadmap.sh website."""
        
        print(f"\nExtracting roadmap from roadmap.sh: {topic}")
        
        # roadmap.sh URLs
        url = f"https://roadmap.sh/{topic}"
        
        roadmap = {
            'topic': topic,
            'source': 'roadmap.sh',
            'url': url,
            'title': f'{topic.title()} Developer Roadmap',
            'description': '',
            'learning_path': [],
            'resources': [],
            'skills': []
        }
        
        try:
            response = self.session.get(url, timeout=10)
            if response.status_code != 200:
                print(f"  ✗ Failed to fetch page: {response.status_code}")
                return roadmap
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract title
            title_elem = soup.find('h1')
            if title_elem:
                roadmap['title'] = title_elem.get_text(strip=True)
            
            # Extract description
            desc_elem = soup.find('p', class_='text-gray-600') or soup.find('meta', {'name': 'description'})
            if desc_elem:
                if desc_elem.name == 'meta':
                    roadmap['description'] = desc_elem.get('content', '')
                else:
                    roadmap['description'] = desc_elem.get_text(strip=True)
            
            # Extract main topics/sections
            # roadmap.sh uses interactive SVG, but we can get the text content
            sections = []
            
            # Look for roadmap content sections
            content_sections = soup.find_all(['div', 'section'], class_=['roadmap-content', 'container'])
            
            for section in content_sections:
                # Find topic headings
                headings = section.find_all(['h2', 'h3'])
                for heading in headings[:20]:  # Limit to prevent too many
                    heading_text = heading.get_text(strip=True)
                    if heading_text and not any(skip in heading_text.lower() 
                                               for skip in ['sponsor', 'advertisement', 'footer']):
                        section_data = {
                            'title': heading_text,
                            'items': []
                        }
                        
                        # Get list items following the heading
                        next_elem = heading.find_next_sibling()
                        while next_elem and next_elem.name not in ['h2', 'h3']:
                            if next_elem.name in ['ul', 'ol']:
                                for li in next_elem.find_all('li')[:10]:
                                    item_text = li.get_text(strip=True)
                                    if item_text:
                                        section_data['items'].append(item_text)
                            next_elem = next_elem.find_next_sibling()
                        
                        if section_data['items']:
                            sections.append(section_data)
            
            roadmap['learning_path'] = sections
            
            # Extract resources/links
            links = soup.find_all('a', href=True)
            resources = []
            for link in links[:100]:  # Limit to prevent too many
                href = link.get('href', '')
                text = link.get_text(strip=True)
                
                # Filter for learning resources
                if any(pattern in href for pattern in ['github.com', 'youtube.com', 'docs.', 'learn.', 'tutorial']):
                    if text and len(text) > 3:
                        resources.append({
                            'title': text,
                            'url': href if href.startswith('http') else f"https://roadmap.sh{href}"
                        })
            
            # Deduplicate resources
            seen = set()
            unique_resources = []
            for r in resources:
                if r['url'] not in seen:
                    seen.add(r['url'])
                    unique_resources.append(r)
            
            roadmap['resources'] = unique_resources[:20]
            
            # Extract skills/technologies mentioned
            skills = []
            text_content = soup.get_text().lower()
            
            # Common technologies to look for
            tech_keywords = [
                'javascript', 'python', 'java', 'react', 'angular', 'vue', 'node.js', 'django',
                'spring', 'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'mongodb', 'postgresql',
                'redis', 'graphql', 'rest api', 'typescript', 'webpack', 'git', 'ci/cd',
                'html', 'css', 'sass', 'sql', 'nosql', 'microservices', 'serverless'
            ]
            
            for tech in tech_keywords:
                if tech in text_content:
                    skills.append(tech.title())
            
            roadmap['skills'] = skills[:15]
            
            print(f"  ✓ Extracted: {len(sections)} sections, {len(unique_resources)} resources, {len(skills)} skills")
            
        except Exception as e:
            print(f"  ✗ Error: {e}")
        
        return roadmap
    
    def get_github_readme_roadmap(self, repo: str) -> Dict:
        """Extract roadmap from GitHub README (raw content)."""
        
        print(f"\nExtracting roadmap from GitHub: {repo}")
        
        # Use raw GitHub content
        raw_url = f"https://raw.githubusercontent.com/{repo}/main/README.md"
        alt_url = f"https://raw.githubusercontent.com/{repo}/master/README.md"
        
        roadmap = {
            'topic': repo.split('/')[-1],
            'source': 'github',
            'repository': repo,
            'url': f"https://github.com/{repo}",
            'title': repo.split('/')[-1].replace('-', ' ').title(),
            'description': '',
            'modules': [],
            'resources': []
        }
        
        try:
            # Try main branch first
            response = self.session.get(raw_url, timeout=10)
            if response.status_code != 200:
                # Try master branch
                response = self.session.get(alt_url, timeout=10)
            
            if response.status_code != 200:
                print(f"  ✗ Failed to fetch README: {response.status_code}")
                return roadmap
            
            content = response.text
            lines = content.split('\n')
            
            # Extract title
            for line in lines[:10]:
                if line.startswith('# '):
                    roadmap['title'] = line.replace('#', '').strip()
                    break
            
            # Extract description
            for i, line in enumerate(lines):
                if line.strip() and not line.startswith('#') and not line.startswith('['):
                    roadmap['description'] = line.strip()[:200]
                    break
            
            # Extract modules/sections
            current_module = None
            modules = []
            
            for line in lines:
                # Main sections (## headings)
                if line.startswith('## ') and not any(skip in line.lower() 
                                                     for skip in ['license', 'contributing', 'table']):
                    if current_module:
                        modules.append(current_module)
                    
                    module_title = line.replace('##', '').strip()
                    current_module = {
                        'title': module_title,
                        'topics': []
                    }
                
                # Sub-sections (### headings)
                elif line.startswith('### ') and current_module:
                    topic = line.replace('###', '').strip()
                    current_module['topics'].append(topic)
                
                # Course/resource links in tables
                elif '|' in line and '[' in line and '](' in line:
                    # Extract links from markdown tables
                    import re
                    links = re.findall(r'\[([^\]]+)\]\(([^)]+)\)', line)
                    for title, url in links:
                        if url.startswith('http'):
                            roadmap['resources'].append({
                                'title': title,
                                'url': url
                            })
            
            # Add last module
            if current_module:
                modules.append(current_module)
            
            roadmap['modules'] = modules[:20]  # Limit modules
            
            # Deduplicate resources
            seen = set()
            unique_resources = []
            for r in roadmap['resources']:
                if r['url'] not in seen:
                    seen.add(r['url'])
                    unique_resources.append(r)
            
            roadmap['resources'] = unique_resources[:30]
            
            print(f"  ✓ Extracted: {len(modules)} modules, {len(unique_resources)} resources")
            
        except Exception as e:
            print(f"  ✗ Error: {e}")
        
        return roadmap
    
    def extract_multiple(self, topics: List[str]) -> List[Dict]:
        """Extract multiple roadmaps."""
        
        roadmaps = []
        
        # roadmap.sh topics
        roadmapsh_topics = ['frontend', 'backend', 'devops', 'react', 'angular', 'vue', 
                           'javascript', 'python', 'java', 'golang', 'rust']
        
        # GitHub repositories
        github_repos = {
            'computer-science': 'ossu/computer-science',
            'data-science': 'ossu/data-science',
            'ai-expert': 'AMAI-GmbH/AI-Expert-Roadmap',
            'blockchain': 'OffcierCia/DeFi-Developer-Road-Map'
        }
        
        for topic in topics:
            topic_lower = topic.lower().replace(' ', '-')
            
            # Check if it's a roadmap.sh topic
            if topic_lower in roadmapsh_topics:
                roadmap = self.get_roadmap_sh(topic_lower)
                roadmaps.append(roadmap)
            
            # Check if it's a known GitHub repo
            elif topic_lower in github_repos:
                roadmap = self.get_github_readme_roadmap(github_repos[topic_lower])
                roadmaps.append(roadmap)
            
            # Try roadmap.sh anyway
            else:
                roadmap = self.get_roadmap_sh(topic_lower)
                if roadmap.get('learning_path') or roadmap.get('resources'):
                    roadmaps.append(roadmap)
                else:
                    print(f"  ℹ No roadmap found for: {topic}")
            
            # Add delay between requests
            time.sleep(1)
        
        return roadmaps
    
    def save_results(self, roadmaps: List[Dict], filename: str):
        """Save roadmaps to JSON file."""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(roadmaps, f, indent=2, ensure_ascii=False)
        print(f"\n✅ Saved {len(roadmaps)} roadmaps to {filename}")
    
    def generate_report(self, roadmaps: List[Dict]) -> str:
        """Generate markdown report from roadmaps."""
        
        report = []
        report.append("# Extracted Learning Roadmaps\n")
        
        for roadmap in roadmaps:
            report.append(f"## {roadmap['title']}")
            report.append(f"**Source**: {roadmap['source']}")
            report.append(f"**URL**: {roadmap['url']}")
            
            if roadmap.get('description'):
                report.append(f"\n{roadmap['description']}\n")
            
            # Learning path or modules
            if roadmap.get('learning_path'):
                report.append("\n### Learning Path\n")
                for i, section in enumerate(roadmap['learning_path'][:10], 1):
                    report.append(f"{i}. **{section['title']}**")
                    for item in section.get('items', [])[:5]:
                        report.append(f"   - {item}")
            
            elif roadmap.get('modules'):
                report.append("\n### Modules\n")
                for i, module in enumerate(roadmap['modules'][:10], 1):
                    report.append(f"{i}. **{module['title']}**")
                    for topic in module.get('topics', [])[:5]:
                        report.append(f"   - {topic}")
            
            # Skills
            if roadmap.get('skills'):
                report.append("\n### Key Skills")
                skills_line = ", ".join(roadmap['skills'][:10])
                report.append(skills_line)
            
            # Resources
            if roadmap.get('resources'):
                report.append("\n### Resources")
                for resource in roadmap['resources'][:5]:
                    report.append(f"- [{resource['title']}]({resource['url']})")
            
            report.append("\n---\n")
        
        return "\n".join(report)


def main():
    """Test the simple roadmap extractor."""
    import sys
    
    # Get topics from command line
    if len(sys.argv) > 1:
        topics = sys.argv[1:]
    else:
        # Default test topics
        topics = ['frontend', 'backend', 'ai-expert', 'computer-science']
    
    print("="*60)
    print("SIMPLE ROADMAP EXTRACTOR")
    print("="*60)
    print(f"Extracting roadmaps for: {', '.join(topics)}")
    
    # Create extractor
    extractor = SimpleRoadmapExtractor()
    
    # Extract roadmaps
    roadmaps = extractor.extract_multiple(topics)
    
    # Save results
    if roadmaps:
        # Save JSON
        json_file = "extracted_roadmaps.json"
        extractor.save_results(roadmaps, json_file)
        
        # Generate and save report
        report = extractor.generate_report(roadmaps)
        report_file = "extracted_roadmaps.md"
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(report)
        print(f"✅ Saved report to {report_file}")
        
        # Summary
        print("\n" + "="*60)
        print("EXTRACTION SUMMARY")
        print("="*60)
        print(f"Total roadmaps extracted: {len(roadmaps)}")
        
        for roadmap in roadmaps:
            sections = len(roadmap.get('learning_path', [])) or len(roadmap.get('modules', []))
            resources = len(roadmap.get('resources', []))
            skills = len(roadmap.get('skills', []))
            
            print(f"\n{roadmap['title']}:")
            print(f"  - Sections/Modules: {sections}")
            print(f"  - Resources: {resources}")
            print(f"  - Skills: {skills}")
    
    return roadmaps


if __name__ == "__main__":
    main()