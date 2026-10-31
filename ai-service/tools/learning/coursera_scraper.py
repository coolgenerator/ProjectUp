"""
Enhanced Coursera Course Outline Scraper Tool V3

This version follows specializations/series to get detailed module information
from individual courses when the parent specialization lacks details.
"""

import requests
from bs4 import BeautifulSoup
import json
import time
import re
from typing import Dict, List, Optional, Tuple
from urllib.parse import quote, urlparse
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class CourseraScraperV3:
    """Enhanced Scraper that follows course series for complete module details."""
    
    def __init__(self, verbose=True, follow_depth=2):
        self.base_url = "https://www.coursera.org"
        self.verbose = verbose
        self.follow_depth = follow_depth  # How deep to follow course links
        self.visited_urls = set()  # Track visited URLs to avoid loops
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0'
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
        """Search for courses on Coursera by topic."""
        self.log(f"Searching for courses on topic: {topic}")
        
        try:
            search_query = quote(topic)
            search_urls = [
                f"{self.base_url}/search?query={search_query}",
                f"{self.base_url}/courses?query={search_query}",
                f"{self.base_url}/search?query={search_query}&product_type=COURSE"
            ]
            
            courses = []
            for url in search_urls:
                if courses:
                    break
                    
                try:
                    response = self.session.get(url, timeout=10)
                    if response.status_code == 200:
                        courses = self._extract_courses_from_search(response.text, limit)
                        if courses:
                            self.log(f"Found {len(courses)} courses using URL pattern: {url}")
                            break
                except Exception as e:
                    self.log(f"Error with URL {url}: {e}", "warning")
                    continue
            
            return courses[:limit]
            
        except Exception as e:
            self.log(f"Error searching courses: {e}", "error")
            return []
    
    def _extract_courses_from_search(self, html_content: str, limit: int) -> List[Dict]:
        """Extract course information from search results HTML."""
        soup = BeautifulSoup(html_content, 'html.parser')
        courses = []
        
        selectors = [
            ('a[data-click-key*="search.search.click.search_card"]', 'href'),
            ('div[data-testid*="search-card"]', 'a'),
            ('div.result-title-container a', 'href'),
            ('a[data-track-component="search_card"]', 'href'),
            ('div.card-content a.headline-1-text', 'href'),
            ('a[href*="/learn/"]', 'href'),
            ('a[href*="/specializations/"]', 'href'),
            ('a[href*="/professional-certificates/"]', 'href')
        ]
        
        for selector, attr in selectors:
            if len(courses) >= limit:
                break
                
            elements = soup.select(selector)
            for elem in elements[:limit - len(courses)]:
                try:
                    if attr == 'href':
                        href = elem.get('href', '')
                    else:
                        link_elem = elem.find('a')
                        href = link_elem.get('href', '') if link_elem else ''
                    
                    if any(pattern in href for pattern in ['/learn/', '/professional-certificates/', '/specializations/']):
                        slug_match = re.search(r'/(learn|professional-certificates|specializations)/([^/?#]+)', href)
                        if slug_match:
                            slug = slug_match.group(2)
                            course_type = slug_match.group(1)
                            
                            title = None
                            if elem.name == 'a':
                                title = elem.get_text(strip=True)
                            else:
                                title_elem = elem.find(['h2', 'h3', 'h4']) or elem.find(class_=re.compile('.*title.*'))
                                if title_elem:
                                    title = title_elem.get_text(strip=True)
                            
                            if not title:
                                title = slug.replace('-', ' ').title()
                            
                            course_url = href if href.startswith('http') else f"{self.base_url}{href}"
                            
                            if not any(c['slug'] == slug for c in courses):
                                courses.append({
                                    'id': slug,
                                    'slug': slug,
                                    'name': title,
                                    'url': course_url,
                                    'type': course_type
                                })
                            
                except Exception as e:
                    self.log(f"Error parsing course element: {e}", "warning")
                    continue
        
        return courses
    
    def get_course_outline(self, course_url: str, depth: int = 0) -> Dict:
        """Get detailed course outline, following series/specializations if needed."""
        
        if course_url in self.visited_urls:
            self.log(f"Already visited {course_url}, skipping to avoid loops")
            return self._create_empty_outline(course_url)
        
        self.visited_urls.add(course_url)
        self.log(f"Fetching course outline from: {course_url} (depth: {depth})")
        
        try:
            response = self.session.get(course_url, timeout=15)
            if response.status_code != 200:
                self.log(f"Failed to fetch course page. Status: {response.status_code}", "error")
                return self._create_empty_outline(course_url)
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Determine if this is a specialization/series
            is_specialization = any(pattern in course_url for pattern in ['/specializations/', '/professional-certificates/'])
            
            outline = {
                'title': self._extract_title(soup),
                'description': self._extract_description(soup),
                'url': course_url,
                'type': 'specialization' if is_specialization else 'course',
                'modules': [],
                'metadata': {},
                'courses': []  # For specializations
            }
            
            # Extract modules
            modules = self._extract_all_modules(soup)
            
            # If this is a specialization with no/few modules, get individual courses
            if is_specialization and len(modules) < 3 and depth < self.follow_depth:
                self.log(f"Specialization has {len(modules)} modules, fetching individual courses...")
                individual_courses = self._extract_specialization_courses(soup, course_url)
                
                if individual_courses:
                    self.log(f"Found {len(individual_courses)} courses in specialization")
                    outline['courses'] = []
                    
                    for i, course_info in enumerate(individual_courses, 1):
                        self.log(f"  [{i}/{len(individual_courses)}] Fetching: {course_info['name']}")
                        
                        # Recursively get outline for each course
                        course_outline = self.get_course_outline(course_info['url'], depth + 1)
                        course_outline['parent_specialization'] = outline['title']
                        outline['courses'].append(course_outline)
                        
                        # Aggregate modules from all courses
                        if course_outline.get('modules'):
                            for module in course_outline['modules']:
                                module['source_course'] = course_outline['title']
                                modules.append(module)
                        
                        # Add delay between requests
                        if i < len(individual_courses):
                            time.sleep(1.5)
            
            outline['modules'] = modules
            outline['metadata'] = self._extract_comprehensive_metadata(soup)
            outline['instructors'] = self._extract_instructors(soup)
            outline['skills'] = self._extract_skills(soup)
            
            return outline
            
        except Exception as e:
            self.log(f"Error getting course outline: {e}", "error")
            return self._create_empty_outline(course_url)
    
    def _extract_specialization_courses(self, soup, parent_url: str) -> List[Dict]:
        """Extract individual course links from a specialization page."""
        courses = []
        
        # Multiple strategies to find course links
        strategies = [
            # Strategy 1: Look for course cards/items
            ('div[data-testid*="course-item"]', 'a'),
            ('div.course-item', 'a'),
            ('div[class*="CourseItem"]', 'a'),
            
            # Strategy 2: Look for links with specific patterns
            ('a[href*="/learn/"][data-track-component*="course"]', 'self'),
            ('a[href*="/learn/"][class*="course"]', 'self'),
            
            # Strategy 3: Look in curriculum/syllabus sections
            ('div#syllabus a[href*="/learn/"]', 'self'),
            ('div[aria-label*="curriculum"] a[href*="/learn/"]', 'self'),
            
            # Strategy 4: Generic course links
            ('a[href*="/learn/"]', 'self')
        ]
        
        found_urls = set()
        
        for selector, link_location in strategies:
            elements = soup.select(selector)
            
            for elem in elements:
                try:
                    if link_location == 'self':
                        link = elem
                    else:
                        link = elem.find('a')
                    
                    if link:
                        href = link.get('href', '')
                        
                        # Filter out non-course links
                        if '/learn/' in href and not any(skip in href for skip in ['#reviews', '#enroll', '?action=']):
                            full_url = href if href.startswith('http') else f"{self.base_url}{href}"
                            
                            # Avoid duplicates and the parent URL
                            if full_url not in found_urls and full_url != parent_url:
                                # Extract course name
                                name = link.get_text(strip=True) if link.get_text(strip=True) else None
                                
                                # Try to get name from parent element
                                if not name or len(name) < 3:
                                    parent = elem.parent
                                    if parent:
                                        name_elem = parent.find(['h3', 'h4', 'h5']) or parent.find(class_=re.compile('.*title.*'))
                                        if name_elem:
                                            name = name_elem.get_text(strip=True)
                                
                                # Extract slug from URL
                                slug_match = re.search(r'/learn/([^/?#]+)', href)
                                slug = slug_match.group(1) if slug_match else ''
                                
                                if not name:
                                    name = slug.replace('-', ' ').title()
                                
                                found_urls.add(full_url)
                                courses.append({
                                    'name': name,
                                    'url': full_url,
                                    'slug': slug
                                })
                                
                except Exception as e:
                    self.log(f"Error extracting course link: {e}", "warning")
                    continue
            
            # If we found courses with a strategy, we can stop
            if len(courses) >= 3:
                break
        
        # Deduplicate by slug
        seen_slugs = set()
        unique_courses = []
        for course in courses:
            if course['slug'] not in seen_slugs:
                seen_slugs.add(course['slug'])
                unique_courses.append(course)
        
        return unique_courses[:10]  # Limit to 10 courses max
    
    def _extract_all_modules(self, soup) -> List[Dict]:
        """Extract modules using all available methods."""
        modules = []
        
        # Try different extraction methods
        methods = [
            self._extract_modules_method1,
            self._extract_modules_method2,
            self._extract_modules_method3,
            self._extract_modules_from_accordion
        ]
        
        for method in methods:
            extracted = method(soup)
            if extracted:
                modules.extend(extracted)
                if len(modules) >= 3:  # If we have enough modules, stop
                    break
        
        # Deduplicate modules by title
        seen_titles = set()
        unique_modules = []
        for module in modules:
            title = module.get('title', '')
            if title and title not in seen_titles:
                seen_titles.add(title)
                unique_modules.append(module)
        
        return unique_modules
    
    def _extract_modules_method1(self, soup) -> List[Dict]:
        """Method 1: Look for module/week cards."""
        modules = []
        
        selectors = [
            'div[data-testid*="week"]',
            'div[data-testid*="module"]',
            'div.week-card',
            'div.module-card',
            'div[class*="WeekCard"]',
            'div[class*="ModuleCard"]'
        ]
        
        for selector in selectors:
            elements = soup.select(selector)
            if elements:
                self.log(f"Found {len(elements)} elements with selector: {selector}")
                
                for elem in elements:
                    module = self._parse_module_element(elem)
                    if module and (module.get('lessons') or module.get('description')):
                        modules.append(module)
                
                if modules:
                    return modules
        
        return modules
    
    def _extract_modules_method2(self, soup) -> List[Dict]:
        """Method 2: Look for syllabus sections."""
        modules = []
        
        syllabus = soup.find('div', {'id': 'syllabus'}) or \
                  soup.find('section', {'aria-label': re.compile('syllabus', re.I)})
        
        if syllabus:
            # Find all week/module sections within syllabus
            sections = syllabus.find_all(['div', 'section'], class_=re.compile('.*(week|module).*', re.I))
            
            for section in sections:
                module = self._parse_module_element(section)
                if module:
                    modules.append(module)
        
        return modules
    
    def _extract_modules_method3(self, soup) -> List[Dict]:
        """Method 3: Extract from headings pattern."""
        modules = []
        
        patterns = [
            re.compile(r'^week\s+\d+', re.I),
            re.compile(r'^module\s+\d+', re.I),
            re.compile(r'^unit\s+\d+', re.I),
            re.compile(r'^chapter\s+\d+', re.I)
        ]
        
        for heading in soup.find_all(['h2', 'h3', 'h4']):
            heading_text = heading.get_text(strip=True)
            
            for pattern in patterns:
                if pattern.match(heading_text):
                    module = {
                        'title': heading_text,
                        'description': '',
                        'lessons': []
                    }
                    
                    # Get content after heading
                    current = heading.find_next_sibling()
                    while current and current.name not in ['h2', 'h3', 'h4']:
                        if current.name == 'p' and not module['description']:
                            module['description'] = current.get_text(strip=True)[:300]
                        elif current.name in ['ul', 'ol']:
                            for li in current.find_all('li')[:20]:
                                lesson_text = li.get_text(strip=True)
                                if lesson_text and len(lesson_text) > 5:
                                    module['lessons'].append(self._parse_lesson(lesson_text))
                        current = current.find_next_sibling()
                    
                    if module['lessons'] or module['description']:
                        modules.append(module)
                    break
        
        return modules
    
    def _extract_modules_from_accordion(self, soup) -> List[Dict]:
        """Extract modules from accordion/expandable elements."""
        modules = []
        
        accordion_selectors = [
            'div[class*="Accordion"]',
            'div[role="button"][aria-expanded]',
            'button[aria-expanded]',
            'div.accordion-item'
        ]
        
        for selector in accordion_selectors:
            elements = soup.select(selector)
            
            for elem in elements[:30]:  # Limit to prevent too many
                text = elem.get_text(strip=True).lower()
                
                # Check if this looks like a module
                if any(keyword in text for keyword in ['week', 'module', 'chapter', 'unit']):
                    module = self._parse_module_element(elem.parent if elem.parent else elem)
                    if module:
                        modules.append(module)
        
        return modules
    
    def _parse_module_element(self, elem) -> Optional[Dict]:
        """Parse a module element to extract information."""
        module = {}
        
        # Extract title
        title_elem = elem.find(['h2', 'h3', 'h4', 'h5']) or \
                    elem.find(class_=re.compile('.*title.*', re.I))
        
        if title_elem:
            module['title'] = title_elem.get_text(strip=True)
        else:
            # Try aria-label or text content
            if elem.get('aria-label'):
                module['title'] = elem.get('aria-label')
            else:
                text = elem.get_text(strip=True)[:100]
                if any(keyword in text.lower() for keyword in ['week', 'module']):
                    module['title'] = text.split('\n')[0] if '\n' in text else text[:50]
        
        if not module.get('title'):
            return None
        
        # Extract description
        desc_elem = elem.find('p') or elem.find(class_=re.compile('.*description.*', re.I))
        module['description'] = desc_elem.get_text(strip=True)[:300] if desc_elem else ""
        
        # Extract lessons
        module['lessons'] = []
        
        # Look for lesson items
        lesson_selectors = [
            'li[data-testid*="item"]',
            'div[data-testid*="item"]',
            'li.item',
            'li'
        ]
        
        for selector in lesson_selectors:
            lesson_elements = elem.select(selector)
            
            if lesson_elements:
                for lesson_elem in lesson_elements[:25]:
                    lesson_text = lesson_elem.get_text(strip=True)
                    
                    # Filter out navigation or non-lesson items
                    if lesson_text and len(lesson_text) > 5 and not any(
                        skip in lesson_text.lower() for skip in ['next', 'previous', 'back', 'continue']
                    ):
                        lesson = self._parse_lesson(lesson_text)
                        if lesson['name']:
                            module['lessons'].append(lesson)
                
                if module['lessons']:
                    break
        
        return module if (module.get('lessons') or module.get('description')) else None
    
    def _parse_lesson(self, lesson_text: str) -> Dict:
        """Parse lesson text to extract name and duration."""
        lesson = {}
        
        # Extract duration
        duration_patterns = [
            r'(\d+)\s*min(?:ute)?s?',
            r'(\d+)\s*hr?(?:our)?s?',
            r'(\d+:\d+)',
            r'•\s*(\d+\s*min)',
        ]
        
        duration = None
        for pattern in duration_patterns:
            match = re.search(pattern, lesson_text, re.I)
            if match:
                duration = match.group(0)
                break
        
        # Clean lesson name
        lesson_name = lesson_text
        if duration:
            lesson_name = lesson_name.replace(duration, '')
        
        # Remove common prefixes/suffixes
        lesson_name = re.sub(r'^\d+\.\d+\s*', '', lesson_name)  # Remove numbering
        lesson_name = re.sub(r'•\s*', '', lesson_name)  # Remove bullets
        lesson_name = re.sub(r'\s+', ' ', lesson_name).strip()  # Clean whitespace
        
        lesson['name'] = lesson_name
        if duration:
            lesson['duration'] = duration.strip()
        
        return lesson
    
    def _extract_title(self, soup) -> str:
        """Extract course title."""
        selectors = [
            'h1.banner-title',
            'h1[data-testid="banner-title"]',
            'h1.display-3-text',
            'h1',
            'meta[property="og:title"]'
        ]
        
        for selector in selectors:
            elem = soup.select_one(selector)
            if elem:
                if elem.name == 'meta':
                    return elem.get('content', 'Unknown Course')
                else:
                    return elem.get_text(strip=True)
        
        return "Unknown Course"
    
    def _extract_description(self, soup) -> str:
        """Extract course description."""
        selectors = [
            'div[data-testid="course-description"]',
            'div.content-inner',
            'div.about-section',
            'meta[name="description"]',
            'meta[property="og:description"]'
        ]
        
        for selector in selectors:
            elem = soup.select_one(selector)
            if elem:
                if elem.name == 'meta':
                    return elem.get('content', '')
                else:
                    return elem.get_text(strip=True)[:500]
        
        return ""
    
    def _extract_comprehensive_metadata(self, soup) -> Dict:
        """Extract comprehensive metadata."""
        metadata = {}
        
        # Duration
        duration_patterns = [
            r'(\d+)\s*weeks?\s*to\s*complete',
            r'(\d+)\s*weeks?',
            r'(\d+)\s*months?',
            r'(\d+)\s*hours?\s*to\s*complete',
            r'Approx\.\s*(\d+)\s*hours?'
        ]
        
        for pattern in duration_patterns:
            duration_elem = soup.find(string=re.compile(pattern, re.I))
            if duration_elem:
                match = re.search(pattern, str(duration_elem), re.I)
                if match:
                    metadata['duration'] = match.group(0)
                    break
        
        # Level
        level_elem = soup.find(string=re.compile(r'(beginner|intermediate|advanced|mixed)', re.I))
        if level_elem:
            level_match = re.search(r'(beginner|intermediate|advanced|mixed)', str(level_elem), re.I)
            if level_match:
                metadata['level'] = level_match.group(1).capitalize()
        
        # Enrollment
        enrollment_elem = soup.find(string=re.compile(r'(\d+[,\d]*)\s*(students|learners|enrolled)', re.I))
        if enrollment_elem:
            enrollment_match = re.search(r'(\d+[,\d]*)\s*(students|learners|enrolled)', str(enrollment_elem), re.I)
            if enrollment_match:
                metadata['enrollment'] = enrollment_match.group(1)
        
        # Language
        lang_elem = soup.find(string=re.compile(r'taught in\s+(\w+)', re.I))
        if lang_elem:
            lang_match = re.search(r'taught in\s+(\w+)', str(lang_elem), re.I)
            if lang_match:
                metadata['language'] = lang_match.group(1)
        
        return metadata
    
    def _extract_instructors(self, soup) -> List[str]:
        """Extract instructor names."""
        instructors = []
        
        selectors = [
            'div[data-testid="instructor-name"]',
            'h3.instructor-name',
            'span.instructor-name',
            'div[class*="InstructorName"]'
        ]
        
        for selector in selectors:
            elements = soup.select(selector)
            for elem in elements:
                name = elem.get_text(strip=True)
                if name and name not in instructors:
                    instructors.append(name)
        
        return instructors[:5]
    
    def _extract_skills(self, soup) -> List[str]:
        """Extract skills."""
        skills = []
        
        selectors = [
            'div[data-testid="skills-you-will-gain"] span',
            'div.skills-gain span',
            'span[class*="SkillTag"]'
        ]
        
        for selector in selectors:
            elements = soup.select(selector)
            for elem in elements:
                skill = elem.get_text(strip=True)
                if skill and len(skill) > 2 and skill not in skills:
                    skills.append(skill)
        
        return skills[:10]
    
    def _create_empty_outline(self, course_url: str) -> Dict:
        """Create an empty outline structure."""
        return {
            'title': 'Course information not available',
            'description': 'Unable to fetch course details',
            'url': course_url,
            'type': 'unknown',
            'modules': [],
            'metadata': {},
            'instructors': [],
            'skills': [],
            'courses': []
        }
    
    def scrape_topic(self, topic: str, max_courses: int = 3) -> List[Dict]:
        """Main method to scrape courses for a topic."""
        print(f"\n{'='*60}")
        print(f"Coursera Scraper V3 - Deep Module Extraction")
        print(f"{'='*60}")
        print(f"Topic: {topic}")
        print(f"Max courses: {max_courses}")
        print(f"Follow depth: {self.follow_depth}")
        print(f"{'='*60}\n")
        
        # Reset visited URLs for new scraping session
        self.visited_urls = set()
        
        courses = self.search_courses(topic, limit=max_courses)
        
        if not courses:
            self.log("No courses found for this topic", "warning")
            return []
        
        self.log(f"Found {len(courses)} courses. Starting deep extraction...")
        
        detailed_courses = []
        for i, course in enumerate(courses, 1):
            print(f"\n[{i}/{len(courses)}] Processing: {course['name']}")
            print(f"      Type: {course['type']}")
            print(f"      URL: {course['url']}")
            
            outline = self.get_course_outline(course['url'], depth=0)
            outline['search_metadata'] = course
            detailed_courses.append(outline)
            
            # Print summary
            modules_count = len(outline.get('modules', []))
            lessons_count = sum(len(m.get('lessons', [])) for m in outline.get('modules', []))
            courses_count = len(outline.get('courses', []))
            
            print(f"      ✓ Direct Modules: {modules_count}")
            print(f"      ✓ Total Lessons: {lessons_count}")
            
            if courses_count > 0:
                print(f"      ✓ Sub-courses: {courses_count}")
                total_sub_modules = sum(len(c.get('modules', [])) for c in outline.get('courses', []))
                total_sub_lessons = sum(
                    sum(len(m.get('lessons', [])) for m in c.get('modules', []))
                    for c in outline.get('courses', [])
                )
                print(f"      ✓ Total Modules (including sub-courses): {modules_count + total_sub_modules}")
                print(f"      ✓ Total Lessons (including sub-courses): {lessons_count + total_sub_lessons}")
            
            if outline.get('metadata'):
                meta_str = ', '.join([f"{k}: {v}" for k, v in outline['metadata'].items() if v])
                if meta_str:
                    print(f"      ✓ Metadata: {meta_str}")
            
            # Add delay between main courses
            if i < len(courses):
                time.sleep(2)
        
        return detailed_courses
    
    def save_to_json(self, data: List[Dict], filename: str):
        """Save scraped data to JSON file."""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"\n✅ Data saved to {filename}")


