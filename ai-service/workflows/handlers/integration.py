"""
Integration Workflow Handlers

Handles:
- sync_to_external: Push data to external services
- import_from_external: Pull data from external services
- execute_custom_api: Execute user-defined API calls
"""

from typing import Dict, Any, List, Optional
import logging
import json
import httpx
from .base import BaseHandler

logger = logging.getLogger(__name__)

# Singleton handler instance
_handler = None


def _get_handler() -> "IntegrationHandlers":
    global _handler
    if _handler is None:
        _handler = IntegrationHandlers()
    return _handler


class IntegrationHandlers(BaseHandler):
    """Handlers for external integration workflows"""

    SYNC_SYSTEM_PROMPT = """You are an expert at data synchronization and integration.
Help format and validate data for external service integration.
Ensure data compatibility and identify potential sync issues."""

    IMPORT_SYSTEM_PROMPT = """You are an expert at data import and transformation.
Help process and normalize data from external sources.
Map external data to internal formats while preserving important information."""

    async def sync_to_external_handler(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sync data to an external service.

        Input:
            integration_id: str - ID of configured integration
            data_type: str - Type of data (tasks, ideas, plans, milestones)
            items: List[Dict] - Items to sync
            sync_mode: str - create, update, upsert
            field_mapping: Dict - How to map fields to external service

        Output:
            synced_items: Items that were synced
            sync_results: Per-item results
            errors: Any errors encountered
        """
        integration_id = input_data.get("integration_id", "")
        data_type = input_data.get("data_type", "tasks")
        items = input_data.get("items", [])
        sync_mode = input_data.get("sync_mode", "create")
        field_mapping = input_data.get("field_mapping", {})
        project_id = input_data.get("_project_id")

        if not integration_id:
            return {
                "success": False,
                "error": "integration_id is required",
                "synced_items": [],
                "sync_results": [],
                "errors": ["Missing integration_id"]
            }

        if not items:
            return {
                "success": False,
                "error": "No items to sync",
                "synced_items": [],
                "sync_results": [],
                "errors": ["No items provided"]
            }

        # Get integration configuration
        from workflows.registry.integration_registry import integration_registry
        integration_config = await self._get_integration_config(
            integration_registry, integration_id, project_id
        )

        if not integration_config:
            return {
                "success": False,
                "error": f"Integration {integration_id} not found or not configured",
                "synced_items": [],
                "sync_results": [],
                "errors": [f"Integration {integration_id} not found"]
            }

        # Transform items using field mapping
        transformed_items = []
        for item in items:
            transformed = self._apply_field_mapping(item, field_mapping, integration_config)
            transformed_items.append(transformed)

        # Execute sync via integration registry
        sync_results = []
        synced_items = []
        errors = []

        for i, (original, transformed) in enumerate(zip(items, transformed_items)):
            try:
                result = await integration_registry.execute(
                    integration_id=integration_id,
                    action=f"{sync_mode}_{data_type}",
                    payload=transformed,
                    project_id=project_id
                )

                if result.get("success"):
                    synced_items.append({
                        "original_id": original.get("id"),
                        "external_id": result.get("external_id"),
                        "external_url": result.get("url")
                    })
                    sync_results.append({
                        "item_index": i,
                        "status": "success",
                        "external_id": result.get("external_id")
                    })
                else:
                    errors.append({
                        "item_index": i,
                        "error": result.get("error", "Unknown error")
                    })
                    sync_results.append({
                        "item_index": i,
                        "status": "failed",
                        "error": result.get("error")
                    })

            except Exception as e:
                logger.error(f"Sync error for item {i}: {e}")
                errors.append({
                    "item_index": i,
                    "error": str(e)
                })
                sync_results.append({
                    "item_index": i,
                    "status": "error",
                    "error": str(e)
                })

        return {
            "success": len(errors) == 0,
            "synced_items": synced_items,
            "sync_results": sync_results,
            "errors": errors,
            "summary": {
                "total": len(items),
                "succeeded": len(synced_items),
                "failed": len(errors)
            },
            "metadata": {
                "workflow_id": input_data.get("_workflow_id"),
                "integration_id": integration_id,
                "data_type": data_type,
                "sync_mode": sync_mode
            }
        }

    async def import_from_external_handler(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Import data from an external service.

        Input:
            integration_id: str - ID of configured integration
            data_type: str - Type of data to import
            filters: Dict - Filters for what to import
            field_mapping: Dict - How to map external fields to internal
            transform_with_ai: bool - Use AI to enhance imported data

        Output:
            imported_items: Items that were imported
            import_summary: Summary of import
            suggestions: AI suggestions for imported data
        """
        integration_id = input_data.get("integration_id", "")
        data_type = input_data.get("data_type", "tasks")
        filters = input_data.get("filters", {})
        field_mapping = input_data.get("field_mapping", {})
        transform_with_ai = input_data.get("transform_with_ai", False)
        project_id = input_data.get("_project_id")

        if not integration_id:
            return {
                "success": False,
                "error": "integration_id is required",
                "imported_items": [],
                "import_summary": {}
            }

        # Get integration configuration
        from workflows.registry.integration_registry import integration_registry

        # Fetch data from external service
        try:
            result = await integration_registry.execute(
                integration_id=integration_id,
                action=f"list_{data_type}",
                payload={"filters": filters},
                project_id=project_id
            )

            if not result.get("success"):
                return {
                    "success": False,
                    "error": result.get("error", "Failed to fetch from external service"),
                    "imported_items": [],
                    "import_summary": {}
                }

            external_items = result.get("data", [])

        except Exception as e:
            logger.error(f"Import error: {e}")
            return {
                "success": False,
                "error": str(e),
                "imported_items": [],
                "import_summary": {}
            }

        # Transform items using field mapping
        imported_items = []
        for item in external_items:
            transformed = self._reverse_field_mapping(item, field_mapping)
            transformed["_external_id"] = item.get("id")
            transformed["_external_source"] = integration_id
            imported_items.append(transformed)

        # Optionally enhance with AI
        suggestions = []
        if transform_with_ai and imported_items:
            ai_result = await self._enhance_imported_data(imported_items, data_type)
            suggestions = ai_result.get("suggestions", [])
            if ai_result.get("enhanced_items"):
                imported_items = ai_result["enhanced_items"]

        return {
            "success": True,
            "imported_items": imported_items,
            "import_summary": {
                "total_fetched": len(external_items),
                "total_imported": len(imported_items),
                "source": integration_id,
                "data_type": data_type
            },
            "suggestions": suggestions,
            "metadata": {
                "workflow_id": input_data.get("_workflow_id"),
                "integration_id": integration_id,
                "data_type": data_type,
                "ai_enhanced": transform_with_ai
            }
        }

    async def execute_custom_api_handler(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a custom API call.

        Input:
            api_config_id: str - ID of saved custom API config
            api_config: Dict - Inline API configuration (if not using saved)
            endpoint: str - Specific endpoint to call
            method: str - HTTP method
            payload: Dict - Request payload
            query_params: Dict - Query parameters
            transform_response: bool - Use AI to transform response

        Output:
            response: API response data
            transformed_data: AI-transformed data if requested
            execution_info: Request/response metadata
        """
        api_config_id = input_data.get("api_config_id")
        api_config = input_data.get("api_config", {})
        endpoint = input_data.get("endpoint", "")
        method = input_data.get("method", "GET").upper()
        payload = input_data.get("payload", {})
        query_params = input_data.get("query_params", {})
        transform_response = input_data.get("transform_response", False)
        project_id = input_data.get("_project_id")

        # Get API configuration
        from workflows.registry.integration_registry import integration_registry

        if api_config_id:
            # Load saved custom API config
            try:
                saved_config = integration_registry.get_custom_api(api_config_id)
                if saved_config:
                    api_config = saved_config.model_dump()
            except Exception as e:
                logger.warning(f"Failed to load custom API config: {e}")

        if not api_config:
            return {
                "success": False,
                "error": "No API configuration provided",
                "response": None
            }

        # Build request
        base_url = api_config.get("base_url", "")
        full_url = f"{base_url.rstrip('/')}/{endpoint.lstrip('/')}" if endpoint else base_url

        headers = api_config.get("default_headers", {}).copy()

        # Apply authentication
        auth_config = api_config.get("auth", {})
        auth_type = auth_config.get("type", "none")

        if auth_type == "api_key":
            key_name = auth_config.get("key_name", "X-API-Key")
            key_value = auth_config.get("api_key", "")
            key_location = auth_config.get("key_location", "header")
            if key_location == "header":
                headers[key_name] = key_value
            elif key_location == "query":
                query_params[key_name] = key_value

        elif auth_type == "bearer_token":
            token = auth_config.get("token", "")
            headers["Authorization"] = f"Bearer {token}"

        elif auth_type == "basic":
            import base64
            username = auth_config.get("username", "")
            password = auth_config.get("password", "")
            credentials = base64.b64encode(f"{username}:{password}".encode()).decode()
            headers["Authorization"] = f"Basic {credentials}"

        elif auth_type == "custom_header":
            custom_headers = auth_config.get("custom_headers", {})
            headers.update(custom_headers)

        # Execute request
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                if method == "GET":
                    response = await client.get(full_url, headers=headers, params=query_params)
                elif method == "POST":
                    headers.setdefault("Content-Type", "application/json")
                    response = await client.post(
                        full_url, headers=headers, params=query_params, json=payload
                    )
                elif method == "PUT":
                    headers.setdefault("Content-Type", "application/json")
                    response = await client.put(
                        full_url, headers=headers, params=query_params, json=payload
                    )
                elif method == "PATCH":
                    headers.setdefault("Content-Type", "application/json")
                    response = await client.patch(
                        full_url, headers=headers, params=query_params, json=payload
                    )
                elif method == "DELETE":
                    response = await client.delete(full_url, headers=headers, params=query_params)
                else:
                    return {
                        "success": False,
                        "error": f"Unsupported HTTP method: {method}",
                        "response": None
                    }

                # Parse response
                try:
                    response_data = response.json()
                except json.JSONDecodeError:
                    response_data = {"raw": response.text}

                execution_info = {
                    "status_code": response.status_code,
                    "url": str(response.url),
                    "method": method,
                    "response_time_ms": response.elapsed.total_seconds() * 1000
                }

                # Transform response with AI if requested
                transformed_data = None
                if transform_response and response.status_code < 400:
                    transformed_data = await self._transform_api_response(
                        response_data,
                        api_config.get("response_schema"),
                        api_config.get("description", "")
                    )

                return {
                    "success": response.status_code < 400,
                    "response": response_data,
                    "transformed_data": transformed_data,
                    "execution_info": execution_info,
                    "metadata": {
                        "workflow_id": input_data.get("_workflow_id"),
                        "api_config_id": api_config_id,
                        "endpoint": endpoint
                    }
                }

        except httpx.TimeoutException:
            return {
                "success": False,
                "error": "Request timed out",
                "response": None,
                "execution_info": {"url": full_url, "method": method}
            }
        except Exception as e:
            logger.error(f"Custom API execution error: {e}")
            return {
                "success": False,
                "error": str(e),
                "response": None,
                "execution_info": {"url": full_url, "method": method}
            }

    async def _get_integration_config(
        self,
        registry,
        integration_id: str,
        project_id: Optional[str]
    ) -> Optional[Dict]:
        """Get integration configuration from registry"""
        try:
            integration = registry.get_integration(integration_id)
            if integration:
                return integration.model_dump()
            return None
        except Exception as e:
            logger.warning(f"Failed to get integration config: {e}")
            return None

    def _apply_field_mapping(
        self,
        item: Dict,
        field_mapping: Dict,
        integration_config: Dict
    ) -> Dict:
        """Apply field mapping for outbound sync"""
        if not field_mapping:
            # Use integration's default mapping
            field_mapping = integration_config.get("default_field_mapping", {})

        result = {}
        for internal_field, external_field in field_mapping.items():
            if internal_field in item:
                result[external_field] = item[internal_field]

        # Include unmapped fields
        for key, value in item.items():
            if key not in field_mapping:
                result[key] = value

        return result

    def _reverse_field_mapping(self, item: Dict, field_mapping: Dict) -> Dict:
        """Apply reverse field mapping for inbound import"""
        if not field_mapping:
            return item.copy()

        # Reverse the mapping
        reverse_mapping = {v: k for k, v in field_mapping.items()}

        result = {}
        for external_field, value in item.items():
            internal_field = reverse_mapping.get(external_field, external_field)
            result[internal_field] = value

        return result

    async def _enhance_imported_data(
        self,
        items: List[Dict],
        data_type: str
    ) -> Dict[str, Any]:
        """Use AI to enhance imported data"""
        items_preview = items[:5]  # Limit for prompt size

        prompt = f"""Analyze these imported {data_type} and provide suggestions for enhancement:

Imported Items:
{json.dumps(items_preview, indent=2)}

Provide suggestions for:
1. Missing fields that should be populated
2. Data quality improvements
3. Categorization or tagging suggestions
4. Priority or ordering suggestions

Return your response as JSON:
{{
    "suggestions": [
        {{
            "item_index": 0,
            "suggestion_type": "missing_field|quality|categorization|priority",
            "field": "field_name",
            "suggestion": "What to add or change",
            "confidence": "high|medium|low"
        }}
    ],
    "general_observations": [
        "Overall observation about the imported data"
    ],
    "recommended_actions": [
        "Recommended action to take"
    ]
}}"""

        result = await self.generate_json(prompt, self.IMPORT_SYSTEM_PROMPT)

        return {
            "suggestions": result.get("suggestions", []),
            "general_observations": result.get("general_observations", []),
            "recommended_actions": result.get("recommended_actions", [])
        }

    async def _transform_api_response(
        self,
        response_data: Any,
        expected_schema: Optional[Dict],
        api_description: str
    ) -> Dict[str, Any]:
        """Use AI to transform API response into structured data"""
        schema_hint = ""
        if expected_schema:
            schema_hint = f"\nExpected output schema: {json.dumps(expected_schema)}"

        prompt = f"""Transform this API response into structured, usable data:

API Description: {api_description}

Response Data:
{json.dumps(response_data, indent=2)[:2000]}
{schema_hint}

Extract and structure the most relevant information from this response.

Return your response as JSON:
{{
    "structured_data": {{
        "items": [...],
        "metadata": {{}}
    }},
    "data_summary": "Brief summary of what was extracted",
    "field_mappings": {{
        "original_field": "mapped_field"
    }}
}}"""

        result = await self.generate_json(prompt, self.IMPORT_SYSTEM_PROMPT)
        return result


# Module-level handler functions (called by registry)
async def sync_to_external_handler(input_data: Dict[str, Any], **kwargs) -> Dict[str, Any]:
    return await _get_handler().sync_to_external_handler(input_data)


async def import_from_external_handler(input_data: Dict[str, Any], **kwargs) -> Dict[str, Any]:
    return await _get_handler().import_from_external_handler(input_data)


async def execute_custom_api_handler(input_data: Dict[str, Any], **kwargs) -> Dict[str, Any]:
    return await _get_handler().execute_custom_api_handler(input_data)
