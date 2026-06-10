from sqlmodel import Session, select
from backend.database import engine
from backend.models import Event

def check_event():
    with Session(engine) as session:
        event = session.get(Event, 19)
        if event:
            print(f"Event ID: {event.id}")
            print(f"Title: {event.title}")
            print(f"Sender Email: {getattr(event, 'sender_email', 'not_found')}")
            print(f"Banner Settings: {event.banner_settings}")
            print(f"Client ID: {event.client_id}")
            if event.client:
                print(f"Client Name: {event.client.name}")
        else:
            print("Event 19 not found.")

if __name__ == "__main__":
    check_event()
