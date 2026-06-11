import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    print("--- USERS ---")
    cur.execute("SELECT id, email, role, is_active FROM \"user\"")
    users = cur.fetchall()
    for u in users:
        print(f"User ID: {u[0]}, Email: {u[1]}, Role: {u[2]}, Active: {u[3]}")
        
    print("\n--- CLIENTS ---")
    cur.execute("SELECT id, name, slug FROM \"client\"")
    clients = cur.fetchall()
    for c in clients:
        print(f"Client ID: {c[0]}, Name: {c[1]}, Slug: {c[2]}")

    print("\n--- USER CLIENT LINKS ---")
    cur.execute("SELECT user_id, client_id FROM \"userclientlink\"")
    links = cur.fetchall()
    for l in links:
        print(f"User ID: {l[0]} -> Client ID: {l[1]}")

    cur.close()
    conn.close()
except Exception as e:
    print("ERROR:", e)
