#!/usr/bin/env python3
"""
edX Course Extractor

This tool extracts course learning paths, syllabi, and content from edX courses.
"""

import requests
from bs4 import BeautifulSoup
import json
import re
import time
from typing import Dict, List, Optional, Tuple
from urllib.parse import quote, urljoin, urlparse
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class EdXExtractor:
    """Extract course content and learning paths from edX."""
    
    def __init__(self, verbose=True):
        """Initialize the edX extractor."""
        self.base_url = "https://www.edx.org"
        self.api_base = "https://www.edx.org/api"
        self.verbose = verbose
        
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        }
        
        self.session = requests.Session()
        self.session.headers.update(self.headers)
        
    def log(self, message, level="info"):
        """Log messages based on verbosity setting."""
        if self.verbose:
            if level == "error":
                logger.error(message)
            elif level == "warning":
                logger.warning(message)
            else:
                logger.info(message)
    
    def search_courses(self, topic: str, limit: int = 5) -> List[Dict]:
        """Search for edX courses by topic."""
        self.log(f"Searching edX for: {topic}")
        
        courses = []
        
        try:
            # Try multiple search approaches
            search_urls = [
                f"{self.base_url}/search?q={quote(topic)}",
                f"{self.base_url}/learn/{quote(topic.lower().replace(' ', '-'))}",
                f"{self.base_url}/course?search_query={quote(topic)}"
            ]
            
            for search_url in search_urls:
                if len(courses) >= limit:
                    break
                    
                try:
                    self.log(f"Trying search URL: {search_url}")
                    response = self.session.get(search_url, timeout=10)
                    
                    if response.status_code == 200:
                        soup = BeautifulSoup(response.content, 'html.parser')
                        
                        # Extract courses from search results
                        found_courses = self._extract_courses_from_page(soup, limit - len(courses))
                        courses.extend(found_courses)
                        
                        if found_courses:
                            self.log(f"Found {len(found_courses)} courses from search")
                            break
                    
                except Exception as e:
                    self.log(f"Error with search URL {search_url}: {e}", "warning")
                    continue
            
            # If no courses found via search, try popular courses
            if not courses:
                courses = self._get_popular_courses(topic, limit)
            
        except Exception as e:
            self.log(f"Error searching courses: {e}", "error")
        
        return courses[:limit]
    
    def _extract_courses_from_page(self, soup, limit: int) -> List[Dict]:
        """Extract course information from a search results page."""
        courses = []
        
        # Multiple selectors for different page structures
        selectors = [
            'div[class*="course-card"]',
            'article[class*="course"]',
            'div[class*="discovery-card"]',
            'a[href*="/course/"]',
            'a[href*="/learn/"]',
            'div[data-testid*="course"]'
        ]
        
        for selector in selectors:
            if len(courses) >= limit:
                break
                
            elements = soup.select(selector)
            
            for elem in elements[:limit - len(courses)]:
                try:
                    course_info = self._parse_course_element(elem)
                    if course_info and course_info.get('url'):
                        # Avoid duplicates
                        if not any(c['url'] == course_info['url'] for c in courses):
                            courses.append(course_info)
                except Exception as e:
                    self.log(f"Error parsing course element: {e}", "warning")
                    continue
        
        return courses
    
    def _parse_course_element(self, elem) -> Optional[Dict]:
        """Parse a course element to extract information."""
        course = {}
        
        try:
            # Find course link
            if elem.name == 'a':
                link = elem
            else:
                link = elem.find('a', href=re.compile(r'/(course|learn)/'))
            
            if not link:
                return None
            
            href = link.get('href', '')
            if not href:
                return None
            
            # Build full URL
            if not href.startswith('http'):
                href = urljoin(self.base_url, href)
            
            course['url'] = href
            
            # Extract slug from URL
            slug_match = re.search(r'/(course|learn)/([^/?#]+)', href)
            if slug_match:
                course['slug'] = slug_match.group(2)
            
            # Extract title
            title_elem = elem.find(['h2', 'h3', 'h4']) or link
            if title_elem:
                course['title'] = title_elem.get_text(strip=True)
            
            if not course.get('title') and course.get('slug'):
                course['title'] = course['slug'].replace('-', ' ').title()
            
            # Extract organization
            org_elem = elem.find(['span', 'div'], class_=re.compile(r'(org|partner|institution)'))
            if org_elem:
                course['organization'] = org_elem.get_text(strip=True)
            
            # Extract description
            desc_elem = elem.find(['p', 'div'], class_=re.compile(r'(description|summary)'))
            if desc_elem:
                course['description'] = desc_elem.get_text(strip=True)[:200]
            
            return course if course.get('url') else None
            
        except Exception as e:
            self.log(f"Error parsing course element: {e}", "warning")
            return None
    
    def _get_popular_courses(self, topic: str, limit: int) -> List[Dict]:
        """Get popular courses related to the topic."""
        
        # Popular edX courses by category
        popular_courses = {
            'computer science': [
                {
                    'title': 'CS50: Introduction to Computer Science',
                    'url': 'https://www.edx.org/learn/computer-science/harvard-university-cs50-s-introduction-to-computer-science',
                    'organization': 'Harvard University',
                    'slug': 'cs50-introduction-to-computer-science'
                },
                {
                    'title': 'Introduction to Computer Science and Programming Using Python',
                    'url': 'https://www.edx.org/learn/computer-science/massachusetts-institute-of-technology-introduction-to-computer-science-and-programming-using-python',
                    'organization': 'MIT',
                    'slug': 'introduction-to-computer-science-and-programming-using-python'
                }
            ],
            'data science': [
                {
                    'title': 'Data Science: R Basics',
                    'url': 'https://www.edx.org/learn/data-science/harvard-university-data-science-r-basics',
                    'organization': 'Harvard University',
                    'slug': 'data-science-r-basics'
                },
                {
                    'title': 'Introduction to Data Science',
                    'url': 'https://www.edx.org/learn/data-science/university-of-washington-introduction-to-data-science',
                    'organization': 'University of Washington',
                    'slug': 'introduction-to-data-science'
                }
            ],
            'machine learning': [
                {
                    'title': 'Machine Learning',
                    'url': 'https://www.edx.org/learn/machine-learning/stanford-university-machine-learning',
                    'organization': 'Stanford University',
                    'slug': 'machine-learning'
                },
                {
                    'title': 'Machine Learning with Python',
                    'url': 'https://www.edx.org/learn/machine-learning/ibm-machine-learning-with-python',
                    'organization': 'IBM',
                    'slug': 'machine-learning-with-python'
                }
            ],
            'artificial intelligence': [
                {
                    'title': 'CS50\'s Introduction to Artificial Intelligence with Python',
                    'url': 'https://www.edx.org/learn/artificial-intelligence/harvard-university-cs50-s-introduction-to-artificial-intelligence-with-python',
                    'organization': 'Harvard University',
                    'slug': 'cs50-introduction-to-artificial-intelligence-with-python'
                },
                {
                    'title': 'Artificial Intelligence (AI)',
                    'url': 'https://www.edx.org/learn/artificial-intelligence/columbia-university-artificial-intelligence-ai',
                    'organization': 'Columbia University',
                    'slug': 'artificial-intelligence-ai'
                }
            ],
            'python': [
                {
                    'title': 'Introduction to Python Programming',
                    'url': 'https://www.edx.org/learn/python/university-of-pennsylvania-introduction-to-python-programming',
                    'organization': 'University of Pennsylvania',
                    'slug': 'introduction-to-python-programming'
                },
                {
                    'title': 'Python Basics for Data Science',
                    'url': 'https://www.edx.org/learn/python/ibm-python-basics-for-data-science',
                    'organization': 'IBM',
                    'slug': 'python-basics-for-data-science'
                }
            ],
            'blockchain': [
                {
                    'title': 'Blockchain Fundamentals',
                    'url': 'https://www.edx.org/learn/blockchain/university-of-california-berkeley-blockchain-fundamentals',
                    'organization': 'UC Berkeley',
                    'slug': 'blockchain-fundamentals'
                },
                {
                    'title': 'Introduction to Hyperledger Blockchain Technologies',
                    'url': 'https://www.edx.org/learn/blockchain/the-linux-foundation-introduction-to-hyperledger-blockchain-technologies',
                    'organization': 'The Linux Foundation',
                    'slug': 'introduction-to-hyperledger-blockchain-technologies'
                }
            ]
        }
        
        # Find matching category
        topic_lower = topic.lower()
        
        for category, courses_list in popular_courses.items():
            if any(word in topic_lower for word in category.split()):
                return courses_list[:limit]
        
        # Default to computer science if no match
        return popular_courses.get('computer science', [])[:limit]
    
    def get_course_content(self, course_url: str) -> Dict:
        """Extract detailed course content including syllabus and learning path."""
        self.log(f"Extracting course from: {course_url}")
        
        course = {
            'url': course_url,
            'title': '',
            'organization': '',
            'description': '',
            'instructors': [],
            'duration': '',
            'effort': '',
            'level': '',
            'language': '',
            'syllabus': [],
            'learning_path': [],
            'modules': [],
            'skills': [],
            'prerequisites': '',
            'what_you_learn': []
        }
        
        try:
            response = self.session.get(course_url, timeout=15)
            
            if response.status_code != 200:
                self.log(f"Failed to fetch course page: {response.status_code}", "error")
                return course
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract basic information
            course.update(self._extract_basic_info(soup))
            
            # Extract what you'll learn
            course['what_you_learn'] = self._extract_learning_outcomes(soup)
            
            # Extract syllabus/modules
            course['syllabus'] = self._extract_syllabus(soup)
            course['modules'] = self._extract_modules(soup)
            
            # Extract learning path
            course['learning_path'] = self._extract_learning_path(soup)
            
            # Extract skills
            course['skills'] = self._extract_skills(soup)
            
            # Extract prerequisites
            course['prerequisites'] = self._extract_prerequisites(soup)
            
            # Extract instructors
            course['instructors'] = self._extract_instructors(soup)
            
        except Exception as e:
            self.log(f"Error extracting course content: {e}", "error")
        
        return course
    
    def _extract_basic_info(self, soup) -> Dict:
        """Extract basic course information."""
        info = {}
        
        # Title
        title_selectors = [
            'h1[class*="course-title"]',
            'h1[class*="course-name"]',
            'h1.banner-title',
            'h1',
            'meta[property="og:title"]'
        ]
        
        for selector in title_selectors:
            elem = soup.select_one(selector)
            if elem:
                if elem.name == 'meta':
                    info['title'] = elem.get('content', '')
                else:
                    info['title'] = elem.get_text(strip=True)
                break
        
        # Organization
        org_selectors = [
            'a[class*="institution"]',
            'span[class*="partner"]',
            'div[class*="org-name"]',
            'span[class*="organization"]'
        ]
        
        for selector in org_selectors:
            elem = soup.select_one(selector)
            if elem:
                info['organization'] = elem.get_text(strip=True)
                break
        
        # Description
        desc_selectors = [
            'div[class*="course-description"]',
            'div[class*="course-summary"]',
            'section[class*="about"]',
            'meta[name="description"]'
        ]
        
        for selector in desc_selectors:
            elem = soup.select_one(selector)
            if elem:
                if elem.name == 'meta':
                    info['description'] = elem.get('content', '')
                else:
                    info['description'] = elem.get_text(strip=True)[:500]
                break
        
        # Duration
        duration_elem = soup.find(string=re.compile(r'\d+\s*weeks?', re.I))
        if duration_elem:
            duration_match = re.search(r'(\d+\s*weeks?)', str(duration_elem), re.I)
            if duration_match:
                info['duration'] = duration_match.group(1)
        
        # Effort
        effort_elem = soup.find(string=re.compile(r'\d+[-–]\d+\s*hours?\s*per\s*week', re.I))
        if effort_elem:
            effort_match = re.search(r'(\d+[-–]\d+\s*hours?\s*per\s*week)', str(effort_elem), re.I)
            if effort_match:
                info['effort'] = effort_match.group(1)
        
        # Level
        level_elem = soup.find(string=re.compile(r'(beginner|intermediate|advanced)', re.I))
        if level_elem:
            level_match = re.search(r'(beginner|intermediate|advanced)', str(level_elem), re.I)
            if level_match:
                info['level'] = level_match.group(1).capitalize()
        
        # Language
        lang_elem = soup.find(string=re.compile(r'(english|spanish|french|chinese)', re.I))
        if lang_elem:
            lang_match = re.search(r'(english|spanish|french|chinese)', str(lang_elem), re.I)
            if lang_match:
                info['language'] = lang_match.group(1).capitalize()
        
        return info
    
    def _extract_learning_outcomes(self, soup) -> List[str]:
        """Extract what you'll learn / learning outcomes."""
        outcomes = []
        
        # Look for "What you'll learn" section
        outcomes_section = None
        
        # Try different heading patterns
        headings = soup.find_all(['h2', 'h3', 'h4'])
        for heading in headings:
            if any(pattern in heading.get_text().lower() for pattern in ['what you', 'learn', 'outcome']):
                outcomes_section = heading
                break
        
        if outcomes_section:
            # Find the list after the heading
            next_elem = outcomes_section.find_next_sibling()
            while next_elem:
                if next_elem.name in ['ul', 'ol']:
                    for li in next_elem.find_all('li')[:15]:
                        outcome = li.get_text(strip=True)
                        if outcome:
                            outcomes.append(outcome)
                    break
                elif next_elem.name in ['h2', 'h3', 'h4']:
                    break
                next_elem = next_elem.find_next_sibling()
        
        # Alternative: look for lists with learning-related class names
        if not outcomes:
            lists = soup.find_all(['ul', 'ol'], class_=re.compile(r'(outcome|objective|learn)'))
            for lst in lists[:2]:
                for li in lst.find_all('li')[:15]:
                    outcome = li.get_text(strip=True)
                    if outcome and len(outcome) > 10:
                        outcomes.append(outcome)
        
        return outcomes
    
    def _extract_syllabus(self, soup) -> List[Dict]:
        """Extract syllabus / course outline."""
        syllabus = []
        
        # Look for syllabus section
        syllabus_section = None
        
        headings = soup.find_all(['h2', 'h3', 'h4'])
        for heading in headings:
            if any(pattern in heading.get_text().lower() for pattern in ['syllabus', 'outline', 'curriculum']):
                syllabus_section = heading
                break
        
        if syllabus_section:
            current_topic = None
            next_elem = syllabus_section.find_next_sibling()
            
            while next_elem and next_elem.name not in ['h2']:
                if next_elem.name in ['h3', 'h4', 'h5']:
                    # New topic
                    if current_topic:
                        syllabus.append(current_topic)
                    
                    current_topic = {
                        'title': next_elem.get_text(strip=True),
                        'subtopics': []
                    }
                
                elif next_elem.name in ['ul', 'ol'] and current_topic:
                    # Subtopics
                    for li in next_elem.find_all('li')[:10]:
                        subtopic = li.get_text(strip=True)
                        if subtopic:
                            current_topic['subtopics'].append(subtopic)
                
                elif next_elem.name == 'p' and current_topic and not current_topic.get('description'):
                    # Topic description
                    current_topic['description'] = next_elem.get_text(strip=True)[:200]
                
                next_elem = next_elem.find_next_sibling()
            
            if current_topic:
                syllabus.append(current_topic)
        
        return syllabus
    
    def _extract_modules(self, soup) -> List[Dict]:
        """Extract course modules / weeks."""
        modules = []
        
        # Look for module/week sections
        module_selectors = [
            'div[class*="module"]',
            'div[class*="week"]',
            'section[class*="module"]',
            'article[class*="week"]'
        ]
        
        for selector in module_selectors:
            elements = soup.select(selector)
            
            if elements:
                for elem in elements[:20]:
                    module = self._parse_module(elem)
                    if module:
                        modules.append(module)
                break
        
        # Alternative: look for patterns in headings
        if not modules:
            headings = soup.find_all(['h2', 'h3', 'h4'], 
                                    string=re.compile(r'(week|module|unit|chapter)\s*\d+', re.I))
            
            for heading in headings[:20]:
                module = {
                    'title': heading.get_text(strip=True),
                    'topics': [],
                    'description': ''
                }
                
                # Get content after heading
                next_elem = heading.find_next_sibling()
                content_count = 0
                
                while next_elem and content_count < 5:
                    if next_elem.name in ['h2', 'h3', 'h4']:
                        break
                    elif next_elem.name == 'p' and not module['description']:
                        module['description'] = next_elem.get_text(strip=True)[:200]
                    elif next_elem.name in ['ul', 'ol']:
                        for li in next_elem.find_all('li')[:10]:
                            topic = li.get_text(strip=True)
                            if topic:
                                module['topics'].append(topic)
                    
                    next_elem = next_elem.find_next_sibling()
                    content_count += 1
                
                if module['topics'] or module['description']:
                    modules.append(module)
        
        return modules
    
    def _parse_module(self, elem) -> Optional[Dict]:
        """Parse a module element."""
        module = {}
        
        # Extract title
        title_elem = elem.find(['h2', 'h3', 'h4', 'h5'])
        if title_elem:
            module['title'] = title_elem.get_text(strip=True)
        else:
            # Try to get from class or aria-label
            if elem.get('aria-label'):
                module['title'] = elem.get('aria-label')
        
        if not module.get('title'):
            return None
        
        # Extract description
        desc_elem = elem.find('p')
        if desc_elem:
            module['description'] = desc_elem.get_text(strip=True)[:200]
        
        # Extract topics/lessons
        module['topics'] = []
        
        lists = elem.find_all(['ul', 'ol'])
        for lst in lists[:2]:
            for li in lst.find_all('li')[:15]:
                topic = li.get_text(strip=True)
                if topic and len(topic) > 5:
                    module['topics'].append(topic)
        
        # Extract duration if available
        duration_text = elem.get_text()
        duration_match = re.search(r'(\d+)\s*(hours?|minutes?)', duration_text, re.I)
        if duration_match:
            module['duration'] = duration_match.group(0)
        
        return module if (module.get('topics') or module.get('description')) else None
    
    def _extract_learning_path(self, soup) -> List[Dict]:
        """Extract structured learning path."""
        learning_path = []
        
        # For edX, learning path might be in program/certificate tracks
        path_section = soup.find(['section', 'div'], class_=re.compile(r'(program|pathway|track)'))
        
        if path_section:
            # Extract path steps
            steps = path_section.find_all(['div', 'article'], class_=re.compile(r'(step|course|phase)'))
            
            for step in steps[:10]:
                path_item = {}
                
                # Title
                title_elem = step.find(['h3', 'h4', 'h5'])
                if title_elem:
                    path_item['title'] = title_elem.get_text(strip=True)
                
                # Description
                desc_elem = step.find('p')
                if desc_elem:
                    path_item['description'] = desc_elem.get_text(strip=True)[:200]
                
                # Link
                link_elem = step.find('a')
                if link_elem:
                    href = link_elem.get('href', '')
                    if href:
                        path_item['url'] = urljoin(self.base_url, href)
                
                if path_item.get('title'):
                    learning_path.append(path_item)
        
        # If no structured path, build from modules
        if not learning_path and self._extract_modules(soup):
            modules = self._extract_modules(soup)
            for i, module in enumerate(modules, 1):
                learning_path.append({
                    'step': i,
                    'title': module.get('title', f'Module {i}'),
                    'description': module.get('description', ''),
                    'topics': module.get('topics', [])
                })
        
        return learning_path
    
    def _extract_skills(self, soup) -> List[str]:
        """Extract skills gained from the course."""
        skills = []
        
        # Look for skills section
        skills_section = None
        
        headings = soup.find_all(['h2', 'h3', 'h4'])
        for heading in headings:
            if 'skill' in heading.get_text().lower():
                skills_section = heading
                break
        
        if skills_section:
            # Find list after heading
            next_elem = skills_section.find_next_sibling()
            while next_elem:
                if next_elem.name in ['ul', 'ol']:
                    for li in next_elem.find_all('li')[:20]:
                        skill = li.get_text(strip=True)
                        if skill:
                            skills.append(skill)
                    break
                elif next_elem.name in ['h2', 'h3', 'h4']:
                    break
                next_elem = next_elem.find_next_sibling()
        
        # Alternative: look for skill tags
        if not skills:
            skill_tags = soup.find_all(['span', 'div'], class_=re.compile(r'(skill|tag|badge)'))
            for tag in skill_tags[:20]:
                skill = tag.get_text(strip=True)
                if skill and len(skill) > 2 and skill not in skills:
                    skills.append(skill)
        
        return skills
    
    def _extract_prerequisites(self, soup) -> str:
        """Extract prerequisites."""
        prerequisites = ""
        
        # Look for prerequisites section
        prereq_elem = soup.find(string=re.compile(r'prerequisite', re.I))
        
        if prereq_elem:
            parent = prereq_elem.parent
            if parent:
                # Get the content after prerequisites heading
                next_elem = parent.find_next_sibling()
                if next_elem:
                    prerequisites = next_elem.get_text(strip=True)[:300]
                else:
                    # Get from parent
                    prerequisites = parent.get_text(strip=True)[:300]
        
        return prerequisites
    
    def _extract_instructors(self, soup) -> List[str]:
        """Extract instructor names."""
        instructors = []
        
        # Look for instructor section
        instructor_selectors = [
            'div[class*="instructor"]',
            'section[class*="instructor"]',
            'div[class*="teacher"]',
            'div[class*="staff"]'
        ]
        
        for selector in instructor_selectors:
            elements = soup.select(selector)
            
            for elem in elements[:5]:
                # Find name
                name_elem = elem.find(['h3', 'h4', 'h5', 'span'], class_=re.compile(r'name'))
                if name_elem:
                    name = name_elem.get_text(strip=True)
                    if name and name not in instructors:
                        instructors.append(name)
        
        return instructors
    
    def extract_topic(self, topic: str, max_courses: int = 3) -> List[Dict]:
        """Main method to extract edX courses for a topic."""
        print(f"\n{'='*60}")
        print(f"edX Course Extractor")
        print(f"{'='*60}")
        print(f"Topic: {topic}")
        print(f"Max courses: {max_courses}")
        print(f"{'='*60}\n")
        
        # Search for courses
        courses = self.search_courses(topic, limit=max_courses * 2)
        
        if not courses:
            self.log("No courses found for this topic", "warning")
            return []
        
        self.log(f"Found {len(courses)} courses. Extracting content...")
        
        detailed_courses = []
        
        for i, course_info in enumerate(courses[:max_courses], 1):
            print(f"\n[{i}/{min(len(courses), max_courses)}] Processing: {course_info.get('title', 'Unknown')}")
            print(f"      Organization: {course_info.get('organization', 'N/A')}")
            print(f"      URL: {course_info['url']}")
            
            # Get detailed content
            course_content = self.get_course_content(course_info['url'])
            
            # Merge with search info
            course_content['search_metadata'] = course_info
            detailed_courses.append(course_content)
            
            # Print summary
            modules_count = len(course_content.get('modules', []))
            syllabus_count = len(course_content.get('syllabus', []))
            skills_count = len(course_content.get('skills', []))
            outcomes_count = len(course_content.get('what_you_learn', []))
            path_count = len(course_content.get('learning_path', []))
            
            print(f"      ✓ Modules: {modules_count}")
            print(f"      ✓ Syllabus topics: {syllabus_count}")
            print(f"      ✓ Learning outcomes: {outcomes_count}")
            print(f"      ✓ Skills: {skills_count}")
            print(f"      ✓ Learning path steps: {path_count}")
            
            if course_content.get('duration'):
                print(f"      ✓ Duration: {course_content['duration']}")
            
            if course_content.get('level'):
                print(f"      ✓ Level: {course_content['level']}")
            
            # Add delay between courses
            if i < min(len(courses), max_courses):
                time.sleep(2)
        
        return detailed_courses
    
    def save_to_json(self, data: List[Dict], filename: str):
        """Save extracted data to JSON file."""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"\n✅ Data saved to {filename}")
    
    def generate_report(self, courses: List[Dict]) -> str:
        """Generate a markdown report from extracted courses."""
        report = []
        
        report.append("# edX Courses Learning Path Report\n")
        
        for course in courses:
            report.append(f"## {course.get('title', 'Unknown Course')}")
            
            if course.get('organization'):
                report.append(f"**Organization**: {course['organization']}")
            
            report.append(f"**URL**: {course['url']}")
            
            if course.get('duration'):
                report.append(f"**Duration**: {course['duration']}")
            
            if course.get('effort'):
                report.append(f"**Effort**: {course['effort']}")
            
            if course.get('level'):
                report.append(f"**Level**: {course['level']}")
            
            if course.get('language'):
                report.append(f"**Language**: {course['language']}")
            
            if course.get('description'):
                report.append(f"\n### Description\n{course['description']}")
            
            # What You'll Learn
            if course.get('what_you_learn'):
                report.append("\n### What You'll Learn")
                for outcome in course['what_you_learn'][:10]:
                    report.append(f"- {outcome}")
            
            # Prerequisites
            if course.get('prerequisites'):
                report.append(f"\n### Prerequisites\n{course['prerequisites']}")
            
            # Learning Path
            if course.get('learning_path'):
                report.append("\n### Learning Path")
                for i, step in enumerate(course['learning_path'], 1):
                    report.append(f"\n**Step {i}: {step.get('title', 'Unknown')}**")
                    
                    if step.get('description'):
                        report.append(f"{step['description']}")
                    
                    if step.get('topics'):
                        for topic in step['topics'][:5]:
                            report.append(f"  - {topic}")
            
            # Modules
            elif course.get('modules'):
                report.append("\n### Course Modules")
                for module in course['modules'][:15]:
                    report.append(f"\n**{module['title']}**")
                    
                    if module.get('description'):
                        report.append(f"{module['description']}")
                    
                    if module.get('duration'):
                        report.append(f"*Duration: {module['duration']}*")
                    
                    if module.get('topics'):
                        for topic in module['topics'][:5]:
                            report.append(f"  - {topic}")
            
            # Syllabus
            elif course.get('syllabus'):
                report.append("\n### Course Syllabus")
                for topic in course['syllabus'][:15]:
                    report.append(f"- **{topic['title']}**")
                    
                    if topic.get('description'):
                        report.append(f"  {topic['description']}")
                    
                    for subtopic in topic.get('subtopics', [])[:5]:
                        report.append(f"  - {subtopic}")
            
            # Skills
            if course.get('skills'):
                report.append("\n### Skills You'll Gain")
                skills_line = ", ".join(course['skills'][:15])
                report.append(skills_line)
            
            # Instructors
            if course.get('instructors'):
                report.append("\n### Instructors")
                report.append(", ".join(course['instructors']))
            
            report.append("\n---\n")
        
        return "\n".join(report)


