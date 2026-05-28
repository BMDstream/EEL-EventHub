import psycopg2

db_url = "postgresql://neondb_owner:npg_UZBj3Y4acwJi@ep-holy-firefly-a8yqsuey-pooler.eastus2.azure.neon.tech/neondb?sslmode=require"

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    # Query user ID for Alvira
    cur.execute("SELECT id FROM \"user\" WHERE email ILIKE 'Alvira@eelogistics.co.za'")
    u = cur.fetchone()
    if not u:
        print("User Alvira not found")
        exit()
    user_id = u[0]
    print(f"User ID: {user_id}")

    # allowed clients
    cur.execute("SELECT client_id FROM \"userclientlink\" WHERE user_id = %s", (user_id,))
    client_ids = [row[0] for row in cur.fetchall()]
    print(f"Client IDs: {client_ids}")

    # Query events
    cur.execute("SELECT id, title, client_id FROM \"event\" WHERE client_id IN %s", (tuple(client_ids),))
    events = cur.fetchall()
    print("EVENTS:")
    for e in events:
        print(e)

    # Query stats calculation
    event_ids = [e[0] for e in events]
    print(f"Event IDs: {event_ids}")

    if event_ids:
        # confirmed registrations
        cur.execute("SELECT COUNT(*) FROM \"registration\" WHERE event_id IN %s AND status = 'confirmed'", (tuple(event_ids),))
        reg_count = cur.fetchone()[0]
        # checked in count
        cur.execute("SELECT COUNT(*) FROM \"registration\" WHERE event_id IN %s AND checked_in = TRUE", (tuple(event_ids),))
        checkin_count = cur.fetchone()[0]
        print(f"Registrations: {reg_count}, Checked in: {checkin_count}")
    else:
        print("No events, so stats will return 0s")

    cur.close()
    conn.close()
except Exception as e:
    print("ERROR DURING SIMULATION:", e)
