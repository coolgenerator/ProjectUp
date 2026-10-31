# Node Chat & Versioning System - Implementation Guide

## Overview

This system enables **chat-based node refinement** and **content versioning** for IdeaTree nodes, with all functionality hosted in the AI Agent service (bypassing the backend completely).

### Key Features

1. **Per-Node Chat Sessions**: Each node has its own AI chat session for iterative refinement
2. **Conclusion Display**: Final refined content displayed on nodes in the tree canvas
3. **Version History**: Track all changes to node content over time
4. **AI-Powered Refinement**: Use conversation to refine and improve node content
5. **Version Restore**: Rollback to any previous version

---

## Architecture

### Database (AI Agent - PostgreSQL)

#### Tables Created

**`node_chat_sessions`**
- Stores chat conversations for each node
- Each node can have multiple sessions (one active at a time)
- Contains:
  - `id`: Session UUID
  - `node_id`: Reference to IdeaNode (UUID)
  - `project_id`: Project UUID string
  - `messages`: JSON array of chat messages
  - `conclusion`: Final refined content (displayed on node)
  - `is_active`: Whether session is currently active
  - Timestamps: `created_at`, `updated_at`, `last_message_at`

**`node_versions`**
- Tracks all versions of a node's content
- One version marked as `is_current` at a time
- Contains:
  - `id`: Version UUID
  - `node_id`: Reference to IdeaNode (UUID)
  - `chat_session_id`: Optional link to session that created this version
  - `version_number`: Sequential version number (1, 2, 3...)
  - `is_current`: Boolean flag for active version
  - `title`, `description`, `tags`: Content snapshot
  - `change_type`: manual_edit | ai_refinement | chat_conclusion
  - `change_description`: What changed

### API Endpoints (AI Agent - Port 8888)

All endpoints are under `/api/node-chat`

#### Chat Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/send-message` | Send a message to node's chat session |
| GET | `/node/{node_id}/session` | Get active chat session for node |
| GET | `/node/{node_id}/messages` | Get all chat messages for node |
| POST | `/session/{session_id}/close` | Close/deactivate a chat session |
| GET | `/node/{node_id}/conclusion` | Get current conclusion for node |

#### Version Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/create-version` | Create version from chat conclusion |
| GET | `/node/{node_id}/versions` | Get all versions for node |
| GET | `/node/{node_id}/current-version` | Get current active version |
| POST | `/restore-version` | Restore a previous version |

---

## Frontend Implementation Guide

### 1. NodeChatPanel Component

Create `/frontend/src/components/project/IdeaTree/NodeChatPanel.tsx`

**Purpose**: Chat interface for refining node content

**Key Features**:
- Message history display
- AI response streaming
- Conclusion preview
- "Save as Version" button
- Context-aware prompts

