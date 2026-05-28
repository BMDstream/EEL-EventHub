from sqlmodel import Session, select
from backend.database import engine
from backend.models import Registration, Event, Attendee

def check_registrations():
    with Session(engine) as session:
        registrations = session.exec(select(Registration)).all()
        print(f"Total registrations: {len(registrations)}")
        for r in registrations:
            attendee = r.attendee
            event = r.event
            print(f"Reg ID: {r.id}")
            print(f"  Attendee: {attendee.first_name} {attendee.last_name} ({attendee.email})")
            print(f"  Event: {event.title} (ID: {event.id}, Start: {event.start_date}, Duration: {event.duration_days})")
            print(f"  Checked In: {r.checked_in}, Days: {r.checked_in_days}")

if __name__ == "__main__":
    check_registrations()
