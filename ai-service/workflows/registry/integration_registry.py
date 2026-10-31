"""
Integration Registry - Registry for 3rd party integrations and custom APIs.

Provides:
- Built-in integrations (GitHub, Jira, Linear, Notion, etc.)
- Custom API configuration support
- Unified interface for external service calls
- OAuth and API key authentication handling
"""

from typing import Dict, List, Optional, Any, Union
from pathlib import Path
from enum import Enum
import logging
import yaml
import httpx
import json
from pydantic import BaseModel, Field
from datetime import datetime

logger = logging.getLogger(__name__)


class AuthType(str, Enum):
    """Supported authentication types"""
    NONE = "none"
    API_KEY = "api_key"
    BEARER_TOKEN = "bearer_token"
    BASIC = "basic"
    OAUTH = "oauth"
    CUSTOM_HEADER = "custom_header"
    WEBHOOK = "webhook"


class IntegrationCategory(BaseModel):
    """Category for integrations"""
    id: str
    name: str
    description: str
    icon: str


class EndpointDefinition(BaseModel):
    """API endpoint definition"""
    method: str = "GET"
    path: str
    params: Optional[Dict[str, Any]] = None
    body: Optional[Dict[str, Any]] = None
    query: Optional[str] = None  # For GraphQL
    mutation: Optional[str] = None  # For GraphQL
    response_mapping: Optional[Dict[str, str]] = None


class IntegrationDefinition(BaseModel):
    """Built-in integration definition"""
    name: str
    description: str
    category: str
    icon: str
    auth_type: AuthType
    base_url: str
    oauth_scopes: Optional[List[str]] = None
    config_fields: Optional[List[Dict[str, Any]]] = None
    headers: Optional[Dict[str, str]] = None
    endpoints: Dict[str, EndpointDefinition] = Field(default_factory=dict)
    field_mapping: Optional[Dict[str, str]] = None
    webhook_events: Optional[List[str]] = None
    graphql: bool = False
    _id: Optional[str] = None

    def to_discovery_response(self) -> Dict[str, Any]:
        """Convert to frontend-friendly format"""
        return {
            "id": self._id,
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "icon": self.icon,
            "auth_type": self.auth_type.value,
            "oauth_scopes": self.oauth_scopes,
            "config_fields": self.config_fields,
            "endpoints": list(self.endpoints.keys()),
            "graphql": self.graphql
        }


class CustomAPIConfig(BaseModel):
    """User-defined custom API configuration"""
    id: str
    name: str
    description: Optional[str] = None
    base_url: str
    auth_type: AuthType
    auth_config: Optional[Dict[str, Any]] = None
    default_headers: Optional[Dict[str, str]] = None
    endpoints: Dict[str, EndpointDefinition] = Field(default_factory=dict)
    rate_limit: Optional[Dict[str, Any]] = None
    error_handling: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    enabled: bool = True
    user_id: Optional[str] = None
    project_id: Optional[str] = None


class IntegrationConfig(BaseModel):
    """User's configured integration instance"""
    id: str
    integration_id: str  # References built-in integration or custom API
    name: str
    config: Dict[str, Any] = Field(default_factory=dict)  # User-specific config (tokens, settings)
    credentials: Optional[Dict[str, str]] = None  # Encrypted credentials
    enabled: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    user_id: Optional[str] = None
    project_id: Optional[str] = None
    last_sync: Optional[datetime] = None
    sync_status: Optional[str] = None


class IntegrationExecutionResult(BaseModel):
    """Result from integration API call"""
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    status_code: Optional[int] = None
    headers: Optional[Dict[str, str]] = None
    execution_time_ms: Optional[float] = None


