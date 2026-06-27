import os
import requests
from dotenv import load_dotenv
import urllib.parse

env_path = "/Users/bartondelaney/Library/CloudStorage/OneDrive-ExcellenceLogisticsEntertainment/Documents/AntiGravity Projects/EEL_Cvent/.env"
load_dotenv(dotenv_path=env_path)
db_url = os.getenv("DATABASE_URL")

if db_url:
    parsed = urllib.parse.urlparse(db_url)
    host = parsed.hostname
    token = parsed.password or ""
    # Strip pooler suffix from host for HTTP query API
    if host and host.endswith("-pooler.eastus2.azure.neon.tech"):
        host = host.replace("-pooler", "")
    elif host and "-pooler" in host:
        host = host.replace("-pooler", "")
else:
    host = "ep-holy-firefly-a8yqsuey.eastus2.azure.neon.tech"
    token = ""

url = f"https://{host}/sql"
headers = {
    "Authorization": f"Bearer {token}",
    "Neon-Connection-String": db_url or "",
    "Content-Type": "application/json"
}

def query_db(sql_query):
    payload = {"query": sql_query}
    try:
        res = requests.post(url, json=payload, headers=headers, timeout=10)
        if res.status_code == 200:
            return res.json()
        else:
            return {"error": res.text, "status_code": res.status_code}
    except Exception as e:
        return {"error": str(e)}

# 1. Check columns in event table
print("--- Checking event table columns ---")
cols_res = query_db("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'event';")
if "error" in cols_res:
    print("Error:", cols_res)
else:
    columns = [row[0] for row in cols_res.get("rows", [])]
    print("Columns in 'event' table:")
    for row in cols_res.get("rows", []):
        print(f"  {row[0]} ({row[1]})")

# 2. Check if there are any events
print("\n--- Checking events data ---")
if "columns" in locals() and "confirmation_template_key" in columns:
    events_res = query_db("SELECT id, slug, title, confirmation_template_key FROM event;")
else:
    events_res = query_db("SELECT id, slug, title FROM event;")

if "error" in events_res:
    print("Error querying events:", events_res)
else:
    rows = events_res.get("rows", [])
    print(f"Found {len(rows)} events:")
    for row in rows:
        print("  ", row)

# 3. Check users count and roles
print("\n--- Checking users data ---")
users_res = query_db("SELECT id, email, role FROM \"user\";")
if "error" in users_res:
    print("Error querying users:", users_res)
else:
    rows = users_res.get("rows", [])
    print(f"Found {len(rows)} users:")
    for row in rows:
        print("  ", row)
