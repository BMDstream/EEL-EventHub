import os
import random
import uuid
import time
from datetime import datetime
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

def test_fast_insert():
    with Session(engine) as session:
        event = session.exec(select(Event)).first()
        if not event:
            print("No events found to test.")
            return
        
        print(f"Testing fast insert of 10 registrants for event: {event.title} (ID: {event.id})")
        t0 = time.time()
        
        # Prepare 10 attendees
        timestamp = int(time.time())
        attendees = []
        for i in range(10):
            attendees.append({
                "email": f"fast_stress_{event.id}_{i}_{timestamp}@example.com",
                "first_name": f"FastFirst{i}",
                "last_name": f"FastLast{i}",
                "company": "Fast Stress Corp"
            })
            
        # Bulk insert attendees and get IDs
        attendee_ids = bulk_insert_attendees(session, attendees)
        
        # Prepare registrations
        registrations = []
        for i, attendee_id in enumerate(attendee_ids):
            registrations.append({
                "id": uuid.uuid4(),
                "pin": str(random.randint(1000, 9999)),
                "event_id": event.id,
                "attendee_id": attendee_id,
                "status": "confirmed",
                "checked_in": False,
                "created_at": datetime.utcnow(),
                "custom_answers": {}
            })
            
        # Bulk insert registrations
        bulk_insert_registrations(session, registrations)
        
        session.commit()
        print(f"Successfully inserted 1000 records in {time.time() - t0:.2f} seconds!")

if __name__ == "__main__":
    test_fast_insert()
