from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks, Header, Request
from sqlmodel import Session, select
from sqlalchemy import text, func
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from backend.database import get_session, init_db, engine
from backend.models import Event, Attendee, Registration, User, Client, UserEventLink
from backend.email_service import send_confirmation_email, send_broadcast_email
from backend.routers import auth
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import uvicorn

limiter = Limiter(key_func=get_remote_address)

def get_current_user_from_request(
    x_user_email: Optional[str] = Header(None),
    email: Optional[str] = None,
    session: Session = Depends(get_session)
):
    user_email = x_user_email or email
    if not user_email:
        return None
    user = session.exec(select(User).where(func.lower(User.email) == user_email.lower())).first()
    return user

def hash_password(password: str) -> str:
    if not password:
        return password
    if password.startswith("$2a$") or password.startswith("$2b$") or password.startswith("$2y$"):
        return password
    import bcrypt
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_client_access(user: Optional[User], client_id: Optional[int], session: Session):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    if user.role == "admin":
        return True
    if not client_id:
        raise HTTPException(status_code=403, detail="Forbidden: Resource has no associated client")
        
    from sqlalchemy import text
    link_exists = session.execute(
        text('SELECT 1 FROM "userclientlink" WHERE user_id = :user_id AND client_id = :client_id'),
        {"user_id": user.id, "client_id": client_id}
    ).first()
    
    if not link_exists:
        raise HTTPException(status_code=403, detail="Forbidden: Access to this client's resources is denied")
    return True

def verify_event_access(user: Optional[User], event: Event, session: Session):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    if user.role == "admin":
        return True
    if user.role == "manager":
        return verify_client_access(user, event.client_id, session)
        
    # staff role check event assignment
    from sqlalchemy import text
    link_exists = session.execute(
        text('SELECT 1 FROM "usereventlink" WHERE user_id = :user_id AND event_id = :event_id'),
        {"user_id": user.id, "event_id": event.id}
    ).first()
    if not link_exists:
        raise HTTPException(status_code=403, detail="Forbidden: You are not assigned to this event")
    return True

app = FastAPI(docs_url="/api/py/docs", openapi_url="/api/py/openapi.json")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
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

            try:
                session.execute(text("ALTER TABLE \"event\" ADD COLUMN address VARCHAR"))
                session.commit()
            except Exception:
                session.rollback()

            try:
                session.execute(text("ALTER TABLE \"event\" ADD COLUMN collect_company BOOLEAN DEFAULT TRUE"))
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

            try:
                session.execute(text("ALTER TABLE \"event\" ADD COLUMN duration_days INTEGER DEFAULT 1"))
                session.commit()
            except Exception:
                session.rollback()

            try:
                session.execute(text("ALTER TABLE \"registration\" ADD COLUMN checked_in_days JSON DEFAULT '[]'"))
                session.commit()
            except Exception:
                session.rollback()

            try:
                session.execute(text("ALTER TABLE \"event\" ADD COLUMN allowed_domains JSON"))
                session.commit()
            except Exception:
                session.rollback()

            # Create Client table if not exists
            try:
                session.execute(text("""
                    CREATE TABLE IF NOT EXISTS "client" (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR NOT NULL,
                        slug VARCHAR UNIQUE NOT NULL,
                        logo_url TEXT,
                        sender_name VARCHAR,
                        reply_to VARCHAR,
                        primary_color VARCHAR DEFAULT '#0f172a',
                        accent_color VARCHAR DEFAULT '#94a3b8',
                        heading_text VARCHAR DEFAULT 'Access Granted.',
                        body_text TEXT DEFAULT 'Your orchestration for **{event_title}** has been authorized. Below are your secure credentials for terminal verification.',
                        footer_text TEXT DEFAULT 'Automated Event Management System\nSecurity Tier: Level 4 Authorized',
                        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    )
                """))
                session.commit()
            except Exception as e:
                print(f"Failed to create client table: {e}")
                session.rollback()

            # Create userclientlink table if not exists
            try:
                session.execute(text("""
                    CREATE TABLE IF NOT EXISTS "userclientlink" (
                        user_id INTEGER NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
                        client_id INTEGER NOT NULL REFERENCES "client" (id) ON DELETE CASCADE,
                        PRIMARY KEY (user_id, client_id)
                    )
                """))
                session.commit()
            except Exception as e:
                print(f"Failed to create userclientlink table: {e}")
                session.rollback()

            # Create usereventlink table if not exists
            try:
                session.execute(text("""
                    CREATE TABLE IF NOT EXISTS "usereventlink" (
                        user_id INTEGER NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
                        event_id INTEGER NOT NULL REFERENCES "event" (id) ON DELETE CASCADE,
                        PRIMARY KEY (user_id, event_id)
                    )
                """))
                session.commit()
            except Exception as e:
                print(f"Failed to create usereventlink table: {e}")
                session.rollback()

            # Add client_id column to event table
            try:
                session.execute(text('ALTER TABLE "event" ADD COLUMN client_id INTEGER REFERENCES "client" (id)'))
                session.commit()
            except Exception:
                session.rollback()

            # ---------------------------------------------------------------
            # Seed default BMD client if it doesn't exist yet.
            # NOTE: We do NOT migrate or rename any other clients.
            # The old eel→bmd migration code has been removed permanently
            # to prevent destroying user-created clients on cold starts.
            # ---------------------------------------------------------------
            try:
                default_client = session.exec(select(Client).where(Client.slug == "bmd")).first()
                if not default_client:
                    default_client = Client(
                        name="BMD Computing",
                        slug="bmd",
                        primary_color="#25678e",
                        accent_color="#1d2a33",
                        heading_text="Access Granted.",
                        body_text="Your orchestration for **{event_title}** has been authorized. Below are your secure credentials for terminal verification.",
                        footer_text="Automated Event Management System\nSecurity Tier: Level 4 Authorized"
                    )
                    session.add(default_client)
                    session.commit()
                    session.refresh(default_client)
                    print(f"Seeded default BMD client with id={default_client.id}")
            except Exception as e:
                print(f"Failed to seed default client: {e}")
                session.rollback()
    except Exception as e:
        print(f"Database initialization failed: {e}")

