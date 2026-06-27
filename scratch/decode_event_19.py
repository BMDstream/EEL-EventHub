import os
import psycopg2
import json
from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")
key = "CqX3rZ8vK9wP5mN2jT6bY7hL1xR4fG9zS0aV2eM8uI5="
fernet = Fernet(key.encode())

def decode_data():
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        # 1. Fetch Event 19 info
        cur.execute("SELECT id, title, slug, custom_fields_schema FROM event WHERE id = 19")
        event = cur.fetchone()
        if not event:
            print("Event 19 not found.")
            return
        print(f"=== Event ID: {event[0]} | Title: {event[1]} | Slug: {event[2]} ===")
        print("Current Schema in DB:")
        print(json.dumps(event[3], indent=2))
        print("\n")
        
        # 2. Fetch all registrations for Event 19
        cur.execute("""
            SELECT r.id, r.custom_answers, a.email, a.first_name, a.last_name
            FROM registration r
            JOIN attendee a ON r.attendee_id = a.id
            WHERE r.event_id = 19
        """)
        regs = cur.fetchall()
        
        # 3. Decrypt and analyze custom answers
        field_values = {}
        registrations_decoded = []
        
        for r in regs:
            reg_id, encrypted_answers, email, fname, lname = r
            decrypted_dict = {}
            if encrypted_answers and "_encrypted" in encrypted_answers:
                ciphertext = encrypted_answers["_encrypted"]
                try:
                    decrypted_str = fernet.decrypt(ciphertext.encode()).decode()
                    decrypted_dict = json.loads(decrypted_str)
                except Exception as e:
                    decrypted_dict = {"error": f"Decryption failed: {e}"}
            elif encrypted_answers:
                decrypted_dict = encrypted_answers
                
            registrations_decoded.append({
                "reg_id": reg_id,
                "email": email,
                "name": f"{fname} {lname}",
                "answers": decrypted_dict
            })
            
            for fid, val in decrypted_dict.items():
                if fid not in field_values:
                    field_values[fid] = set()
                if isinstance(val, list):
                    field_values[fid].update(str(x) for x in val)
                else:
                    field_values[fid].add(str(val))
                    
        print("=== Submitted Answers Analysis ===")
        for fid, vals in field_values.items():
            print(f"Field ID: {fid}")
            print(f"  Sample Values: {list(vals)[:10]}")
            print(f"  Total distinct answers: {len(vals)}")
            print("-" * 40)
            
        # Write full decoded registrations list to a file for backup
        backup_path = "scratch/event_19_registrations.json"
        with open(backup_path, "w") as f:
            json.dump(registrations_decoded, f, default=str, indent=2)
        print(f"\nSaved all decrypted registrations to: {backup_path}")
        
        cur.close()
        conn.close()
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    decode_data()
