# AI Service: User API Key Integration for Free Accounts

## Overview

This document describes how the AI service should use user-provided API keys for free-tier users while using the service's API keys for paid users.

## Backend Endpoints (Already Implemented)

### 1. Get User Subscription Tier
```
GET /api/v1/subscription/tier
Authorization: Bearer <user_jwt_token>

Response:
{
    "tier": "free|basic|pro|enterprise",
    "is_free": true|false
}
```

### 2. Get Active API Key for Provider
```
GET /api/ai-api-keys/active/:provider
Authorization: Bearer <user_jwt_token>

Parameters:
- provider: openai|anthropic|google|groq|mistral|etc.

Response (Success):
{
    "api_key": "sk-decrypted-key-here",
    "base_url": "https://api.openai.com/v1",
    "model": "gpt-4o",
    "provider": "openai"
}

Response (Not Found):
{
    "error": "no active API key found for this provider"
}
```

## AI Service Implementation Flow

### Step 1: Check User Tier (On Every AI Request)

```python
# In middleware or at the start of AI request handling

async def check_user_tier(user_id: int, token: str) -> dict:
    """
    Check if user is on free tier
    Returns: {"tier": str, "is_free": bool}
    """
    headers = {"Authorization": f"Bearer {token}"}
    response = await http_client.get(
        f"{BACKEND_URL}/api/v1/subscription/tier",
        headers=headers
    )

    if response.status_code == 200:
        return response.json()
    else:
        # Default to free if endpoint fails
        return {"tier": "free", "is_free": True}
```

### Step 2: Get User API Key (If Free Tier)

```python
async def get_user_api_key(provider: str, token: str) -> dict:
    """
    Get user's active API key for the provider
    Returns: {"api_key": str, "base_url": str, "model": str, "provider": str}
    Raises: NoAPIKeyError if not found
    """
    headers = {"Authorization": f"Bearer {token}"}
    response = await http_client.get(
        f"{BACKEND_URL}/api/ai-api-keys/active/{provider}",
        headers=headers
    )

    if response.status_code == 200:
        return response.json()
    elif response.status_code == 404:
        raise NoAPIKeyError(f"No active API key found for provider: {provider}")
    else:
        raise APIKeyRetrievalError("Failed to retrieve API key")
```

### Step 3: Modified AI Request Flow

```python
async def generate_ai_response(request: ChatRequest, user_token: str):
    """
    Generate AI response using appropriate API key based on user tier
    """

    # Step 1: Check user tier
    user_tier_info = await check_user_tier(request.user_id, user_token)

    # Step 2: Determine which API key to use
    if user_tier_info["is_free"]:
        # Free user - use their API key
        try:
            user_key_config = await get_user_api_key(
                provider=request.provider or "openai",  # Default to openai
                token=user_token
            )

            api_key = user_key_config["api_key"]
            base_url = user_key_config.get("base_url")
            model = user_key_config.get("model") or request.model

        except NoAPIKeyError:
            # User hasn't configured API key
            return {
                "error": "API_KEY_REQUIRED",
                "message": "Please configure your API key in Settings > AI API Keys",
                "provider": request.provider,
                "action_required": "configure_api_key"
            }

    else:
        # Paid user - use service API key
        api_key = get_service_api_key(request.provider)
        base_url = get_service_base_url(request.provider)
        model = request.model

    # Step 3: Make AI request with error handling
    try:
        response = await make_llm_call(
            api_key=api_key,
            base_url=base_url,
            model=model,
            messages=request.messages
        )
        return response

    except InvalidAPIKeyError as e:
        if user_tier_info["is_free"]:
            return {
                "error": "INVALID_API_KEY",
                "message": "Your API key is invalid. Please update it in Settings > AI API Keys",
                "action_required": "update_api_key"
            }
        else:
            # Service API key issue - internal error
            raise

    except QuotaExceededError as e:
        if user_tier_info["is_free"]:
            return {
                "error": "QUOTA_EXCEEDED",
                "message": "Your API key has exceeded its quota. Please check your provider account or upgrade to a paid plan.",
                "action_required": "upgrade_or_add_credits"
            }
        else:
            # Service quota issue - internal error
            raise

    except Exception as e:
        # Other errors
        return {
            "error": "AI_REQUEST_FAILED",
            "message": str(e)
        }
```

## Provider Mapping

Map user's provider selection to the appropriate LLM client:

