#!/usr/bin/env python3
"""
MIT OpenCourseWare (OCW) Course Extractor

This tool extracts course syllabi, learning paths, lecture notes, and videos
from MIT OpenCourseWare courses.
"""

import requests
from bs4 import BeautifulSoup
import json
import re
import time
from typing import Dict, List, Optional, Tuple
from urllib.parse import urljoin, quote, urlparse
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class MITOCWExtractor:
    """Extract course content from MIT OpenCourseWare."""
    
    def __init__(self, verbose=True):
        """Initialize the MIT OCW extractor."""
        self.base_url = "https://ocw.mit.edu"
        self.search_url = "https://ocw.mit.edu/search/"
        self.verbose = verbose
        
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive'
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
        """Search for MIT OCW courses by topic."""
        self.log(f"Searching MIT OCW for: {topic}")
        
        courses = []
        
        try:
            # Search using the OCW search API
            search_params = {
                'q': topic,
                'sort': 'best',
                'f': 'All'
            }
            
            # Try the search page
            search_url = f"{self.base_url}/search/?q={quote(topic)}"
            response = self.session.get(search_url, timeout=10)
            
            if response.status_code != 200:
                self.log(f"Search failed with status: {response.status_code}", "error")
                return courses
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Find course cards/results
            course_cards = soup.find_all('div', class_='course-card') or \
                          soup.find_all('article', class_='search-result') or \
                          soup.find_all('div', class_='lr-row')
            
            if not course_cards:
                # Try alternative selectors
                course_cards = soup.find_all('a', href=re.compile(r'/courses/'))[:limit]
            
            self.log(f"Found {len(course_cards)} course cards")
            
            for card in course_cards[:limit]:
                try:
                    course_info = self._extract_course_info_from_card(card)
                    if course_info:
                        courses.append(course_info)
                except Exception as e:
                    self.log(f"Error parsing course card: {e}", "warning")
                    continue
            
            # If no results from search, try department pages
            if not courses:
                courses = self._search_by_department(topic, limit)
            
        except Exception as e:
            self.log(f"Error searching courses: {e}", "error")
        
        return courses
    
    def _extract_course_info_from_card(self, card) -> Optional[Dict]:
        """Extract course information from a search result card."""
        course_info = {}
        
        try:
            # Find course link
            if card.name == 'a':
                link = card
            else:
                link = card.find('a', href=re.compile(r'/courses/'))
            
            if not link:
                return None
            
            href = link.get('href', '')
            if not href.startswith('http'):
                href = urljoin(self.base_url, href)
            
            course_info['url'] = href
            
            # Extract course number and title
            title_elem = card.find(['h3', 'h4', 'h5']) or link
            if title_elem:
                title_text = title_elem.get_text(strip=True)
                course_info['title'] = title_text
                
                # Try to extract course number
                number_match = re.search(r'(\d+[\.\-]\d+[A-Z]?)', title_text)
                if number_match:
                    course_info['course_number'] = number_match.group(1)
            
            # Extract department/term
            dept_elem = card.find('div', class_='department') or \
                       card.find('span', class_='department')
            if dept_elem:
                course_info['department'] = dept_elem.get_text(strip=True)
            
            # Extract term/year
            term_elem = card.find('div', class_='term') or \
                       card.find('span', class_='term')
            if term_elem:
                course_info['term'] = term_elem.get_text(strip=True)
            
            # Extract description
            desc_elem = card.find('p', class_='description') or \
                       card.find('div', class_='description')
            if desc_elem:
                course_info['description'] = desc_elem.get_text(strip=True)[:200]
            
            return course_info if course_info.get('url') else None
            
        except Exception as e:
            self.log(f"Error extracting course info: {e}", "warning")
            return None
    
    def _search_by_department(self, topic: str, limit: int) -> List[Dict]:
        """Search courses by department listing."""
        courses = []
        
        # Map topics to MIT departments
        dept_mapping = {
            'computer science': '6-electrical-engineering-and-computer-science',
            'cs': '6-electrical-engineering-and-computer-science',
            'ai': '6-electrical-engineering-and-computer-science',
            'machine learning': '6-electrical-engineering-and-computer-science',
            'mathematics': '18-mathematics',
            'math': '18-mathematics',
            'physics': '8-physics',
            'biology': '7-biology',
            'chemistry': '5-chemistry',
            'economics': '14-economics',
            'business': '15-sloan-school-of-management',
            'management': '15-sloan-school-of-management'
        }
        
        # Find matching department
        topic_lower = topic.lower()
        dept_slug = None
        
        for key, value in dept_mapping.items():
            if key in topic_lower:
                dept_slug = value
                break
        
        if not dept_slug:
            # Default to EECS for tech topics
            dept_slug = '6-electrical-engineering-and-computer-science'
        
        try:
            dept_url = f"{self.base_url}/courses/{dept_slug}/"
            self.log(f"Searching department: {dept_url}")
            
            response = self.session.get(dept_url, timeout=10)
            if response.status_code == 200:
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Find course links
                course_links = soup.find_all('a', href=re.compile(r'/courses/[\w-]+/[\w-]+/'))
                
                for link in course_links[:limit]:
                    href = link.get('href', '')
                    if not href.startswith('http'):
                        href = urljoin(self.base_url, href)
                    
                    title = link.get_text(strip=True)
                    
                    # Filter by topic relevance
                    if topic_lower in title.lower() or len(courses) < limit:
                        courses.append({
                            'url': href,
                            'title': title,
                            'department': dept_slug.replace('-', ' ').title()
                        })
                
        except Exception as e:
            self.log(f"Error searching department: {e}", "warning")
        
        return courses
    
    def get_course_content(self, course_url: str) -> Dict:
        """Extract complete course content including syllabus, lectures, and materials."""
        self.log(f"Extracting course from: {course_url}")
        
        course = {
            'url': course_url,
            'title': '',
            'course_number': '',
            'department': '',
            'term': '',
            'description': '',
            'instructors': [],
            'syllabus': {},
            'learning_objectives': [],
            'lectures': [],
            'assignments': [],
            'exams': [],
            'resources': [],
            'prerequisites': '',
            'textbooks': [],
            'grading': {}
        }
        
        try:
            response = self.session.get(course_url, timeout=15)
            if response.status_code != 200:
                self.log(f"Failed to fetch course page: {response.status_code}", "error")
                return course
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract basic course info
            course.update(self._extract_basic_info(soup))
            
            # Extract syllabus
            course['syllabus'] = self._extract_syllabus(soup, course_url)
            
            # Extract learning objectives
            course['learning_objectives'] = self._extract_learning_objectives(soup)
            
            # Extract lectures with notes and videos
            course['lectures'] = self._extract_lectures(soup, course_url)
            
            # Extract assignments
            course['assignments'] = self._extract_assignments(soup, course_url)
            
            # Extract exams
            course['exams'] = self._extract_exams(soup, course_url)
            
            # Extract additional resources
            course['resources'] = self._extract_resources(soup, course_url)
            
            # Extract prerequisites
            course['prerequisites'] = self._extract_prerequisites(soup)
            
            # Extract textbooks
            course['textbooks'] = self._extract_textbooks(soup)
            
            # Extract grading info
            course['grading'] = self._extract_grading(soup)
            
        except Exception as e:
            self.log(f"Error extracting course content: {e}", "error")
        
        return course
    
    def _extract_basic_info(self, soup) -> Dict:
        """Extract basic course information."""
        info = {}
        
        # Title
        title_elem = soup.find('h1', class_='course-title') or \
                    soup.find('h1') or \
                    soup.find('meta', property='og:title')
        
        if title_elem:
            if title_elem.name == 'meta':
                info['title'] = title_elem.get('content', '')
            else:
                info['title'] = title_elem.get_text(strip=True)
        
        # Course number
        number_match = re.search(r'(\d+[\.\-]\d+[A-Z]?)', info.get('title', ''))
        if number_match:
            info['course_number'] = number_match.group(1)
        
        # Department
        dept_elem = soup.find('div', class_='department') or \
                   soup.find('a', href=re.compile(r'/courses/\d+-'))
        if dept_elem:
            info['department'] = dept_elem.get_text(strip=True)
        
        # Term
        term_elem = soup.find('div', class_='term') or \
                   soup.find('span', string=re.compile(r'(Spring|Fall|Summer|January)'))
        if term_elem:
            info['term'] = term_elem.get_text(strip=True)
        
        # Description
        desc_elem = soup.find('div', class_='course-description') or \
                   soup.find('section', id='description') or \
                   soup.find('meta', name='description')
        
        if desc_elem:
            if desc_elem.name == 'meta':
                info['description'] = desc_elem.get('content', '')
            else:
                info['description'] = desc_elem.get_text(strip=True)[:500]
        
        # Instructors
        instructors = []
        instructor_elems = soup.find_all('a', href=re.compile(r'/faculty/')) or \
                          soup.find_all('span', class_='instructor')
        
        for elem in instructor_elems:
            name = elem.get_text(strip=True)
            if name and name not in instructors:
                instructors.append(name)
        
        info['instructors'] = instructors[:5]
        
        return info
    
    def _extract_syllabus(self, soup, base_url: str) -> Dict:
        """Extract syllabus information."""
        syllabus = {
            'topics': [],
            'schedule': [],
            'course_structure': ''
        }
        
        # Find syllabus section or page
        syllabus_section = soup.find('section', id='syllabus') or \
                          soup.find('div', class_='syllabus') or \
                          soup.find('a', string=re.compile(r'syllabus', re.I))
        
        if syllabus_section and syllabus_section.name == 'a':
            # Follow syllabus link
            syllabus_url = urljoin(base_url, syllabus_section.get('href', ''))
            try:
                response = self.session.get(syllabus_url, timeout=10)
                if response.status_code == 200:
                    syllabus_soup = BeautifulSoup(response.content, 'html.parser')
                    syllabus_section = syllabus_soup.find('main') or syllabus_soup.find('body')
            except:
                pass
        
        if syllabus_section:
            # Extract topics
            topics = []
            topic_headers = syllabus_section.find_all(['h2', 'h3', 'h4'])
            
            for header in topic_headers[:20]:
                topic_text = header.get_text(strip=True)
                if not any(skip in topic_text.lower() for skip in ['navigation', 'menu', 'footer']):
                    topic = {'title': topic_text, 'subtopics': []}
                    
                    # Get subtopics
                    next_elem = header.find_next_sibling()
                    while next_elem and next_elem.name not in ['h2', 'h3', 'h4']:
                        if next_elem.name in ['ul', 'ol']:
                            for li in next_elem.find_all('li')[:10]:
                                subtopic = li.get_text(strip=True)
                                if subtopic:
                                    topic['subtopics'].append(subtopic)
                        next_elem = next_elem.find_next_sibling()
                    
                    if topic['title']:
                        topics.append(topic)
            
            syllabus['topics'] = topics
            
            # Extract schedule (look for tables)
            schedule_table = syllabus_section.find('table')
            if schedule_table:
                schedule = []
                rows = schedule_table.find_all('tr')
                
                for row in rows[:30]:
                    cells = row.find_all(['td', 'th'])
                    if len(cells) >= 2:
                        week_or_session = cells[0].get_text(strip=True)
                        topic = cells[1].get_text(strip=True)
                        
                        schedule_item = {
                            'session': week_or_session,
                            'topic': topic
                        }
                        
                        # Add additional info if available
                        if len(cells) > 2:
                            schedule_item['materials'] = cells[2].get_text(strip=True)
                        
                        schedule.append(schedule_item)
                
                syllabus['schedule'] = schedule
        
        return syllabus
    
    def _extract_learning_objectives(self, soup) -> List[str]:
        """Extract learning objectives/outcomes."""
        objectives = []
        
        # Look for learning objectives section
        obj_section = soup.find(string=re.compile(r'learning (objectives|outcomes|goals)', re.I))
        
        if obj_section:
            parent = obj_section.parent
            if parent:
                # Find the list following the header
                obj_list = parent.find_next_sibling(['ul', 'ol'])
                if obj_list:
                    for li in obj_list.find_all('li')[:15]:
                        obj_text = li.get_text(strip=True)
                        if obj_text:
                            objectives.append(obj_text)
        
        return objectives
    
    def _extract_lectures(self, soup, base_url: str) -> List[Dict]:
        """Extract lecture information including notes and videos."""
        lectures = []
        
        # Find lectures section or page
        lectures_section = soup.find('section', id='lectures') or \
                          soup.find('div', class_='lectures') or \
                          soup.find('a', string=re.compile(r'lecture', re.I))
        
        if lectures_section and lectures_section.name == 'a':
            # Follow lectures link
            lectures_url = urljoin(base_url, lectures_section.get('href', ''))
            try:
                response = self.session.get(lectures_url, timeout=10)
                if response.status_code == 200:
                    lectures_soup = BeautifulSoup(response.content, 'html.parser')
                    lectures_section = lectures_soup.find('main') or lectures_soup.find('body')
            except:
                pass
        
        if lectures_section:
            # Find lecture items
            lecture_items = lectures_section.find_all(['div', 'article', 'li'], 
                                                     class_=re.compile(r'lecture|session'))
            
            if not lecture_items:
                # Try table format
                lecture_table = lectures_section.find('table')
                if lecture_table:
                    rows = lecture_table.find_all('tr')[1:]  # Skip header
                    for row in rows[:50]:
                        cells = row.find_all(['td', 'th'])
                        if len(cells) >= 2:
                            lecture = self._parse_lecture_row(cells, base_url)
                            if lecture:
                                lectures.append(lecture)
            else:
                # Parse lecture items
                for item in lecture_items[:50]:
                    lecture = self._parse_lecture_item(item, base_url)
                    if lecture:
                        lectures.append(lecture)
        
        # If no lectures found in sections, look for video/notes links
        if not lectures:
            video_links = soup.find_all('a', href=re.compile(r'(video|lecture)'))[:20]
            for link in video_links:
                lecture = {
                    'title': link.get_text(strip=True),
                    'materials': []
                }
                
                href = link.get('href', '')
                if 'video' in href.lower() or 'youtube' in href:
                    lecture['video_url'] = urljoin(base_url, href)
                    lecture['materials'].append({
                        'type': 'video',
                        'url': lecture['video_url']
                    })
                else:
                    lecture['notes_url'] = urljoin(base_url, href)
                    lecture['materials'].append({
                        'type': 'notes',
                        'url': lecture['notes_url']
                    })
                
                if lecture['title']:
                    lectures.append(lecture)
        
        return lectures
    
    def _parse_lecture_row(self, cells, base_url: str) -> Optional[Dict]:
        """Parse a lecture from a table row."""
        if len(cells) < 2:
            return None
        
        lecture = {
            'session': cells[0].get_text(strip=True),
            'title': cells[1].get_text(strip=True),
            'materials': []
        }
        
        # Look for links in the row
        for cell in cells:
            links = cell.find_all('a')
            for link in links:
                href = link.get('href', '')
                text = link.get_text(strip=True).lower()
                
                material = {
                    'title': link.get_text(strip=True),
                    'url': urljoin(base_url, href)
                }
                
                if any(vid in text for vid in ['video', 'watch', 'youtube']):
                    material['type'] = 'video'
                    lecture['video_url'] = material['url']
                elif any(note in text for note in ['notes', 'slides', 'pdf']):
                    material['type'] = 'notes'
                    lecture['notes_url'] = material['url']
                else:
                    material['type'] = 'other'
                
                lecture['materials'].append(material)
        
        return lecture if lecture['title'] else None
    
    def _parse_lecture_item(self, item, base_url: str) -> Optional[Dict]:
        """Parse a lecture from a div/article element."""
        lecture = {}
        
        # Extract title
        title_elem = item.find(['h2', 'h3', 'h4', 'a'])
        if title_elem:
            lecture['title'] = title_elem.get_text(strip=True)
        
        # Extract session number
        session_match = re.search(r'(lecture|session|week)\s*(\d+)', 
                                 item.get_text(), re.I)
        if session_match:
            lecture['session'] = session_match.group(0)
        
        # Find materials
        materials = []
        links = item.find_all('a')
        
        for link in links:
            href = link.get('href', '')
            text = link.get_text(strip=True).lower()
            
            if not href:
                continue
            
            material = {
                'title': link.get_text(strip=True),
                'url': urljoin(base_url, href)
            }
            
            if any(vid in text or vid in href for vid in ['video', 'youtube', 'mp4']):
                material['type'] = 'video'
                lecture['video_url'] = material['url']
            elif any(note in text or note in href for note in ['notes', 'slides', 'pdf']):
                material['type'] = 'notes'
                lecture['notes_url'] = material['url']
            else:
                material['type'] = 'other'
            
            materials.append(material)
        
        lecture['materials'] = materials
        
        return lecture if lecture.get('title') else None
    
    def _extract_assignments(self, soup, base_url: str) -> List[Dict]:
        """Extract assignment information."""
        assignments = []
        
        # Find assignments section
        assign_section = soup.find('section', id='assignments') or \
                        soup.find('a', string=re.compile(r'assignment', re.I))
        
        if assign_section and assign_section.name == 'a':
            # Follow link
            assign_url = urljoin(base_url, assign_section.get('href', ''))
            try:
                response = self.session.get(assign_url, timeout=10)
                if response.status_code == 200:
                    assign_soup = BeautifulSoup(response.content, 'html.parser')
                    assign_section = assign_soup.find('main') or assign_soup.find('body')
            except:
                pass
        
        if assign_section:
            # Find assignment items
            assign_items = assign_section.find_all(['div', 'article', 'li', 'tr'])
            
            for item in assign_items[:20]:
                assignment = {}
                
                # Extract title
                title_elem = item.find(['h3', 'h4', 'a'])
                if title_elem:
                    assignment['title'] = title_elem.get_text(strip=True)
                    
                    # Find links
                    links = item.find_all('a')
                    for link in links:
                        href = link.get('href', '')
                        if href:
                            assignment['url'] = urljoin(base_url, href)
                            break
                    
                    if assignment.get('title'):
                        assignments.append(assignment)
        
        return assignments
    
    def _extract_exams(self, soup, base_url: str) -> List[Dict]:
        """Extract exam information."""
        exams = []
        
        # Find exams section
        exam_section = soup.find('section', id='exams') or \
                      soup.find('a', string=re.compile(r'exam', re.I))
        
        if exam_section and exam_section.name == 'a':
            # Follow link
            exam_url = urljoin(base_url, exam_section.get('href', ''))
            try:
                response = self.session.get(exam_url, timeout=10)
                if response.status_code == 200:
                    exam_soup = BeautifulSoup(response.content, 'html.parser')
                    exam_section = exam_soup.find('main') or exam_soup.find('body')
            except:
                pass
        
        if exam_section:
            # Find exam items
            exam_links = exam_section.find_all('a', string=re.compile(r'(exam|quiz|test)', re.I))
            
            for link in exam_links[:10]:
                exam = {
                    'title': link.get_text(strip=True),
                    'url': urljoin(base_url, link.get('href', ''))
                }
                
                # Determine type
                text_lower = exam['title'].lower()
                if 'final' in text_lower:
                    exam['type'] = 'final'
                elif 'midterm' in text_lower:
                    exam['type'] = 'midterm'
                elif 'quiz' in text_lower:
                    exam['type'] = 'quiz'
                else:
                    exam['type'] = 'exam'
                
                exams.append(exam)
        
        return exams
    
    def _extract_resources(self, soup, base_url: str) -> List[Dict]:
        """Extract additional resources."""
        resources = []
        
        # Find download links
        download_links = soup.find_all('a', href=re.compile(r'\.(pdf|zip|ppt|doc)', re.I))
        
        for link in download_links[:20]:
            resource = {
                'title': link.get_text(strip=True),
                'url': urljoin(base_url, link.get('href', '')),
                'type': 'download'
            }
            
            # Determine file type
            href = link.get('href', '').lower()
            if '.pdf' in href:
                resource['file_type'] = 'pdf'
            elif '.zip' in href:
                resource['file_type'] = 'zip'
            elif '.ppt' in href:
                resource['file_type'] = 'powerpoint'
            elif '.doc' in href:
                resource['file_type'] = 'word'
            
            if resource['title']:
                resources.append(resource)
        
        return resources
    
    def _extract_prerequisites(self, soup) -> str:
        """Extract prerequisites."""
        prereq_section = soup.find(string=re.compile(r'prerequisite', re.I))
        
        if prereq_section:
            parent = prereq_section.parent
            if parent:
                # Get the text after the prerequisite heading
                prereq_text = parent.find_next_sibling()
                if prereq_text:
                    return prereq_text.get_text(strip=True)[:300]
                else:
                    return parent.get_text(strip=True)[:300]
        
        return ""
    
    def _extract_textbooks(self, soup) -> List[str]:
        """Extract textbook information."""
        textbooks = []
        
        # Find textbook section
        textbook_section = soup.find(string=re.compile(r'(textbook|reading|book)', re.I))
        
        if textbook_section:
            parent = textbook_section.parent
            if parent:
                # Find list or paragraphs with book info
                book_list = parent.find_next_sibling(['ul', 'ol'])
                if book_list:
                    for li in book_list.find_all('li')[:5]:
                        book_text = li.get_text(strip=True)
                        if book_text:
                            textbooks.append(book_text)
        
        return textbooks
    
    def _extract_grading(self, soup) -> Dict:
        """Extract grading information."""
        grading = {}
        
        # Find grading section
        grading_section = soup.find(string=re.compile(r'grading', re.I))
        
        if grading_section:
            parent = grading_section.parent
            if parent:
                # Look for grading breakdown
                grading_text = parent.get_text()
                
                # Extract percentages
                percent_pattern = r'(\w+[\s\w]*?)[\s:]+(\d+)%'
                matches = re.findall(percent_pattern, grading_text)
                
                for component, percentage in matches:
                    component = component.strip().lower()
                    grading[component] = f"{percentage}%"
        
        return grading
    
    def extract_topic(self, topic: str, max_courses: int = 3) -> List[Dict]:
        """Main method to extract MIT OCW courses for a topic."""
        print(f"\n{'='*60}")
        print(f"MIT OpenCourseWare Extractor")
        print(f"{'='*60}")
        print(f"Topic: {topic}")
        print(f"Max courses: {max_courses}")
        print(f"{'='*60}\n")
        
        # Search for courses
        courses = self.search_courses(topic, limit=max_courses * 2)  # Get extra in case some fail
        
        if not courses:
            self.log("No courses found for this topic", "warning")
            return []
        
        self.log(f"Found {len(courses)} courses. Extracting content...")
        
        detailed_courses = []
        
        for i, course_info in enumerate(courses[:max_courses], 1):
            print(f"\n[{i}/{min(len(courses), max_courses)}] Processing: {course_info.get('title', 'Unknown')}")
            print(f"      URL: {course_info['url']}")
            
            # Get detailed content
            course_content = self.get_course_content(course_info['url'])
            
            # Merge with search info
            course_content['search_metadata'] = course_info
            detailed_courses.append(course_content)
            
            # Print summary
            lectures_count = len(course_content.get('lectures', []))
            videos_count = sum(1 for l in course_content.get('lectures', []) if l.get('video_url'))
            notes_count = sum(1 for l in course_content.get('lectures', []) if l.get('notes_url'))
            topics_count = len(course_content.get('syllabus', {}).get('topics', []))
            
            print(f"      ✓ Lectures: {lectures_count}")
            print(f"      ✓ Videos: {videos_count}")
            print(f"      ✓ Lecture Notes: {notes_count}")
            print(f"      ✓ Topics: {topics_count}")
            
            if course_content.get('assignments'):
                print(f"      ✓ Assignments: {len(course_content['assignments'])}")
            
            if course_content.get('exams'):
                print(f"      ✓ Exams: {len(course_content['exams'])}")
            
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
        
        report.append("# MIT OpenCourseWare Courses Report\n")
        
        for course in courses:
            report.append(f"## {course.get('title', 'Unknown Course')}")
            
            if course.get('course_number'):
                report.append(f"**Course Number**: {course['course_number']}")
            
            if course.get('department'):
                report.append(f"**Department**: {course['department']}")
            
            if course.get('term'):
                report.append(f"**Term**: {course['term']}")
            
            report.append(f"**URL**: {course['url']}")
            
            if course.get('instructors'):
                report.append(f"**Instructors**: {', '.join(course['instructors'])}")
            
            if course.get('description'):
                report.append(f"\n### Description\n{course['description']}")
            
            # Learning Objectives
            if course.get('learning_objectives'):
                report.append("\n### Learning Objectives")
                for obj in course['learning_objectives'][:5]:
                    report.append(f"- {obj}")
            
            # Prerequisites
            if course.get('prerequisites'):
                report.append(f"\n### Prerequisites\n{course['prerequisites']}")
            
            # Syllabus Topics
            if course.get('syllabus', {}).get('topics'):
                report.append("\n### Course Topics")
                for topic in course['syllabus']['topics'][:10]:
                    report.append(f"- **{topic['title']}**")
                    for subtopic in topic.get('subtopics', [])[:3]:
                        report.append(f"  - {subtopic}")
            
            # Lectures with materials
            if course.get('lectures'):
                report.append("\n### Lectures")
                
                # Count materials
                video_count = sum(1 for l in course['lectures'] if l.get('video_url'))
                notes_count = sum(1 for l in course['lectures'] if l.get('notes_url'))
                
                report.append(f"Total: {len(course['lectures'])} lectures " +
                            f"({video_count} with videos, {notes_count} with notes)")
                
                # Show first few lectures
                for lecture in course['lectures'][:5]:
                    lecture_line = f"- {lecture.get('title', 'Untitled')}"
                    
                    materials = []
                    if lecture.get('video_url'):
                        materials.append(f"[Video]({lecture['video_url']})")
                    if lecture.get('notes_url'):
                        materials.append(f"[Notes]({lecture['notes_url']})")
                    
                    if materials:
                        lecture_line += f" - {', '.join(materials)}"
                    
                    report.append(lecture_line)
            
            # Assignments
            if course.get('assignments'):
                report.append(f"\n### Assignments")
                report.append(f"Total: {len(course['assignments'])} assignments")
                for assign in course['assignments'][:3]:
                    if assign.get('url'):
                        report.append(f"- [{assign['title']}]({assign['url']})")
                    else:
                        report.append(f"- {assign['title']}")
            
            # Exams
            if course.get('exams'):
                report.append(f"\n### Exams")
                for exam in course['exams']:
                    if exam.get('url'):
                        report.append(f"- [{exam['title']}]({exam['url']}) ({exam.get('type', 'exam')})")
                    else:
                        report.append(f"- {exam['title']} ({exam.get('type', 'exam')})")
            
            # Textbooks
            if course.get('textbooks'):
                report.append("\n### Textbooks")
                for book in course['textbooks']:
                    report.append(f"- {book}")
            
            # Grading
            if course.get('grading'):
                report.append("\n### Grading")
                for component, weight in course['grading'].items():
                    report.append(f"- {component.title()}: {weight}")
            
            report.append("\n---\n")
        
        return "\n".join(report)


