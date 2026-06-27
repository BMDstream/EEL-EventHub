import os
import psycopg2
from dotenv import load_dotenv

env_path = "/Users/bartondelaney/Library/CloudStorage/OneDrive-ExcellenceLogisticsEntertainment/Documents/AntiGravity Projects/EEL_Cvent/.env"
load_dotenv(dotenv_path=env_path)
db_url = os.getenv("DATABASE_URL")

print(f"Testing connection to: {db_url}")
try:
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()
    print("Connection successful!")
    cursor.execute("SELECT version();")
    print(cursor.fetchone())
    
    cursor.execute("SELECT count(*) FROM event;")
    print("Events count:", cursor.fetchone()[0])
    
    cursor.close()
    conn.close()
except Exception as e:
    print("Connection failed:", e)