def main():
    """Main function to test the V3 scraper."""
    import sys
    
    # Get arguments
    topic = sys.argv[1] if len(sys.argv) > 1 else "machine learning"
    max_courses = int(sys.argv[2]) if len(sys.argv) > 2 else 3
    follow_depth = int(sys.argv[3]) if len(sys.argv) > 3 else 2
    
    scraper = CourseraScraperV3(verbose=True, follow_depth=follow_depth)
    results = scraper.scrape_topic(topic, max_courses=max_courses)
    
    if results:
        # Save to JSON file
        filename = f"coursera_{topic.replace(' ', '_')}_outline_v3.json"
        scraper.save_to_json(results, filename)
        
        # Print final summary
        print(f"\n{'='*60}")
        print(f"SCRAPING COMPLETE")
        print(f"{'='*60}")
        print(f"Total main courses scraped: {len(results)}")
        
        total_modules = 0
        total_lessons = 0
        total_sub_courses = 0
        
        for course in results:
            modules = course.get('modules', [])
            total_modules += len(modules)
            total_lessons += sum(len(m.get('lessons', [])) for m in modules)
            
            # Count sub-courses
            sub_courses = course.get('courses', [])
            total_sub_courses += len(sub_courses)
            
            for sub_course in sub_courses:
                sub_modules = sub_course.get('modules', [])
                total_modules += len(sub_modules)
                total_lessons += sum(len(m.get('lessons', [])) for m in sub_modules)
        
        print(f"Total sub-courses extracted: {total_sub_courses}")
        print(f"Total modules found: {total_modules}")
        print(f"Total lessons found: {total_lessons}")
        print(f"Output file: {filename}")
        print(f"{'='*60}\n")
    else:
        print("\n❌ No results found")
    
    return results


if __name__ == "__main__":
    main()