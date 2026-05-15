from sqlmodel import Session, select
from backend.database import engine
from backend.models import Attendee

def check_attendees():
    with Session(engine) as session:
        attendees = session.exec(select(Attendee)).all()
        for a in attendees:
            print(f"ID: {a.id}, Name: {a.first_name} {a.last_name}, Email: {a.email}")

if __name__ == "__main__":
    check_attendees()