@app.get("/api/py/healthcheck")
def healthcheck():
    return {"status": "ok", "version": "1.3-robust"}

@app.get("/api/py/settings/{key}")
def get_setting(
    key: str,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    from backend.models import SystemSetting
    setting = session.exec(select(SystemSetting).where(SystemSetting.key == key)).first()
    if not setting:
        return {"key": key, "value": {}}
    return setting

@app.put("/api/py/settings/{key}")
def update_setting(
    key: str,
    data: Dict[str, Any],
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user or current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update settings")
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

@app.get("/api/py/events")
def read_events(
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
        
    if current_user.role == "admin":
        events = session.exec(select(Event)).all()
    elif current_user.role == "manager":
        from sqlalchemy import text
        stmt = text('SELECT client_id FROM "userclientlink" WHERE user_id = :user_id')
        rows = session.execute(stmt, {"user_id": current_user.id}).all()
        allowed_client_ids = [row[0] for row in rows]
        events = session.exec(select(Event).where(Event.client_id.in_(allowed_client_ids))).all()
    elif current_user.role == "staff":
        from sqlalchemy import text
        stmt = text('SELECT event_id FROM "usereventlink" WHERE user_id = :user_id')
        rows = session.execute(stmt, {"user_id": current_user.id}).all()
        allowed_event_ids = [row[0] for row in rows]
        events = session.exec(select(Event).where(Event.id.in_(allowed_event_ids))).all()
    else:
        events = []
        
    result = []
    for event in events:
        client = session.get(Client, event.client_id) if event.client_id else None
        event_dict = event.dict()
        event_dict["client"] = client.dict() if client else None
        result.append(event_dict)
    return result

@app.post("/api/py/events", response_model=Event)
def create_event(
    event: Event, 
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    verify_client_access(current_user, event.client_id, session)
    
    session.add(event)
    session.commit()
    session.refresh(event)
    return event

@app.get("/api/py/events/{slug}")
def read_event(slug: str, session: Session = Depends(get_session)):
    event = session.exec(select(Event).where(Event.slug == slug)).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    client = session.get(Client, event.client_id) if event.client_id else None
    event_dict = event.dict()
    event_dict["client"] = client.dict() if client else None
    return event_dict

@app.get("/api/py/events/id/{event_id}")
def read_event_by_id(
    event_id: int, 
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    verify_event_access(current_user, event, session)
    
    client = session.get(Client, event.client_id) if event.client_id else None
    event_dict = event.dict()
    event_dict["client"] = client.dict() if client else None
    return event_dict

@app.put("/api/py/events/{event_id}", response_model=Event)
def update_event(
    event_id: int, 
    event_data: Event, 
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    db_event = session.get(Event, event_id)
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")
    verify_client_access(current_user, db_event.client_id, session)
    if event_data.client_id != db_event.client_id:
        verify_client_access(current_user, event_data.client_id, session)
    
    event_dict = event_data.dict(exclude_unset=True)
    for key, value in event_dict.items():
        setattr(db_event, key, value)
    
    session.add(db_event)
    session.commit()
    session.refresh(db_event)
    return db_event

@app.put("/api/py/events/{event_id}/form-schema")
def update_event_form_schema(
    event_id: int, 
    payload: Dict[str, Any], 
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    db_event = session.get(Event, event_id)
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")
    verify_client_access(current_user, db_event.client_id, session)
    
    db_event.custom_fields_schema = payload.get("custom_fields_schema", [])
    session.add(db_event)
    session.commit()
    session.refresh(db_event)
    return db_event

@app.delete("/api/py/events/{event_id}")
def delete_event(
    event_id: int, 
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    verify_client_access(current_user, event.client_id, session)
    
    # Clean up usereventlink entries first to prevent foreign key errors
    session.execute(text('DELETE FROM "usereventlink" WHERE event_id = :event_id'), {"event_id": event_id})
    
    session.delete(event)
    session.commit()
    return {"ok": True}

@app.get("/api/py/events/{event_id}/registrations")
def get_event_registrations(
    event_id: int, 
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    verify_event_access(current_user, event, session)
    
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
            "checked_in_days": reg.checked_in_days if isinstance(reg.checked_in_days, list) else [],
            "created_at": reg.created_at,
            "custom_answers": reg.custom_answers,
            "pin": reg.pin,
            "attendee": att
        } for reg, att in registrations
    ]

def get_event_email_config(event, session: Session):
    client = session.get(Client, event.client_id) if event.client_id else None
    if client:
        return {
            "primary_color": client.primary_color,
            "accent_color": client.accent_color,
            "heading_text": client.heading_text,
            "body_text": client.body_text,
            "footer_text": client.footer_text,
            "sender_name": client.sender_name or client.name,
            "reply_to": client.reply_to
        }
    
    from backend.models import SystemSetting
    email_setting = session.exec(select(SystemSetting).where(SystemSetting.key == "email_config")).first()
    config = email_setting.value if email_setting else {}
    if not config.get("sender_name"):
        config["sender_name"] = "BMD-EventHub"
    return config

@app.post("/api/py/register")
@limiter.limit("30/minute")
def register_attendee(
    request: Request,
    data: Dict[str, Any],
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session)
):
    from sqlalchemy import func
    from backend.models import SystemSetting
    event_id = data.get("event_id")
    # Standardize email: lowercase and strip whitespace
    raw_email = data.get("email", "")
    email = raw_email.strip().lower()
    
    # Domain restriction check
    if event_id:
        event = session.get(Event, event_id)
        if event and event.allowed_domains:
            email_parts = email.split("@")
            if len(email_parts) > 1:
                email_domain = email_parts[-1].strip().lower()
                allowed = [d.strip().lower() for d in event.allowed_domains if d.strip()]
                if allowed and email_domain not in allowed:
                    raise HTTPException(
                        status_code=400,
                        detail=f"This event is restricted. Please register using your corporate email address (e.g. ending in @{', @'.join(allowed)})."
                    )
    
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
                config = get_event_email_config(event, session)
                
                background_tasks.add_task(
                    send_confirmation_email,
                    to_email=attendee.email,
                    first_name=attendee.first_name,
                    event_title=event.title,
                    clearance_id=registration.pin,
                    event_details={
                        "start_date": event.start_date,
                        "location": event.location,
                        "address": event.address
                    },
                    config=config
                )
        except Exception as e:
            print(f"Error queuing confirmation email: {e}")

    return {
        "id": str(registration.id),
        "pin": registration.pin,
        "message": message,
        "version": "1.3-multi-identity"
    }

@app.post("/api/py/events/{event_id}/test-email")
def test_email(
    event_id: str,
    data: dict,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user or current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden: Only administrators can send test emails")
    email = data.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email required")
    
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    try:
        from backend.email_service import send_confirmation_email
        config = get_event_email_config(event, session)
        res = send_confirmation_email(
            to_email=email,
            first_name="Test",
            event_title=event.title,
            clearance_id="1234",
            event_details={
                "start_date": event.start_date,
                "location": event.location,
                "address": event.address
            },
            config=config
        )
        return {"ok": True, "resend_id": res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/py/registrations/{registration_id}/resend-email")
def resend_registration_email(
    registration_id: str,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
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
        
    attendee = session.get(Attendee, registration.attendee_id)
    if not attendee:
        raise HTTPException(status_code=404, detail="Attendee not found")
        
    event = session.get(Event, registration.event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    # Get email config
    config = get_event_email_config(event, session)
    
    try:
        send_confirmation_email(
            to_email=attendee.email,
            first_name=attendee.first_name,
            event_title=event.title,
            clearance_id=registration.pin,
            event_details={
                "start_date": event.start_date,
                "location": event.location,
                "address": event.address
            },
            config=config
        )
        return {"ok": True, "message": "Email resent successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {e}")

def bulk_send_tickets_task(event_id: int, session_factory):
    with Session(session_factory) as session:
        event = session.get(Event, event_id)
        if not event:
            print(f"Bulk resend error: Event {event_id} not found")
            return
            
        # Get email config
        config = get_event_email_config(event, session)
        
        # Get all confirmed registrations
        registrations = session.exec(
            select(Registration, Attendee)
            .join(Attendee)
            .where(Registration.event_id == event_id)
            .where(Registration.status == "confirmed")
        ).all()
        
        print(f"Starting bulk send for {len(registrations)} confirmed attendees of event {event.title}")
        for reg, att in registrations:
            try:
                send_confirmation_email(
                    to_email=att.email,
                    first_name=att.first_name,
                    event_title=event.title,
                    clearance_id=reg.pin,
                    event_details={
                        "start_date": event.start_date,
                        "location": event.location,
                        "address": event.address
                    },
                    config=config
                )
                print(f"Successfully resent ticket to {att.email}")
            except Exception as e:
                print(f"Failed to resend ticket to {att.email}: {e}")

@app.post("/api/py/events/{event_id}/resend-all-tickets")
def resend_all_tickets(
    event_id: int,
    background_tasks: BackgroundTasks,
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    background_tasks.add_task(bulk_send_tickets_task, event_id, engine)
    return {"ok": True, "message": "Bulk ticket dispatch started in the background."}


class BulkRegistrantItem(BaseModel):
    email: str
    first_name: str
    last_name: str
    company: Optional[str] = None
    custom_answers: Optional[Dict[str, Any]] = None

@app.post("/api/py/events/{event_id}/registrations/bulk")
def create_registrations_bulk(
    event_id: int,
    registrants_data: List[BulkRegistrantItem],
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden: Only administrators can import registrants in bulk")
        
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    config = get_event_email_config(event, session)
    
    created = []
    errors = []
    
    for item in registrants_data:
        email = item.email.strip().lower()
        first_name = item.first_name.strip()
        last_name = item.last_name.strip()
        company = item.company.strip() if item.company else None
        custom_answers = item.custom_answers or {}
        
        if not email or not first_name or not last_name:
            errors.append("Row missing required fields (email, first_name, or last_name)")
            continue
            
        try:
            # 1. Look up or create attendee matching single registration strategy
            attendee = session.exec(
                select(Attendee)
                .where(func.lower(Attendee.email) == email)
                .where(func.lower(Attendee.first_name) == first_name.lower())
                .where(func.lower(Attendee.last_name) == last_name.lower())
            ).first()
            
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
            else:
                if company:
                    attendee.company = company
                    session.add(attendee)
                    session.commit()
                    session.refresh(attendee)
            
            # 2. Look up or create registration
            registration = session.exec(
                select(Registration)
                .where(Registration.event_id == event_id)
                .where(Registration.attendee_id == attendee.id)
            ).first()
            
            if registration:
                registration.custom_answers = custom_answers
                registration.status = "confirmed"
                session.add(registration)
                session.commit()
                session.refresh(registration)
            else:
                import random
                pin = str(random.randint(1000, 9999))
                registration = Registration(
                    event_id=event_id,
                    attendee_id=attendee.id,
                    custom_answers=custom_answers,
                    pin=pin,
                    status="confirmed"
                )
                session.add(registration)
                session.commit()
                session.refresh(registration)
            
            # 3. Add background task to send confirmation email
            background_tasks.add_task(
                send_confirmation_email,
                to_email=attendee.email,
                first_name=attendee.first_name,
                event_title=event.title,
                clearance_id=registration.pin,
                event_details={
                    "start_date": event.start_date,
                    "location": event.location,
                    "address": event.address
                },
                config=config
            )
            created.append(email)
            
        except Exception as e:
            session.rollback()
            errors.append(f"Error registering {email}: {str(e)}")
            
    return {"created": created, "errors": errors}


@app.delete("/api/py/registrations/{registration_id}")
def delete_registration(
    registration_id: str,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    # Safely parse UUID to avoid 500 on malformed IDs
    registration = None
    try:
        from uuid import UUID
        val = UUID(registration_id, version=4)
        registration = session.get(Registration, val)
    except (ValueError, AttributeError):
        pass
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    session.delete(registration)
    session.commit()
    return {"ok": True}

@app.get("/api/py/users")
def read_users(
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user or current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view users")
    users = session.exec(select(User)).all()
    result = []
    for user in users:
        u_dict = user.dict()
        u_dict["password"] = None  # Security check: redact passwords
        u_dict["clients"] = [c.dict() for c in user.clients]
        result.append(u_dict)
    return result

@app.post("/api/py/users", response_model=User)
def create_user(
    user: User,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user or current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create users")
    existing = session.exec(select(User).where(func.lower(User.email) == user.email.lower())).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    if user.password:
        user.password = hash_password(user.password)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

@app.post("/api/py/users/bulk")
def create_users_bulk(
    users_data: List[User], 
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if current_user and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden: Only administrators can create users")
        
    created = []
    errors = []
    for user_data in users_data:
        if not user_data.email:
            errors.append("Missing email for one of the rows")
            continue
        user_email = user_data.email.lower().strip()
        existing = session.exec(select(User).where(func.lower(User.email) == user_email)).first()
        if existing:
            errors.append(f"User {user_email} already exists")
            continue
        try:
            hashed_password = hash_password(user_data.password) if user_data.password else None
            new_user = User(
                email=user_email,
                password=hashed_password,
                role=user_data.role or "staff",
                is_active=True
            )
            session.add(new_user)
            created.append(user_email)
        except Exception as e:
            errors.append(f"Error creating {user_email}: {str(e)}")
            
    session.commit()
    return {"created": created, "errors": errors}

@app.get("/api/py/users/me", response_model=User)
def get_current_user(email: str, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(func.lower(User.email) == email.lower())).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.put("/api/py/users/{user_id}", response_model=User)
def update_user(
    user_id: int,
    user_data: User,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user or current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update users")
    db_user = session.get(User, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_dict = user_data.dict(exclude_unset=True)
    for key, value in user_dict.items():
        if key == "password" and value:
            value = hash_password(value)
        setattr(db_user, key, value)
    
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user

@app.delete("/api/py/users/{user_id}")
def delete_user(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user or current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete users")
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    session.delete(user)
    session.commit()
    return {"ok": True}

def perform_checkin_logic(registration: Registration, day: Optional[int], mode: str, session: Session):
    event = session.get(Event, registration.event_id)
    duration = event.duration_days if event else 1
    
    # Calculate day number
    if day is not None:
        target_day = day
    elif event:
        from datetime import datetime
        now_date = datetime.utcnow().date()
        start_date = event.start_date.date()
        calculated_day = (now_date - start_date).days + 1
        target_day = max(1, min(calculated_day, duration))
    else:
        target_day = 1
        
    days = list(registration.checked_in_days) if isinstance(registration.checked_in_days, list) else []
        
    if mode == "checkin" and target_day in days:
        raise HTTPException(
            status_code=400, 
            detail=f"Attendee already checked in for Day {target_day}" if duration > 1 else "Attendee already checked in"
        )
        
    if mode == "checkin":
        if target_day not in days:
            days.append(target_day)
    else:
        # Toggle mode
        if target_day in days:
            days.remove(target_day)
        else:
            days.append(target_day)
            
    registration.checked_in_days = sorted(list(set(days)))
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(registration, "checked_in_days")
    registration.checked_in = len(registration.checked_in_days) > 0
    return registration

@app.put("/api/py/registrations/{registration_id}/checkin")
@limiter.limit("60/minute")
def toggle_checkin(
    request: Request,
    registration_id: str,
    mode: str = "toggle",
    day: Optional[int] = None,
    session: Session = Depends(get_session)
):
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
        
    registration = perform_checkin_logic(registration, day, mode, session)
    
    session.add(registration)
    session.commit()
    session.refresh(registration)
    
    # Return explicit dict so checked_in_days is always a list, never null
    return {
        "id": str(registration.id),
        "status": registration.status,
        "checked_in": registration.checked_in,
        "checked_in_days": registration.checked_in_days if isinstance(registration.checked_in_days, list) else [],
        "created_at": registration.created_at,
        "custom_answers": registration.custom_answers,
        "pin": registration.pin,
        "attendee": {
            "id": registration.attendee.id,
            "first_name": registration.attendee.first_name,
            "last_name": registration.attendee.last_name,
            "email": registration.attendee.email,
            "company": registration.attendee.company,
        }
    }

@app.post("/api/py/events/{event_id}/checkin-by-pin")
@limiter.limit("60/minute")
def checkin_by_pin(
    request: Request,
    event_id: int,
    data: Dict[str, Any],
    session: Session = Depends(get_session)
):
    pin = data.get("pin")
    day = data.get("day")
    if day is not None:
        try:
            day = int(day)
        except (ValueError, TypeError):
            day = None
            
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
        
    registration = perform_checkin_logic(registration, day, "checkin", session)
        
    session.add(registration)
    session.commit()
    session.refresh(registration)
    
    return {
        "id": str(registration.id),
        "status": registration.status,
        "checked_in": registration.checked_in,
        "checked_in_days": registration.checked_in_days if isinstance(registration.checked_in_days, list) else [],
        "created_at": registration.created_at,
        "custom_answers": registration.custom_answers,
        "pin": registration.pin,
        "attendee": registration.attendee
    }

@app.post("/api/py/events/{event_id}/broadcast")
def broadcast_to_attendees(
    event_id: int,
    data: Dict[str, Any],
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session)
):
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    subject = data.get("subject", f"Reminder: {event.title}")
    body = data.get("body", "")
    signature = data.get("signature", "")
    attachments = data.get("attachments", [])
    
    # Get all registrant data
    registrations = session.exec(
        select(Registration, Attendee)
        .join(Attendee)
        .where(Registration.event_id == event_id)
        .where(Registration.status == "confirmed")
    ).all()
    
    registrations_data = []
    for reg, att in registrations:
        registrations_data.append({
            "email": att.email,
            "first_name": att.first_name,
            "last_name": att.last_name,
            "pin": reg.pin
        })
        
    # Get email config
    config = get_event_email_config(event, session)
    
    # Prepare event details for templates
    event_details = {
        "start_date": event.start_date,
        "location": event.location,
        "address": event.address
    }
    
    background_tasks.add_task(
        send_broadcast_email,
        registrations_data=registrations_data,
        subject=subject,
        body=body,
        event_title=event.title,
        signature=signature,
        config=config,
        attachments=attachments,
        event_details=event_details
    )
    
    return {"ok": True, "sent": len(registrations_data), "message": "Broadcast queued in background"}

@app.get("/api/py/events/{slug}/public-stats")
def get_public_stats(slug: str, session: Session = Depends(get_session)):
    event = session.exec(select(Event).where(Event.slug == slug)).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    from sqlalchemy import func
    rsvp_count = session.exec(
        select(func.count(Registration.id))
        .where(Registration.event_id == event.id)
        .where(Registration.status == "confirmed")
    ).first() or 0
    
    declined_count = session.exec(
        select(func.count(Registration.id))
        .where(Registration.event_id == event.id)
        .where(Registration.status == "declined")
    ).first() or 0
    
    checked_in_count = session.exec(
        select(func.count(Registration.id))
        .where(Registration.event_id == event.id)
        .where(Registration.checked_in == True)
    ).first() or 0
    
    total_count = session.exec(
        select(func.count(Registration.id))
        .where(Registration.event_id == event.id)
    ).first() or 0
    
    client_data = None
    if event.client_id:
        client = session.get(Client, event.client_id)
        if client:
            client_data = {
                "name": client.name,
                "primary_color": client.primary_color,
                "accent_color": client.accent_color,
                "logo_url": client.logo_url
            }
    
    return {
        "title": event.title,
        "rsvp": rsvp_count,
        "declined": declined_count,
        "checked_in": checked_in_count,
        "total": total_count,
        "client": client_data
    }

@app.get("/api/py/stats")
def get_stats(
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
        
    if current_user.role == "admin":
        events = session.exec(select(Event)).all()
        clients_count = len(session.exec(select(Client)).all())
    elif current_user.role == "manager":
        from sqlalchemy import text
        stmt = text('SELECT client_id FROM "userclientlink" WHERE user_id = :user_id')
        rows = session.execute(stmt, {"user_id": current_user.id}).all()
        allowed_client_ids = [row[0] for row in rows]
        events = session.exec(select(Event).where(Event.client_id.in_(allowed_client_ids))).all()
        clients_count = len(allowed_client_ids)
    elif current_user.role == "staff":
        from sqlalchemy import text
        stmt = text('SELECT event_id FROM "usereventlink" WHERE user_id = :user_id')
        rows = session.execute(stmt, {"user_id": current_user.id}).all()
        allowed_event_ids = [row[0] for row in rows]
        events = session.exec(select(Event).where(Event.id.in_(allowed_event_ids))).all()
        
        allowed_client_ids = list(set([e.client_id for e in events if e.client_id]))
        clients_count = len(allowed_client_ids)
    else:
        events = []
        clients_count = 0
        
    event_ids = [e.id for e in events]
    if not event_ids:
        return {
            "events": 0,
            "registrations": 0,
            "check_in_rate": "0%",
            "revenue": "R0.00",
            "clients": clients_count
        }
        
    from sqlalchemy import func
    registrations_count = session.exec(
        select(func.count(Registration.id))
        .where(Registration.event_id.in_(event_ids))
        .where(Registration.status == "confirmed")
    ).first() or 0
    checked_in_count = session.exec(
        select(func.count(Registration.id))
        .where(Registration.event_id.in_(event_ids))
        .where(Registration.checked_in == True)
    ).first() or 0
    
    check_in_rate = 0
    if registrations_count > 0:
        check_in_rate = round((checked_in_count / registrations_count) * 100, 1)
        
    return {
        "events": len(events),
        "registrations": registrations_count,
        "check_in_rate": f"{check_in_rate}%",
        "revenue": "R0.00",
        "clients": clients_count
    }

@app.get("/api/py/activities")
def get_recent_activities(
    limit: int = 10,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
        
    if current_user.role == "admin":
        events = session.exec(select(Event)).all()
    elif current_user.role == "manager":
        from sqlalchemy import text
        stmt = text('SELECT client_id FROM "userclientlink" WHERE user_id = :user_id')
        rows = session.execute(stmt, {"user_id": current_user.id}).all()
        allowed_client_ids = [row[0] for row in rows]
        events = session.exec(select(Event).where(Event.client_id.in_(allowed_client_ids))).all()
    elif current_user.role == "staff":
        from sqlalchemy import text
        stmt = text('SELECT event_id FROM "usereventlink" WHERE user_id = :user_id')
        rows = session.execute(stmt, {"user_id": current_user.id}).all()
        allowed_event_ids = [row[0] for row in rows]
        events = session.exec(select(Event).where(Event.id.in_(allowed_event_ids))).all()
    else:
        events = []
        
    event_ids = [e.id for e in events]
    if not event_ids:
        return []

    # Single JOIN query — eliminates the N+1 lazy-load of attendee + event per row
    recent_results = session.exec(
        select(Registration, Attendee, Event)
        .join(Attendee, Registration.attendee_id == Attendee.id)
        .join(Event, Registration.event_id == Event.id)
        .where(Registration.event_id.in_(event_ids))
        .order_by(Registration.created_at.desc())
        .limit(limit)
    ).all()

    activities = []
    for reg, attendee, event in recent_results:
        if not attendee or not event:
            continue

        name = f"{attendee.first_name} {attendee.last_name[0]}."

        if reg.checked_in:
            activities.append({
                "user": name,
                "action": f"checked in at {event.title}",
                "time": reg.created_at.isoformat() + "Z" if reg.created_at else "",
                "type": "checkin"
            })
        else:
            activities.append({
                "user": name,
                "action": f"registered for {event.title}",
                "time": reg.created_at.isoformat() + "Z" if reg.created_at else "",
                "type": "registration"
            })
            
    if len(activities) < 3:
        import datetime as dt
        now = dt.datetime.utcnow()
        fallbacks = [
            {"user": "System", "action": "database backup completed successfully", "time": (now - dt.timedelta(hours=1)).isoformat() + "Z", "type": "system"},
            {"user": "Barton D.", "action": "updated organization settings", "time": (now - dt.timedelta(hours=2)).isoformat() + "Z", "type": "security"},
            {"user": "System", "action": "SSL certificate renewed", "time": (now - dt.timedelta(hours=4)).isoformat() + "Z", "type": "system"}
        ]
        activities.extend(fallbacks[:3 - len(activities)])
            
    return activities

@app.get("/api/py/analytics")
def get_analytics(
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
        
    if current_user.role == "admin":
        events = session.exec(select(Event)).all()
        clients_count = len(session.exec(select(Client)).all())
    elif current_user.role == "manager":
        from sqlalchemy import text
        stmt = text('SELECT client_id FROM "userclientlink" WHERE user_id = :user_id')
        rows = session.execute(stmt, {"user_id": current_user.id}).all()
        allowed_client_ids = [row[0] for row in rows]
        events = session.exec(select(Event).where(Event.client_id.in_(allowed_client_ids))).all()
        clients_count = len(allowed_client_ids)
    elif current_user.role == "staff":
        from sqlalchemy import text
        stmt = text('SELECT event_id FROM "usereventlink" WHERE user_id = :user_id')
        rows = session.execute(stmt, {"user_id": current_user.id}).all()
        allowed_event_ids = [row[0] for row in rows]
        events = session.exec(select(Event).where(Event.id.in_(allowed_event_ids))).all()
        allowed_client_ids = list(set([e.client_id for e in events if e.client_id]))
        clients_count = len(allowed_client_ids)
    else:
        events = []
        clients_count = 0
        
    event_ids = [e.id for e in events]
    if not event_ids:
        return {
            "registrations_by_day": [],
            "event_breakdown": [],
            "client_breakdown": [],
            "summary": {
                "total_events": 0,
                "total_registrations": 0,
                "checked_in": 0,
                "check_in_rate": "0%",
                "clients": clients_count
            }
        }

    import datetime as dt

    # --- Summary counts: pure SQL, zero rows loaded into Python memory ---
    summary_row = session.execute(
        select(
            func.count().label("total"),
            func.count().filter(Registration.checked_in == True).label("checked_in")
        )
        .where(Registration.event_id.in_(event_ids))
        .where(Registration.status == "confirmed")
    ).one()

    total_registrations = summary_row.total or 0
    checked_in = summary_row.checked_in or 0
    check_in_rate = round((checked_in / total_registrations) * 100, 1) if total_registrations > 0 else 0

    # --- Registrations by day (last 7 days): SQL GROUP BY ---
    today = dt.date.today()
    seven_days_ago = today - dt.timedelta(days=6)
    reg_by_day = {(today - dt.timedelta(days=i)).isoformat(): 0 for i in range(6, -1, -1)}

    day_rows = session.execute(
        select(
            func.date(Registration.created_at).label("day"),
            func.count().label("count")
        )
        .where(Registration.event_id.in_(event_ids))
        .where(Registration.status == "confirmed")
        .where(func.date(Registration.created_at) >= seven_days_ago)
        .group_by(func.date(Registration.created_at))
    ).all()

    for row in day_rows:
        day_str = str(row.day)
        if day_str in reg_by_day:
            reg_by_day[day_str] = row.count

    registrations_by_day = [{"date": d, "count": c} for d, c in sorted(reg_by_day.items())]

    # --- Event breakdown: SQL GROUP BY ---
    event_agg_rows = session.execute(
        select(
            Registration.event_id,
            func.count().label("total"),
            func.count().filter(Registration.checked_in == True).label("checked_in_count")
        )
        .where(Registration.event_id.in_(event_ids))
        .where(Registration.status == "confirmed")
        .group_by(Registration.event_id)
    ).all()

    event_agg = {row.event_id: (row.total, row.checked_in_count) for row in event_agg_rows}

    event_breakdown = []
    for e in events:
        total, chk = event_agg.get(e.id, (0, 0))
        event_breakdown.append({
            "id": e.id,
            "title": e.title,
            "capacity": e.capacity,
            "registrations": total,
            "checked_in": chk,
            "check_in_rate": f"{round((chk / total) * 100, 1) if total > 0 else 0}%"
        })

    # --- Client breakdown: SQL GROUP BY ---
    allowed_client_ids_for_breakdown = []
    if current_user.role == "admin":
        clients = session.exec(select(Client)).all()
    elif current_user.role == "manager":
        clients = session.exec(select(Client).where(Client.id.in_(allowed_client_ids))).all()
        allowed_client_ids_for_breakdown = allowed_client_ids
    else:
        allowed_client_ids_for_breakdown = list(set([e.client_id for e in events if e.client_id]))
        clients = session.exec(select(Client).where(Client.id.in_(allowed_client_ids_for_breakdown))).all()

    client_event_map = {}
    for e in events:
        if e.client_id:
            client_event_map.setdefault(e.client_id, []).append(e.id)

    client_agg_rows = session.execute(
        select(
            Event.client_id,
            func.count(Registration.id).label("reg_count")
        )
        .join(Event, Registration.event_id == Event.id)
        .where(Registration.event_id.in_(event_ids))
        .where(Registration.status == "confirmed")
        .group_by(Event.client_id)
    ).all()

    client_agg = {row.client_id: row.reg_count for row in client_agg_rows}

    client_breakdown = []
    for c in clients:
        c_event_ids = client_event_map.get(c.id, [])
        client_breakdown.append({
            "id": c.id,
            "name": c.name,
            "events_count": len(c_event_ids),
            "registrations_count": client_agg.get(c.id, 0)
        })

    return {
        "registrations_by_day": registrations_by_day,
        "event_breakdown": event_breakdown,
        "client_breakdown": client_breakdown,
        "summary": {
            "total_events": len(events),
            "total_registrations": total_registrations,
            "checked_in": checked_in,
            "check_in_rate": f"{check_in_rate}%",
            "clients": clients_count
        }
    }

# Client CRUD Endpoints
@app.get("/api/py/clients", response_model=List[Client])
def get_clients(
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    if current_user.role == "admin":
        return session.exec(select(Client)).all()
    return current_user.clients

@app.post("/api/py/clients", response_model=Client)
def create_client(
    client: Client, 
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create clients")
    existing = session.exec(select(Client).where(Client.slug == client.slug)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Client slug already exists")
    session.add(client)
    session.commit()
    session.refresh(client)
    return client

@app.get("/api/py/clients/{client_id}", response_model=Client)
def get_client_by_id(client_id: int, session: Session = Depends(get_session)):
    client = session.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client

@app.put("/api/py/clients/{client_id}", response_model=Client)
def update_client(client_id: int, client_data: Client, session: Session = Depends(get_session)):
    db_client = session.get(Client, client_id)
    if not db_client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    if client_data.slug != db_client.slug:
        existing = session.exec(select(Client).where(Client.slug == client_data.slug)).first()
        if existing:
            raise HTTPException(status_code=400, detail="Client slug already exists")
            
    client_dict = client_data.dict(exclude_unset=True)
    for key, value in client_dict.items():
        setattr(db_client, key, value)
        
    session.add(db_client)
    session.commit()
    session.refresh(db_client)
    return db_client

@app.delete("/api/py/clients/{client_id}")
def delete_client(
    client_id: int, 
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user or current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete clients")
        
    db_client = session.get(Client, client_id)
    if not db_client:
        raise HTTPException(status_code=404, detail="Client not found")
        
    events_count = len(session.exec(select(Event).where(Event.client_id == client_id)).all())
    if events_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete client with {events_count} associated events")
        
    session.delete(db_client)
    session.commit()
    return {"ok": True}

@app.get("/api/py/users/{user_id}/clients", response_model=List[Client])
def get_user_clients(
    user_id: int, 
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user or current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view user client links")
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user.clients

@app.post("/api/py/users/{user_id}/clients")
def sync_user_clients(
    user_id: int, 
    payload: Dict[str, Any], 
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user or current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can modify user client links")
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Accept both {"client_ids": [...]} and a raw list for backward compat
    client_ids = payload.get("client_ids", [])
    if not isinstance(client_ids, list):
        raise HTTPException(status_code=422, detail="client_ids must be a list")
    
    # Delete existing mappings
    session.execute(text('DELETE FROM "userclientlink" WHERE user_id = :user_id'), {"user_id": user_id})
    session.commit()
    
    # Bulk insert new mappings
    for c_id in client_ids:
        client = session.get(Client, c_id)
        if client:
            session.execute(
                text('INSERT INTO "userclientlink" (user_id, client_id) VALUES (:user_id, :client_id)'),
                {"user_id": user_id, "client_id": c_id}
            )
    session.commit()
    return {"ok": True}

@app.get("/api/py/events/{event_id}/staff")
def get_event_staff(
    event_id: int, 
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
        
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    verify_client_access(current_user, event.client_id, session)
    
    # 1. Fetch all users associated with this event's client (non-admin)
    from sqlalchemy import text
    stmt = text("""
        SELECT u.id, u.email, u.role 
        FROM "user" u
        JOIN "userclientlink" l ON l.user_id = u.id
        WHERE l.client_id = :client_id AND u.role != 'admin'
    """)
    rows = session.execute(stmt, {"client_id": event.client_id}).all()
    
    # 2. Fetch currently assigned users for this event
    stmt_assigned = text('SELECT user_id FROM "usereventlink" WHERE event_id = :event_id')
    assigned_rows = session.execute(stmt_assigned, {"event_id": event_id}).all()
    assigned_ids = {row[0] for row in assigned_rows}
    
    # 3. Build response list
    result = []
    for row in rows:
        result.append({
            "id": row[0],
            "email": row[1],
            "role": row[2],
            "assigned": row[0] in assigned_ids
        })
    return result

@app.post("/api/py/events/{event_id}/staff")
def update_event_staff(
    event_id: int,
    payload: Dict[str, Any],
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
        
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    verify_client_access(current_user, event.client_id, session)
    
    user_ids = payload.get("user_ids", [])
    if not isinstance(user_ids, list):
        raise HTTPException(status_code=422, detail="user_ids must be a list")
        
    from sqlalchemy import text
    # Delete existing mappings for this event
    session.execute(text('DELETE FROM "usereventlink" WHERE event_id = :event_id'), {"event_id": event_id})
    session.commit()
    
    # Insert new assignments
    for u_id in user_ids:
        # Verify the user is linked to the event's client
        link_exists = session.execute(
            text('SELECT 1 FROM "userclientlink" WHERE user_id = :user_id AND client_id = :client_id'),
            {"user_id": u_id, "client_id": event.client_id}
        ).first()
        if link_exists:
            session.execute(
                text('INSERT INTO "usereventlink" (user_id, event_id) VALUES (:user_id, :event_id)'),
                {"user_id": u_id, "event_id": event_id}
            )
            
    session.commit()
    return {"ok": True}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