**Example Structure**:
```typescript
interface NodeChatPanelProps {
  node: IdeaNode;
  projectId: string;
  onConclusionUpdate: (conclusion: string) => void;
  onClose: () => void;
}

const NodeChatPanel: React.FC<NodeChatPanelProps> = ({
  node,
  projectId,
  onConclusionUpdate,
  onClose
}) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [conclusion, setConclusion] = useState('');

  const sendMessage = async () => {
    const response = await fetch(`${AI_AGENT_URL}/api/node-chat/send-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        node_id: node.id,
        project_id: projectId,
        user_id: currentUser.id,
        message: input,
        context: {
          node_title: node.title,
          node_description: node.description,
          node_type: node.node_type,
          parent_title: getParentTitle(node),
          children_count: getChildrenCount(node)
        }
      })
    });

    const data = await response.json();

    // Update messages
    setMessages(prev => [
      ...prev,
      { role: 'user', content: input },
      { role: 'assistant', content: data.message }
    ]);

    // Update conclusion if provided
    if (data.conclusion) {
      setConclusion(data.conclusion);
      onConclusionUpdate(data.conclusion);
    }
  };

  const saveAsVersion = async () => {
    // Create version from conclusion
    await fetch(`${AI_AGENT_URL}/api/node-chat/create-version`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        user_id: currentUser.id
      })
    });
  };

  return (
    <div className="chat-panel">
      {/* Chat messages */}
      {/* Input field */}
      {/* Conclusion preview */}
      {/* Save button */}
    </div>
  );
};
```

### 2. NodeVersionHistory Component

Create `/frontend/src/components/project/IdeaTree/NodeVersionHistory.tsx`

**Purpose**: Display and manage node versions

**Key Features**:
- List all versions with timestamps
- Show who created each version
- Diff view between versions
- Restore version button
- Current version indicator

**Example Structure**:
```typescript
const NodeVersionHistory: React.FC<{ node: IdeaNode }> = ({ node }) => {
  const [versions, setVersions] = useState([]);

  useEffect(() => {
    fetchVersions();
  }, [node.id]);

  const fetchVersions = async () => {
    const response = await fetch(
      `${AI_AGENT_URL}/api/node-chat/node/${node.id}/versions`
    );
    const data = await response.json();
    setVersions(data);
  };

  const restoreVersion = async (versionId: string) => {
    await fetch(`${AI_AGENT_URL}/api/node-chat/restore-version`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version_id: versionId,
        user_id: currentUser.id
      })
    });
    // Refresh node data
  };

  return (
    <div className="version-history">
      {versions.map(v => (
        <div key={v.id} className={v.is_current ? 'current' : ''}>
          <div>v{v.version_number} - {v.change_type}</div>
          <div>{v.description}</div>
          <div>{new Date(v.created_at).toLocaleString()}</div>
          {!v.is_current && (
            <button onClick={() => restoreVersion(v.id)}>
              Restore
            </button>
          )}
        </div>
      ))}
    </div>
  );
};
```

### 3. Update IdeaNode Display

Modify `/frontend/src/components/project/IdeaTree/IdeaNode.tsx`

**Show conclusion on node**:

```typescript
const IdeaNode: React.FC<IdeaNodeProps> = ({ node, ... }) => {
  const [conclusion, setConclusion] = useState('');

  useEffect(() => {
    // Fetch conclusion for this node
    fetchConclusion();
  }, [node.id]);

  const fetchConclusion = async () => {
    const response = await fetch(
      `${AI_AGENT_URL}/api/node-chat/node/${node.id}/conclusion`
    );
    const data = await response.json();
    if (data.conclusion) {
      setConclusion(data.conclusion);
    }
  };

  return (
    <div className="idea-node">
      <div className="node-title">{node.title}</div>

      {/* Show conclusion if available */}
      {conclusion && (
        <div className="node-conclusion">
          {conclusion}
        </div>
      )}

      {/* Otherwise show description */}
      {!conclusion && node.description && (
        <div className="node-description">
          {node.description}
        </div>
      )}

      {/* Chat button */}
      <button onClick={() => openChatPanel(node)}>
        💬 Refine
      </button>
    </div>
  );
};
```

### 4. Integrate with IdeaTree Sidebar

Modify `/frontend/src/components/project/IdeaTree/IdeaTreeSidebar.tsx`

**Add tabs for Chat and Versions**:

```typescript
const IdeaTreeSidebar: React.FC = ({ selectedNode, ... }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'chat' | 'versions'>('details');

  return (
    <div className="sidebar">
      <div className="tabs">
        <button onClick={() => setActiveTab('details')}>Details</button>
        <button onClick={() => setActiveTab('chat')}>Chat</button>
        <button onClick={() => setActiveTab('versions')}>Versions</button>
      </div>

      <div className="tab-content">
        {activeTab === 'details' && <NodeDetails node={selectedNode} />}
        {activeTab === 'chat' && (
          <NodeChatPanel
            node={selectedNode}
            projectId={projectId}
            onConclusionUpdate={handleConclusionUpdate}
          />
        )}
        {activeTab === 'versions' && (
          <NodeVersionHistory node={selectedNode} />
        )}
      </div>
    </div>
  );
};
```

---

## User Workflow

### Refining a Node

1. **User selects a node** in the tree
2. **Clicks "Chat" tab** in sidebar
3. **Starts conversation** with AI about the node
   - "Can you help me expand this idea?"
   - "What are the key components needed?"
   - "How does this fit with the parent goal?"
4. **AI responds** with suggestions and questions
5. **User iterates** until content is refined
6. **User says** "finalize" or "summarize"
7. **AI generates conclusion** - shown in preview
8. **User clicks "Save as Version"**
9. **New version created**, node updated on canvas with conclusion

### Viewing Versions

1. **Click "Versions" tab**
2. **See all versions** with timestamps
3. **Click any version** to see full content
4. **Click "Restore"** to rollback to that version

### Tree Canvas Display

- **Nodes show** either:
  - Latest **conclusion** from active chat session (if exists)
  - Current **version description** (if saved)
  - Original **node description** (fallback)
- **Visual indicator** if node has active chat or multiple versions

---

## API Request Examples

### Send Chat Message

```typescript
POST http://localhost:8888/api/node-chat/send-message