class IntegrationRegistry:
    """
    Central registry for integrations and custom APIs.

    Features:
    - Load built-in integrations from YAML
    - Support custom API configurations
    - Execute API calls with proper authentication
    - Rate limiting and error handling

    Usage:
        registry = IntegrationRegistry()

        # Get available integrations
        integrations = registry.get_all_integrations()

        # Execute an integration endpoint
        result = await registry.execute(
            integration_id="github_issues",
            endpoint="list_issues",
            config=user_config,
            params={"owner": "user", "repo": "project"}
        )
    """

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self._integrations: Dict[str, IntegrationDefinition] = {}
        self._categories: Dict[str, IntegrationCategory] = {}
        self._custom_apis: Dict[str, CustomAPIConfig] = {}
        self._user_configs: Dict[str, IntegrationConfig] = {}
        self._custom_api_schema: Dict[str, Any] = {}
        self._http_client: Optional[httpx.AsyncClient] = None
        self._load_registry()
        self._initialized = True

    def _load_registry(self):
        """Load integration definitions from YAML"""
        registry_path = Path(__file__).parent / "integration_registry.yaml"

        try:
            with open(registry_path) as f:
                data = yaml.safe_load(f)

            # Load categories
            for cat_data in data.get("categories", []):
                self._categories[cat_data["id"]] = IntegrationCategory(**cat_data)

            # Load integrations
            for integration_id, config in data.get("integrations", {}).items():
                try:
                    # Convert endpoints
                    endpoints = {}
                    for ep_name, ep_config in config.get("endpoints", {}).items():
                        endpoints[ep_name] = EndpointDefinition(**ep_config) if isinstance(ep_config, dict) else ep_config
                    config["endpoints"] = endpoints

                    integration = IntegrationDefinition(**config)
                    integration._id = integration_id
                    self._integrations[integration_id] = integration
                except Exception as e:
                    logger.error(f"Failed to load integration '{integration_id}': {e}")

            # Load custom API schema
            self._custom_api_schema = data.get("custom_api_schema", {})

            logger.info(f"Loaded {len(self._integrations)} integrations in {len(self._categories)} categories")

        except FileNotFoundError:
            logger.warning(f"Integration registry not found at {registry_path}")
        except Exception as e:
            logger.error(f"Failed to load integration registry: {e}")

    async def _get_http_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client"""
        if self._http_client is None:
            self._http_client = httpx.AsyncClient(timeout=30.0)
        return self._http_client

    # ═══════════════════════════════════════════════════════════════════════
    # QUERY METHODS
    # ═══════════════════════════════════════════════════════════════════════

    def get_integration(self, integration_id: str) -> Optional[IntegrationDefinition]:
        """Get a built-in integration by ID"""
        return self._integrations.get(integration_id)

    def get_all_integrations(self) -> List[IntegrationDefinition]:
        """Get all built-in integrations as a list"""
        return list(self._integrations.values())

    def get_integrations_by_category(self, category: str) -> Dict[str, IntegrationDefinition]:
        """Get integrations by category"""
        return {
            iid: i for iid, i in self._integrations.items()
            if i.category == category
        }

    def get_categories(self) -> List[IntegrationCategory]:
        """Get all integration categories"""
        return list(self._categories.values())

    def get_custom_api_schema(self) -> Dict[str, Any]:
        """Get the schema for custom API configurations"""
        return self._custom_api_schema

    # ═══════════════════════════════════════════════════════════════════════
    # CUSTOM API MANAGEMENT
    # ═══════════════════════════════════════════════════════════════════════

    def register_custom_api(self, config: CustomAPIConfig) -> bool:
        """Register a custom API configuration"""
        try:
            self._custom_apis[config.id] = config
            logger.info(f"Registered custom API: {config.name} ({config.id})")
            return True
        except Exception as e:
            logger.error(f"Failed to register custom API: {e}")
            return False

    def get_custom_api(self, api_id: str) -> Optional[CustomAPIConfig]:
        """Get a custom API configuration"""
        return self._custom_apis.get(api_id)

    def get_custom_apis(self, user_id: Optional[str] = None, project_id: Optional[str] = None) -> List[CustomAPIConfig]:
        """Get custom APIs as a list, optionally filtered by user/project"""
        apis = list(self._custom_apis.values())

        if user_id:
            apis = [a for a in apis if a.user_id == user_id or a.user_id is None]

        if project_id:
            apis = [a for a in apis if a.project_id == project_id or a.project_id is None]

        return apis

    def get_all_custom_apis(self, user_id: Optional[str] = None, project_id: Optional[str] = None) -> Dict[str, CustomAPIConfig]:
        """Get custom APIs as dict, optionally filtered by user/project"""
        apis = self._custom_apis

        if user_id:
            apis = {aid: a for aid, a in apis.items() if a.user_id == user_id or a.user_id is None}

        if project_id:
            apis = {aid: a for aid, a in apis.items() if a.project_id == project_id or a.project_id is None}

        return apis

    def update_custom_api(self, api_id: str, updates: Dict[str, Any]) -> bool:
        """Update a custom API configuration"""
        if api_id not in self._custom_apis:
            return False

        api = self._custom_apis[api_id]
        for key, value in updates.items():
            if hasattr(api, key):
                setattr(api, key, value)
        api.updated_at = datetime.utcnow()
        return True

    def delete_custom_api(self, api_id: str) -> bool:
        """Delete a custom API configuration"""
        if api_id in self._custom_apis:
            del self._custom_apis[api_id]
            return True
        return False

    def remove_custom_api(self, api_id: str) -> None:
        """Remove a custom API (raises ValueError if not found)"""
        if api_id not in self._custom_apis:
            raise ValueError(f"Custom API '{api_id}' not found")
        del self._custom_apis[api_id]

    # ═══════════════════════════════════════════════════════════════════════
    # USER CONFIGURATION MANAGEMENT
    # ═══════════════════════════════════════════════════════════════════════

    def configure_integration(self, config: IntegrationConfig) -> bool:
        """Configure an integration with user credentials and settings"""
        # Validate that the base integration exists
        if not self.get_integration(config.integration_id) and not self.get_custom_api(config.integration_id):
            raise ValueError(f"Integration '{config.integration_id}' not found")

        try:
            config_key = f"{config.integration_id}:{config.project_id or 'global'}"
            self._user_configs[config_key] = config
            logger.info(f"Configured integration: {config.integration_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to configure integration: {e}")
            return False

    def get_configured_integrations(self, project_id: Optional[str] = None) -> List[IntegrationConfig]:
        """Get all configured integrations, optionally filtered by project"""
        configs = list(self._user_configs.values())

        if project_id:
            configs = [c for c in configs if c.project_id == project_id or c.project_id is None]

        return configs

    def remove_configuration(self, integration_id: str, project_id: Optional[str] = None) -> None:
        """Remove an integration configuration"""
        config_key = f"{integration_id}:{project_id or 'global'}"
        if config_key in self._user_configs:
            del self._user_configs[config_key]
        else:
            # Try to find by integration_id only
            for key in list(self._user_configs.keys()):
                if key.startswith(f"{integration_id}:"):
                    if project_id is None or key.endswith(f":{project_id}"):
                        del self._user_configs[key]

    def save_user_config(self, config: IntegrationConfig) -> bool:
        """Save a user's integration configuration"""
        try:
            self._user_configs[config.id] = config
            return True
        except Exception as e:
            logger.error(f"Failed to save user config: {e}")
            return False

    def get_user_config(self, config_id: str) -> Optional[IntegrationConfig]:
        """Get a user's integration configuration"""
        return self._user_configs.get(config_id)

    def get_user_configs(
        self,
        user_id: Optional[str] = None,
        project_id: Optional[str] = None,
        integration_id: Optional[str] = None
    ) -> List[IntegrationConfig]:
        """Get user configurations with optional filters"""
        configs = list(self._user_configs.values())

        if user_id:
            configs = [c for c in configs if c.user_id == user_id]

        if project_id:
            configs = [c for c in configs if c.project_id == project_id]

        if integration_id:
            configs = [c for c in configs if c.integration_id == integration_id]

        return configs

    # ═══════════════════════════════════════════════════════════════════════
    # EXECUTION
    # ═══════════════════════════════════════════════════════════════════════

    async def execute(
        self,
        integration_id: str,
        endpoint: str,
        config: IntegrationConfig,
        params: Optional[Dict[str, Any]] = None,
        body: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None
    ) -> IntegrationExecutionResult:
        """
        Execute an integration endpoint.

        Args:
            integration_id: The integration to use
            endpoint: The endpoint name to call
            config: User's integration configuration
            params: URL and query parameters
            body: Request body
            headers: Additional headers

        Returns:
            IntegrationExecutionResult with response data
        """
        import time
        start_time = time.time()

        # Get integration definition
        integration = self.get_integration(integration_id)
        custom_api = self.get_custom_api(integration_id) if not integration else None

        if not integration and not custom_api:
            return IntegrationExecutionResult(
                success=False,
                error=f"Unknown integration: {integration_id}"
            )

        # Get endpoint definition
        if integration:
            ep_def = integration.endpoints.get(endpoint)
            base_url = integration.base_url
            auth_type = integration.auth_type
            default_headers = integration.headers or {}
        else:
            ep_def = custom_api.endpoints.get(endpoint)
            base_url = custom_api.base_url
            auth_type = custom_api.auth_type
            default_headers = custom_api.default_headers or {}

        if not ep_def:
            return IntegrationExecutionResult(
                success=False,
                error=f"Unknown endpoint '{endpoint}' for integration '{integration_id}'"
            )

        try:
            # Build URL
            path = ep_def.path
            if params:
                for key, value in params.items():
                    path = path.replace(f"{{{key}}}", str(value))

            # Handle domain replacement in base_url
            if config.config:
                for key, value in config.config.items():
                    base_url = base_url.replace(f"{{{key}}}", str(value))

            url = f"{base_url}{path}"

            # Build headers
            request_headers = {**default_headers}
            if headers:
                request_headers.update(headers)

            # Add authentication
            request_headers = self._add_auth_headers(
                request_headers,
                auth_type,
                config.credentials or {},
                custom_api.auth_config if custom_api else None
            )

            # Build query params (remaining params not in URL)
            query_params = {}
            if params:
                for key, value in params.items():
                    if f"{{{key}}}" not in ep_def.path:
                        query_params[key] = value

            # Execute request
            client = await self._get_http_client()

            method = ep_def.method.upper()
            request_body = body or {}

            if method == "GET":
                response = await client.get(url, params=query_params, headers=request_headers)
            elif method == "POST":
                response = await client.post(url, params=query_params, headers=request_headers, json=request_body)
            elif method == "PUT":
                response = await client.put(url, params=query_params, headers=request_headers, json=request_body)
            elif method == "PATCH":
                response = await client.patch(url, params=query_params, headers=request_headers, json=request_body)
            elif method == "DELETE":
                response = await client.delete(url, params=query_params, headers=request_headers)
            else:
                return IntegrationExecutionResult(
                    success=False,
                    error=f"Unsupported HTTP method: {method}"
                )

            execution_time = (time.time() - start_time) * 1000

            # Parse response
            try:
                data = response.json()
            except:
                data = response.text

            # Apply response mapping if defined
            if ep_def.response_mapping and isinstance(data, dict):
                data = self._apply_mapping(data, ep_def.response_mapping)

            if response.is_success:
                return IntegrationExecutionResult(
                    success=True,
                    data=data,
                    status_code=response.status_code,
                    headers=dict(response.headers),
                    execution_time_ms=execution_time
                )
            else:
                return IntegrationExecutionResult(
                    success=False,
                    data=data,
                    error=f"HTTP {response.status_code}",
                    status_code=response.status_code,
                    execution_time_ms=execution_time
                )

        except Exception as e:
            execution_time = (time.time() - start_time) * 1000
            logger.error(f"Integration execution failed: {e}", exc_info=True)
            return IntegrationExecutionResult(
                success=False,
                error=str(e),
                execution_time_ms=execution_time
            )

    def _add_auth_headers(
        self,
        headers: Dict[str, str],
        auth_type: AuthType,
        credentials: Dict[str, str],
        auth_config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, str]:
        """Add authentication headers based on auth type"""
        if auth_type == AuthType.NONE:
            return headers

        if auth_type == AuthType.API_KEY:
            header_name = (auth_config or {}).get("header_name", "X-API-Key")
            if "api_key" in credentials:
                headers[header_name] = credentials["api_key"]

        elif auth_type == AuthType.BEARER_TOKEN:
            if "token" in credentials:
                prefix = (auth_config or {}).get("prefix", "Bearer")
                headers["Authorization"] = f"{prefix} {credentials['token']}"

        elif auth_type == AuthType.BASIC:
            import base64
            if "username" in credentials and "password" in credentials:
                auth_string = f"{credentials['username']}:{credentials['password']}"
                encoded = base64.b64encode(auth_string.encode()).decode()
                headers["Authorization"] = f"Basic {encoded}"

        elif auth_type == AuthType.OAUTH:
            if "access_token" in credentials:
                headers["Authorization"] = f"Bearer {credentials['access_token']}"

        elif auth_type == AuthType.CUSTOM_HEADER:
            if auth_config:
                header_name = auth_config.get("header_name", "Authorization")
                prefix = auth_config.get("prefix", "")
                if "token" in credentials:
                    value = f"{prefix} {credentials['token']}" if prefix else credentials['token']
                    headers[header_name] = value.strip()

        return headers

    def _apply_mapping(self, data: Dict[str, Any], mapping: Dict[str, str]) -> Dict[str, Any]:
        """Apply field mapping to response data"""
        result = {}
        for target_field, source_path in mapping.items():
            value = self._get_nested_value(data, source_path)
            if value is not None:
                result[target_field] = value
        return result

    def _get_nested_value(self, data: Dict[str, Any], path: str) -> Any:
        """Get nested value from dict using dot notation"""
        parts = path.replace("[", ".").replace("]", "").split(".")
        current = data
        for part in parts:
            if isinstance(current, dict):
                current = current.get(part)
            elif isinstance(current, list):
                try:
                    current = current[int(part)]
                except (IndexError, ValueError):
                    return None
            else:
                return None
            if current is None:
                return None
        return current

    # ═══════════════════════════════════════════════════════════════════════
    # DISCOVERY API
    # ═══════════════════════════════════════════════════════════════════════

    def to_discovery_response(
        self,
        category: Optional[str] = None,
        include_custom: bool = True,
        user_id: Optional[str] = None
    ) -> Dict:
        """Generate API response for frontend discovery"""
        integrations = self._integrations
        if category:
            integrations = self.get_integrations_by_category(category)

        result = {
            "integrations": [
                {
                    "id": iid,
                    "name": i.name,
                    "description": i.description,
                    "category": i.category,
                    "icon": i.icon,
                    "auth_type": i.auth_type.value,
                    "oauth_scopes": i.oauth_scopes,
                    "config_fields": i.config_fields,
                    "endpoints": list(i.endpoints.keys()),
                    "graphql": i.graphql
                }
                for iid, i in integrations.items()
            ],
            "categories": [
                {
                    "id": c.id,
                    "name": c.name,
                    "description": c.description,
                    "icon": c.icon
                }
                for c in self.get_categories()
            ],
            "custom_api_schema": self._custom_api_schema
        }

        if include_custom:
            custom_apis = self.get_all_custom_apis(user_id=user_id)
            result["custom_apis"] = [
                {
                    "id": api.id,
                    "name": api.name,
                    "description": api.description,
                    "base_url": api.base_url,
                    "auth_type": api.auth_type.value,
                    "endpoints": list(api.endpoints.keys()),
                    "enabled": api.enabled
                }
                for api in custom_apis.values()
            ]

        return result


# Singleton instance
integration_registry = IntegrationRegistry()
