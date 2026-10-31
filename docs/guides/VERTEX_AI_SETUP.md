# Vertex AI Configuration Guide

## Prerequisites

1. **Google Cloud Project**: You need a GCP project with Vertex AI API enabled
2. **Service Account**: Create a service account with Vertex AI permissions
3. **Authentication**: Download service account JSON key file

## Step 1: Enable Vertex AI API

```bash
# Using gcloud CLI
gcloud services enable aiplatform.googleapis.com
```

Or enable via [Google Cloud Console](https://console.cloud.google.com/apis/library/aiplatform.googleapis.com)

## Step 2: Create Service Account

```bash
# Create service account
gcloud iam service-accounts create project-up-ai-agent \
    --display-name="ProjectUp AI Agent"

# Grant Vertex AI permissions
gcloud projects add-iam-policy-binding project-up66 \
    --member="serviceAccount:project-up-ai-agent@project-up66.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"

# Download key file
gcloud iam service-accounts keys create \
    ~/vertex-ai-key.json \
    --iam-account=project-up-ai-agent@project-up66.iam.gserviceaccount.com
```

## Step 3: Configure Environment Variables

Create a `.env` file in the ai-agent directory:

```bash
# Copy the example file
cp .env.example .env
```

Then edit `.env` with your configuration:

```env
# Google Cloud Platform / Vertex AI Configuration
GCP_PROJECT_ID=project-up66
GCP_REGION=us-central1
GCP_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=./vertex-ai-key.json

# Vertex AI Model Configuration
VERTEX_AI_MODEL=gemini-1.5-flash
VERTEX_AI_EMBEDDING_MODEL=text-embedding-004
VERTEX_AI_TEMPERATURE=0.7
VERTEX_AI_MAX_OUTPUT_TOKENS=8192

# Default LLM Provider
DEFAULT_LLM_PROVIDER=vertex_ai
DEFAULT_LLM_MODEL=gemini-1.5-flash
```

## Step 4: Alternative - Using JSON String

If you can't use a file path (e.g., in Docker or CI/CD), you can use the JSON string directly:

```env
# Instead of GOOGLE_APPLICATION_CREDENTIALS, use:
GCP_CREDENTIALS_JSON='{"type": "service_account", "project_id": "project-up66", ...}'
```

## Step 5: Test Configuration

```python
# Test script
from config.vertex_ai_config import vertex_ai_config

# Validate configuration
is_valid, error = vertex_ai_config.validate_config()
if is_valid:
    print("✓ Vertex AI configuration is valid")
    print(f"  Project: {vertex_ai_config.gcp_project_id}")
    print(f"  Model: {vertex_ai_config.vertex_ai_model}")
else:
    print(f"✗ Configuration error: {error}")
```

## Step 6: Initialize Vertex AI in Code

The system will automatically use Vertex AI when configured. The initialization happens in:

```python
# In workflows/roadmap_generation/generator.py
from langchain_google_vertexai import ChatVertexAI

# Automatic initialization with your config
model = os.environ.get("VERTEX_AI_MODEL", "gemini-1.5-flash")
llm = ChatVertexAI(
    model=model,
    project=vertex_ai_config.gcp_project_id,
    location=vertex_ai_config.gcp_location
)
```

## Available Models

Based on your configuration, you can use:

### Chat Models
- `gemini-1.5-flash` - Fast, versatile (default)
- `gemini-1.5-pro` - Advanced reasoning
- `gemini-1.0-pro` - Balanced performance

### Embedding Models
- `text-embedding-004` - Latest embeddings (default)
- `textembedding-gecko@003` - Legacy embeddings

## Troubleshooting

### 1. Authentication Error
```
Error: Could not automatically determine credentials
```
**Solution**: Ensure `GOOGLE_APPLICATION_CREDENTIALS` points to valid JSON key file

### 2. API Not Enabled
```
Error: Vertex AI API has not been used in project
```
**Solution**: Enable the API using gcloud command above

### 3. Permission Denied
```
Error: Permission 'aiplatform.endpoints.predict' denied
```
**Solution**: Grant `roles/aiplatform.user` role to service account

### 4. Invalid Project ID
```
Error: Project project-up66 not found
```
**Solution**: Verify project ID in GCP Console and update `.env`

## Cost Considerations

Vertex AI charges per 1000 characters:
- **Gemini 1.5 Flash**: ~$0.00001875 per 1K chars (input), ~$0.000075 per 1K chars (output)
- **Gemini 1.5 Pro**: ~$0.000125 per 1K chars (input), ~$0.0005 per 1K chars (output)

For roadmap generation with average 50 nodes:
- Estimated cost per roadmap: $0.01 - $0.05

## Security Best Practices

1. **Never commit `.env` or key files** to Git
2. **Use least privilege** - only grant necessary permissions
3. **Rotate keys regularly** - regenerate service account keys periodically
4. **Use Secret Manager** in production instead of files
5. **Enable audit logging** to track API usage

## Next Steps

After configuration:
1. Restart the AI agent server: `python main.py serve`
2. Test roadmap generation: `curl -X POST localhost:8000/api/roadmap/generate -d '{"topic": "Python Programming"}'`
3. Check logs for any errors: `tail -f ai-agent.log`