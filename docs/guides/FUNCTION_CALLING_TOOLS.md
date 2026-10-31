# Function Calling Tools Implementation

## Overview

I've implemented a comprehensive function calling tool system that allows the AI to autonomously execute actions during conversations. The AI can now create nodes, update content, add tasks, suggest resources, and more - all based on the conversation context.

**✅ All tools are integrated with your existing services:**
- Tasks are created using **TaskService** (real task management)
- Learning resources are created as **learning tasks**
- Learning paths trigger **CourseGenerationService** (real course generation)
- Everything is stored in your actual database tables!

## 🛠️ Available Tools

### 1. **create_child_node**
Creates a new child node under the current node.

**When AI uses it:** When discussing sub-topics, breaking down concepts, or user explicitly asks to create a node.

**Parameters:**
- `title` (required): Node title (3-8 words)
- `description` (required): Detailed description
- `icon` (optional): Icon identifier (lightbulb, rocket, brain, target, star, fire, sparkles, chart, tree)
- `tags` (optional): Array of tags

**Example:**
```
User: "Let's break down the web crawler into components"
AI: "I'll create child nodes for the main components..."
   [Calls create_child_node for "URL Queue Manager", "HTTP Client", "HTML Parser", etc.]
```

### 2. **update_current_node**
Updates the current node's title, description, summary, or tags.

**When AI uses it:** When refining the node based on discussion, clarifying content, or user asks to update.

**Parameters:**
- `title` (optional): New title
- `description` (optional): Updated description
- `summary` (optional): One-sentence summary
- `tags` (optional): Updated tags array

**Example:**
```
User: "Actually, this should focus on scalability"
AI: "I'll update the node to reflect the scalability focus..."
   [Calls update_current_node with new description]
```

### 3. **create_action_items**
Creates actionable tasks/to-dos using **TaskService** (integrated with your real task management system).

**When AI uses it:** When discussing implementation steps, next actions, or creating a task list.

**What it does:**
- Creates real tasks in the `tasks` table
- Links tasks to the current node via `idea_node_id`
- Sets appropriate due dates (high: 3 days, medium: 7 days, low: 14 days)
- Tags all tasks as `ai-generated` and `from-chat`
- Updates node's `actions_count`

**Parameters:**
- `items` (required): Array of action items
  - `title` (required): Task title
  - `description` (optional): Task details
  - `priority` (optional): low/medium/high

**Example:**
```
User: "What do I need to do to implement this?"
AI: "Here are the action items..."
   [Calls create_action_items with tasks]

✅ Created 5 real tasks in Task Management system
📋 Tasks are visible in your task dashboard
🔗 All tasks linked to this node
```

### 4. **suggest_related_nodes**
Suggests connections to other existing nodes.

**When AI uses it:** When discussing related concepts, dependencies, or prerequisites.

**Parameters:**
- `node_titles` (required): Array of node titles to connect with
- `relationship_type` (required): prerequisite/related/blocks/depends-on
- `reason` (optional): Why they should be connected

**Example:**
```
User: "This relates to our authentication system"
AI: "I'll suggest connecting this to the authentication node..."
   [Calls suggest_related_nodes]
```

### 5. **add_learning_resource**
Adds documentation, tutorials, or reference materials as **learning tasks** using TaskService.

**When AI uses it:** When relevant resources come up in discussion.

**What it does:**
- Creates a learning task in the `tasks` table (task_type="learning")
- Estimates completion time based on resource type (video: 60min, article: 30min, etc.)
- Stores resource URL in `learning_metadata`
- Links to current node
- Also stores in node metadata for quick reference

**Parameters:**
- `title` (required): Resource title
- `url` (required): URL
- `resource_type` (required): documentation/tutorial/video/article/book/tool/library
- `description` (optional): Why it's relevant

**Example:**
```
User: "Where can I learn more about web scraping?"
AI: "I'll add some helpful resources..."
   [Calls add_learning_resource for Scrapy docs, tutorials, etc.]

✅ Added "Scrapy Official Tutorial" as learning task
📚 Estimated time: 2 hours
🔗 Resource URL stored in task metadata
```

### 6. **create_learning_path**
Creates a structured learning curriculum using **CourseGenerationService** (your real course generation system).

**When AI uses it:** When discussing learning goals or creating educational content.

