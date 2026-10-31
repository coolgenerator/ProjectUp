"""Udacity Course Scraper Tool

Extracts course information and nanodegree programs from Udacity.
"""

import requests
from bs4 import BeautifulSoup
import json
import time
from typing import Dict, List, Optional
from urllib.parse import quote
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class UdacityScraper:
    """Scraper for Udacity nanodegrees and courses."""
    
    def __init__(self, verbose=True):
        self.base_url = "https://www.udacity.com"
        self.catalog_api = "https://api.udacity.com/api/courses/v1/courses"
        self.verbose = verbose
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json, text/html',
            'Accept-Language': 'en-US,en;q=0.9'
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)
    
    def log(self, message, level="info"):
        if self.verbose:
            getattr(logger, level)(message)
    
    def search_courses(self, topic: str, limit: int = 5) -> List[Dict]:
        """Search for Udacity courses and nanodegrees."""
        self.log(f"Searching Udacity for: {topic}")
        
        try:
            # Try API endpoint first
            response = self.session.get(self.catalog_api, timeout=10)
            if response.status_code == 200:
                data = response.json()
                courses = self._filter_courses(data.get('courses', []), topic, limit)
                return courses
        except Exception as e:
            self.log(f"API error: {e}", "warning")
        
        # Fallback to web scraping
        return self._scrape_catalog(topic, limit)
    
    def _filter_courses(self, courses: List[Dict], topic: str, limit: int) -> List[Dict]:
        """Filter courses based on topic."""
        topic_lower = topic.lower()
        filtered = []
        
        for course in courses:
            title = course.get('title', '').lower()
            summary = course.get('summary', '').lower()
            
            if topic_lower in title or topic_lower in summary:
                filtered.append({
                    'id': course.get('key', ''),
                    'name': course.get('title', ''),
                    'url': f"{self.base_url}/course/{course.get('slug', '')}",
                    'type': 'nanodegree' if 'nanodegree' in title else 'course',
                    'level': course.get('level', 'intermediate'),
                    'duration': course.get('expected_duration', 'N/A')
                })
                
                if len(filtered) >= limit:
                    break
        
        return filtered
    
    def _scrape_catalog(self, topic: str, limit: int) -> List[Dict]:
        """Scrape Udacity catalog page."""
        search_url = f"{self.base_url}/courses/all?search={quote(topic)}"
        
        try:
            response = self.session.get(search_url, timeout=10)
            if response.status_code != 200:
                return []
            
            soup = BeautifulSoup(response.text, 'html.parser')
            courses = []
            
            # Find course cards
            course_cards = soup.find_all('div', class_='course-summary-card')
            
            for card in course_cards[:limit]:
                title_elem = card.find('h3') or card.find('h2')
                link_elem = card.find('a')
                
                if title_elem and link_elem:
                    courses.append({
                        'id': link_elem.get('href', '').split('/')[-1],
                        'name': title_elem.get_text(strip=True),
                        'url': f"{self.base_url}{link_elem.get('href', '')}",
                        'type': 'course'
                    })
            
            return courses
            
        except Exception as e:
            self.log(f"Scraping error: {e}", "error")
            return []
    
    def get_course_outline(self, course_url: str) -> Dict:
        """Get detailed course syllabus."""
        self.log(f"Fetching Udacity course: {course_url}")
        
        try:
            response = self.session.get(course_url, timeout=15)
            if response.status_code != 200:
                return self._empty_outline(course_url)
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            outline = {
                'title': self._extract_title(soup),
                'description': self._extract_description(soup),
                'url': course_url,
                'modules': self._extract_syllabus(soup),
                'skills': self._extract_skills(soup),
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
        desc_elem = soup.find('div', class_='course-summary') or soup.find('meta', {'name': 'description'})
        if desc_elem:
            return desc_elem.get_text(strip=True)[:500] if hasattr(desc_elem, 'get_text') else desc_elem.get('content', '')
        return ""
    
    def _extract_syllabus(self, soup) -> List[Dict]:
        modules = []
        
        # Look for syllabus sections
        syllabus_section = soup.find('div', {'id': 'syllabus'}) or soup.find('section', class_='syllabus')
        
        if syllabus_section:
            lessons = syllabus_section.find_all(['div', 'article'], class_='lesson')
            
            for lesson in lessons:
                title = lesson.find(['h3', 'h4'])
                if title:
                    module = {
                        'title': title.get_text(strip=True),
                        'lessons': []
                    }
                    
                    # Extract lesson items
                    items = lesson.find_all('li')
                    for item in items[:10]:
                        module['lessons'].append({
                            'name': item.get_text(strip=True)
                        })
                    
                    modules.append(module)
        
        return modules
    
    def _extract_skills(self, soup) -> List[str]:
        skills = []
        skills_section = soup.find('div', class_='skills') or soup.find('section', {'aria-label': 'skills'})
        
        if skills_section:
            skill_items = skills_section.find_all(['span', 'li'])
            for item in skill_items[:10]:
                skill = item.get_text(strip=True)
                if skill and len(skill) > 2:
                    skills.append(skill)
        
        return skills
    
    def _extract_duration(self, soup) -> str:
        duration_elem = soup.find(string=lambda text: 'month' in text.lower() if text else False)
        if duration_elem:
            return duration_elem.strip()
        return "Self-paced"
    
    def _empty_outline(self, url: str) -> Dict:
        return {
            'title': 'Course information not available',
            'description': '',
            'url': url,
            'modules': [],
            'skills': [],
            'duration': 'N/A'
        }


if __name__ == "__main__":
    scraper = UdacityScraper()
    results = scraper.search_courses("machine learning", limit=3)
    
    for course in results:
        print(f"\nCourse: {course['name']}")
        outline = scraper.get_course_outline(course['url'])
        print(f"  Modules: {len(outline['modules'])}")
        print(f"  Duration: {outline['duration']}")