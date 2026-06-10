from sqlalchemy import text
from backend.database import engine

def audit_indexes():
    with engine.connect() as conn:
        # Get all indexes in the public schema
        result = conn.execute(text("""
            SELECT tablename, indexname, indexdef 
            FROM pg_indexes 
            WHERE schemaname = 'public'
            ORDER BY tablename, indexname;
        """))
        print("=== Database Index Audit ===")
        for row in result:
            print(f"Table: {row[0]}")
            print(f"  Index: {row[1]}")
            print(f"  Definition: {row[2]}")
            print("-" * 50)

if __name__ == "__main__":
    audit_indexes()