**What it does:**
- Triggers async course generation workflow
- Creates a `CourseRequest` in the database
- Extracts goals from module titles
- Calculates estimated weeks based on module count
- Stores course request ID in node metadata
- Course generation happens in background via LangGraph workflow

**Parameters:**
- `title` (required): Learning path title
- `description` (required): Overview
- `modules` (required): Array of learning modules with topics
- `difficulty` (optional): beginner/intermediate/advanced

**Example:**
```
User: "I want to learn web scraping from scratch"
AI: "I'll create a learning path for you..."
   [Calls create_learning_path with structured curriculum]

✅ Started course generation: "Web Scraping Mastery"
⏳ Course generation in progress (request_id: abc-123)
📚 Check status at /courses/abc-123/status
🔔 You'll be notified when course is ready
```

---

## 🎯 How to Use

### Backend Integration

The tools are automatically available when using the node chat service:

```python
from services.node_chat.node_chat_service import NodeChatService

service = NodeChatService(db=db, user_id=user_id)

response = await service.generate_ai_response_with_tools(
    message="Break this down into components",
    conversation_history=[],
    context={...},
    node_id=node_id,
    project_id=project_id,
    enable_tools=True  # Enable function calling
)

# Response includes:
# - response: AI's text response
# - tool_calls: List of tools the AI called
# - tool_results: Results from executing those tools
# - first_message_metadata: Auto-update data (if first message)
```

### API Endpoint (Already Integrated)

The streaming and non-streaming chat endpoints automatically use tools:

**POST** `/ai-api/node-chat/message` (streaming)
**POST** `/ai-api/node-chat/send` (non-streaming)

Both endpoints now:
1. Call the AI with available tools
2. Execute any tool calls
3. Return results in the response

### Frontend Integration (Next Step)

Update `NodeChatPanel.tsx` to handle tool call results:

```typescript
// In the SSE stream handler, add:
else if (data.type === 'tool_call') {
  // Show tool execution in progress
  console.log('Tool called:', data.tool_name);
  console.log('Arguments:', data.arguments);
}
else if (data.type === 'tool_result') {
  // Show tool execution result
  console.log('Tool result:', data.result);
  if (data.result.success) {
    // Refresh node data if needed
    if (onNodeUpdate) {
      onNodeUpdate();
    }
  }
}
```

---

## 🎨 Tool Execution Flow

```
User Message
     ↓
AI analyzes context + available tools
     ↓
AI decides to call tools (or not)
     ↓
[Tool Call 1] create_child_node
     ↓
Execute tool → Create node in DB
     ↓
Return result to AI
     ↓
[Tool Call 2] add_learning_resource
     ↓
Execute tool → Add resource to node
     ↓
Return result to AI
     ↓
AI generates final response
     ↓
Stream response + tool results to user
```

---

## 🔧 Configuration

### Enable/Disable Tools

```python
# Enable tools (default)
response = await service.generate_ai_response_with_tools(
    ...
    enable_tools=True
)

# Disable tools (fall back to regular chat)
response = await service.generate_ai_response_with_tools(
    ...
    enable_tools=False
)
```

### Add New Tools

1. Add tool definition to `services/node_chat/tools.py`:

```python
NODE_CHAT_TOOLS.append({
    "type": "function",
    "function": {
        "name": "your_new_tool",
        "description": "What your tool does",
        "parameters": {
            "type": "object",
            "properties": {
                "param1": {"type": "string", "description": "..."}
            },
            "required": ["param1"]
        }
    }
})
```

2. Add execution handler in `ToolExecutor`:

```python
async def _your_new_tool(self, args: Dict[str, Any]) -> Dict[str, Any]:
    """Execute your new tool"""
    # Your implementation here
    return {
        "success": True,
        "message": "Tool executed successfully"
    }
```

3. Register in `execute_tool` method:

```python
elif tool_name == "your_new_tool":
    return await self._your_new_tool(arguments)
```

---

## 🎭 Example Conversations

### Example 1: Creating Sub-Nodes

```
User: Help me design a scalable web crawler framework

AI: I'll help you break this down into key components...
[TOOL CALL: create_child_node]
  - Title: "URL Queue Manager"
  - Description: "Manages the queue of URLs to be crawled..."

[TOOL CALL: create_child_node]
  - Title: "HTTP Client"
  - Description: "Handles HTTP requests with rate limiting..."

[TOOL CALL: create_child_node]
  - Title: "HTML Parser"
  - Description: "Extracts data and discovers new URLs..."

✅ Created 3 child nodes in the idea_nodes table
🔗 All linked to current node as parent
📊 Positions automatically calculated
```

