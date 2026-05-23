from fastapi import FastAPI, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List, Dict, Any
from backend.database import get_session, init_db, engine
from backend.models import Event, Attendee, Registration, User
from backend.email_service import send_confirmation_email, send_broadcast_email
from backend.routers import auth
import uvicorn

app = FastAPI(docs_url="/api/py/docs", openapi_url="/api/py/openapi.json")
app.include_router(auth.router, prefix="/api/py/auth", tags=["auth"])

@app.on_event("startup")
def on_startup():
    # In a real production app, migrations are better
    # but for initialization, this works
    try:
        init_db()
        # Add columns if they don't exist (lightweight migrations)
        from sqlalchemy import text
        with Session(engine) as session:
            # Drop unique constraint AND unique index on attendee email if they exist
            try:
                print("Attempting to drop unique constraints on attendee email...")
                session.execute(text("ALTER TABLE attendee DROP CONSTRAINT IF EXISTS attendee_email_key"))
                session.execute(text("DROP INDEX IF EXISTS ix_attendee_email"))
                session.commit()
                print("Constraints/Indexes dropped successfully.")
            except Exception as e:
                session.rollback()
                print(f"Non-critical error dropping constraints: {e}")

            # Initialize default email settings if not present
            from backend.models import SystemSetting
            default_email = session.exec(select(SystemSetting).where(SystemSetting.key == "email_config")).first()
            if not default_email:
                config = {
                    "primary_color": "#0f172a",
                    "accent_color": "#94a3b8",
                    "heading_text": "Access Granted.",
                    "body_text": "Your orchestration for **{event_title}** has been authorized. Below are your secure credentials for terminal verification.",
                    "footer_text": "Automated Event Management System\nSecurity Tier: Level 4 Authorized"
                }
                session.add(SystemSetting(key="email_config", value=config))
                session.commit()

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
    return {"status": "ok", "version": "1.3-robust"}

@app.get("/api/py/settings/{key}")
def get_setting(key: str, session: Session = Depends(get_session)):
    from backend.models import SystemSetting
    setting = session.exec(select(SystemSetting).where(SystemSetting.key == key)).first()
    if not setting:
        return {"key": key, "value": {}}
    return setting

@app.put("/api/py/settings/{key}")
def update_setting(key: str, data: Dict[str, Any], session: Session = Depends(get_session)):
    from backend.models import SystemSetting
    setting = session.exec(select(SystemSetting).where(SystemSetting.key == key)).first()
    if not setting:
        setting = SystemSetting(key=key, value=data)
    else:
        setting.value = data
    session.add(setting)
    session.commit()
    session.refresh(setting)
    return setting

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
            "custom_answers": reg.custom_answers,
            "attendee": att
        } for reg, att in registrations
    ]

@app.post("/api/py/register")
def register_attendee(
    data: Dict[str, Any],
    session: Session = Depends(get_session)
):
    from sqlalchemy import func
    from backend.models import SystemSetting
    event_id = data.get("event_id")
    # Standardize email: lowercase and strip whitespace
    raw_email = data.get("email", "")
    email = raw_email.strip().lower()
    
    first_name = data.get("first_name", "").strip()
    last_name = data.get("last_name", "").strip()
    company = data.get("company", "").strip()
    custom_answers = data.get("custom_answers", {})
    is_attending = data.get("is_attending", True)
    status = "confirmed" if is_attending else "declined"

    # 1. Handle Attendee Record (Match by Email AND Name now)
    try:
        attendee = session.exec(
            select(Attendee)
            .where(func.lower(Attendee.email) == email)
            .where(func.lower(Attendee.first_name) == first_name.lower())
            .where(func.lower(Attendee.last_name) == last_name.lower())
        ).first()
    except Exception as e:
        print(f"Error looking up attendee: {e}")
        raise HTTPException(status_code=500, detail=f"Lookup error: {e}")
    
    message = "Your registration has been confirmed."
    
    try:
        if not attendee:
            print(f"Creating new record for {first_name} {last_name} ({email})")
            attendee = Attendee(
                email=email, 
                first_name=first_name, 
                last_name=last_name, 
                company=company
            )
            session.add(attendee)
            session.commit()
            session.refresh(attendee)
        else:
            print(f"Found exact match for {first_name} {last_name} ({email}) - updating profile.")
            message = "We've identified your existing profile. Your information has been synchronized."
            attendee.company = company
            session.add(attendee)
            session.commit()
            session.refresh(attendee)
    except Exception as e:
        session.rollback()
        print(f"Error saving attendee record: {e}")
        raise HTTPException(status_code=500, detail=f"Database error during attendee sync: {e}")
    
    # 2. Handle Registration
    try:
        registration = session.exec(
            select(Registration)
            .where(Registration.event_id == event_id)
            .where(Registration.attendee_id == attendee.id)
        ).first()
        
        if registration:
            # Existing registration for this specific attendee
            print(f"Updating existing registration {registration.id} for attendee {attendee.id}")
            message = "Duplicate detected: You are already registered for this event. Your record has been updated."
            registration.custom_answers = custom_answers
            registration.status = status
            if status == "declined":
                registration.checked_in = False
            session.add(registration)
            session.commit()
            session.refresh(registration)
        else:
            # New registration for this event
            import random
            pin = str(random.randint(1000, 9999))
            
            registration = Registration(
                event_id=event_id, 
                attendee_id=attendee.id, 
                custom_answers=custom_answers,
                pin=pin,
                status=status
            )
            session.add(registration)
            session.commit()
            session.refresh(registration)
    except Exception as e:
        session.rollback()
        print(f"Error saving registration record: {e}")
        raise HTTPException(status_code=500, detail=f"Database error during registration: {e}")

    # 3. Send confirmation email (ONLY if attending)
    if is_attending:
        try:
            event = session.get(Event, event_id)
            if event:
                # Get email config
                email_setting = session.exec(select(SystemSetting).where(SystemSetting.key == "email_config")).first()
                config = email_setting.value if email_setting else {}
                
                send_confirmation_email(
                    to_email=attendee.email,
                    first_name=attendee.first_name,
                    event_title=event.title,
                    clearance_id=registration.pin,
                    event_details={
                        "start_date": event.start_date,
                        "location": event.location
                    },
                    config=config
                )
        except Exception as e:
            print(f"Error triggering confirmation email: {e}")

    return {
        "id": str(registration.id),
        "pin": registration.pin,
        "message": message,
        "version": "1.3-multi-identity"
    }

