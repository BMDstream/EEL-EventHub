from sqlalchemy import text
from backend.database import engine

def create_indexes():
    indexes_to_create = [
        # Attendee lookup optimization
        ("idx_attendee_email", "attendee", "email"),
        
        # Registration lookup optimization (catalog filtering, PIN check-in, etc.)
        ("idx_registration_event_id", "registration", "event_id"),
        ("idx_registration_attendee_id", "registration", "attendee_id"),
        ("idx_registration_pin", "registration", "pin"),
        
        # Tournament entities optimization
        ("idx_event_checkins_player_id", "event_checkins", "player_id"),
        ("idx_matches_challenger_id", "matches", "challenger_id"),
        ("idx_matches_partner_id", "matches", "partner_id"),
        ("idx_matches_status", "matches", "status")
    ]
    
    with engine.connect() as conn:
        print("=== Database Index Optimization Start ===")
        for index_name, table, column in indexes_to_create:
            # Check if index exists first
            check_sql = text(f"""
                SELECT count(*) 
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE c.relname = '{index_name}' AND n.nspname = 'public';
            """)
            exists = conn.execute(check_sql).scalar()
            
            if exists == 0:
                print(f"Creating index {index_name} on table {table}({column})...")
                try:
                    create_sql = text(f"CREATE INDEX {index_name} ON public.{table} ({column});")
                    conn.execute(create_sql)
                    conn.commit()
                    print(f"Index {index_name} created successfully.")
                except Exception as e:
                    print(f"Failed to create index {index_name}: {e}")
            else:
                print(f"Index {index_name} already exists. Skipping.")
                
        print("=== Database Index Optimization Complete ===")

if __name__ == "__main__":
    create_indexes()
