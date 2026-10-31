"""
Helper utilities for AI Agent
"""

import asyncio
import json
import time
import uuid
from datetime import datetime
from functools import wraps
from typing import Any, Callable, Dict, List, Optional, TypeVar, Union
import logging
import hashlib

logger = logging.getLogger(__name__)

T = TypeVar('T')


def retry_with_backoff(
    func: Callable[..., T],
    max_retries: int = 3,
    initial_delay: float = 1.0,
    backoff_factor: float = 2.0,
    max_delay: float = 60.0
) -> Callable[..., T]:
    """
    Decorator for retrying a function with exponential backoff
    """
    @wraps(func)
    def wrapper(*args, **kwargs) -> T:
        delay = initial_delay
        last_exception = None
        
        for attempt in range(max_retries):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                last_exception = e
                if attempt < max_retries - 1:
                    sleep_time = min(delay, max_delay)
                    logger.warning(
                        f"Attempt {attempt + 1} failed: {e}. "
                        f"Retrying in {sleep_time:.1f} seconds..."
                    )
                    time.sleep(sleep_time)
                    delay *= backoff_factor
                else:
                    logger.error(f"All {max_retries} attempts failed")
        
        raise last_exception
    
    return wrapper


def async_retry(
    max_retries: int = 3,
    initial_delay: float = 1.0,
    backoff_factor: float = 2.0,
    max_delay: float = 60.0
):
    """
    Decorator for retrying async functions with exponential backoff
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            delay = initial_delay
            last_exception = None
            
            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < max_retries - 1:
                        sleep_time = min(delay, max_delay)
                        logger.warning(
                            f"Attempt {attempt + 1} failed: {e}. "
                            f"Retrying in {sleep_time:.1f} seconds..."
                        )
                        await asyncio.sleep(sleep_time)
                        delay *= backoff_factor
                    else:
                        logger.error(f"All {max_retries} attempts failed")
            
            raise last_exception
        
        return wrapper
    return decorator


async def batch_process(
    items: List[Any],
    process_func: Callable,
    batch_size: int = 10,
    max_concurrent: int = 5
) -> List[Any]:
    """
    Process items in batches with concurrency control
    """
    results = []
    semaphore = asyncio.Semaphore(max_concurrent)
    
    async def process_batch(batch: List[Any]) -> List[Any]:
        async with semaphore:
            tasks = [process_func(item) for item in batch]
            return await asyncio.gather(*tasks)
    
    # Split items into batches
    batches = [items[i:i + batch_size] for i in range(0, len(items), batch_size)]
    
    # Process batches
    batch_results = await asyncio.gather(*[process_batch(batch) for batch in batches])
    
    # Flatten results
    for batch_result in batch_results:
        results.extend(batch_result)
    
    return results


def chunk_text(
    text: str,
    chunk_size: int = 1000,
    overlap: int = 100,
    separator: str = "\n"
) -> List[str]:
    """
    Split text into overlapping chunks
    """
    if not text:
        return []
    
    chunks = []
    
    # Try to split by separator first
    if separator and separator in text:
        segments = text.split(separator)
        current_chunk = ""
        
        for segment in segments:
            if len(current_chunk) + len(segment) + len(separator) <= chunk_size:
                current_chunk += segment + separator
            else:
                if current_chunk:
                    chunks.append(current_chunk.rstrip())
                current_chunk = segment + separator
        
        if current_chunk:
            chunks.append(current_chunk.rstrip())
    else:
        # Fall back to character-based chunking
        start = 0
        while start < len(text):
            end = min(start + chunk_size, len(text))
            chunk = text[start:end]
            chunks.append(chunk)
            start = end - overlap if end < len(text) else end
    
    return chunks


def format_prompt(
    template: str,
    variables: Dict[str, Any],
    strict: bool = False
) -> str:
    """
    Format a prompt template with variables
    """
    try:
        if strict:
            # Strict mode - all variables must be provided
            return template.format(**variables)
        else:
            # Lenient mode - missing variables are ignored
            from string import Template
            t = Template(template)
            return t.safe_substitute(**variables)
    except Exception as e:
        logger.error(f"Error formatting prompt: {e}")
        return template


def parse_json_safely(
    text: str,
    default: Optional[Any] = None,
    extract: bool = True
) -> Any:
    """
    Safely parse JSON from text, optionally extracting from larger text
    """
    if not text:
        return default
    
    try:
        # Try direct parsing first
        return json.loads(text)
    except json.JSONDecodeError:
        if not extract:
            return default
        
        # Try to extract JSON from text
        import re
        
        # Look for JSON objects
        json_patterns = [
            r'\{[^{}]*\}',  # Simple object
            r'\{.*?\}',      # Non-greedy object
            r'\[.*?\]',      # Array
        ]
        
        for pattern in json_patterns:
            matches = re.findall(pattern, text, re.DOTALL)
            for match in matches:
                try:
                    return json.loads(match)
                except:
                    continue
        
        return default


def get_timestamp(format: str = "%Y-%m-%d %H:%M:%S") -> str:
    """
    Get current timestamp in specified format
    """
    return datetime.now().strftime(format)


def generate_id(prefix: str = "", length: int = 8) -> str:
    """
    Generate a unique ID with optional prefix
    """
    unique_id = str(uuid.uuid4())[:length]
    return f"{prefix}_{unique_id}" if prefix else unique_id


def calculate_hash(content: Union[str, bytes], algorithm: str = "sha256") -> str:
    """
    Calculate hash of content
    """
    if isinstance(content, str):
        content = content.encode('utf-8')
    
    hasher = hashlib.new(algorithm)
    hasher.update(content)
    return hasher.hexdigest()


def merge_dicts(dict1: Dict, dict2: Dict, deep: bool = True) -> Dict:
    """
    Merge two dictionaries, optionally deep merging
    """
    if not deep:
        return {**dict1, **dict2}
    
    result = dict1.copy()
    
    for key, value in dict2.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = merge_dicts(result[key], value, deep=True)
        else:
            result[key] = value
    
    return result


def flatten_dict(d: Dict, parent_key: str = '', separator: str = '.') -> Dict:
    """
    Flatten a nested dictionary
    """
    items = []
    
    for key, value in d.items():
        new_key = f"{parent_key}{separator}{key}" if parent_key else key
        
        if isinstance(value, dict):
            items.extend(flatten_dict(value, new_key, separator).items())
        else:
            items.append((new_key, value))
    
    return dict(items)


def safe_get(data: Dict, path: str, default: Any = None, separator: str = '.') -> Any:
    """
    Safely get nested value from dictionary
    """
    keys = path.split(separator)
    current = data
    
    for key in keys:
        if isinstance(current, dict) and key in current:
            current = current[key]
        else:
            return default
    
    return current