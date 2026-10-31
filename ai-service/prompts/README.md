# Prompts Module

This directory contains all prompt templates for AI interactions in the ProjectUp system.

## Shared Formatting Rules

The `formatting_rules.py` module provides centralized markdown formatting guidelines used across all chat interfaces. This ensures consistency and reduces code duplication.

### Available Functions

- **`get_mandatory_formatting_header()`**: Critical formatting rule to place at the top of prompts
- **`get_detailed_formatting_rules()`**: Comprehensive formatting guidelines with examples
- **`get_compact_formatting_rules()`**: Shorter version for space-constrained prompts
- **`get_code_formatting_rules_detailed()`**: Detailed code formatting rules (for educational content)
- **`get_code_formatting_rules_compact()`**: Compact code formatting rules

### Usage Example

```python
from prompts.formatting_rules import get_mandatory_formatting_header, get_detailed_formatting_rules

system_prompt = f"""{get_mandatory_formatting_header()}
You are a helpful AI assistant...

{get_detailed_formatting_rules()}
"""
```

## Prompt Files

- **`node_chat_prompts.py`**: Prompts for idea tree node chat interactions
- **`paper_prompts.py`**: Prompts for research paper analysis and chat
- **`course_prompts.py`**: Prompts for course generation and learning content
- **`tree_prompts.py`**: Prompts for idea tree operations

## Formatting Philosophy

The formatting rules enforce:
1. **Never use code blocks for titles or regular text** - use bold instead
2. **Inline code only for actual code** - commands, file names, function names
3. **Code blocks only for multi-line code** - actual code examples
4. **Consistent markdown usage** - headings, lists, blockquotes, emphasis

This ensures that AI responses render correctly in the frontend ReactMarkdown components.
