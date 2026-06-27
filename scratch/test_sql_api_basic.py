import os
import requests
import base64
from dotenv import load_dotenv
import urllib.parse

env_path = "/Users/bartondelaney/Library/CloudStorage/OneDrive-ExcellenceLogisticsEntertainment/Documents/AntiGravity Projects/EEL_Cvent/.env"
load_dotenv(dotenv_path=env_path)
db_url = os.getenv("DATABASE_URL")

# Clean db_url by replacing -pooler with empty string
clean_db_url = db_url.replace("-pooler", "") if db_url else ""
parsed = urllib.parse.urlparse(clean_db_url)
host = parsed.hostname
username = parsed.username or ""
password = parsed.password or ""

# Base64 encode the username:password for Basic Auth
auth_str = f"{username}:{password}"
b64_auth = base64.b64encode(auth_str.encode('utf-8')).decode('utf-8')

url = f"https://{host}/sql"
headers = {
    "Authorization": f"Basic {b64_auth}",
    "Neon-Connection-String": clean_db_url,
    "Content-Type": "application/json"
}

payload = {
    "query": "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'event';"
}

print(f"URL: {url}")
try:
    res = requests.post(url, json=payload, headers=headers, timeout=10)
    print("Status Code:", res.status_code)
    print("Response:", res.text)
except Exception as e:
    print("Error:", e)
