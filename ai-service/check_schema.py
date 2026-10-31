"""
Quick script to check if the branching columns exist in the database
"""
from sqlalchemy import text, inspect
from database.connection import engine

def check_table_schema():
    """Check the node_chat_sessions table schema"""

    print("=" * 70)
    print("CHECKING node_chat_sessions TABLE SCHEMA")
    print("=" * 70)

    with engine.connect() as conn:
        # Get column information
        result = conn.execute(text("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'node_chat_sessions'
            ORDER BY ordinal_position;
        """))

        columns = result.fetchall()

        print(f"\nTotal columns: {len(columns)}\n")

        branching_columns = ['parent_session_id', 'branch_name', 'branch_point_index', 'branch_display_name']
        found_branching = []

        for col in columns:
            col_name, data_type, nullable, default = col
            print(f"  {col_name:30} {data_type:20} nullable={nullable:3} default={default}")

            if col_name in branching_columns:
                found_branching.append(col_name)

        print("\n" + "=" * 70)
        print("BRANCHING COLUMNS CHECK:")
        print("=" * 70)

        for col in branching_columns:
            if col in found_branching:
                print(f"  ✅ {col} - FOUND")
            else:
                print(f"  ❌ {col} - MISSING")

        if len(found_branching) == len(branching_columns):
            print("\n✅ All branching columns present!")
        else:
            print(f"\n❌ Missing {len(branching_columns) - len(found_branching)} branching columns")

if __name__ == "__main__":
    try:
        check_table_schema()
    except Exception as e:
        print(f"\n❌ Error checking schema: {e}")
        import traceback
        traceback.print_exc()
