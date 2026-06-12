import os
import bcrypt
from fastapi import Header, Depends, HTTPException, Request
from sqlmodel import Session, select
from sqlalchemy import func, text
from typing import Optional

from slowapi import Limiter
from slowapi.util import get_remote_address

from backend.database import get_session
from backend.models import User, Event, Client, Registration

# Share a single limiter instance across all routers
limiter = Limiter(key_func=get_remote_address)

if os.getenv("MOCK_EMAIL_SERVICE") == "true":
    limiter.enabled = False

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
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_client_access(user: Optional[User], client_id: Optional[int], session: Session):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    if user.role == "admin":
        return True
    if not client_id:
        raise HTTPException(status_code=403, detail="Forbidden: Resource has no associated client")
        
    link = session.execute(
        text('SELECT role FROM "userclientlink" WHERE user_id = :user_id AND client_id = :client_id'),
        {"user_id": user.id, "client_id": client_id}
    ).first()
    
    if not link:
        raise HTTPException(status_code=403, detail="Forbidden: Access to this client's resources is denied")
        
    if link[0] != "manager":
        raise HTTPException(status_code=403, detail="Forbidden: Manager permissions required for this client")
    return True

def verify_event_access(user: Optional[User], event: Event, session: Session):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    if user.role == "admin":
        return True
        
    # Check if user is a manager for this client context
    if event.client_id:
        link = session.execute(
            text('SELECT role FROM "userclientlink" WHERE user_id = :user_id AND client_id = :client_id'),
            {"user_id": user.id, "client_id": event.client_id}
        ).first()
        if link and link[0] == "manager":
            return True
        
    # staff role check event assignment
    link_exists = session.execute(
        text('SELECT 1 FROM "usereventlink" WHERE user_id = :user_id AND event_id = :event_id'),
        {"user_id": user.id, "event_id": event.id}
    ).first()
    if not link_exists:
        raise HTTPException(status_code=403, detail="Forbidden: You are not assigned to this event")
    return True

def verify_event_manager_access(user: Optional[User], event: Event, session: Session):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    if user.role == "admin":
        return True
        
    # 1. Check if user is a client-level manager
    if event.client_id:
        link = session.execute(
            text('SELECT role FROM "userclientlink" WHERE user_id = :user_id AND client_id = :client_id'),
            {"user_id": user.id, "client_id": event.client_id}
        ).first()
        if link and link[0] == "manager":
            return True
            
    # 2. Check if user has a manager role on this specific event
    event_link = session.execute(
        text('SELECT role FROM "usereventlink" WHERE user_id = :user_id AND event_id = :event_id'),
        {"user_id": user.id, "event_id": event.id}
    ).first()
    if event_link and event_link[0] == "manager":
        return True
        
    raise HTTPException(status_code=403, detail="Forbidden: Event manager privileges required")

def get_event_email_config(event: Event, session: Session):
    client = session.get(Client, event.client_id) if event.client_id else None
    if client:
        config = {
            "primary_color": client.primary_color,
            "accent_color": client.accent_color,
            "heading_text": client.heading_text,
            "body_text": client.body_text,
            "footer_text": client.footer_text,
            "sender_name": client.sender_name or client.name,
            "reply_to": client.reply_to,
            "logo_url": client.logo_url
        }
    else:
        from backend.models import SystemSetting
        email_setting = session.exec(select(SystemSetting).where(SystemSetting.key == "email_config")).first()
        config = email_setting.value if email_setting else {}
        if not config.get("sender_name"):
            config["sender_name"] = "BMD-EventHub"
            
    # Set default sender_email if not configured
    if not config.get("sender_email"):
        config["sender_email"] = "events@eelogistics.co.za"

    # Override with event-specific sender_email if provided
    if getattr(event, "sender_email", None):
        config["sender_email"] = event.sender_email
            
    # Override with event-specific sender_name if provided
    if getattr(event, "sender_name", None):
        config["sender_name"] = event.sender_name
            
    # Override with event-specific logo if provided
    if getattr(event, "logo_url", None):
        config["logo_url"] = event.logo_url
        
    return config

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
