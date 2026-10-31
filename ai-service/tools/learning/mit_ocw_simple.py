#!/usr/bin/env python3
"""
Simple MIT OCW Course Extractor
Extracts course content using direct course URLs
"""

import requests
from bs4 import BeautifulSoup
import json
import re
from typing import Dict, List, Optional
from urllib.parse import urljoin


class SimpleMITOCWExtractor:
    """Simple extractor for MIT OCW courses."""
    
    def __init__(self, verbose=True):
        self.base_url = "https://ocw.mit.edu"
        self.verbose = verbose
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
        
        # Popular MIT OCW courses by topic
        self.course_catalog = {
            'computer science': [
                {
                    'url': 'https://ocw.mit.edu/courses/6-00sc-introduction-to-computer-science-and-programming-spring-2011/',
                    'title': 'Introduction to Computer Science and Programming',
                    'number': '6.00SC'
                },
                {
                    'url': 'https://ocw.mit.edu/courses/6-034-artificial-intelligence-fall-2010/',
                    'title': 'Artificial Intelligence',
                    'number': '6.034'
                },
                {
                    'url': 'https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/',
                    'title': 'Introduction to Algorithms',
                    'number': '6.006'
                }
            ],
            'machine learning': [
                {
                    'url': 'https://ocw.mit.edu/courses/6-034-artificial-intelligence-fall-2010/',
                    'title': 'Artificial Intelligence',
                    'number': '6.034'
                },
                {
                    'url': 'https://ocw.mit.edu/courses/6-867-machine-learning-fall-2006/',
                    'title': 'Machine Learning',
                    'number': '6.867'
                },
                {
                    'url': 'https://ocw.mit.edu/courses/9-520-statistical-learning-theory-and-applications-spring-2003/',
                    'title': 'Statistical Learning Theory and Applications',
                    'number': '9.520'
                }
            ],
            'mathematics': [
                {
                    'url': 'https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/',
                    'title': 'Linear Algebra',
                    'number': '18.06'
                },
                {
                    'url': 'https://ocw.mit.edu/courses/18-01sc-single-variable-calculus-fall-2010/',
                    'title': 'Single Variable Calculus',
                    'number': '18.01SC'
                },
                {
                    'url': 'https://ocw.mit.edu/courses/18-02sc-multivariable-calculus-fall-2010/',
                    'title': 'Multivariable Calculus',
                    'number': '18.02SC'
                }
            ],
            'physics': [
                {
                    'url': 'https://ocw.mit.edu/courses/8-01sc-classical-mechanics-fall-2016/',
                    'title': 'Classical Mechanics',
                    'number': '8.01SC'
                },
                {
                    'url': 'https://ocw.mit.edu/courses/8-02-physics-ii-electricity-and-magnetism-spring-2007/',
                    'title': 'Physics II: Electricity and Magnetism',
                    'number': '8.02'
                }
            ],
            'data science': [
                {
                    'url': 'https://ocw.mit.edu/courses/6-0002-introduction-to-computational-thinking-and-data-science-fall-2016/',
                    'title': 'Introduction to Computational Thinking and Data Science',
                    'number': '6.0002'
                },
                {
                    'url': 'https://ocw.mit.edu/courses/14-310x-data-analysis-for-social-scientists-spring-2023/',
                    'title': 'Data Analysis for Social Scientists',
                    'number': '14.310x'
                }
            ]
        }
    
    def search_courses(self, topic: str, limit: int = 5) -> List[Dict]:
        """
        Search for MIT OCW courses by topic (wrapper for compatibility).
        """
        courses = self.get_courses_for_topic(topic)
        return courses[:limit]
    
    def get_course_outline(self, course_url: str) -> Dict:
        """
        Get course outline (wrapper for compatibility).
        """
        course_data = self.extract_course(course_url)
        
        # Convert to expected format
        modules = []
        if course_data.get('syllabus'):
            for week in course_data['syllabus']:
                module = {
                    'title': week.get('week', 'Unknown'),
                    'description': week.get('description', ''),
                    'lessons': [{'name': topic} for topic in week.get('topics', [])]
                }
                modules.append(module)
        
        return {
            'title': course_data.get('title', 'Unknown Course'),
            'description': course_data.get('description', ''),
            'url': course_url,
            'modules': modules,
            'resources': course_data.get('resources', []),
            'lectures': course_data.get('lectures', [])
        }
    
    def get_courses_for_topic(self, topic: str) -> List[Dict]:
        """Get course URLs for a topic."""
        topic_lower = topic.lower()
        
        # Check direct match
        if topic_lower in self.course_catalog:
            return self.course_catalog[topic_lower]
        
        # Check partial matches
        for key, courses in self.course_catalog.items():
            if topic_lower in key or key in topic_lower:
                return courses
        
        # Default to computer science
        print(f"Topic '{topic}' not found. Using computer science courses.")
        return self.course_catalog['computer science']
    
    def extract_course(self, course_url: str) -> Dict:
        """Extract course content from a URL."""
        print(f"\nExtracting: {course_url}")
        
        course = {
            'url': course_url,
            'title': '',
            'number': '',
            'description': '',
            'syllabus': [],
            'lectures': [],
            'resources': []
        }
        
        try:
            response = requests.get(course_url, headers=self.headers, timeout=10)
            if response.status_code != 200:
                print(f"  ✗ Failed: Status {response.status_code}")
                return course
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract title
            title_elem = soup.find('h1')
            if title_elem:
                course['title'] = title_elem.get_text(strip=True)
                # Extract course number
                number_match = re.search(r'(\d+[\.\-]\d+\w*)', course['title'])
                if number_match:
                    course['number'] = number_match.group(1)
            
            # Extract description
            desc_elem = soup.find('meta', {'name': 'description'})
            if desc_elem:
                course['description'] = desc_elem.get('content', '')
            
            # Find navigation links for course sections
            nav_links = soup.find_all('a', href=True)
            
            for link in nav_links:
                href = link.get('href', '')
                text = link.get_text(strip=True).lower()
                
                # Syllabus
                if 'syllabus' in text:
                    course['syllabus_url'] = urljoin(course_url, href)
                
                # Lecture Videos
                elif 'video' in text and 'lecture' in text:
                    course['videos_url'] = urljoin(course_url, href)
                
                # Lecture Notes
                elif 'lecture' in text and 'note' in text:
                    course['notes_url'] = urljoin(course_url, href)
                
                # Assignments
                elif 'assignment' in text:
                    course['assignments_url'] = urljoin(course_url, href)
            
            # Extract lectures if we have a video or notes URL
            if course.get('videos_url'):
                course['lectures'] = self._extract_lectures(course['videos_url'])
            elif course.get('notes_url'):
                course['lectures'] = self._extract_lectures(course['notes_url'])
            
            # Extract syllabus topics
            if course.get('syllabus_url'):
                course['syllabus'] = self._extract_syllabus(course['syllabus_url'])
            
            # Find downloadable resources
            course['resources'] = self._extract_resources(soup, course_url)
            
            print(f"  ✓ Extracted: {len(course['lectures'])} lectures, {len(course['resources'])} resources")
            
        except Exception as e:
            print(f"  ✗ Error: {e}")
        
        return course
    
    def _extract_lectures(self, lectures_url: str) -> List[Dict]:
        """Extract lecture information from lectures page."""
        lectures = []
        
        try:
            response = requests.get(lectures_url, headers=self.headers, timeout=10)
            if response.status_code != 200:
                return lectures
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Find lecture links
            lecture_links = soup.find_all('a', href=True)
            
            for link in lecture_links:
                text = link.get_text(strip=True)
                href = link.get('href', '')
                
                # Look for lecture patterns
                if any(pattern in text.lower() for pattern in ['lecture', 'session', 'week', 'class']):
                    lecture = {
                        'title': text,
                        'url': urljoin(lectures_url, href)
                    }
                    
                    # Determine type
                    if 'video' in href.lower() or 'youtube' in href:
                        lecture['type'] = 'video'
                    elif '.pdf' in href.lower():
                        lecture['type'] = 'notes'
                    else:
                        lecture['type'] = 'page'
                    
                    # Extract lecture number
                    num_match = re.search(r'(\d+)', text)
                    if num_match:
                        lecture['number'] = int(num_match.group(1))
                    
                    # Avoid duplicates
                    if not any(l['title'] == lecture['title'] for l in lectures):
                        lectures.append(lecture)
            
            # Sort by lecture number if available
            lectures.sort(key=lambda x: x.get('number', 999))
            
        except Exception as e:
            print(f"    Error extracting lectures: {e}")
        
        return lectures[:30]  # Limit to 30 lectures
    
    def _extract_syllabus(self, syllabus_url: str) -> List[Dict]:
        """Extract syllabus topics."""
        topics = []
        
        try:
            response = requests.get(syllabus_url, headers=self.headers, timeout=10)
            if response.status_code != 200:
                return topics
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Look for topic headings or table
            headings = soup.find_all(['h2', 'h3', 'h4'])
            
            for heading in headings:
                text = heading.get_text(strip=True)
                # Filter out navigation headings
                if not any(skip in text.lower() for skip in ['navigation', 'menu', 'footer', 'header']):
                    topic = {
                        'title': text,
                        'subtopics': []
                    }
                    
                    # Get subtopics (next list after heading)
                    next_elem = heading.find_next_sibling()
                    if next_elem and next_elem.name in ['ul', 'ol']:
                        for li in next_elem.find_all('li')[:5]:
                            subtopic = li.get_text(strip=True)
                            if subtopic:
                                topic['subtopics'].append(subtopic)
                    
                    if topic['title']:
                        topics.append(topic)
            
            # Also check for tables (common for syllabi)
            tables = soup.find_all('table')
            for table in tables[:2]:
                rows = table.find_all('tr')[1:]  # Skip header
                for row in rows[:20]:
                    cells = row.find_all(['td', 'th'])
                    if len(cells) >= 2:
                        session = cells[0].get_text(strip=True)
                        topic_text = cells[1].get_text(strip=True)
                        
                        if session and topic_text:
                            topics.append({
                                'title': f"{session}: {topic_text}",
                                'subtopics': []
                            })
            
        except Exception as e:
            print(f"    Error extracting syllabus: {e}")
        
        return topics[:20]  # Limit topics
    
    def _extract_resources(self, soup, base_url: str) -> List[Dict]:
        """Extract downloadable resources."""
        resources = []
        
        # Find download links
        download_patterns = ['.pdf', '.zip', '.ppt', '.doc', '.mp4', '.mp3']
        links = soup.find_all('a', href=True)
        
        for link in links:
            href = link.get('href', '').lower()
            text = link.get_text(strip=True)
            
            for pattern in download_patterns:
                if pattern in href:
                    resource = {
                        'title': text or f"Download {pattern.upper()}",
                        'url': urljoin(base_url, link.get('href', '')),
                        'type': pattern.replace('.', '')
                    }
                    
                    # Avoid duplicates
                    if not any(r['url'] == resource['url'] for r in resources):
                        resources.append(resource)
                    break
        
        return resources[:20]  # Limit resources
    
    def extract_topic(self, topic: str, max_courses: int = 3) -> List[Dict]:
        """Extract courses for a topic."""
        print(f"\n{'='*60}")
        print(f"MIT OCW Simple Extractor")
        print(f"{'='*60}")
        print(f"Topic: {topic}")
        
        # Get courses for topic
        courses_info = self.get_courses_for_topic(topic)
        
        extracted_courses = []
        
        for i, course_info in enumerate(courses_info[:max_courses], 1):
            print(f"\n[{i}/{min(len(courses_info), max_courses)}] {course_info['title']}")
            
            # Extract course
            course = self.extract_course(course_info['url'])
            
            # Add catalog info
            course['catalog_info'] = course_info
            extracted_courses.append(course)
        
        return extracted_courses
    
    def generate_report(self, courses: List[Dict]) -> str:
        """Generate markdown report."""
        report = []
        
        report.append("# MIT OpenCourseWare Courses\n")
        
        for course in courses:
            report.append(f"## {course.get('title', 'Unknown Course')}")
            
            if course.get('number'):
                report.append(f"**Course Number**: {course['number']}")
            
            report.append(f"**URL**: {course['url']}")
            
            if course.get('description'):
                report.append(f"\n{course['description']}\n")
            
            # Course sections
            sections = []
            if course.get('syllabus_url'):
                sections.append(f"[Syllabus]({course['syllabus_url']})")
            if course.get('videos_url'):
                sections.append(f"[Video Lectures]({course['videos_url']})")
            if course.get('notes_url'):
                sections.append(f"[Lecture Notes]({course['notes_url']})")
            if course.get('assignments_url'):
                sections.append(f"[Assignments]({course['assignments_url']})")
            
            if sections:
                report.append(f"\n**Course Sections**: {' | '.join(sections)}")
            
            # Syllabus topics
            if course.get('syllabus'):
                report.append("\n### Course Topics")
                for topic in course['syllabus'][:10]:
                    report.append(f"- {topic['title']}")
                    for subtopic in topic.get('subtopics', [])[:3]:
                        report.append(f"  - {subtopic}")
            
            # Lectures
            if course.get('lectures'):
                report.append("\n### Lectures")
                
                # Count by type
                videos = [l for l in course['lectures'] if l.get('type') == 'video']
                notes = [l for l in course['lectures'] if l.get('type') == 'notes']
                
                report.append(f"Total: {len(course['lectures'])} lectures")
                if videos:
                    report.append(f"- Videos: {len(videos)}")
                if notes:
                    report.append(f"- Lecture Notes: {len(notes)}")
                
                # Show first few
                for lecture in course['lectures'][:5]:
                    type_label = f" [{lecture.get('type', 'link')}]" if lecture.get('type') else ""
                    report.append(f"- [{lecture['title']}]({lecture['url']}){type_label}")
            
            # Resources
            if course.get('resources'):
                report.append("\n### Downloadable Resources")
                
                # Group by type
                by_type = {}
                for resource in course['resources']:
                    rtype = resource.get('type', 'other')
                    if rtype not in by_type:
                        by_type[rtype] = []
                    by_type[rtype].append(resource)
                
                for rtype, items in list(by_type.items())[:5]:
                    report.append(f"\n**{rtype.upper()} Files** ({len(items)})")
                    for item in items[:3]:
                        report.append(f"- [{item['title']}]({item['url']})")
            
            report.append("\n---\n")
        
        return "\n".join(report)