{
  "node_id": "123e4567-e89b-12d3-a456-426614174000",
  "project_id": "wAR2kotV",
  "user_id": 42,
  "message": "Help me refine this into actionable steps",
  "context": {
    "node_title": "Build Authentication System",
    "node_description": "Need to add user login",
    "node_type": "action",
    "parent_title": "User Management Module",
    "children_count": 0
  }
}

Response:
{
  "session_id": "456e4567-e89b-12d3-a456-426614174111",
  "message": "Let's break down the authentication system into these steps:\n1. User registration\n2. Login with JWT\n3. Password reset\n...",
  "conclusion": null,
  "metadata": {
    "message_count": 2,
    "has_conclusion": false
  }
}
```

### Get Node Conclusion

```typescript
GET http://localhost:8888/api/node-chat/node/123e4567-e89b-12d3-a456-426614174000/conclusion

Response:
{
  "node_id": "123e4567-e89b-12d3-a456-426614174000",
  "conclusion": "Build a JWT-based authentication system with registration, login, password reset, and session management. Include OAuth2 integration for social logins.",
  "source": "active_session",
  "updated_at": "2025-10-04T11:30:00Z"
}
```

### Create Version

```typescript
POST http://localhost:8888/api/node-chat/create-version

{
  "session_id": "456e4567-e89b-12d3-a456-426614174111",
  "user_id": 42
}

Response:
{
  "id": "789e4567-e89b-12d3-a456-426614174222",
  "node_id": "123e4567-e89b-12d3-a456-426614174000",
  "version_number": 3,
  "is_current": true,
  "title": "Build Authentication System",
  "description": "Build a JWT-based authentication system...",
  "change_type": "chat_conclusion",
  "created_at": "2025-10-04T11:35:00Z"
}
```

---

## Testing

### 1. Start AI Agent

```bash
cd ai-agent
python main.py
```

### 2. Test API Endpoints

```bash
# Test send message
curl -X POST http://localhost:8888/api/node-chat/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "node_id": "test-node-id",
    "project_id": "test-project-id",
    "user_id": 1,
    "message": "Help me refine this",
    "context": {"node_title": "Test Node"}
  }'

# Test get conclusion
curl http://localhost:8888/api/node-chat/node/test-node-id/conclusion
```

### 3. Frontend Testing

1. Create a test node in IdeaTree
2. Open chat panel
3. Send messages and observe AI responses
4. Request conclusion with "finalize"
5. Save as version
6. Check version history
7. Restore previous version
8. Verify canvas updates with conclusion

---

## Database Queries

### Check Chat Sessions

```sql
SELECT id, node_id, message_count, conclusion, is_active, last_message_at
FROM node_chat_sessions
WHERE node_id = 'your-node-uuid'
ORDER BY created_at DESC;
```

### Check Versions

```sql
SELECT id, node_id, version_number, is_current, change_type, created_at
FROM node_versions
WHERE node_id = 'your-node-uuid'
ORDER BY version_number DESC;
```

### Get Current Version

```sql
SELECT * FROM node_versions
WHERE node_id = 'your-node-uuid' AND is_current = true;
```

---

## Implementation Status

✅ **Completed**:
- Database schema design
- SQLAlchemy models (NodeChatSession, NodeVersion)
- API routes (/api/node-chat/*)
- Database migration
- Tables created in PostgreSQL

⏳ **Next Steps**:
1. Create NodeChatPanel React component
2. Create NodeVersionHistory React component
3. Update IdeaNode to display conclusions
4. Integrate chat/version tabs in IdeaTreeSidebar
5. Test end-to-end workflow

---

## Benefits

1. **Iterative Refinement**: Users can have conversations to clarify and improve node content
2. **Context-Aware**: AI understands the node's position in the tree structure
3. **Version Control**: Track all changes and restore previous versions
4. **Clean Display**: Final conclusions shown on canvas, details in chat history
5. **Independent Service**: All functionality in AI Agent, no backend changes needed

---

## File Locations

### Backend (AI Agent)
- Models: `/ai-agent/schemas/db/node_chat_models.py`
- Routes: `/ai-agent/routes/node_chat_routes.py`
- App registration: `/ai-agent/app.py` (lines 32, 171-174)

### Frontend (To Be Created)
- Chat Panel: `/frontend/src/components/project/IdeaTree/NodeChatPanel.tsx`
- Version History: `/frontend/src/components/project/IdeaTree/NodeVersionHistory.tsx`
- Node Display: Update `/frontend/src/components/project/IdeaTree/IdeaNode.tsx`
- Sidebar Integration: Update `/frontend/src/components/project/IdeaTree/IdeaTreeSidebar.tsx`
