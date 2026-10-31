"""
Script to generate AI summaries for idea nodes that have descriptions but no summaries.

This script:
1. Finds all nodes where summary is NULL but description is not NULL
2. Uses Vertex AI to generate 1-2 sentence summaries from the description
3. Updates the summary field in the database
"""
import sys
import os
import asyncio

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import get_db
from sqlalchemy import text
from services.llm.vertex_ai_service import VertexAIService

async def generate_summary(description: str, vertex_service: VertexAIService) -> str:
    """Generate a 1-2 sentence summary from the description using AI.

    Args:
        description: The full node description
        vertex_service: Initialized Vertex AI service

    Returns:
        Generated summary (1-2 sentences)
    """
    prompt = f"""Generate a concise 1-2 sentence summary of the following content.
The summary should capture the main idea and be suitable for a preview card.

Content:
{description}

Summary:"""

    try:
        summary = await vertex_service.generate_text(
            prompt=prompt,
            temperature=0.3,  # Lower temperature for more focused summaries
            max_tokens=150    # Limit to keep summaries short
        )
        return summary.strip()
    except Exception as e:
        print(f"Error generating summary: {e}")
        # Fallback: use first 150 characters of description
        return description[:150] + "..." if len(description) > 150 else description


async def main():
    """Main script execution."""
    db = next(get_db())

    try:
        # Get count of nodes that need summaries
        result = db.execute(text("""
            SELECT COUNT(*)
            FROM idea_nodes
            WHERE description IS NOT NULL
            AND description != ''
            AND (summary IS NULL OR summary = '')
        """)).fetchone()

        count = result[0]

        if count == 0:
            print("No nodes need AI-generated summaries. All nodes already have summaries or have empty descriptions.")
            return

        print(f"Found {count} node(s) that need AI-generated summaries.")
        print()

        # Initialize Vertex AI service
        print("Initializing Vertex AI service...")
        vertex_service = VertexAIService()
        print("Vertex AI service initialized.")
        print()

        # Fetch nodes that need summaries
        nodes_result = db.execute(text("""
            SELECT id, title, description
            FROM idea_nodes
            WHERE description IS NOT NULL
            AND description != ''
            AND (summary IS NULL OR summary = '')
            ORDER BY created_at DESC
        """)).fetchall()

        # Process each node
        processed = 0
        failed = 0

        for node in nodes_result:
            node_id, title, description = node

            try:
                print(f"Processing node: {title[:50]}...")

                # Generate summary using AI
                summary = await generate_summary(description, vertex_service)

                # Update the node
                db.execute(text("""
                    UPDATE idea_nodes
                    SET summary = :summary
                    WHERE id = :node_id
                """), {"summary": summary, "node_id": node_id})

                db.commit()
                processed += 1
                print(f"  ✓ Generated summary: {summary[:80]}...")
                print()

            except Exception as e:
                print(f"  ✗ Failed to process node {node_id}: {e}")
                failed += 1
                db.rollback()

        print()
        print("=" * 60)
        print(f"Summary generation complete!")
        print(f"  Processed: {processed}")
        print(f"  Failed: {failed}")
        print(f"  Total: {count}")
        print("=" * 60)

    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(main())