def main():
    """Main function to test the MIT OCW extractor."""
    import sys
    
    # Get topic from command line or use default
    topic = sys.argv[1] if len(sys.argv) > 1 else "machine learning"
    max_courses = int(sys.argv[2]) if len(sys.argv) > 2 else 3
    
    # Create extractor
    extractor = MITOCWExtractor(verbose=True)
    
    # Extract courses
    results = extractor.extract_topic(topic, max_courses=max_courses)
    
    if results:
        # Save to JSON
        filename = f"mit_ocw_{topic.replace(' ', '_')}.json"
        extractor.save_to_json(results, filename)
        
        # Generate and save report
        report = extractor.generate_report(results)
        report_filename = f"mit_ocw_{topic.replace(' ', '_')}_report.md"
        with open(report_filename, 'w', encoding='utf-8') as f:
            f.write(report)
        print(f"✅ Report saved to {report_filename}")
        
        # Print summary
        print(f"\n{'='*60}")
        print("EXTRACTION COMPLETE")
        print(f"{'='*60}")
        print(f"Total courses extracted: {len(results)}")
        
        total_lectures = sum(len(c.get('lectures', [])) for c in results)
        total_videos = sum(sum(1 for l in c.get('lectures', []) if l.get('video_url')) for c in results)
        total_notes = sum(sum(1 for l in c.get('lectures', []) if l.get('notes_url')) for c in results)
        
        print(f"Total lectures: {total_lectures}")
        print(f"Total videos: {total_videos}")
        print(f"Total lecture notes: {total_notes}")
        print(f"{'='*60}\n")
    else:
        print("\n❌ No results found")
    
    return results


if __name__ == "__main__":
    main()