def main():
    """Main function to test the edX extractor."""
    import sys
    
    # Get topic from command line or use default
    topic = sys.argv[1] if len(sys.argv) > 1 else "data science"
    max_courses = int(sys.argv[2]) if len(sys.argv) > 2 else 3
    
    # Create extractor
    extractor = EdXExtractor(verbose=True)
    
    # Extract courses
    results = extractor.extract_topic(topic, max_courses=max_courses)
    
    if results:
        # Save to JSON
        filename = f"edx_{topic.replace(' ', '_')}.json"
        extractor.save_to_json(results, filename)
        
        # Generate and save report
        report = extractor.generate_report(results)
        report_filename = f"edx_{topic.replace(' ', '_')}_report.md"
        with open(report_filename, 'w', encoding='utf-8') as f:
            f.write(report)
        print(f"✅ Report saved to {report_filename}")
        
        # Print summary
        print(f"\n{'='*60}")
        print("EXTRACTION COMPLETE")
        print(f"{'='*60}")
        print(f"Total courses extracted: {len(results)}")
        
        total_modules = sum(len(c.get('modules', [])) for c in results)
        total_skills = sum(len(c.get('skills', [])) for c in results)
        total_outcomes = sum(len(c.get('what_you_learn', [])) for c in results)
        total_path_steps = sum(len(c.get('learning_path', [])) for c in results)
        
        print(f"Total modules: {total_modules}")
        print(f"Total learning outcomes: {total_outcomes}")
        print(f"Total skills: {total_skills}")
        print(f"Total learning path steps: {total_path_steps}")
        print(f"{'='*60}\n")
    else:
        print("\n❌ No results found")
    
    return results


if __name__ == "__main__":
    main()