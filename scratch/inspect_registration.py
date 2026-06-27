import os
from sqlmodel import Session, select, create_engine
from backend.models import Registration, Event, Attendee

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    from dotenv import load_dotenv
    load_dotenv()
    DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL, connect_args={"sslmode": "require"})

with Session(engine) as session:
    for pin in ["8567", "6765"]:
        print(f"\n=== INSPECTING PIN: {pin} ===")
        regs = session.exec(select(Registration).where(Registration.pin == pin)).all()
        print(f"Found {len(regs)} registrations:")
        for r in regs:
            event = session.get(Event, r.event_id)
            attendee = session.get(Attendee, r.attendee_id)
            print(f"  Reg ID: {r.id} | Status: {r.status} | Checked In: {r.checked_in} | Event: {event.title if event else 'None'} (ID: {r.event_id}) | Attendee: {attendee.first_name} {attendee.last_name if attendee else 'None'}")
