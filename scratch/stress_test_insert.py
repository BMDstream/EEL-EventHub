import os
import random
import uuid
import time
from sqlmodel import Session, select, create_engine
from backend.models import Event, Attendee, Registration

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    from dotenv import load_dotenv
    load_dotenv()
    DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL, connect_args={"sslmode": "require"})

def test_insert():
    with Session(engine) as session:
        # Get one event
        event = session.exec(select(Event)).first()
        if not event:
            print("No events found in database to test.")
            return
        
        print(f"Testing insert for event: {event.title} (ID: {event.id})")
        
        t0 = time.time()
        
        # Create 10 test attendees
        attendees = []
        for i in range(10):
            email = f"test_stress_{event.id}_{i}_{int(time.time())}@example.com"
            attendees.append(
                Attendee(
                    email=email,
                    first_name=f"TestFirst{i}",
                    last_name=f"TestLast{i}",
                    company="Stress Test Co"
                )
            )
        
        session.add_all(attendees)
        session.flush() # Populate IDs
        
        registrations = []
        for attendee in attendees:
            registrations.append(
                Registration(
                    id=uuid.uuid4(),
                    pin=str(random.randint(1000, 9999)),
                    event_id=event.id,
                    attendee_id=attendee.id,
                    status="confirmed",
                    checked_in=False
                )
            )
        
        session.add_all(registrations)
        session.commit()
        
        print(f"Successfully inserted 10 attendees and registrations in {time.time() - t0:.2f} seconds.")

if __name__ == "__main__":
    test_insert()
