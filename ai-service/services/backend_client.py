"""
Backend API Client Service

Provides HTTP client for communicating with the Go backend API.
Handles authentication, retries, and error handling.
"""

import httpx
import logging
from typing import Dict, Any, Optional, List
from config.settings import settings

logger = logging.getLogger(__name__)


class BackendClient:
    """HTTP client for backend API communication."""

    def __init__(self):
        """Initialize the backend client."""
        self.base_url = settings.backend_url
        self.api_prefix = settings.backend_api_prefix
        self.timeout = settings.backend_timeout
        self.client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create async HTTP client."""
        if self.client is None:
            self.client = httpx.AsyncClient(
                base_url=f"{self.base_url}{self.api_prefix}",
                timeout=self.timeout,
                follow_redirects=True,
                headers={
                    "Content-Type": "application/json",
                    "User-Agent": "ProjectUp-AI-Service/1.0"
                }
            )
        return self.client

    async def close(self):
        """Close the HTTP client."""
        if self.client:
            await self.client.aclose()
            self.client = None

    async def get(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Make GET request to backend API.

        Args:
            endpoint: API endpoint path (e.g., "/projects/abc123/plans")
            params: Optional query parameters

        Returns:
            JSON response as dictionary

        Raises:
            httpx.HTTPError: If request fails
        """
        try:
            client = await self._get_client()
            response = await client.get(endpoint, params=params)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching {endpoint}: {e.response.status_code} - {e.response.text}")
            raise
        except httpx.RequestError as e:
            logger.error(f"Request error fetching {endpoint}: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error fetching {endpoint}: {str(e)}")
            raise

    async def post(
        self,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        json: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Make POST request to backend API.

        Args:
            endpoint: API endpoint path
            data: Optional form data
            json: Optional JSON payload

        Returns:
            JSON response as dictionary
        """
        try:
            client = await self._get_client()
            response = await client.post(endpoint, data=data, json=json)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error posting to {endpoint}: {e.response.status_code} - {e.response.text}")
            raise
        except httpx.RequestError as e:
            logger.error(f"Request error posting to {endpoint}: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error posting to {endpoint}: {str(e)}")
            raise

    async def put(self, endpoint: str, json: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Make PUT request to backend API."""
        try:
            client = await self._get_client()
            response = await client.put(endpoint, json=json)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error updating {endpoint}: {str(e)}")
            raise

    async def delete(self, endpoint: str) -> Dict[str, Any]:
        """Make DELETE request to backend API."""
        try:
            client = await self._get_client()
            response = await client.delete(endpoint)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error deleting {endpoint}: {str(e)}")
            raise

    # Project Roadmap specific methods

    async def store_project_roadmap(
        self,
        project_id: str,
        roadmap_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Store AI-generated roadmap in backend database.

        Args:
            project_id: Project ID (short ID or numeric)
            roadmap_data: Complete roadmap structure from AI generation

        Returns:
            Storage result with counts of created entities
        """
        try:
            logger.info(f"Storing roadmap for project {project_id}")

            # Call backend endpoint to store roadmap
            endpoint = f"/projects/{project_id}/roadmap/store-ai-generated"
            response = await self.post(endpoint, json=roadmap_data)

            logger.info(f"Successfully stored roadmap for project {project_id}")
            return response

        except Exception as e:
            logger.error(f"Error storing roadmap for project {project_id}: {str(e)}")
            raise

    async def get_project_roadmap(self, project_id: str) -> Dict[str, Any]:
        """
        Get the complete roadmap for a project.

        Args:
            project_id: Project ID

        Returns:
            Project roadmap with sections, milestones, and tasks
        """
        try:
            endpoint = f"/projects/{project_id}/roadmap"
            return await self.get(endpoint)
        except Exception as e:
            logger.error(f"Error fetching roadmap for project {project_id}: {str(e)}")
            raise


# Singleton instance
backend_client = BackendClient()
