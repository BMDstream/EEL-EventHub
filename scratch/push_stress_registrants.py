import os
import random
import uuid
import time
from datetime import datetime, timezone
from json import dumps
from sqlalchemy import text
from sqlmodel import Session, select, create_engine
from backend.models import Event

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    from dotenv import load_dotenv
    load_dotenv()
    DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL, connect_args={"sslmode": "require"})

def bulk_insert_attendees(session, attendees_list):
    params = {}
    values_clauses = []
    for idx, att in enumerate(attendees_list):
        values_clauses.append(f"(:email_{idx}, :first_name_{idx}, :last_name_{idx}, :company_{idx})")
        params[f"email_{idx}"] = att["email"]
        params[f"first_name_{idx}"] = att["first_name"]
        params[f"last_name_{idx}"] = att["last_name"]
        params[f"company_{idx}"] = att["company"]
        
    query_str = f"INSERT INTO attendee (email, first_name, last_name, company) VALUES {', '.join(values_clauses)} RETURNING id"
    result = session.execute(text(query_str), params)
    ids = [row[0] for row in result.fetchall()]
    return ids

def bulk_insert_registrations(session, registrations_list):
    params = {}
    values_clauses = []
    for idx, reg in enumerate(registrations_list):
        values_clauses.append(
            f"(:id_{idx}, :pin_{idx}, :event_id_{idx}, :attendee_id_{idx}, :status_{idx}, :checked_in_{idx}, :created_at_{idx}, CAST(:custom_answers_{idx} AS json))"
        )
        params[f"id_{idx}"] = str(reg["id"])
        params[f"pin_{idx}"] = reg["pin"]
        params[f"event_id_{idx}"] = reg["event_id"]
        params[f"attendee_id_{idx}"] = reg["attendee_id"]
        params[f"status_{idx}"] = reg["status"]
        params[f"checked_in_{idx}"] = reg["checked_in"]
        params[f"created_at_{idx}"] = reg["created_at"]
        params[f"custom_answers_{idx}"] = dumps(reg["custom_answers"])
        
    query_str = f'INSERT INTO "registration" (id, pin, event_id, attendee_id, status, checked_in, created_at, custom_answers) VALUES {", ".join(values_clauses)}'
    session.execute(text(query_str), params)

def main():
    t_start = time.time()
    
    with Session(engine) as session:
        # Fetch all events
        events = session.exec(select(Event)).all()
        if not events:
            print("No events found in the database. Cannot push registrants.")
            return
        
        print(f"Starting stress test setup for {len(events)} events.")
        total_registrants_added = 0
        
        for event in events:
            # Generate count between 1300 and 1500 for variety
            count = random.randint(1300, 1500)
            print(f"Generating {count} registrants for event '{event.title}' (ID: {event.id})...")
            
            timestamp = int(time.time())
            attendees = []
            for i in range(count):
                attendees.append({
                    "email": f"stress_{event.id}_{i}_{timestamp}@stress.bmdcomputing.com",
                    "first_name": f"StressFirst{i}",
                    "last_name": f"StressLast{i}",
                    "company": f"Stress Corp Tier {1 + (i % 3)}"
                })
            
            # 1. Bulk insert attendees and get their IDs
            t0 = time.time()
            attendee_ids = bulk_insert_attendees(session, attendees)
            t_att = time.time() - t0
            
            # 2. Prepare registrations
            registrations = []
            for i, attendee_id in enumerate(attendee_ids):
                registrations.append({
                    "id": uuid.uuid4(),
                    "pin": str(random.randint(1000, 9999)),
                    "event_id": event.id,
                    "attendee_id": attendee_id,
                    "status": "confirmed",
                    "checked_in": False,
                    "created_at": datetime.now(timezone.utc),
                    "custom_answers": {}
                })
                
            # 3. Bulk insert registrations
            t0 = time.time()
            bulk_insert_registrations(session, registrations)
            t_reg = time.time() - t0
            
            total_registrants_added += count
            print(f"  -> Added {count} registrants (Attendees: {t_att:.2f}s, Registrations: {t_reg:.2f}s)")
            
        # Commit the transaction
        print("Committing transaction to database...")
        t0 = time.time()
        session.commit()
        print(f"Transaction committed successfully in {time.time() - t0:.2f}s.")
        
        print(f"\nCompleted! Successfully added a total of {total_registrants_added} registrants across {len(events)} events.")
        print(f"Total time elapsed: {time.time() - t_start:.2f} seconds.")

if __name__ == "__main__":
    main()
