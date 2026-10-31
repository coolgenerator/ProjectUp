# How Session Branching Works in the Database

## Storage: PostgreSQL (No Checkpointer)

All session data is stored directly in the **`node_chat_sessions`** table in PostgreSQL.

### Database Schema

```sql
CREATE TABLE node_chat_sessions (
    id UUID PRIMARY KEY,
    node_id UUID NOT NULL,
    project_id VARCHAR(50) NOT NULL,

    -- Branching structure
    parent_session_id UUID REFERENCES node_chat_sessions(id),
    branch_name VARCHAR(100) DEFAULT 'main',
    branch_point_index INTEGER,
    branch_display_name VARCHAR(255),

    -- Hierarchical version numbering
    version_number VARCHAR(50) DEFAULT '1',  -- '1', '2', '2.1', '2.1.1'
    parent_version_number VARCHAR(50),

    -- Session data
    title VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    messages JSON,  -- Array of {role, content, timestamp}
    context JSON,   -- Node context, parent/children info

    -- Metadata
    message_count INTEGER,
    conclusion TEXT,
    created_by INTEGER,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

**Key Points:**

- ✅ **No checkpointer** - direct PostgreSQL storage
- ✅ **Messages stored as JSON** in the `messages` column
- ✅ **Self-referencing** via `parent_session_id` (creates tree structure)
- ✅ **Multiple active sessions** per node (for branching)

---

## What Happens When You Create a New Branch

### Scenario: User at Message 3 wants to explore alternative

```
Initial Session (session-1):
┌─────────────────────────────────────┐
│ id: session-1                       │
│ node_id: node-abc                   │
│ parent_session_id: NULL             │
│ version_number: "1"                 │
│ branch_name: "main"                 │
│ messages: [                         │
│   { role: "user", content: "Q1" },  │
│   { role: "assistant", content: "A1" }, │
│   { role: "user", content: "Q2" },  │
│   { role: "assistant", content: "A2" }  │
│ ]                                   │
└─────────────────────────────────────┘
```

### Step-by-Step Flow

#### **1. Frontend: User Creates Branch**

User clicks "Branch" on message 3 (index 2) and edits it:

```typescript
// NodeChatPanel.tsx:486-498
const response = await fetch(`${AI_AGENT_URL}/ai-api/node-chat/sessions/create-branch`, {
  method: 'POST',
  body: JSON.stringify({
    parent_session_id: 'session-1',
    branch_point_index: 2,  // After message 2 (0-indexed)
    branch_display_name: 'Explore alternative approach',
    initial_messages: messages.slice(0, 2),  // Copy [Q1, A1]
    modified_message: 'Q2-alternative',  // Different question
    version_number: '2',  // Calculated by frontend
    parent_version_number: '1'
  })
});
```

#### **2. Backend: Create New Session Record**

```python
# node_chat_routes.py:620-635
new_session = NodeChatSession(
    node_id=parent_session.node_id,  # ✅ Same node
    project_id=parent_session.project_id,  # ✅ Same project
    parent_session_id=uuid.UUID(request.parent_session_id),  # ✅ Link to parent
    branch_name='branch-1',  # ✅ Auto-generated
    branch_point_index=2,  # ✅ Where it branched
    branch_display_name='Explore alternative approach',
    version_number='2',  # ✅ Hierarchical version
    parent_version_number='1',
    title=parent_session.title,
    messages=request.initial_messages,  # ✅ COPY messages [Q1, A1]
    message_count=len(request.initial_messages),
    context=parent_session.context,  # ✅ COPY context
    created_by=parent_session.created_by,
    is_active=True
)

# Add modified message
new_session.messages.append({
    "role": "user",
    "content": "Q2-alternative",
    "timestamp": datetime.utcnow().isoformat()
})
new_session.message_count += 1

db.add(new_session)
db.commit()
```

#### **3. Database State After Branching**

```
Session 1 (Main):
┌─────────────────────────────────────┐
│ id: session-1                       │
│ parent_session_id: NULL             │
│ version_number: "1"                 │
│ branch_name: "main"                 │
│ messages: [Q1, A1, Q2, A2]          │
└─────────────────────────────────────┘
                │
                │ branches from message 2
                ↓
