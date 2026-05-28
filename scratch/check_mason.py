from sqlmodel import Session, select
from backend.database import engine
from backend.models import Registration, Attendee

def check_mason():
    with Session(engine) as session:
        attendees = session.exec(select(Attendee).where(Attendee.email.like("%bartondelaney%"))).all()
        print(f"Matching attendees: {len(attendees)}")
        for att in attendees:
            print(f"Attendee ID: {att.id}, Name: {att.first_name} {att.last_name}, Email: {att.email}")
            regs = session.exec(select(Registration).where(Registration.attendee_id == att.id)).all()
            for r in regs:
                print(f"  Reg ID: {r.id}, Event ID: {r.event_id}, Checked In: {r.checked_in}, Days: {r.checked_in_days}, PIN: {r.pin}")

if __name__ == "__main__":
    check_mason()
