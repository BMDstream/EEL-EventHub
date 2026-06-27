import os
import requests
from dotenv import load_dotenv
import urllib.parse

env_path = "/Users/bartondelaney/Library/CloudStorage/OneDrive-ExcellenceLogisticsEntertainment/Documents/AntiGravity Projects/EEL_Cvent/.env"
load_dotenv(dotenv_path=env_path)
db_url = os.getenv("DATABASE_URL")

# Clean db_url by replacing -pooler with empty string and postgresql with postgres
if db_url:
    clean_db_url = db_url.replace("-pooler", "")
    if clean_db_url.startswith("postgresql://"):
        clean_db_url = clean_db_url.replace("postgresql://", "postgres://", 1)
else:
    clean_db_url = ""

parsed = urllib.parse.urlparse(clean_db_url)
host = parsed.hostname
token = parsed.password or ""

url = f"https://{host}/sql"
headers = {
    "Authorization": f"Bearer {token}",
    "Neon-Connection-String": clean_db_url,
    "Content-Type": "application/json"
}

payload = {
    "query": "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'event';"
}

print(f"URL: {url}")
print(f"Neon-Connection-String: {clean_db_url}")
try:
    res = requests.post(url, json=payload, headers=headers, timeout=10)
    print("Status Code:", res.status_code)
    print("Response:", res.text)
except Exception as e:
    print("Error:", e)
