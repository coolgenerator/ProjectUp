#!/usr/bin/env python3
"""
Update nodes_count for all trees to match actual node counts
"""
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text, func
from database.connection import engine
from models.database.tree_models import IdeaTree, IdeaNode
from sqlalchemy.orm import Session

def update_all_tree_node_counts():
    """Update node counts for all trees"""

    with Session(engine) as db:
        # Get all non-deleted trees
        trees = db.query(IdeaTree).filter(IdeaTree.deleted_at.is_(None)).all()

        print(f"Updating node counts for {len(trees)} trees...\n")

        for tree in trees:
            # Count actual nodes for this tree
            actual_count = db.query(func.count(IdeaNode.id)).filter(
                IdeaNode.session_id == tree.id,
                IdeaNode.deleted_at.is_(None)
            ).scalar()

            old_count = tree.nodes_count
            tree.nodes_count = actual_count

            print(f"Tree: {tree.name}")
            print(f"  Old count: {old_count}")
            print(f"  New count: {actual_count}")
            print()

        db.commit()
        print("✓ All tree node counts updated successfully!")

if __name__ == "__main__":
    update_all_tree_node_counts()
