import os
from dotenv import load_dotenv
from sqlmodel import create_engine, Session, select
from backend.models import Event

load_dotenv()

db_url = os.getenv("DATABASE_URL")
print("Database URL loaded:", bool(db_url))

# Add connection timeout of 3 seconds so it doesn't hang
engine = create_engine(
    db_url, 
    connect_args={"connect_timeout": 3, "sslmode": "require"}
)

try:
    with Session(engine) as session:
        print("Querying events...")
        events = session.exec(select(Event)).all()
        print("Found events:")
        for event in events:
            print(f"ID: {event.id} | Slug: {event.slug} | Title: {repr(event.title)}")
except Exception as e:
    print("Database Query Error:", e)
