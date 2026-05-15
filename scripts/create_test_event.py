from backend.database import engine
from backend.models import Event
from sqlmodel import Session
from datetime import datetime

with Session(engine) as session:
    event = Event(
        slug='stress-test-final', 
        title='Stress Test Final', 
        description='Test', 
        start_date=datetime.now(), 
        location='Local', 
        capacity=10000
    )
    session.add(event)
    session.commit()
    print(f"Created event with ID: {event.id}")
