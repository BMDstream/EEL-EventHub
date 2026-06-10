import os
import requests
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("DATABASE_URL")
# The Neon SQL API endpoint is usually: https://ep-holy-firefly-a8yqsuey.eastus2.azure.neon.tech/sql
# Let's extract the clean host
host = "ep-holy-firefly-a8yqsuey.eastus2.azure.neon.tech"
url = f"https://{host}/sql"

headers = {
    "Authorization": f"Bearer npg_UZBj3Y4acwJi",
    "Neon-Connection-String": db_url,
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
