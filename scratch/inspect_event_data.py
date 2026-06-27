import os
import psycopg2
from urllib.parse import urlparse
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")

def inspect_data():
    print("Connecting to database...")
    try:
        # Connect with a 5-second timeout to avoid hanging if there is a firewall issue
        conn = psycopg2.connect(db_url, connect_timeout=5)
        cur = conn.cursor()
        
        print("\n--- EVENTS ---")
        cur.execute("SELECT id, title, slug, custom_fields_schema FROM event")
        events = cur.fetchall()
        for e in events:
            print(f"ID: {e[0]} | Title: {e[1]} | Slug: {e[2]}")
            print(f"Schema: {e[3]}\n")
            
        print("--- REGISTRATIONS CUSTOM ANSWERS ---")
        cur.execute("""
            SELECT r.id, r.event_id, r.custom_answers, a.email, a.first_name, a.last_name
            FROM registration r
            JOIN attendee a ON r.attendee_id = a.id
        """)
        regs = cur.fetchall()
        for r in regs:
            # Only print registrations with non-empty custom answers
            if r[2] and len(r[2]) > 0:
                print(f"Reg ID: {r[0]} | Event ID: {r[1]} | Attendee: {r[3]} ({r[4]} {r[5]})")
                print(f"Custom Answers: {r[2]}\n")
                
        cur.close()
        conn.close()
    except Exception as e:
        print("Error during database inspection:", e)

if __name__ == "__main__":
    inspect_data()
