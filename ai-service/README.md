# 🤖 AI Agent Service

A powerful FastAPI-based AI agent service with support for multiple AI providers, workflow orchestration, and project assistance tools.

## ✨ Features

- **Multiple AI Providers**: OpenAI, Google Vertex AI, Google Generative AI
- **LangGraph Workflows**: Orchestrate complex multi-step AI workflows
- **Project Assistance**: Generate project ideas, roadmaps, learning paths
- **Tool Integration**: URL search, image processing, link validation
- **Memory Management**: Conversation history and entity memory
- **Interactive API Docs**: Swagger UI and ReDoc documentation

## 🏗️ Project Structure

```
ai-agent/
├── agent/                # Core agent modules
│   ├── core/            # Agent core logic
│   ├── prompts/         # Prompt templates
│   ├── tools/           # External tool scrapers
│   ├── utils/           # Utility functions
│   └── workflows/       # Workflow definitions
├── routes/              # API route handlers
├── tests/               # Test suite
├── config/              # Configuration files
├── scripts/             # Utility scripts
├── deployments/         # Deployment configs
├── docs/                # Documentation
├── main.py              # Application entry point
├── requirements.txt     # Python dependencies
└── README.md            # This file
```

## 🚀 Quick Start

### Prerequisites

- Python 3.12+
- Virtual environment (venv)
- API keys for AI providers (optional)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-org/project-up.git
cd project-up/ai-agent
```

2. **Set up virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Configure environment**
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your configuration
# Key settings:
# - ENVIRONMENT=development  # or 'production'
# - ENABLE_SWAGGER=true      # Set to false in production
# - GOOGLE_APPLICATION_CREDENTIALS=/path/to/credential.json
```

### Running the Service

```bash
# Development mode (with Swagger UI enabled)
ENVIRONMENT=development python main.py

# Production mode (Swagger UI disabled for security)
ENVIRONMENT=production uvicorn main:app --host 0.0.0.0 --port 8888 --workers 4
```

The service will be available at `http://localhost:8000`

## 📚 API Documentation

### Interactive Documentation

**Development Mode (enabled by default):**
- **Swagger UI**: http://localhost:8888/docs
- **ReDoc**: http://localhost:8888/redoc
- **OpenAPI Spec**: http://localhost:8888/openapi.json

**Production Mode:**
- API documentation endpoints are disabled for security
- Set `ENVIRONMENT=development` or `ENABLE_SWAGGER=true` to enable

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/api/agents` | Create new agent |
| `POST` | `/api/agents/{name}/chat` | Chat with agent |
| `POST` | `/api/tools/url-search` | Search and extract URL content |
| `POST` | `/api/workflows/create` | Create workflow |
| `GET` | `/api/workflows/list` | List all workflows |

## 🔧 Configuration

### Supported AI Providers

1. **OpenAI**
   - Set `OPENAI_API_KEY` environment variable
   - Or pass `api_key` when creating agent

2. **Google Vertex AI**
   - Set `GOOGLE_APPLICATION_CREDENTIALS` to service account JSON path
   - Configure project ID and location

3. **Google Generative AI**
   - Configure Google API credentials
   - Supports Gemini models

### Example Usage

```python
import requests

# Create an OpenAI agent
response = requests.post("http://localhost:8000/api/agents", json={
    "name": "MyAssistant",
    "provider": "openai",
    "model": "gpt-4",
    "temperature": 0.7,
    "api_key": "sk-..."  # Optional if env var is set
})

# Chat with the agent
response = requests.post("http://localhost:8000/api/agents/MyAssistant/chat", json={
    "message": "Help me build a web app",
    "session_id": "session-123"
})
```

## 🧪 Testing

```bash
# Run all tests
pytest tests/

# Run with coverage
pytest tests/ --cov=agent --cov-report=html

# Run specific test file
pytest tests/test_langgraph_integration.py -v
```

## 🚢 Deployment

### Docker

```bash
# Build image
docker build -t ai-agent .

# Run container
docker run -p 8000:8000 --env-file .env ai-agent
```

### Systemd Service

```bash
# Copy service file
sudo cp deployments/ai-agent.service /etc/systemd/system/

# Start service
sudo systemctl start ai-agent
sudo systemctl enable ai-agent
```

## 🛠️ Development

### Adding New Tools

1. Create tool class in `agent/core/tools.py`
2. Inherit from `Tool` base class
3. Implement `execute()` method
4. Register in agent initialization

### Creating Workflows

1. Define workflow in `agent/workflows/`
2. Use LangGraph for orchestration
3. Register in workflow routes
4. Test with workflow endpoints

## 📊 Monitoring

- Health endpoint: `/health`
- Prometheus metrics: (when configured)
- Structured JSON logging

## 🔒 Security Best Practices

### Swagger UI Configuration

**⚠️ Important:** Swagger UI should be disabled in production environments for security reasons.

#### Development Environment
```bash
# Swagger UI is enabled by default
ENVIRONMENT=development
ENABLE_SWAGGER=true
```

#### Production Environment
```bash
# Disable Swagger UI for security
ENVIRONMENT=production
ENABLE_SWAGGER=false  # or omit entirely
```

#### Environment-Based Control
The API automatically disables Swagger UI when:
- `ENVIRONMENT=production` is set
- `ENABLE_SWAGGER=false` is explicitly set

#### Affected Endpoints
When disabled, the following endpoints become unavailable:
- `/docs` - Swagger UI interface
- `/redoc` - ReDoc documentation
- `/openapi.json` - OpenAPI schema

### Additional Security Recommendations

1. **Use HTTPS in production** - Always deploy with SSL/TLS certificates
2. **Implement API keys** - Add authentication for production APIs
3. **Rate limiting** - Configure rate limits to prevent abuse
4. **CORS configuration** - Restrict allowed origins in production
5. **Environment variables** - Never commit `.env` files with secrets

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open pull request

## 📄 License

MIT License

## 📮 Support

- Issues: [GitHub Issues](https://github.com/your-org/project-up/issues)
- Documentation: Interactive API docs at `/docs`

---

Built with ❤️ using FastAPI, LangChain, and LangGraph