def main():
    """Test the simple MIT OCW extractor."""
    import sys
    
    # Get topic
    topic = sys.argv[1] if len(sys.argv) > 1 else "machine learning"
    max_courses = int(sys.argv[2]) if len(sys.argv) > 2 else 2
    
    # Create extractor
    extractor = SimpleMITOCWExtractor()
    
    # Extract courses
    courses = extractor.extract_topic(topic, max_courses)
    
    if courses:
        # Save JSON
        filename = f"mit_ocw_{topic.replace(' ', '_')}_simple.json"
        with open(filename, 'w') as f:
            json.dump(courses, f, indent=2)
        print(f"\n✅ Saved to {filename}")
        
        # Generate report
        report = extractor.generate_report(courses)
        report_file = f"mit_ocw_{topic.replace(' ', '_')}_report.md"
        with open(report_file, 'w') as f:
            f.write(report)
        print(f"✅ Report saved to {report_file}")
        
        # Summary
        print(f"\n{'='*60}")
        print("SUMMARY")
        print(f"{'='*60}")
        print(f"Courses extracted: {len(courses)}")
        
        total_lectures = sum(len(c.get('lectures', [])) for c in courses)
        total_resources = sum(len(c.get('resources', [])) for c in courses)
        
        print(f"Total lectures: {total_lectures}")
        print(f"Total resources: {total_resources}")
    
    return courses


# Alias for compatibility
MITOCWScraper = SimpleMITOCWExtractor

if __name__ == "__main__":
    main()