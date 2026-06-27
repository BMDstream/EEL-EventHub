import os
import psycopg2
from dotenv import load_dotenv

# Load env variables from workspace env path
env_path = "/Users/bartondelaney/Library/CloudStorage/OneDrive-ExcellenceLogisticsEntertainment/Documents/AntiGravity Projects/EEL_Cvent/.env"
load_dotenv(dotenv_path=env_path)
db_url = os.getenv("DATABASE_URL")

try:
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()
    
    print("=== Connected to Database ===")
    
    # 1. Check Events email configs
    print("\n--- Event Email Configurations ---")
    cursor.execute("""
        SELECT id, title, slug, sender_email, sender_name, confirmation_template_key 
        FROM event 
        ORDER BY id DESC LIMIT 10;
    """)
    events = cursor.fetchall()
    for ev in events:
        print(f"ID: {ev[0]} | Title: {ev[1]} | Slug: {ev[2]} | SenderEmail: {ev[3]} | SenderName: {ev[4]} | TemplateKey: {ev[5]}")
        
    # 2. Check System Settings
    print("\n--- System Settings (email config) ---")
    cursor.execute("""
        SELECT key, value FROM systemsetting WHERE key IN ('email_config', 'resend_api_key', 'mock_email_service');
    """)
    settings = cursor.fetchall()
    for s in settings:
        print(f"Key: {s[0]} | Value: {s[1]}")
        
    # 3. Check Email Templates
    print("\n--- Available Email Templates ---")
    cursor.execute("SELECT key, name, subject FROM emailtemplate;")
    templates = cursor.fetchall()
    for t in templates:
        print(f"Key: {t[0]} | Name: {t[1]} | Subject: {t[2]}")

    # 4. Check Recent Registrations
    print("\n--- Recent Registrations ---")
    cursor.execute("""
        SELECT r.id, a.first_name, a.last_name, a.email, e.title, r.pin, r.created_at, r.status
        FROM registration r
        JOIN attendee a ON r.attendee_id = a.id
        JOIN event e ON r.event_id = e.id
        ORDER BY r.created_at DESC LIMIT 5;
    """)
    regs = cursor.fetchall()
    for r in regs:
        print(f"ID: {r[0]} | Name: {r[1]} {r[2]} ({r[3]}) | Event: {r[4]} | Pin: {r[5]} | Date: {r[6]} | Status: {r[7]}")
        
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"Error: {e}")
