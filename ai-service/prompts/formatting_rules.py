"""
Shared Markdown Formatting Rules for AI Prompts
Centralizes formatting guidelines to ensure consistency across all chat interfaces
"""


def get_mandatory_formatting_header() -> str:
    """
    Get the mandatory formatting rule header to be placed at the top of prompts.
    This is the most critical rule that must be followed.

    Returns:
        Formatted header string
    """
    return """🚨 MANDATORY FORMATTING RULE - FOLLOW STRICTLY 🚨

FOR COMPONENT NAMES, TITLES, CONCEPTS:
- Use ONLY inline code with single backticks: `Crawler Engine`, `Data Parser`
- NEVER use code blocks (```) for names
- NEVER use bold for component names

FOR ACTUAL CODE:
- Use code blocks (```) ONLY for multi-line code examples

Examples:
✅ CORRECT: Now let's build the `Crawler Engine` component
✅ CORRECT: The `Data Parser` handles extraction
❌ WRONG: Now let's build the **Crawler Engine** component
❌ WRONG: Now let's build the
```
Crawler Engine
```
❌ WRONG: **`Crawler Engine`**

REMEMBER: Single-word or short technical terms = `inline code` NOT ```code blocks```
"""


def get_detailed_formatting_rules() -> str:
    """
    Get detailed markdown formatting rules for AI responses.

    Returns:
        Formatted rules string
    """
    return """**⚠️ CRITICAL FORMATTING RULES - READ CAREFULLY:**

**WHEN TO USE EACH FORMAT:**

1. **Inline Code (`...`)** - Use for:
   - Component/module/class names: `Crawler Engine`, `UserService`, `AuthController`
   - Technical terms: `HTTP`, `REST API`, `WebSocket`
   - File/folder names: `app.py`, `src/components/`
   - Variables/functions: `getUserData()`, `isValid`
   - Commands: `npm install`, `git commit`
   - Libraries/packages: `React`, `Express`, `requests`

2. **Bold (\*\*...\*\*)** - Use for:
   - Section headings
   - Important concepts (non-technical)
   - Emphasis on key points

3. **Code Blocks (\`\`\`...\`\`\`)** - Use ONLY for:
   - Multi-line code examples
   - Complete functions/classes
   - Configuration files

**EXAMPLES:**

✅ CORRECT:
"Now let's build the `Crawler Engine` which uses `requests` to fetch data."
"The `Data Parser` extracts information using `BeautifulSoup`."
"Install dependencies with `npm install`."

❌ WRONG - Don't do this:
"Now let's build the **Crawler Engine** component"
"Now let's build the
```
Crawler Engine
```
"
"The **`Data Parser`** handles data"

**Other formatting:**
- Use *italic* for subtle emphasis or quotes
- Use > blockquote for quoted text or callouts
- Use ## headings for section titles (if response is long)
- Use - or * for unordered lists
- Use 1. 2. 3. for ordered lists
- Use $...$ for inline math equations and $$...$$ for block equations"""


def get_compact_formatting_rules() -> str:
    """
    Get compact version of formatting rules for shorter prompts.

    Returns:
        Formatted rules string
    """
    return """**⚠️ CRITICAL FORMATTING RULES:**

**Component/technical names = `inline code` NOT code blocks or bold!**

✅ CORRECT:
- Component names: `Crawler Engine`, `Data Parser`, `UserService`
- Commands: `npm install`, `git commit`
- Files: `app.py`, `config.json`

❌ WRONG:
- ```Crawler Engine``` or **Crawler Engine** or **`Crawler Engine`**

**Format usage:**
- `inline code` for components, commands, files, technical terms
- **bold** for section headings and emphasis (non-technical)
- ```code blocks``` ONLY for multi-line code, never single terms
- Use - or 1. for lists
- Use > for blockquotes"""


def get_code_formatting_rules_detailed() -> str:
    """
    Get detailed code formatting rules (for educational/course content).

    Returns:
        Formatted rules string
    """
    return """**CRITICAL - Code Formatting Rules**:
- ✅ DO use single backticks for: keywords (`if`, `else`, `while`), function names (`print()`), variable names (`count`), short expressions (`x + y`)
- ✅ DO use code blocks ONLY for: complete code examples, multi-line code, code that demonstrates a concept
- ❌ DON'T use code blocks for single keywords or short code fragments
- ❌ DON'T break up sentences with code blocks - keep inline code inline

Good example: "You'll learn conditional logic (`if/else`), loops (`for` and `while`), and functions."
Bad example: "You'll learn conditional logic
```
if/else
```
, loops
```
for
```
..."
"""


def get_code_formatting_rules_compact() -> str:
    """
    Get compact code formatting rules.

    Returns:
        Formatted rules string
    """
    return """**Code Formatting**:
- ✅ `inline code` for keywords (`if`, `else`), function names (`print()`), libraries (`React`)
- ✅ ```code blocks``` ONLY for multi-line code examples
- ❌ DON'T use code blocks for single words or breaking up sentences
"""


def get_mermaid_formatting_rules() -> str:
    """
    Get Mermaid diagram formatting rules for educational content.

    Returns:
        Formatted rules string with Mermaid best practices
    """
    return """**Mermaid Diagram Rules - FOLLOW STRICTLY**:

**CRITICAL - Avoid These Syntax Issues:**
- ❌ NEVER use `&` operator (limited support): `A & B --> C`
- ❌ NEVER chain edges: `A -- B -- C -- D`
- ❌ NEVER use parentheses in subgraph labels: `subgraph Array(2,3)`
- ❌ NEVER use special characters in node IDs: `node-1`, `item#5`

**✅ DO USE - Reliable Syntax:**
1. **Simple node connections** (use separate arrows):
   ```
   A --> C
   B --> C
   ```
   NOT: `A & B --> C`

2. **Quoted labels for complex text**:
   ```
   A["Text with spaces"]
   B["axis=0 (down rows)"]
   ```

3. **Simple subgraph labels**:
   ```
   subgraph operations["Operations"]
       node1 --> node2
   end
   ```
   NOT: `subgraph Operations(axis=0)`

4. **Use <br/> for multi-line labels**:
   ```
   A["First line<br/>Second line"]
   ```

5. **Node shapes**:
   - Rectangle: `A[Label]`
   - Rounded: `A(Label)`
   - Stadium: `A([Label])`
   - Circle: `A((Label))`

**Good Example:**
```mermaid
graph TD
    A[Input Data] --> B[Process]
    B --> C[Output]
    C --> D["Result:<br/>Success"]
```

**Keep diagrams simple** - Focus on clarity over complexity."""