Session 2 (Branch):
┌─────────────────────────────────────┐
│ id: session-2                       │
│ parent_session_id: session-1   ✅   │
│ version_number: "2"            ✅   │
│ parent_version_number: "1"     ✅   │
│ branch_name: "branch-1"        ✅   │
│ branch_point_index: 2          ✅   │
│ messages: [                         │
│   Q1,           ← COPIED            │
│   A1,           ← COPIED            │
│   Q2-alternative ← NEW              │
│ ]                                   │
│ context: { ... } ← COPIED      ✅   │
└─────────────────────────────────────┘
```

#### **4. Generate AI Response in New Branch**

```typescript
// Frontend continues with new session
await sendMessage('Q2-alternative', [], false);
```

Backend receives message → **Uses session-2** → AI generates response:

```python
# node_chat_routes.py:89-110
session = db.query(NodeChatSession).filter(
    NodeChatSession.node_id == node_uuid,
    NodeChatSession.is_active == True
).first()  # Gets session-2 (newly created, now active)

# Generate AI response with NEW context
ai_result = await generate_ai_response(
    message=request.message,  # "Q2-alternative"
    conversation_history=session.messages,  # [Q1, A1, Q2-alternative]
    context=session.context,  # Copied context
    node_id=request.node_id,
    project_id=request.project_id,
    db=db
)

# Append to session-2's messages
session.messages.append({
    "role": "assistant",
    "content": ai_result["response"],  # A2-alternative (different from session-1)
    "timestamp": datetime.utcnow().isoformat()
})
```

#### **5. Final Database State**

```
Session 1 (Main) - version "1":
┌─────────────────────────────────────┐
│ messages: [Q1, A1, Q2, A2]          │
└─────────────────────────────────────┘

Session 2 (Branch) - version "2":
┌─────────────────────────────────────┐
│ messages: [                         │
│   Q1,             ← COPIED           │
│   A1,             ← COPIED           │
│   Q2-alternative, ← NEW              │
│   A2-alternative  ← NEW (AI response)│
│ ]                                   │
└─────────────────────────────────────┘
```

---

## Complete Branching Flow Diagram

```
User Journey:
──────────────────────────────────────────────────────────────

1. Initial Chat (Session 1)
   User: "What database should I use?"
   AI: "Consider PostgreSQL or MongoDB..."
   User: "Tell me about PostgreSQL"
   AI: "PostgreSQL is a relational database..."

   Database: session-1 with 4 messages ✅

2. User Branches at Message 3
   User clicks "Branch" → Edits to: "Tell me about MongoDB instead"

   Frontend:
   - Calculates version_number: "2"
   - Calls /sessions/create-branch

   Backend:
   - Creates session-2 ✅
   - Copies messages [Q1, A1] ✅
   - Copies context ✅
   - Adds modified message: "Tell me about MongoDB instead" ✅
   - Links: parent_session_id → session-1 ✅

   Database: Now has 2 sessions ✅

3. AI Responds in Branch
   Backend:
   - Loads session-2
   - Conversation history: [Q1, A1, "Tell me about MongoDB instead"]
   - Generates NEW response about MongoDB
   - Appends to session-2.messages ✅

   Database: session-2 has different conversation path ✅

4. User Continues Branch
   User: "How does MongoDB handle transactions?"

   Backend:
   - Uses session-2 (active branch)
   - History: [Q1, A1, MongoDB-Q, MongoDB-A]
   - AI responds with MongoDB transaction info ✅

5. User Switches Back to Main
   User selects "Version 1" from dropdown

   Frontend:
   - Calls /messages?session_id=session-1
   - Loads messages: [Q1, A1, Q2-PostgreSQL, A2-PostgreSQL] ✅
   - Shows PostgreSQL conversation ✅

