from backend.database import engine
from sqlalchemy import text

def clear_dummy_data():
    tables = ["registration", "attendee", "event", "user"]
    
    with engine.connect() as conn:
        # Disable foreign key checks for the session if possible, or just delete in order
        # Registrations depend on Events and Attendees
        # We keep the 'user' table if we want to keep the admin, or we clear it and let them re-register?
        # The user likely wants to keep their admin account.
        
        print("Clearing data...")
        conn.execute(text("DELETE FROM registration"))
        conn.execute(text("DELETE FROM attendee"))
        conn.execute(text("DELETE FROM event"))
        # conn.execute(text("DELETE FROM \"user\"")) # Keep users to avoid locking out the admin
        conn.commit()
        print("Data cleared successfully.")

if __name__ == "__main__":
    clear_dummy_data()
