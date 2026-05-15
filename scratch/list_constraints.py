from sqlalchemy import text
from backend.database import engine
from sqlmodel import Session

def list_constraints():
    with Session(engine) as session:
        # Query pg_constraint for attendee table
        sql = """
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'attendee'::regclass;
        """
        result = session.execute(text(sql))
        for row in result:
            print(f"Constraint: {row[0]}")
            
        # Also check indexes
        sql_idx = """
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'attendee';
        """
        result_idx = session.execute(text(sql_idx))
        for row in result_idx:
            print(f"Index: {row[0]}")

if __name__ == "__main__":
    list_constraints()