```python
PROVIDER_TO_CLIENT = {
    "openai": OpenAIClient,
    "anthropic": AnthropicClient,
    "google": GoogleClient,
    "groq": GroqClient,  # OpenAI-compatible
    "mistral": MistralClient,  # OpenAI-compatible
    "deepseek": OpenAIClient,  # OpenAI-compatible
    "together": OpenAIClient,  # OpenAI-compatible
    "openrouter": OpenAIClient,  # OpenAI-compatible
    # ... add more as needed
}

def get_llm_client(provider: str, api_key: str, base_url: str = None):
    """Get the appropriate LLM client for the provider"""
    client_class = PROVIDER_TO_CLIENT.get(provider, OpenAIClient)

    if base_url:
        return client_class(api_key=api_key, base_url=base_url)
    else:
        return client_class(api_key=api_key)
```

## Error Response Format

All AI service responses should include clear error information:

```python
# Success
{
    "success": true,
    "response": "AI generated response here...",
    "model": "gpt-4o",
    "provider": "openai"
}

# Error - Missing API Key
{
    "success": false,
    "error": "API_KEY_REQUIRED",
    "message": "Please configure your API key in Settings > AI API Keys",
    "provider": "openai",
    "action_required": "configure_api_key"
}

# Error - Invalid API Key
{
    "success": false,
    "error": "INVALID_API_KEY",
    "message": "Your API key is invalid. Please update it in Settings > AI API Keys",
    "action_required": "update_api_key"
}

# Error - Quota Exceeded
{
    "success": false,
    "error": "QUOTA_EXCEEDED",
    "message": "Your API key has exceeded its quota. Please check your provider account or upgrade to a paid plan.",
    "action_required": "upgrade_or_add_credits"
}
```

## Frontend Integration

The frontend should handle these error responses:

```typescript
async function sendAIRequest(message: string) {
    const response = await fetch(`${AI_SERVICE_URL}/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({ message })
    });

    const data = await response.json();

    if (!data.success) {
        switch (data.error) {
            case 'API_KEY_REQUIRED':
                showNotification({
                    type: 'warning',
                    message: data.message,
                    action: {
                        label: 'Configure API Key',
                        onClick: () => navigate('/settings?tab=ai-settings')
                    }
                });
                break;

            case 'INVALID_API_KEY':
                showNotification({
                    type: 'error',
                    message: data.message,
                    action: {
                        label: 'Update API Key',
                        onClick: () => navigate('/settings?tab=ai-settings')
                    }
                });
                break;

            case 'QUOTA_EXCEEDED':
                showNotification({
                    type: 'error',
                    message: data.message,
                    actions: [
                        {
                            label: 'Check Provider Account',
                            onClick: () => window.open(getProviderURL(data.provider))
                        },
                        {
                            label: 'Upgrade Plan',
                            onClick: () => navigate('/subscription')
                        }
                    ]
                });
                break;
        }
    }

    return data;
}
```

## Implementation Checklist

### Backend (✅ Complete)
- [x] Add `GET /api/v1/subscription/tier` endpoint
- [x] Add `GET /api/ai-api-keys/active/:provider` endpoint
- [x] Implement API key encryption/decryption
- [x] Add subscription tier checking service

### AI Service (🔲 To Do)
- [ ] Add tier checking at start of AI requests
- [ ] Implement user API key retrieval
- [ ] Add provider-to-client mapping
- [ ] Implement error handling for invalid/expired keys
- [ ] Add quota exceeded detection
- [ ] Update all AI endpoints to use this flow

### Frontend (🔲 To Do)
- [ ] Add error response handling
- [ ] Show appropriate notifications for API key errors
- [ ] Deep link to settings when API key config needed
- [ ] Add upgrade prompts for quota exceeded errors

## Testing Scenarios

1. **Free user with valid API key**: Should use user's key successfully
2. **Free user without API key**: Should show friendly error asking them to configure
3. **Free user with invalid API key**: Should show error asking them to update
4. **Free user with exceeded quota**: Should suggest checking provider account or upgrading
5. **Paid user**: Should use service API key regardless of user configuration
6. **Provider not configured by user**: Should show provider-specific guidance

## Security Considerations

- ✅ API keys are encrypted in database (AES-256-GCM)
- ✅ Keys are only decrypted on backend, never sent to frontend
- ✅ Only active keys are returned
- ✅ Authentication required for all endpoints
- ⚠️ AI service should cache user tier/API key for session (add Redis caching)
- ⚠️ Implement rate limiting per user (not just per IP)

## Next Steps

1. **Immediate**: Update AI service to check tier and use user API keys
2. **Short-term**: Add caching to reduce backend calls
3. **Medium-term**: Add usage tracking per user
4. **Long-term**: Implement smart provider fallback (if one provider fails, try another)
