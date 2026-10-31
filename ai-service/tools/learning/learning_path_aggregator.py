"""Learning Path Aggregator Tool

Aggregates learning resources from multiple educational platforms
and creates a weighted, comprehensive learning path.
"""

import json
import asyncio
from typing import Dict, List, Optional, Any
from concurrent.futures import ThreadPoolExecutor, as_completed
import logging
from datetime import datetime

# Import individual scrapers with fallback
try:
    from .coursera_scraper import CourseraScraperV3
except ImportError:
    CourseraScraperV3 = None

try:
    from .edx_extractor import EdXExtractor as EdxExtractor
except ImportError:
    EdxExtractor = None

try:
    from .udacity_scraper import UdacityScraper
except ImportError:
    UdacityScraper = None

try:
    from .mit_ocw_simple import MITOCWScraper
except ImportError:
    MITOCWScraper = None

try:
    from .stanford_online_scraper import StanfordOnlineScraper
except ImportError:
    StanfordOnlineScraper = None

try:
    from .github_roadmap_scraper import GitHubRoadmapScraper
except ImportError:
    GitHubRoadmapScraper = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class LearningPathAggregator:
    """Aggregates learning paths from multiple data sources with weighted importance."""
    
    def __init__(self, verbose=True):
        self.verbose = verbose
        
        # Initialize data source weights - only include available scrapers
        self.data_sources = {
            "authoritative_courses": {},
            "open_education": {},
            "practical_paths": {}
        }
        
        # Add available scrapers
        if CourseraScraperV3:
            self.data_sources["authoritative_courses"]["coursera"] = {
                "weight": 0.3, 
                "scraper": CourseraScraperV3(verbose=False)
            }
        
        if EdxExtractor:
            self.data_sources["authoritative_courses"]["edx"] = {
                "weight": 0.25,
                "scraper": EdxExtractor(verbose=False)
            }
        
        if UdacityScraper:
            self.data_sources["authoritative_courses"]["udacity"] = {
                "weight": 0.15,
                "scraper": UdacityScraper(verbose=False)
            }
        
        if MITOCWScraper:
            self.data_sources["open_education"]["mit_ocw"] = {
                "weight": 0.15,
                "scraper": MITOCWScraper(verbose=False)
            }
        
        if StanfordOnlineScraper:
            self.data_sources["open_education"]["stanford_online"] = {
                "weight": 0.1,
                "scraper": StanfordOnlineScraper(verbose=False)
            }
        
        if GitHubRoadmapScraper:
            self.data_sources["practical_paths"]["github_roadmaps"] = {
                "weight": 0.05,
                "scraper": GitHubRoadmapScraper(verbose=False)
            }
        
        # Remove empty categories
        self.data_sources = {k: v for k, v in self.data_sources.items() if v}
        
        # Calculate total weight for normalization
        self.total_weight = sum(
            source["weight"] 
            for category in self.data_sources.values()
            for source in category.values()
        )
    
    def log(self, message, level="info"):
        """Log messages based on verbosity."""
        if self.verbose:
            getattr(logger, level)(message)
    
    def fetch_from_source(self, source_name: str, scraper: Any, topic: str, limit: int = 3) -> Dict:
        """Fetch learning resources from a single source."""
        self.log(f"Fetching from {source_name}...")
        
        try:
            # Search for courses
            courses = scraper.search_courses(topic, limit=limit)
            
            if not courses:
                self.log(f"No courses found from {source_name}", "warning")
                return {
                    "source": source_name,
                    "courses": [],
                    "error": "No courses found"
                }
            
            # Get detailed outlines for each course
            detailed_courses = []
            for course in courses:
                try:
                    if hasattr(scraper, 'get_course_outline'):
                        outline = scraper.get_course_outline(course.get('url', ''))
                        outline['source'] = source_name
                        outline['course_info'] = course
                        detailed_courses.append(outline)
                    else:
                        # If no outline method, use basic course info
                        course['source'] = source_name
                        detailed_courses.append(course)
                except Exception as e:
                    self.log(f"Error getting outline for {course.get('name', 'Unknown')}: {e}", "warning")
                    continue
            
            return {
                "source": source_name,
                "courses": detailed_courses,
                "count": len(detailed_courses)
            }
            
        except Exception as e:
            self.log(f"Error fetching from {source_name}: {e}", "error")
            return {
                "source": source_name,
                "courses": [],
                "error": str(e)
            }
    
    def aggregate_learning_paths(self, topic: str, max_courses_per_source: int = 3) -> Dict:
        """Aggregate learning paths from all sources."""
        self.log(f"\n{'='*60}")
        self.log(f"Learning Path Aggregator - Multi-Source Collection")
        self.log(f"Topic: {topic}")
        self.log(f"{'='*60}\n")
        
        all_results = {}
        
        # Use ThreadPoolExecutor for parallel fetching
        with ThreadPoolExecutor(max_workers=6) as executor:
            future_to_source = {}
            
            # Submit all fetch tasks
            for category_name, category_sources in self.data_sources.items():
                for source_name, source_info in category_sources.items():
                    future = executor.submit(
                        self.fetch_from_source,
                        source_name,
                        source_info["scraper"],
                        topic,
                        max_courses_per_source
                    )
                    future_to_source[future] = (source_name, source_info["weight"], category_name)
            
            # Collect results as they complete
            for future in as_completed(future_to_source):
                source_name, weight, category = future_to_source[future]
                try:
                    result = future.result(timeout=30)
                    result["weight"] = weight
                    result["category"] = category
                    all_results[source_name] = result
                    
                    self.log(f"✓ {source_name}: {result.get('count', 0)} courses fetched")
                    
                except Exception as e:
                    self.log(f"✗ {source_name}: Failed - {e}", "error")
                    all_results[source_name] = {
                        "source": source_name,
                        "courses": [],
                        "error": str(e),
                        "weight": weight,
                        "category": category
                    }
        
        # Process and rank the aggregated results
        processed_results = self.process_aggregated_data(all_results, topic)
        
        return processed_results
    
    def process_aggregated_data(self, all_results: Dict, topic: str) -> Dict:
        """Process and rank aggregated learning resources."""
        
        # Collect all courses with their weighted scores
        all_courses = []
        
        for source_name, source_data in all_results.items():
            weight = source_data.get("weight", 0)
            
            for course in source_data.get("courses", []):
                # Calculate weighted score
                course_score = self.calculate_course_score(course, weight)
                
                all_courses.append({
                    "course": course,
                    "source": source_name,
                    "category": source_data.get("category"),
                    "weight": weight,
                    "score": course_score
                })
        
        # Sort courses by score
        all_courses.sort(key=lambda x: x["score"], reverse=True)
        
        # Extract learning path structure
        learning_path = self.extract_learning_path(all_courses, topic)
        
        # Generate summary statistics
        stats = self.generate_statistics(all_results)
        
        return {
            "topic": topic,
            "timestamp": datetime.now().isoformat(),
            "sources_summary": stats,
            "learning_path": learning_path,
            "all_courses": all_courses[:20],  # Top 20 courses
            "source_details": all_results
        }
    
    def calculate_course_score(self, course: Dict, source_weight: float) -> float:
        """Calculate a score for a course based on various factors."""
        base_score = source_weight * 100
        
        # Bonus for having detailed modules
        if course.get("modules"):
            module_count = len(course.get("modules", []))
            base_score += min(module_count * 2, 20)  # Max 20 bonus points
        
        # Bonus for having resources
        if course.get("resources"):
            base_score += 10
        
        # Bonus for having skills listed
        if course.get("skills"):
            base_score += 5
        
        # Bonus for having instructors
        if course.get("instructors"):
            base_score += 5
        
        return base_score
    
    def extract_learning_path(self, ranked_courses: List[Dict], topic: str) -> Dict:
        """Extract a structured learning path from ranked courses."""
        
        # Group courses by difficulty/level if available
        beginner_courses = []
        intermediate_courses = []
        advanced_courses = []
        unclassified_courses = []
        
        for course_data in ranked_courses[:15]:  # Top 15 courses
            course = course_data["course"]
            
            # Try to determine level
            level = self.determine_course_level(course)
            
            course_summary = {
                "title": course.get("title") or course.get("name", "Unknown"),
                "source": course_data["source"],
                "url": course.get("url", ""),
                "score": course_data["score"],
                "modules_count": len(course.get("modules", [])),
                "duration": course.get("duration") or course.get("metadata", {}).get("duration", "N/A")
            }
            
            if level == "beginner":
                beginner_courses.append(course_summary)
            elif level == "intermediate":
                intermediate_courses.append(course_summary)
            elif level == "advanced":
                advanced_courses.append(course_summary)
            else:
                unclassified_courses.append(course_summary)
        
        # Create structured learning path
        learning_path = {
            "title": f"Comprehensive {topic} Learning Path",
            "description": f"A curated learning path for {topic} aggregated from multiple authoritative sources",
            "stages": []
        }
        
        if beginner_courses:
            learning_path["stages"].append({
                "level": "Beginner",
                "description": "Foundation concepts and basic skills",
                "courses": beginner_courses[:5]
            })
        
        if intermediate_courses or unclassified_courses:
            learning_path["stages"].append({
                "level": "Intermediate",
                "description": "Core concepts and practical applications",
                "courses": (intermediate_courses + unclassified_courses)[:5]
            })
        
        if advanced_courses:
            learning_path["stages"].append({
                "level": "Advanced",
                "description": "Advanced topics and specializations",
                "courses": advanced_courses[:5]
            })
        
        # Extract key topics from all modules
        all_topics = self.extract_key_topics(ranked_courses[:10])
        learning_path["key_topics"] = all_topics[:20]  # Top 20 topics
        
        # Extract common skills
        all_skills = self.extract_common_skills(ranked_courses[:10])
        learning_path["skills_to_gain"] = all_skills[:15]  # Top 15 skills
        
        return learning_path
    
    def determine_course_level(self, course: Dict) -> str:
        """Determine the difficulty level of a course."""
        
        # Check explicit level field
        if course.get("level"):
            level_str = course["level"].lower()
            if "beginner" in level_str:
                return "beginner"
            elif "advanced" in level_str:
                return "advanced"
            elif "intermediate" in level_str:
                return "intermediate"
        
        # Check in metadata
        metadata = course.get("metadata", {})
        if metadata.get("level"):
            level_str = metadata["level"].lower()
            if "beginner" in level_str:
                return "beginner"
            elif "advanced" in level_str:
                return "advanced"
        
        # Check title and description
        title = (course.get("title") or course.get("name", "")).lower()
        description = course.get("description", "").lower()
        
        beginner_keywords = ["introduction", "basics", "fundamental", "getting started", "101"]
        advanced_keywords = ["advanced", "expert", "mastery", "deep dive", "specialization"]
        
        for keyword in beginner_keywords:
            if keyword in title or keyword in description:
                return "beginner"
        
        for keyword in advanced_keywords:
            if keyword in title or keyword in description:
                return "advanced"
        
        return "intermediate"
    
    def extract_key_topics(self, courses: List[Dict]) -> List[str]:
        """Extract key topics from course modules."""
        topics = {}
        
        for course_data in courses:
            course = course_data["course"]
            
            # Extract from modules
            for module in course.get("modules", []):
                title = module.get("title", "").lower()
                # Clean and add topic
                if title and len(title) > 3:
                    topics[title] = topics.get(title, 0) + 1
                
                # Extract from lessons
                for lesson in module.get("lessons", []):
                    lesson_name = lesson.get("name", "").lower()
                    if lesson_name and len(lesson_name) > 5:
                        topics[lesson_name] = topics.get(lesson_name, 0) + 0.5
        
        # Sort by frequency and return top topics
        sorted_topics = sorted(topics.items(), key=lambda x: x[1], reverse=True)
        return [topic.title() for topic, _ in sorted_topics]
    
    def extract_common_skills(self, courses: List[Dict]) -> List[str]:
        """Extract common skills from courses."""
        skills = {}
        
        for course_data in courses:
            course = course_data["course"]
            
            # Extract from skills field
            for skill in course.get("skills", []):
                if skill:
                    skills[skill] = skills.get(skill, 0) + 1
        
        # Sort by frequency
        sorted_skills = sorted(skills.items(), key=lambda x: x[1], reverse=True)
        return [skill for skill, _ in sorted_skills]
    
    def generate_statistics(self, all_results: Dict) -> Dict:
        """Generate summary statistics."""
        stats = {
            "total_sources": len(all_results),
            "successful_sources": sum(1 for r in all_results.values() if not r.get("error")),
            "total_courses": sum(len(r.get("courses", [])) for r in all_results.values()),
            "sources_breakdown": {}
        }
        
        for source_name, data in all_results.items():
            stats["sources_breakdown"][source_name] = {
                "category": data.get("category"),
                "weight": data.get("weight", 0),
                "courses_found": len(data.get("courses", [])),
                "status": "success" if not data.get("error") else "failed"
            }
        
        return stats
    
    def save_results(self, results: Dict, filename: str):
        """Save aggregated results to JSON file."""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False, default=str)
        self.log(f"\n✅ Results saved to {filename}")


def main():
    """Test the aggregator."""
    import sys
    
    topic = sys.argv[1] if len(sys.argv) > 1 else "machine learning"
    
    aggregator = LearningPathAggregator(verbose=True)
    results = aggregator.aggregate_learning_paths(topic, max_courses_per_source=2)
    
    # Save results
    filename = f"learning_path_{topic.replace(' ', '_')}_aggregated.json"
    aggregator.save_results(results, filename)
    
    # Print summary
    print(f"\n{'='*60}")
    print(f"AGGREGATION COMPLETE")
    print(f"{'='*60}")
    print(f"Topic: {results['topic']}")
    print(f"Total sources: {results['sources_summary']['total_sources']}")
    print(f"Successful sources: {results['sources_summary']['successful_sources']}")
    print(f"Total courses: {results['sources_summary']['total_courses']}")
    
    print(f"\nLearning Path Stages:")
    for stage in results['learning_path']['stages']:
        print(f"  - {stage['level']}: {len(stage['courses'])} courses")
    
    print(f"\nTop Skills to Gain:")
    for skill in results['learning_path'].get('skills_to_gain', [])[:5]:
        print(f"  - {skill}")
    
    print(f"\nOutput saved to: {filename}")


if __name__ == "__main__":
    main()