"""
Example: Branching Version Control for Chat-Based Node Refinement

Demonstrates your exact use case:
- Question with Option A and Option B
- Multiple versions within Option A
- Sub-versions creating their own branches
"""

from uuid import uuid4
from models.database.tree_models import IdeaNode
from models.database.node_chat_models import NodeChatSession
from services.node_version_service import NodeVersionService


def example_branching_workflow(db):
    """
    Scenario:
    1. User has a node: "Choose database architecture"
    2. Chat asks: "Show me SQL vs NoSQL approaches"
    3. AI generates two options:
       - Option A: PostgreSQL with strong consistency
       - Option B: MongoDB with flexibility
    4. User refines Option A:
       - Version 1: Basic PostgreSQL
       - Version 2: Add read replicas
       - Version 3: Add sharding strategy
    5. User adopts Option A v3 into main branch
    """

    service = NodeVersionService(db)

    # ============ STEP 1: Initial node ============
    node = IdeaNode(
        id=uuid4(),
        title="Database Architecture Decision",
        summary="Need to choose between SQL and NoSQL for our platform",
        content="We need a database that scales, supports complex queries, and is reliable...",
        project_sid="proj123",
        created_by=1
    )
    db.add(node)
    db.commit()

    # Create initial main version (v1)
    main_v1 = service.create_version_in_branch(
        node_id=node.id,
        branch_name='main',
        title=node.title,
        summary=node.summary,
        content=node.content,
        user_id=1,
        change_description="Initial version"
    )
    print(f"✅ Created {main_v1.full_version}: {main_v1.title}")

    # ============ STEP 2: User asks for options ============
    chat_session = NodeChatSession(
        id=uuid4(),
        node_id=node.id,
        project_id='proj123',
        title="Explore DB options",
        created_by=1
    )
    db.add(chat_session)
    db.commit()

    # ============ STEP 3: AI generates two option branches ============
    options = [
        {
            'branch_name': 'option_a_postgres',
            'display_name': 'PostgreSQL with Strong Consistency',
            'title': 'Database: PostgreSQL',
            'summary': 'Use PostgreSQL for ACID compliance, complex queries, and strong consistency',
            'content': '''
            PostgreSQL Approach:
            - ACID transactions
            - Complex JOIN support
            - Strong consistency
            - Mature ecosystem
            '''
        },
        {
            'branch_name': 'option_b_mongo',
            'display_name': 'MongoDB for Flexibility',
            'title': 'Database: MongoDB',
            'summary': 'Use MongoDB for flexible schema, horizontal scaling, and document model',
            'content': '''
            MongoDB Approach:
            - Flexible schema
            - Horizontal scaling
            - Document model
            - Native JSON support
            '''
        }
    ]

    versions = service.create_multi_option_branches(
        node_id=node.id,
        chat_session_id=chat_session.id,
        options=options,
        user_id=1
    )

    print(f"\n✅ Created {len(versions)} option branches:")
    for v in versions:
        print(f"   - {v.full_version}: {v.title}")

    # ============ STEP 4: Refine Option A multiple times ============
    print(f"\n📝 Refining Option A (PostgreSQL)...")

    # Option A - Version 2: Add read replicas
    option_a_v2 = service.create_version_in_branch(
        node_id=node.id,
        branch_name='option_a_postgres',
        title='Database: PostgreSQL with Read Replicas',
        summary='PostgreSQL with read replicas for scalability and high availability',
        content='''
        Enhanced PostgreSQL Approach:
        - Primary DB for writes
        - 3 read replicas for scaling reads
        - Automatic failover with Patroni
        - Connection pooling with PgBouncer
        ''',
        user_id=1,
        chat_session_id=chat_session.id,
        change_description="Added read replica architecture",
        parent_version_id=versions[0].id,  # Branch from option_a.1
        changed_fields=['title', 'summary', 'content']
    )
    print(f"   ✅ {option_a_v2.full_version}: Added read replicas")

    # Option A - Version 3: Add sharding
    option_a_v3 = service.create_version_in_branch(
        node_id=node.id,
        branch_name='option_a_postgres',
        title='Database: PostgreSQL with Sharding',
        summary='PostgreSQL with Citus extension for horizontal sharding across multiple nodes',
        content='''
        Advanced PostgreSQL Approach:
        - Citus extension for sharding
        - Distribute data across 5 nodes
        - Read replicas per shard
        - 10M+ records per shard
        - Cross-shard queries support
        ''',
        user_id=1,
        chat_session_id=chat_session.id,
        change_description="Added sharding strategy with Citus",
        parent_version_id=option_a_v2.id,  # Branch from option_a.2
        changed_fields=['title', 'summary', 'content']
    )
    print(f"   ✅ {option_a_v3.full_version}: Added sharding")

    # ============ STEP 5: Create sub-branch from Option A v2 ============
    print(f"\n🌿 Exploring alternative within Option A...")

    # Create sub-branch: What if we use TimescaleDB instead?
    option_a_timescale = service.create_branch_from_chat(
        node_id=node.id,
        branch_name='option_a_timescale',
        display_name='PostgreSQL with TimescaleDB',
        prompt='What if we use TimescaleDB for time-series optimization?',
        chat_session_id=chat_session.id,
        user_id=1,
        parent_version_id=option_a_v2.id  # Branch from option_a.2
    )

    timescale_v1 = service.create_version_in_branch(
        node_id=node.id,
        branch_name='option_a_timescale',
        title='Database: PostgreSQL with TimescaleDB',
        summary='PostgreSQL with TimescaleDB extension for optimized time-series data',
        content='''
        TimescaleDB Approach:
        - Based on PostgreSQL (option_a.2)
        - TimescaleDB extension for time-series
        - Automatic data retention policies
        - Optimized for metric storage
        - Still supports read replicas
        ''',
        user_id=1,
        chat_session_id=chat_session.id,
        change_description="Explore TimescaleDB variant",
        parent_version_id=option_a_v2.id
    )
    print(f"   ✅ {timescale_v1.full_version}: TimescaleDB variant")

    # ============ STEP 6: View complete version tree ============
    print(f"\n📊 Complete Version Tree:")
    tree = service.get_version_tree(node.id)

    print("\n   Branches:")
    for branch_name, versions in tree['branches'].items():
        print(f"   📁 {branch_name}:")
        for v in versions:
            print(f"      - {v['full_version']}: {v['title'][:50]}...")

    print("\n   Tree Structure:")
    print('''
    main.1 (Initial version)
      ├─> option_a_postgres.1 (PostgreSQL basic)
      │    ├─> option_a_postgres.2 (+ Read replicas)
      │    │    ├─> option_a_postgres.3 (+ Sharding)
      │    │    └─> option_a_timescale.1 (TimescaleDB variant)
      │
      └─> option_b_mongo.1 (MongoDB basic)
    ''')

    # ============ STEP 7: Compare versions ============
    print(f"\n🔍 Comparing option_a.1 vs option_a.3:")
    comparison = service.compare_versions(versions[0].id, option_a_v3.id)
    print(f"   Title changed: {comparison['title_changed']}")
    print(f"   Summary similarity: {comparison['summary_diff']['similarity']:.2%}")
    print(f"   Content added: {comparison['content_diff']['added']} chars")

    # ============ STEP 8: Adopt Option A v3 into main ============
    print(f"\n✅ Adopting option_a_postgres.3 into main branch...")
    main_v2 = service.adopt_version(
        node_id=node.id,
        version_id=option_a_v3.id,
        target_branch='main',
        user_id=1
    )
    print(f"   Created {main_v2.full_version}: {main_v2.title}")
    print(f"   Main branch now has PostgreSQL with sharding!")

    # ============ STEP 9: Get all branches ============
    print(f"\n📋 All branches:")
    branches = service.get_branches(node.id)
    for branch in branches:
        status = "merged" if branch.is_merged else "active"
        print(f"   - {branch.branch_name}: {branch.display_name} [{status}]")

    return {
        'node': node,
        'versions': tree,
        'final_version': main_v2
    }


# ============ USAGE EXAMPLE ============
if __name__ == "__main__":
    from database.connection import get_db

    with get_db() as db:
        result = example_branching_workflow(db)
        print("\n✨ Workflow complete!")
        print(f"Final version: {result['final_version'].full_version}")
        print(f"Total branches: {len(result['versions']['branches'])}")
