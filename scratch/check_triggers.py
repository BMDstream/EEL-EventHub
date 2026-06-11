import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    print("Checking triggers...")
    cur.execute("""
        SELECT trigger_name, event_manipulation, event_object_table, action_statement
        FROM information_schema.triggers;
    """)
    triggers = cur.fetchall()
    if not triggers:
        print("No triggers found.")
    for t in triggers:
        print(f"Trigger: {t[0]}, Event: {t[1]}, Table: {t[2]}, Action: {t[3]}")

    print("\nChecking functions/procedures...")
    cur.execute("""
        SELECT routine_name, routine_type
        FROM information_schema.routines
        WHERE routine_schema = 'public';
    """)
    routines = cur.fetchall()
    if not routines:
        print("No routines found.")
    for r in routines:
        print(f"Routine: {r[0]} ({r[1]})")

    cur.close()
    conn.close()
except Exception as e:
    print("ERROR:", e)