### Example 2: Adding Learning Resources (Creates Real Tasks!)

```
User: Show me resources for learning Scrapy

AI: I'll add some essential resources...

[TOOL CALL: add_learning_resource]
  - Title: "Scrapy Official Tutorial"
  - URL: "https://docs.scrapy.org/en/latest/intro/tutorial.html"
  - Type: "documentation"

[TOOL CALL: add_learning_resource]
  - Title: "Scrapy Best Practices"
  - URL: "https://docs.scrapy.org/en/latest/topics/practices.html"
  - Type: "documentation"

✅ Created 2 learning tasks in Task Management
📋 Task 1: "Learn: Scrapy Official Tutorial" (est. 45 min)
📋 Task 2: "Learn: Scrapy Best Practices" (est. 45 min)
🔗 All tasks linked to this node
📊 Check your task dashboard!
```

### Example 3: Creating Action Items (Real Task System!)

```
User: What steps do I need to implement this?

AI: Let me create an action plan...

[TOOL CALL: create_action_items]
  - Items:
    1. "Set up project structure" (priority: high)
    2. "Install dependencies (Scrapy, Redis)" (priority: high)
    3. "Implement URL queue manager" (priority: medium)
    4. "Build HTTP client with retry logic" (priority: medium)
    5. "Create HTML parser" (priority: low)

✅ Created 5 real tasks in Task Management System
📅 High priority tasks due in 3 days
📅 Medium priority tasks due in 7 days
📅 Low priority tasks due in 14 days
🏷️ All tagged: ai-generated, from-chat
🔗 All tasks visible in your project dashboard!
```

### Example 4: Creating Full Course (Real Course Generation!)

```
User: I want to learn web scraping from scratch

AI: I'll create a comprehensive learning path...

[TOOL CALL: create_learning_path]
  - Title: "Web Scraping Mastery"
  - Description: "Complete guide from basics to advanced"
  - Modules: [
      "Python Fundamentals",
      "HTTP & Web Basics",
      "BeautifulSoup & lxml",
      "Scrapy Framework",
      "Advanced Techniques"
    ]
  - Difficulty: "beginner"

✅ Started course generation workflow
📚 Course: "Web Scraping Mastery"
⏱️ Estimated: 5 weeks (10 hrs/week)
🆔 Request ID: course-abc-123
📊 Check status: /courses/course-abc-123/status
⏳ LangGraph workflow running in background
🔔 You'll get notified when course structure is ready!
```

---

## 🚀 Benefits

1. **Autonomous Actions**: AI can create nodes, tasks, and resources without explicit commands
2. **Natural Conversation**: Users can discuss ideas naturally, and the AI will organize them
3. **Context-Aware**: Tools are called based on conversation context
4. **Transparent**: Tool calls and results are visible to users
5. **Extensible**: Easy to add new tools for new capabilities

---

## 🛡️ Safety & Best Practices

1. **Always show tool calls to users** - Be transparent about what the AI is doing
2. **Validate tool results** - Check success/failure and handle errors gracefully
3. **Rate limit tool calls** - Prevent excessive tool usage in a single response
4. **Log all tool executions** - For debugging and audit trails
5. **Allow undo** - Consider adding undo functionality for tool actions

---

## 📝 Next Steps

1. **Add tool call visualization in UI** - Show users when tools are being called
2. **Add confirmation prompts** - For destructive actions (delete, major changes)
3. **Implement undo functionality** - Allow users to revert tool actions
4. **Add more tools** - Based on user needs (delete node, move node, etc.)
5. **Tool usage analytics** - Track which tools are most useful

---

## 🎉 You're All Set!

The function calling tool system is now fully integrated. The AI will automatically use these tools when appropriate during conversations, making the chat experience more productive and action-oriented!

To see it in action, just start chatting with a node and ask the AI to:
- "Break this down into components"
- "Create action items for implementing this"
- "Add some learning resources"
- "Update the node description to be more specific"

The AI will use the appropriate tools to fulfill your requests! 🚀
