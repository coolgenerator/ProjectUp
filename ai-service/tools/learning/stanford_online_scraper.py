"""Stanford Online Course Scraper Tool

Extracts course information from Stanford Online platform.
"""

import requests
from bs4 import BeautifulSoup
import json
from typing import Dict, List, Optional
from urllib.parse import quote
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class StanfordOnlineScraper:
    """Scraper for Stanford Online courses."""
    
    def __init__(self, verbose=True):
        self.base_url = "https://online.stanford.edu"
        self.verbose = verbose
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml'
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)
    
    def log(self, message, level="info"):
        if self.verbose:
            getattr(logger, level)(message)
    
    def search_courses(self, topic: str, limit: int = 5) -> List[Dict]:
        """Search for Stanford Online courses."""
        self.log(f"Searching Stanford Online for: {topic}")
        
        # Stanford Online typically has specific course categories
        search_urls = [
            f"{self.base_url}/courses",
            f"{self.base_url}/professional-education",
            f"{self.base_url}/graduate-education"
        ]
        
        courses = []
        
        for url in search_urls:
            try:
                response = self.session.get(url, timeout=10)
                if response.status_code == 200:
                    soup = BeautifulSoup(response.text, 'html.parser')
                    courses.extend(self._extract_courses(soup, topic, limit))
                    
                    if len(courses) >= limit:
                        break
            except Exception as e:
                self.log(f"Error fetching {url}: {e}", "warning")
        
        return courses[:limit]
    
    def _extract_courses(self, soup, topic: str, limit: int) -> List[Dict]:
        """Extract course information from page."""
        topic_lower = topic.lower()
        courses = []
        
        # Look for course cards/listings
        course_elements = soup.find_all(['div', 'article'], class_=['course-card', 'program-card', 'course-item'])
        
        for elem in course_elements:
            title_elem = elem.find(['h2', 'h3', 'h4'])
            link_elem = elem.find('a')
            
            if title_elem:
                title = title_elem.get_text(strip=True)
                
                # Check if topic matches
                if topic_lower in title.lower():
                    course_url = link_elem.get('href', '') if link_elem else ''
                    if not course_url.startswith('http'):
                        course_url = f"{self.base_url}{course_url}"
                    
                    courses.append({
                        'id': course_url.split('/')[-1],
                        'name': title,
                        'url': course_url,
                        'type': 'course',
                        'provider': 'Stanford Online'
                    })
                    
                    if len(courses) >= limit:
                        break
        
        return courses
    
    def get_course_outline(self, course_url: str) -> Dict:
        """Get detailed course information."""
        self.log(f"Fetching Stanford course: {course_url}")
        
        try:
            response = self.session.get(course_url, timeout=15)
            if response.status_code != 200:
                return self._empty_outline(course_url)
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            outline = {
                'title': self._extract_title(soup),
                'description': self._extract_description(soup),
                'url': course_url,
                'modules': self._extract_curriculum(soup),
                'instructors': self._extract_instructors(soup),
                'duration': self._extract_duration(soup)
            }
            
            return outline
            
        except Exception as e:
            self.log(f"Error fetching outline: {e}", "error")
            return self._empty_outline(course_url)
    
    def _extract_title(self, soup) -> str:
        title_elem = soup.find('h1') or soup.find('meta', {'property': 'og:title'})
        if title_elem:
            return title_elem.get_text(strip=True) if hasattr(title_elem, 'get_text') else title_elem.get('content', '')
        return "Unknown Course"
    
    def _extract_description(self, soup) -> str:
        desc_elem = soup.find('div', class_='course-description') or soup.find('meta', {'name': 'description'})
        if desc_elem:
            return desc_elem.get_text(strip=True)[:500] if hasattr(desc_elem, 'get_text') else desc_elem.get('content', '')
        return ""
    
    def _extract_curriculum(self, soup) -> List[Dict]:
        modules = []
        
        # Look for curriculum/syllabus sections
        curriculum = soup.find(['div', 'section'], {'id': 'curriculum'}) or \
                    soup.find(['div', 'section'], class_='curriculum')
        
        if curriculum:
            # Extract week/module sections
            sections = curriculum.find_all(['div', 'li'], class_=['week', 'module', 'session'])
            
            for section in sections:
                title = section.find(['h3', 'h4', 'strong'])
                if title:
                    module = {
                        'title': title.get_text(strip=True),
                        'topics': []
                    }
                    
                    # Extract topics
                    topics = section.find_all('li')
                    for topic in topics[:10]:
                        module['topics'].append(topic.get_text(strip=True))
                    
                    modules.append(module)
        
        return modules
    
    def _extract_instructors(self, soup) -> List[str]:
        instructors = []
        
        # Look for instructor section
        instructor_section = soup.find(['div', 'section'], class_='instructors') or \
                           soup.find(['div', 'section'], {'id': 'instructors'})
        
        if instructor_section:
            names = instructor_section.find_all(['h3', 'h4', 'p'], class_='instructor-name')
            for name in names:
                instructors.append(name.get_text(strip=True))
        
        return instructors
    
    def _extract_duration(self, soup) -> str:
        duration_elem = soup.find(string=lambda text: 'week' in text.lower() if text else False)
        if duration_elem:
            return duration_elem.strip()
        return "Self-paced"
    
    def _empty_outline(self, url: str) -> Dict:
        return {
            'title': 'Course information not available',
            'description': '',
            'url': url,
            'modules': [],
            'instructors': [],
            'duration': 'N/A'
        }


if __name__ == "__main__":
    scraper = StanfordOnlineScraper()
    results = scraper.search_courses("artificial intelligence", limit=3)
    
    for course in results:
        print(f"\nCourse: {course['name']}")
        outline = scraper.get_course_outline(course['url'])
        print(f"  Modules: {len(outline['modules'])}")
        print(f"  Instructors: {', '.join(outline['instructors'])}")