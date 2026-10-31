from fastapi import APIRouter, HTTPException
# from schemas.tool import URLRequest, ImageRequest, URLResponse, ImageResponse
# from tools.common_tools import URLSearchTool, ImageProcessingTool, LinkValidatorTool
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize standalone tools for direct API access
# url_tool = URLSearchTool()
# image_tool = ImageProcessingTool()
# link_validator_tool = LinkValidatorTool()

# @router.post("/tools/url-search", response_model=URLResponse)
# async def search_urls(request: URLRequest):
#     """Extract and search URLs from text."""
#     try:
#         result = url_tool.execute(request.text)
#         return result
#     except Exception as e:
#         logger.error(f"Error searching URLs: {str(e)}")
#         raise HTTPException(status_code=500, detail=str(e))

# @router.post("/tools/image-processing", response_model=ImageResponse)
# async def process_images(request: ImageRequest):
#     """Process and analyze images."""
#     try:
#         message = ""
#         for img in request.base64_images:
#             if not img.startswith("data:image"):
#                 img = f"data:image/jpeg;base64,{img}"
#             message += f"{img}\n"
#         
#         result = image_tool.execute(message)
#         return result
#     except Exception as e:
#         logger.error(f"Error processing images: {str(e)}")
#         raise HTTPException(status_code=500, detail=str(e))

# @router.post("/tools/validate-links")
# async def validate_links(request: dict):
#     """Validate URLs using the link validator tool."""
#     try:
#         text = request.get("text")
#         urls = request.get("urls")
#         
#         if text is None and urls is None:
#             raise HTTPException(status_code=400, detail="Either 'text' or 'urls' parameter is required")
#         
#         result = link_validator_tool.execute(text=text, urls=urls)
#         return {"result": result}
#     except Exception as e:
#         logger.error(f"Error validating links: {str(e)}")
#         raise HTTPException(status_code=400, detail=str(e)) 