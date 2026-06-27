import os
from dotenv import load_dotenv
import urllib.parse

env_path = "/Users/bartondelaney/Library/CloudStorage/OneDrive-ExcellenceLogisticsEntertainment/Documents/AntiGravity Projects/EEL_Cvent/.env"
load_dotenv(dotenv_path=env_path)
db_url = os.getenv("DATABASE_URL")

print(f"DATABASE_URL: {db_url}")
parsed = urllib.parse.urlparse(db_url)
print(f"Scheme: {parsed.scheme}")
print(f"Netloc: {parsed.netloc}")
print(f"Hostname: {parsed.hostname}")
print(f"Username: {parsed.username}")
print(f"Password: {parsed.password}")
print(f"Path: {parsed.path}")
print(f"Query: {parsed.query}")