@app.post("/api/py/events/{event_id}/test-email")
def test_email(event_id: str, data: dict, session: Session = Depends(get_session)):
    email = data.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email required")
    
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    try:
        from backend.email_service import send_confirmation_email
        res = send_confirmation_email(
            to_email=email,
            first_name="Test",
            event_title=event.title,
            clearance_id="1234",
            event_details={
                "start_date": event.start_date,
                "location": event.location
            }
        )
        return {"ok": True, "resend_id": res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
def toggle_checkin(registration_id: str, mode: str = "toggle", session: Session = Depends(get_session)):
    # Try looking up by UUID first
    registration = None
    try:
        from uuid import UUID
        val = UUID(registration_id, version=4)
        registration = session.get(Registration, val)
    except (ValueError, AttributeError):
        pass
    
    if not registration:
        registration = session.exec(
            select(Registration).where(Registration.pin == registration_id)
        ).first()
        
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
        
    if registration.status == "declined":
        raise HTTPException(status_code=400, detail="Declined registrations cannot be checked in")
        
    if mode == "checkin" and registration.checked_in:
        raise HTTPException(status_code=400, detail="Attendee already checked in")
        
    if mode == "checkin":
        registration.checked_in = True
    else:
        # Default is toggle for manual admin control
        registration.checked_in = not registration.checked_in
        
    session.add(registration)
    session.commit()
    session.refresh(registration)
    return registration

@app.post("/api/py/events/{event_id}/checkin-by-pin")
def checkin_by_pin(event_id: int, data: Dict[str, str], session: Session = Depends(get_session)):
    pin = data.get("pin")
    if not pin:
        raise HTTPException(status_code=400, detail="PIN is required")
    
    registration = session.exec(
        select(Registration)
        .where(Registration.event_id == event_id)
        .where(Registration.pin == pin)
    ).first()
    
    if not registration:
        raise HTTPException(status_code=404, detail="Invalid PIN or no registration found for this event")
    
    if registration.status == "declined":
        raise HTTPException(status_code=400, detail="This registration was declined and cannot be used for check-in")
        
    if registration.checked_in:
        raise HTTPException(status_code=400, detail="Attendee already checked in")
        
    registration.checked_in = True
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
    signature = data.get("signature", "")
    
    # Get all registrant emails
    registrations = session.exec(
        select(Registration, Attendee)
        .join(Attendee)
        .where(Registration.event_id == event_id)
        .where(Registration.status == "confirmed")
    ).all()
    
    emails = [att.email for reg, att in registrations]
    
    # Get email config
    from backend.models import SystemSetting
    email_setting = session.exec(select(SystemSetting).where(SystemSetting.key == "email_config")).first()
    config = email_setting.value if email_setting else {}
    
    success = send_broadcast_email(emails, subject, body, event.title, signature, config)
    
    return {"ok": success, "sent": len(emails)}

@app.get("/api/py/events/{slug}/public-stats")
def get_public_stats(slug: str, session: Session = Depends(get_session)):
    event = session.exec(select(Event).where(Event.slug == slug)).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    registrations = session.exec(select(Registration).where(Registration.event_id == event.id)).all()
    
    rsvp_count = len([r for r in registrations if r.status == "confirmed"])
    declined_count = len([r for r in registrations if r.status == "declined"])
    checked_in_count = len([r for r in registrations if r.checked_in])
    
    return {
        "title": event.title,
        "rsvp": rsvp_count,
        "declined": declined_count,
        "checked_in": checked_in_count,
        "total": len(registrations)
    }

@app.get("/api/py/stats")
def get_stats(session: Session = Depends(get_session)):
    events_count = len(session.exec(select(Event)).all())
    registrations_count = len(session.exec(select(Registration).where(Registration.status == "confirmed")).all())
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
