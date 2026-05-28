import psycopg2

db_url = "postgresql://neondb_owner:npg_UZBj3Y4acwJi@ep-holy-firefly-a8yqsuey-pooler.eastus2.azure.neon.tech/neondb?sslmode=require"

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
