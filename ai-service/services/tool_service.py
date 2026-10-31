"""
Service layer for tool management and execution.
"""

from typing import Dict, Any, List, Optional
import time
import base64
from io import BytesIO

from .base_service import BaseService
from models.requests.tool_requests import (
    ToolRequest,
    URLRequest,
    ImageRequest
)
from models.responses.tool_responses import (
    ToolResponse,
    URLResponse,
    ImageResponse,
    ImageAnalysisResult
)
from tools import common_tools


class ToolService(BaseService):
    """Service for managing and executing tools."""
    
    def __init__(self):
        """Initialize tool service."""
        super().__init__()
        self.available_tools = self._load_available_tools()
        self.tool_registry = {}
        self._register_tools()
    
    def _initialize(self):
        """Initialize tool service resources."""
        self.log_info("Tool service initialized")
    
    def _load_available_tools(self) -> Dict[str, Any]:
        """Load available tools from the tools module."""
        tools = {
            'web_search': {
                'name': 'Web Search',
                'description': 'Search the web for information',
                'parameters': ['query', 'num_results']
            },
            'url_extractor': {
                'name': 'URL Content Extractor',
                'description': 'Extract and analyze content from URLs',
                'parameters': ['url', 'extract_text', 'extract_metadata']
            },
            'image_analyzer': {
                'name': 'Image Analyzer',
                'description': 'Analyze images for content and text',
                'parameters': ['image_data', 'extract_text', 'detect_objects']
            },
            'code_executor': {
                'name': 'Code Executor',
                'description': 'Execute code snippets safely',
                'parameters': ['code', 'language', 'timeout']
            },
            'file_processor': {
                'name': 'File Processor',
                'description': 'Process various file formats',
                'parameters': ['file_path', 'operation']
            }
        }
        return tools
    
    def _register_tools(self):
        """Register tool implementations."""
        # Register actual tool implementations
        # This would map tool names to actual functions
        self.tool_registry = {
            'web_search': self._execute_web_search,
            'url_extractor': self._execute_url_extraction,
            'image_analyzer': self._execute_image_analysis,
            'code_executor': self._execute_code,
            'file_processor': self._execute_file_processing
        }
    
    async def execute_tool(
        self, 
        request: ToolRequest
    ) -> ToolResponse:
        """Execute a tool with given parameters."""
        try:
            start_time = time.time()
            
            # Validate tool exists
            if request.tool_name not in self.tool_registry:
                return ToolResponse(
                    tool_name=request.tool_name,
                    success=False,
                    error=f"Tool '{request.tool_name}' not found"
                )
            
            self.log_info(
                f"Executing tool: {request.tool_name}",
                parameters=request.parameters
            )
            
            # Execute tool
            tool_func = self.tool_registry[request.tool_name]
            result = await tool_func(request.parameters)
            
            execution_time = time.time() - start_time
            
            return ToolResponse(
                tool_name=request.tool_name,
                success=True,
                result=result,
                execution_time=execution_time,
                metadata={
                    'session_id': request.session_id,
                    'parameters_used': request.parameters
                }
            )
            
        except Exception as e:
            self.log_error(f"Failed to execute tool: {request.tool_name}", error=e)
            return ToolResponse(
                tool_name=request.tool_name,
                success=False,
                error=str(e)
            )
    
    async def process_urls(
        self, 
        request: URLRequest
    ) -> URLResponse:
        """Process URLs from text."""
        try:
            # Extract URLs from text
            urls = self._extract_urls_from_text(request.text)
            
            self.log_info(f"Processing {len(urls)} URLs")
            
            url_contents = {}
            
            if request.extract_content:
                for url in urls:
                    try:
                        content = await self._fetch_url_content(
                            url, 
                            request.follow_redirects,
                            request.timeout
                        )
                        url_contents[url] = content
                    except Exception as e:
                        url_contents[url] = f"Error fetching: {str(e)}"
            
            return URLResponse(
                urls_found=len(urls),
                url_contents=url_contents,
                metadata={
                    'follow_redirects': request.follow_redirects,
                    'timeout': request.timeout
                }
            )
            
        except Exception as e:
            self.log_error("Failed to process URLs", error=e)
            return URLResponse(
                urls_found=0,
                url_contents={},
                metadata={'error': str(e)}
            )
    
    async def analyze_images(
        self, 
        request: ImageRequest
    ) -> ImageResponse:
        """Analyze images."""
        try:
            self.log_info(f"Analyzing {len(request.base64_images)} images")
            
            start_time = time.time()
            analysis_results = []
            
            for img_data in request.base64_images:
                try:
                    result = await self._analyze_single_image(
                        img_data,
                        request.extract_text,
                        request.detect_objects
                    )
                    analysis_results.append(result)
                except Exception as e:
                    analysis_results.append(
                        ImageAnalysisResult(error=str(e))
                    )
            
            processing_time = time.time() - start_time
            
            return ImageResponse(
                images_found=len(request.base64_images),
                image_analysis=analysis_results,
                processing_time=processing_time,
                metadata={
                    'analyze_content': request.analyze_content,
                    'extract_text': request.extract_text,
                    'detect_objects': request.detect_objects
                }
            )
            
        except Exception as e:
            self.log_error("Failed to analyze images", error=e)
            return ImageResponse(
                images_found=0,
                image_analysis=[],
                metadata={'error': str(e)}
            )
    
    async def list_tools(self) -> List[Dict[str, Any]]:
        """List all available tools."""
        tools_list = []
        
        for tool_id, tool_info in self.available_tools.items():
            tools_list.append({
                'id': tool_id,
                'name': tool_info['name'],
                'description': tool_info['description'],
                'parameters': tool_info['parameters']
            })
        
        return tools_list
    
    async def get_tool_info(self, tool_name: str) -> Optional[Dict[str, Any]]:
        """Get information about a specific tool."""
        if tool_name not in self.available_tools:
            return None
        
        tool_info = self.available_tools[tool_name]
        return {
            'id': tool_name,
            'name': tool_info['name'],
            'description': tool_info['description'],
            'parameters': tool_info['parameters'],
            'examples': self._get_tool_examples(tool_name)
        }
    
    # Tool implementation methods
    
    async def _execute_web_search(self, parameters: Dict[str, Any]) -> Any:
        """Execute web search tool."""
        query = parameters.get('query', '')
        num_results = parameters.get('num_results', 10)
        
        # This would integrate with actual search API
        # For now, returning mock results
        return {
            'query': query,
            'results': [
                {
                    'title': f'Result for {query}',
                    'url': f'https://example.com/{query}',
                    'snippet': f'Information about {query}'
                }
                for i in range(min(num_results, 3))
            ]
        }
    
    async def _execute_url_extraction(self, parameters: Dict[str, Any]) -> Any:
        """Execute URL content extraction."""
        url = parameters.get('url', '')
        extract_text = parameters.get('extract_text', True)
        extract_metadata = parameters.get('extract_metadata', False)
        
        # This would integrate with actual URL fetching
        # For now, returning mock data
        result = {
            'url': url,
            'status': 200
        }
        
        if extract_text:
            result['text'] = f'Content from {url}'
        
        if extract_metadata:
            result['metadata'] = {
                'title': 'Page Title',
                'description': 'Page description'
            }
        
        return result
    
    async def _execute_image_analysis(self, parameters: Dict[str, Any]) -> Any:
        """Execute image analysis."""
        image_data = parameters.get('image_data', '')
        extract_text = parameters.get('extract_text', True)
        detect_objects = parameters.get('detect_objects', False)
        
        # This would integrate with actual image analysis
        # For now, returning mock data
        result = {}
        
        if extract_text:
            result['text'] = 'Sample text from image'
        
        if detect_objects:
            result['objects'] = ['object1', 'object2']
        
        return result
    
    async def _execute_code(self, parameters: Dict[str, Any]) -> Any:
        """Execute code safely."""
        code = parameters.get('code', '')
        language = parameters.get('language', 'python')
        timeout = parameters.get('timeout', 5)
        
        # This would integrate with actual code execution sandbox
        # For now, returning mock output
        return {
            'language': language,
            'output': f'Code executed successfully',
            'execution_time': 0.1
        }
    
    async def _execute_file_processing(self, parameters: Dict[str, Any]) -> Any:
        """Execute file processing."""
        file_path = parameters.get('file_path', '')
        operation = parameters.get('operation', 'read')
        
        # This would integrate with actual file processing
        # For now, returning mock data
        return {
            'file': file_path,
            'operation': operation,
            'status': 'completed'
        }
    
    # Helper methods
    
    def _extract_urls_from_text(self, text: str) -> List[str]:
        """Extract URLs from text."""
        import re
        url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+'
        urls = re.findall(url_pattern, text)
        return urls
    
    async def _fetch_url_content(
        self, 
        url: str, 
        follow_redirects: bool, 
        timeout: int
    ) -> str:
        """Fetch content from URL."""
        # This would use actual HTTP client
        # For now, returning mock content
        return f"Content from {url}"
    
    async def _analyze_single_image(
        self,
        image_data: str,
        extract_text: bool,
        detect_objects: bool
    ) -> ImageAnalysisResult:
        """Analyze a single image."""
        result = ImageAnalysisResult()
        
        if extract_text:
            # This would use OCR
            result.extracted_text = "Sample text from image"
        
        if detect_objects:
            # This would use object detection
            result.objects_detected = [
                {'object': 'person', 'confidence': 0.95},
                {'object': 'car', 'confidence': 0.87}
            ]
            result.confidence_scores = {'overall': 0.91}
        
        result.labels = ['outdoor', 'daylight']
        
        return result
    
    def _get_tool_examples(self, tool_name: str) -> List[Dict[str, Any]]:
        """Get usage examples for a tool."""
        examples = {
            'web_search': [
                {
                    'description': 'Search for Python tutorials',
                    'parameters': {'query': 'Python tutorials', 'num_results': 5}
                }
            ],
            'url_extractor': [
                {
                    'description': 'Extract content from a webpage',
                    'parameters': {'url': 'https://example.com', 'extract_text': True}
                }
            ]
        }
        
        return examples.get(tool_name, [])