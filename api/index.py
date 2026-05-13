from fastapi import FastAPI, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List, Dict, Any
from backend.database import get_session, init_db, engine
from backend.models import Event, Attendee, Registration, User
from backend.email_service import send_confirmation_email, send_broadcast_email
import uvicorn

app = FastAPI(docs_url="/api/py/docs", openapi_url="/api/py/openapi.json")

@app.on_event("startup")
def on_startup():
    # In a real production app, migrations are better
    # but for initialization, this works
    try:
        init_db()
        # Add columns if they don't exist (lightweight migrations)
        from sqlalchemy import text
        with Session(engine) as session:
            # For User table
            try:
                session.execute(text("ALTER TABLE \"user\" ADD COLUMN password VARCHAR"))
                session.commit()
            except Exception:
                session.rollback()
            
            # For Event table
            try:
                session.execute(text("ALTER TABLE \"event\" ADD COLUMN custom_fields_schema JSON"))
                session.commit()
            except Exception:
                session.rollback()
            
            try:
                session.execute(text("ALTER TABLE \"event\" ADD COLUMN banner_url VARCHAR"))
                session.commit()
            except Exception:
                session.rollback()

            # For Registration table
            try:
                session.execute(text("ALTER TABLE \"registration\" ADD COLUMN custom_answers JSON"))
                session.commit()
            except Exception:
                session.rollback()
                
            try:
                session.execute(text("ALTER TABLE \"registration\" ADD COLUMN pin VARCHAR"))
                session.commit()
            except Exception:
                session.rollback()
    except Exception as e:
        print(f"Database initialization failed: {e}")

@app.get("/api/py/healthcheck")
def healthcheck():
    return {"status": "ok"}

@app.get("/api/py/events", response_model=List[Event])
def read_events(session: Session = Depends(get_session)):
    events = session.exec(select(Event)).all()
    return events

@app.post("/api/py/events", response_model=Event)
def create_event(event: Event, session: Session = Depends(get_session)):
    session.add(event)
    session.commit()
    session.refresh(event)
    return event

@app.get("/api/py/events/{slug}", response_model=Event)
def read_event(slug: str, session: Session = Depends(get_session)):
    event = session.exec(select(Event).where(Event.slug == slug)).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

@app.get("/api/py/events/id/{event_id}", response_model=Event)
def read_event_by_id(event_id: int, session: Session = Depends(get_session)):
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

@app.put("/api/py/events/{event_id}", response_model=Event)
def update_event(event_id: int, event_data: Event, session: Session = Depends(get_session)):
    db_event = session.get(Event, event_id)
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    event_dict = event_data.dict(exclude_unset=True)
    for key, value in event_dict.items():
        setattr(db_event, key, value)
    
    session.add(db_event)
    session.commit()
    session.refresh(db_event)
    return db_event

@app.delete("/api/py/events/{event_id}")
def delete_event(event_id: int, session: Session = Depends(get_session)):
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    session.delete(event)
    session.commit()
    return {"ok": True}

@app.get("/api/py/events/{event_id}/registrations")
def get_event_registrations(event_id: int, session: Session = Depends(get_session)):
    # This join will give us the registrations with attendee info
    registrations = session.exec(
        select(Registration, Attendee)
        .join(Attendee)
        .where(Registration.event_id == event_id)
    ).all()
    
    # Format the response
    return [
        {
            "id": reg.id,
            "status": reg.status,
            "checked_in": reg.checked_in,
            "created_at": reg.created_at,
            "attendee": att
        } for reg, att in registrations
    ]

