"""
Common tools shared across workflows
"""

from typing import Dict, Any, List, Optional
from langchain_community.tools import DuckDuckGoSearchRun, WikipediaQueryRun
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_core.tools import Tool
import requests
import json
import os


class WebSearchTool:
    """Web search tool with multiple providers"""
    
    def __init__(self, provider: str = "tavily"):
        self.provider = provider
        
        if provider == "tavily":
            self.search = TavilySearchResults(max_results=5)
        elif provider == "duckduckgo":
            self.search = DuckDuckGoSearchRun()
        else:
            raise ValueError(f"Unknown search provider: {provider}")
    
    def search_web(self, query: str) -> List[Dict[str, Any]]:
        """Search the web"""
        results = self.search.invoke(query)
        
        if self.provider == "tavily":
            return results
        else:
            # Convert DuckDuckGo results to standard format
            return [{"content": results, "url": "duckduckgo.com"}]
    
    def as_tool(self) -> Tool:
        """Get as LangChain tool"""
        return Tool(
            name="web_search",
            description="Search the web for information",
            func=self.search_web
        )


class WikipediaTool:
    """Wikipedia search tool"""
    
    def __init__(self):
        self.wiki = WikipediaQueryRun()
    
    def search_wikipedia(self, query: str) -> str:
        """Search Wikipedia"""
        return self.wiki.invoke(query)
    
    def as_tool(self) -> Tool:
        """Get as LangChain tool"""
        return Tool(
            name="wikipedia",
            description="Search Wikipedia for information",
            func=self.search_wikipedia
        )


class CalculatorTool:
    """Calculator tool for mathematical operations"""
    
    def calculate(self, expression: str) -> float:
        """Evaluate mathematical expression"""
        try:
            # Safe evaluation of mathematical expressions
            import ast
            import operator as op
            
            # Supported operators
            operators = {
                ast.Add: op.add,
                ast.Sub: op.sub,
                ast.Mult: op.mul,
                ast.Div: op.truediv,
                ast.Pow: op.pow,
                ast.USub: op.neg,
            }
            
            def eval_expr(node):
                if isinstance(node, ast.Num):
                    return node.n
                elif isinstance(node, ast.BinOp):
                    return operators[type(node.op)](
                        eval_expr(node.left), 
                        eval_expr(node.right)
                    )
                elif isinstance(node, ast.UnaryOp):
                    return operators[type(node.op)](eval_expr(node.operand))
                else:
                    raise TypeError(node)
            
            tree = ast.parse(expression, mode='eval')
            return eval_expr(tree.body)
        except Exception as e:
            return f"Error: {str(e)}"
    
    def as_tool(self) -> Tool:
        """Get as LangChain tool"""
        return Tool(
            name="calculator",
            description="Perform mathematical calculations",
            func=self.calculate
        )


class PythonREPLTool:
    """Python REPL tool for code execution"""
    
    def __init__(self, safe_mode: bool = True):
        self.safe_mode = safe_mode
        self.globals = {}
        self.locals = {}
    
    def execute_code(self, code: str) -> str:
        """Execute Python code"""
        if self.safe_mode:
            # Restrict dangerous operations
            restricted_keywords = ['import os', 'import sys', '__import__', 
                                 'eval', 'exec', 'open', 'file']
            for keyword in restricted_keywords:
                if keyword in code:
                    return f"Error: '{keyword}' is not allowed in safe mode"
        
        try:
            exec(code, self.globals, self.locals)
            
            # Capture any output
            if '_' in self.locals:
                return str(self.locals['_'])
            else:
                return "Code executed successfully"
        except Exception as e:
            return f"Error: {str(e)}"
    
    def as_tool(self) -> Tool:
        """Get as LangChain tool"""
        return Tool(
            name="python_repl",
            description="Execute Python code",
            func=self.execute_code
        )


class FileSystemTool:
    """File system operations tool"""
    
    def __init__(self, base_path: str = "."):
        self.base_path = os.path.abspath(base_path)
    
    def _validate_path(self, path: str) -> str:
        """Validate and resolve path"""
        abs_path = os.path.abspath(os.path.join(self.base_path, path))
        
        # Ensure path is within base_path
        if not abs_path.startswith(self.base_path):
            raise ValueError("Path is outside allowed directory")
        
        return abs_path
    
    def read_file(self, path: str) -> str:
        """Read file contents"""
        try:
            abs_path = self._validate_path(path)
            with open(abs_path, 'r') as f:
                return f.read()
        except Exception as e:
            return f"Error reading file: {str(e)}"
    
    def write_file(self, path: str, content: str) -> str:
        """Write content to file"""
        try:
            abs_path = self._validate_path(path)
            with open(abs_path, 'w') as f:
                f.write(content)
            return f"File written successfully: {path}"
        except Exception as e:
            return f"Error writing file: {str(e)}"
    
    def list_directory(self, path: str = ".") -> List[str]:
        """List directory contents"""
        try:
            abs_path = self._validate_path(path)
            return os.listdir(abs_path)
        except Exception as e:
            return [f"Error: {str(e)}"]
    
    def as_tools(self) -> List[Tool]:
        """Get as LangChain tools"""
        return [
            Tool(
                name="read_file",
                description="Read contents of a file",
                func=self.read_file
            ),
            Tool(
                name="write_file",
                description="Write content to a file",
                func=lambda x: self.write_file(*x.split('|||', 1))
            ),
            Tool(
                name="list_directory",
                description="List contents of a directory",
                func=self.list_directory
            )
        ]


class APITool:
    """Generic API calling tool"""
    
    def __init__(self, base_url: str, headers: Optional[Dict[str, str]] = None):
        self.base_url = base_url
        self.headers = headers or {}
    
    def make_request(self, method: str, endpoint: str, 
                    data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Make API request"""
        url = f"{self.base_url}/{endpoint}"
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=self.headers, params=data)
            elif method.upper() == "POST":
                response = requests.post(url, headers=self.headers, json=data)
            elif method.upper() == "PUT":
                response = requests.put(url, headers=self.headers, json=data)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=self.headers)
            else:
                return {"error": f"Unknown method: {method}"}
            
            response.raise_for_status()
            return response.json()
        except Exception as e:
            return {"error": str(e)}
    
    def as_tool(self) -> Tool:
        """Get as LangChain tool"""
        def api_call(input_str: str) -> str:
            """Parse input and make API call"""
            try:
                # Expected format: "METHOD endpoint {data}"
                parts = input_str.split(' ', 2)
                method = parts[0]
                endpoint = parts[1]
                data = json.loads(parts[2]) if len(parts) > 2 else None
                
                result = self.make_request(method, endpoint, data)
                return json.dumps(result)
            except Exception as e:
                return f"Error: {str(e)}"
        
        return Tool(
            name="api_call",
            description="Make API calls (format: METHOD endpoint {json_data})",
            func=api_call
        )