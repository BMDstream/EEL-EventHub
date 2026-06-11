import os
import requests
from dotenv import load_dotenv

load_dotenv()

import urllib.parse
db_url = os.getenv("DATABASE_URL")

# Extract host and password/token from DATABASE_URL if available
if db_url:
    parsed = urllib.parse.urlparse(db_url)
    host = parsed.hostname
    token = parsed.password or ""
else:
    host = "ep-holy-firefly-a8yqsuey.eastus2.azure.neon.tech"
    token = ""

url = f"https://{host}/sql"

headers = {
    "Authorization": f"Bearer {token}",
    "Neon-Connection-String": db_url or "",
    "Content-Type": "application/json"
}

payload = {
    "query": "SELECT id, slug, title FROM event;"
}

print("Querying Neon HTTP SQL API...")
try:
    res = requests.post(url, json=payload, headers=headers, timeout=5)
    print("Status Code:", res.status_code)
    if res.status_code == 200:
        data = res.json()
        print("Found events:")
        for row in data.get("rows", []):
            print(row)
    else:
        print("Error Response:", res.text)
except Exception as e:
    print("Request failed:", e)