@app.post("/api/py/register", response_model=Registration)
def register_attendee(
    data: Dict[str, Any],
    session: Session = Depends(get_session)
):
    event_id = data.get("event_id")
    email = data.get("email")
    first_name = data.get("first_name")
    last_name = data.get("last_name")
    company = data.get("company")
    custom_answers = data.get("custom_answers", {})
    # Check if attendee exists
    attendee = session.exec(select(Attendee).where(Attendee.email == email)).first()
    if not attendee:
        attendee = Attendee(
            email=email, 
            first_name=first_name, 
            last_name=last_name, 
            company=company
        )
        session.add(attendee)
        session.commit()
        session.refresh(attendee)
    
    # Check if already registered
    existing_reg = session.exec(
        select(Registration)
        .where(Registration.event_id == event_id)
        .where(Registration.attendee_id == attendee.id)
    ).first()
    
    if existing_reg:
        return existing_reg
    
    # Generate a random 4-digit PIN for clearance_id
    import random
    pin = str(random.randint(1000, 9999))
    
    # Create registration
    try:
        registration = Registration(
            event_id=event_id, 
            attendee_id=attendee.id, 
            custom_answers=custom_answers,
            pin=pin
        )
        session.add(registration)
        session.commit()
        session.refresh(registration)
        print(f"Successfully created registration {registration.id} with PIN {pin}")
    except Exception as e:
        session.rollback()
        print(f"FAILED to create registration: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    # Send confirmation email
    try:
        event = session.get(Event, event_id)
        if event:
            print(f"Attempting to send email to {attendee.email} for PIN {pin}")
            send_confirmation_email(
                to_email=attendee.email,
                first_name=attendee.first_name,
                event_title=event.title,
                clearance_id=pin
            )
            print(f"Email dispatch triggered successfully")
    except Exception as e:
        # Don't fail the registration if only the email fails
        print(f"Error triggering confirmation email: {e}")

    return registration

@app.delete("/api/py/registrations/{registration_id}")
def delete_registration(registration_id: str, session: Session = Depends(get_session)):
    registration = session.get(Registration, registration_id)
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    session.delete(registration)
    session.commit()
    return {"ok": True}

@app.get("/api/py/users", response_model=List[User])
def read_users(session: Session = Depends(get_session)):
    users = session.exec(select(User)).all()
    return users

@app.post("/api/py/users", response_model=User)
def create_user(user: User, session: Session = Depends(get_session)):
    existing = session.exec(select(User).where(User.email == user.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

@app.get("/api/py/users/me", response_model=User)
def get_current_user(email: str, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == email)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.put("/api/py/users/{user_id}", response_model=User)
def update_user(user_id: int, user_data: User, session: Session = Depends(get_session)):
    db_user = session.get(User, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_dict = user_data.dict(exclude_unset=True)
    for key, value in user_dict.items():
        setattr(db_user, key, value)
    
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user

@app.delete("/api/py/users/{user_id}")
def delete_user(user_id: int, session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    session.delete(user)
    session.commit()
    return {"ok": True}

@app.put("/api/py/registrations/{registration_id}/checkin", response_model=Registration)
def toggle_checkin(registration_id: str, session: Session = Depends(get_session)):
    registration = session.get(Registration, registration_id)
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    registration.checked_in = not registration.checked_in
    session.add(registration)
    session.commit()
    session.refresh(registration)
    return registration

@app.post("/api/py/events/{event_id}/broadcast")
def broadcast_to_attendees(
    event_id: int,
    data: Dict[str, str],
    session: Session = Depends(get_session)
):
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    subject = data.get("subject", f"Reminder: {event.title}")
    body = data.get("body", "")
    
    # Get all registrant emails
    registrations = session.exec(
        select(Registration, Attendee)
        .join(Attendee)
        .where(Registration.event_id == event_id)
    ).all()
    
    emails = [att.email for reg, att in registrations]
    
    if not emails:
        return {"ok": True, "sent": 0}
    
    success = send_broadcast_email(emails, subject, body, event.title)
    
    return {"ok": success, "sent": len(emails)}

@app.get("/api/py/stats")
def get_stats(session: Session = Depends(get_session)):
    events_count = len(session.exec(select(Event)).all())
    registrations_count = len(session.exec(select(Registration)).all())
    checked_in_count = len(session.exec(select(Registration).where(Registration.checked_in == True)).all())
    
    check_in_rate = 0
    if registrations_count > 0:
        check_in_rate = round((checked_in_count / registrations_count) * 100, 1)
        
    return {
        "events": events_count,
        "registrations": registrations_count,
        "check_in_rate": f"{check_in_rate}%",
        "revenue": "R0.00" # Placeholder for now as no payment integration exists
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
