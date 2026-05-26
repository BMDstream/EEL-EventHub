import os
from sqlmodel import Session, select, create_engine
from backend.models import Event

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    from dotenv import load_dotenv
    load_dotenv()
    DATABASE_URL = os.getenv("DATABASE_URL")

print("DATABASE_URL:", DATABASE_URL)
engine = create_engine(DATABASE_URL, connect_args={"sslmode": "require"})

with Session(engine) as session:
    events = session.exec(select(Event)).all()
    print(f"Found {len(events)} events:")
    for event in events:
        print(f"ID: {event.id} | Slug: {event.slug} | Title: {event.title} | Client ID: {event.client_id}")
