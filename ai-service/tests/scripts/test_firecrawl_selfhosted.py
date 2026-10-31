#!/usr/bin/env python3
"""Test script for self-hosted Firecrawl integration"""

import asyncio
import json
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from tools.firecrawl_tool import FirecrawlTool


async def test_selfhosted_firecrawl():
    """Test self-hosted Firecrawl at localhost:3002"""
    
    print("=" * 60)
    print("Testing Self-Hosted Firecrawl Integration")
    print("=" * 60)
    
    # Initialize Firecrawl with self-hosted configuration
    # No API key needed for self-hosted
    firecrawl = FirecrawlTool(
        api_key="",  # Empty for self-hosted
        base_url="http://localhost:3002/v0"
    )
    
    print(f"\n✓ Firecrawl initialized")
    print(f"  Base URL: {firecrawl.base_url}")
    print(f"  Is self-hosted: {firecrawl.is_self_hosted}")
    print(f"  Available: {firecrawl.available}")
    
    # Test URL
    test_url = "https://python.org"
    
    print(f"\n📊 Testing scrape_url with: {test_url}")
    print("-" * 40)
    
    try:
        # Test single URL scrape
        result = await firecrawl.scrape_url(test_url)
        
        if result.get("success"):
            print("✅ Scraping successful!")
            print(f"  URL: {result.get('url')}")
            
            # Check markdown content
            markdown = result.get("markdown", "")
            if markdown:
                print(f"  Markdown content: {len(markdown)} characters")
                print(f"  First 200 chars: {markdown[:200]}...")
            else:
                print("  ⚠️ No markdown content extracted")
            
            # Check metadata
            metadata = result.get("metadata", {})
            if metadata:
                print(f"  Metadata keys: {list(metadata.keys())}")
            else:
                print("  ⚠️ No metadata extracted")
            
        else:
            print(f"❌ Scraping failed: {result.get('error')}")
            
    except Exception as e:
        print(f"❌ Error during scrape: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 60)
    
    # Test multiple URLs
    print("\n📊 Testing multiple URL scraping")
    print("-" * 40)
    
    test_urls = [
        "https://docs.python.org/3/tutorial/",
        "https://www.python.org/about/gettingstarted/"
    ]
    
    try:
        results = await firecrawl.scrape_multiple_urls(test_urls, max_concurrent=2)
        
        for i, result in enumerate(results):
            print(f"\nURL {i+1}: {result.get('url')}")
            if result.get("success"):
                print("  ✅ Success")
                markdown = result.get("markdown", "")
                if markdown:
                    print(f"  Content length: {len(markdown)} chars")
            else:
                print(f"  ❌ Failed: {result.get('error')}")
                
    except Exception as e:
        print(f"❌ Error during multiple scraping: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 60)
    print("Test completed!")
    print("=" * 60)


async def test_with_extract_topic_endpoint():
    """Test the extract_topic endpoint with Firecrawl"""
    
    print("\n" + "=" * 60)
    print("Testing extract_topic endpoint with Firecrawl")
    print("=" * 60)
    
    import aiohttp
    
    url = "http://localhost:8888/test/hierarchy/node/extract-topic"
    
    payload = {
        "topic": "Python programming",
        "web_search_results": [
            {
                "title": "Python.org",
                "url": "https://www.python.org",
                "snippet": "Official Python website"
            },
            {
                "title": "Python Tutorial",
                "url": "https://docs.python.org/3/tutorial/",
                "snippet": "Official Python tutorial"
            }
        ],
        "use_firecrawl": True
    }
    
    print(f"\nSending request to: {url}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload) as response:
                print(f"\nResponse status: {response.status}")
                
                if response.status == 200:
                    data = await response.json()
                    print("✅ Success!")
                    print(f"\nExtracted content items: {len(data.get('extracted_content', []))}")
                    
                    for item in data.get('extracted_content', []):
                        print(f"\n  URL: {item.get('url')}")
                        print(f"  Title: {item.get('title', 'N/A')}")
                        summary = item.get('summary', '')
                        if summary:
                            print(f"  Summary: {summary[:100]}...")
                    
                    consolidated = data.get('consolidated', {})
                    if consolidated:
                        print(f"\nConsolidated info:")
                        print(f"  Sources processed: {consolidated.get('sources_processed', 0)}")
                        print(f"  Sources failed: {consolidated.get('sources_failed', 0)}")
                        print(f"  Key concepts: {len(consolidated.get('key_concepts', []))}")
                        print(f"  Prerequisites: {len(consolidated.get('prerequisites', []))}")
                else:
                    text = await response.text()
                    print(f"❌ Error: {text}")
                    
    except Exception as e:
        print(f"❌ Request failed: {e}")
        import traceback
        traceback.print_exc()


async def main():
    """Run all tests"""
    
    # Test Firecrawl directly
    await test_selfhosted_firecrawl()
    
    # Test via endpoint
    print("\n" + "=" * 60)
    print("Press Enter to test via extract_topic endpoint...")
    input()
    
    await test_with_extract_topic_endpoint()


if __name__ == "__main__":
    asyncio.run(main())