# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

ProjectUp is a full-stack project collaboration platform with three main components:

- **Backend** (`/backend`): Go/Gin REST API with PostgreSQL, JWT auth, WebSockets, AWS S3 storage
- **Frontend** (`/frontend`): React/TypeScript SPA with Vite, Redux state management, Material UI
- **AI Service** (`/ai-service`): Python FastAPI service with LangGraph workflows for AI-powered project assistance

The whole folder is one git repository (monorepo, `github.com/coolgenerator/ProjectUp`); commit backend, frontend, ai-service, docs and demo changes together from the top level. The old per-service repos under `project-up-hub` are no longer updated.

### Key Components

**Backend (Go)**:
- Clean architecture with controllers, services, repositories, models
- JWT authentication with automatic refresh mechanism (24h access, 30d refresh tokens)
- WebSocket support for real-time features
- AWS integrations (S3, SES, RDS)
- EditorJS support for rich content blocks

**Frontend (React/TypeScript)**:
- Component-based architecture with shared components in `/src/components`
- Redux Toolkit for state management with persistence
- Custom hooks for API interactions and WebSocket connections
- EditorJS integration for rich text editing
- Material UI and Tailwind CSS for styling

**AI Agent (Python)**:
- LangGraph workflow engine with 4 workflow types (chat, project planning, research, custom)
- Multiple AI provider support (OpenAI, Google Vertex AI)
- FastAPI REST API with comprehensive workflow management endpoints
- Template system for common AI workflows

## Development Commands

### Backend (Go)
```bash
cd backend
go mod tidy                    # Install dependencies
go run main.go                 # Start development server
go run migrate/migrate.go      # Run database migrations
swag init --parseDependency --parseInternal -g main.go  # Generate API docs
GOOS=linux GOARCH=amd64 GIN_MODE=release go build -o server main.go  # Production build
```

### Frontend (React)
```bash
cd frontend
npm install                    # Install dependencies
npm run dev                    # Start development server
npm run build                  # Production build
npm run lint                   # Run ESLint
```

### AI Service (Python)
```bash
cd ai-service
pip install -r requirements.txt  # Install dependencies
python main.py serve --reload     # Start FastAPI server on :8000 (bare `python main.py` uses :8888)
pytest tests/ -v                  # Run tests (tests/unit, tests/integration, ...)
```

## Authentication System

The backend uses a sophisticated JWT system:
- Access tokens (24h) with automatic server-side refresh
- Refresh tokens (30d) stored in database
- Automatic token refresh via response headers (`X-Token-Refreshed`, `X-New-Access-Token`, `X-New-Refresh-Token`)
- Frontend `fetchWithAuth` utility handles token updates seamlessly

## AI Workflow System

The AI agent supports complex multi-step workflows:
- **Project Planning**: Requirements → Ideas/Roadmap → Resources → Final Project
- **Research**: Keywords → Search → Validation → Synthesis → Fact Check → Report
- **Custom Workflows**: User-defined nodes with conditional routing
- **Templates**: Q&A, Content Analysis, Decision Support

## Key Patterns

- **Go**: Repository pattern with GORM, Gin middleware for auth/CORS, structured JSON responses
- **React**: Custom hooks for data fetching, Redux slices with persistence, component composition
- **Python**: Pydantic models for validation, async/await patterns, LangGraph state management

## API Documentation

- Backend Swagger docs: `http://localhost:8080/swagger/index.html`
- AI Agent OpenAPI docs: `http://localhost:8000/docs`

## Database

PostgreSQL on AWS RDS with GORM ORM. Migration files in `/backend/migrate/`.

## File Storage

AWS S3 integration for media uploads with pre-signed URLs for secure access.

## Documentation

Project docs live in `/docs`, indexed by `docs/README.md`:
- `architecture/` – system architecture, ports, deployment, core flows
- `features/` – per-feature design and implementation notes
- `guides/` – testing, migration, configuration, quickstarts
- `strategy/` – competitive analysis, product strategy, roadmap

Keep the repository root limited to `README.md` and `CLAUDE.md`. Put new docs in the matching `docs/` folder and add them to the index. Don't write one-off fix, debug or "implementation complete" notes as docs; put that context in the commit or PR message instead. When a feature changes, update or delete its doc in the same change.