6. User Switches to Branch
   User selects "Version 2" from dropdown

   Frontend:
   - Calls /messages?session_id=session-2
   - Loads messages: [Q1, A1, Q2-MongoDB, A2-MongoDB, Q3, A3] ✅
   - Shows MongoDB conversation ✅
```

---

## Key Mechanisms

### ✅ **Context Copying**

```python
# node_chat_routes.py:632
context=parent_session.context,  # Full copy of context dict
```

**What gets copied:**

- Node title, description
- Tree context (parent/children nodes)
- Any custom metadata
- Project information

**What happens:**

- Branch starts with **identical context** as parent
- AI generates response using this context
- Future messages in branch build on copied context

### ✅ **Message Copying**

```python
# node_chat_routes.py:630
messages=request.initial_messages,  # Array of messages up to branch point
```

**Frontend sends:**

```typescript
initial_messages: messages.slice(0, branchIndex)  // Messages 0 to branch point
```

**Result:**

- Branch session has **shared history** up to branch point
- Diverges after that point
- Each session maintains its own message array

### ✅ **Independence**

Once created, sessions are **completely independent**:

| Feature    | Session 1 (Main)           | Session 2 (Branch)                        |
| ---------- | -------------------------- | ----------------------------------------- |
| Messages   | [Q1, A1, Q2, A2, Q3, A3]   | [Q1, A1, Q2-alt, A2-alt]                  |
| Context    | Original context + updates | Original context copy + different updates |
| Active     | Yes                        | Yes                                       |
| Conclusion | "Use PostgreSQL"           | "Use MongoDB"                             |

**They don't affect each other!**

---

## Database Queries

### Get All Sessions for a Node

```sql
SELECT
  id,
  parent_session_id,
  version_number,
  parent_version_number,
  branch_name,
  branch_point_index,
  message_count,
  array_length(messages, 1) as msg_count_json
FROM node_chat_sessions
WHERE node_id = 'node-abc'
  AND is_active = TRUE
ORDER BY created_at;
```

**Result:**

```
id         | parent_id  | version | branch_name | branch_point | message_count
-----------|------------|---------|-------------|--------------|---------------
session-1  | NULL       | 1       | main        | NULL         | 4
session-2  | session-1  | 2       | branch-1    | 2            | 4
session-3  | session-1  | 2.1     | branch-2    | 2            | 3
session-4  | session-2  | 2.2     | branch-3    | 3            | 5
```

### Get Messages from Specific Session

```sql
SELECT messages
FROM node_chat_sessions
WHERE id = 'session-2';
```

**Result:**

```json
[
  {"role": "user", "content": "What database should I use?", "timestamp": "..."},
  {"role": "assistant", "content": "Consider PostgreSQL or MongoDB...", "timestamp": "..."},
  {"role": "user", "content": "Tell me about MongoDB instead", "timestamp": "..."},
  {"role": "assistant", "content": "MongoDB is a NoSQL database...", "timestamp": "..."}
]
```

---

## Answer to Your Question

> **Is that mean when I now create a new branch in the frontend, the backend will copy the previous context, create a new session, and generate new content based on a different version?**

**Yes, exactly!** Here's what happens:

1. **Copy Context** ✅
   
   - All node metadata
   - Tree relationships
   - Project info

2. **Create New Session** ✅
   
   - New `NodeChatSession` record in PostgreSQL
   - Links to parent via `parent_session_id`
   - Stores `branch_point_index` (where it diverged)
   - Has hierarchical `version_number`

3. **Copy Messages Up to Branch Point** ✅
   
   - Messages array copied from parent
   - Only messages before branch point
   - Modified message added

4. **Generate New Content** ✅
   
   - AI uses copied context + conversation history
   - Generates response based on **different question/approach**
   - Stores in branch session's message array
   - Completely independent from parent session

5. **Both Sessions Coexist** ✅
   
   - Parent session continues independently
   - Branch session evolves separately
   - Can switch between them anytime
   - Each has its own conclusion, messages, evolution

**It's like Git branches but for conversations!** 🌳