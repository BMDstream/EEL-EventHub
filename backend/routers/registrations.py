from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request, status
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select
from sqlalchemy import func
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import random
import zipfile
from io import BytesIO
import qrcode
from uuid import UUID

from backend.database import get_session, engine
from backend.models import Event, Attendee, Registration, User, Client
from backend.email_service import send_confirmation_email, send_broadcast_email
from backend.tasks import dispatch_send_confirmation_email, dispatch_send_broadcast_email
from backend.encryption import encrypt_dict, decrypt_dict
from backend.routers.webhooks import trigger_webhooks
from backend.utils import (
    get_current_user_from_request,
    verify_event_access,
    verify_client_access,
    get_event_email_config,
    perform_checkin_logic,
    limiter
)

router = APIRouter()

class BulkRegistrantItem(BaseModel):
    email: str
    first_name: str
    last_name: str
    company: Optional[str] = None
    custom_answers: Optional[Dict[str, Any]] = None

@router.post("/register")
@limiter.limit("30/minute")
def register_attendee(
    request: Request,
    data: Dict[str, Any],
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session)
):
    event_id = data.get("event_id")
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
    else:
        raise HTTPException(status_code=400, detail="Event ID is required")
        
    first_name = data.get("first_name", "").strip()
    last_name = data.get("last_name", "").strip()
    company = data.get("company", "").strip()
    custom_answers = data.get("custom_answers", {})
    is_attending = data.get("is_attending", True)
    reg_status = "confirmed" if is_attending else "declined"

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
    
    message = "Your registration has been confirmed." if is_attending else "Your registration has been submitted."
    
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
            message = "We've identified your existing profile. Your information has been synchronized." if is_attending else "Your registration has been submitted."
            attendee.company = company
            session.add(attendee)
            session.commit()
            session.refresh(attendee)
    except Exception as e:
        session.rollback()
        print(f"Error saving attendee record: {e}")
        raise HTTPException(status_code=500, detail=f"Database error during attendee sync: {e}")
    
    # 2. Handle Registration
    is_new_registration = True
    try:
        registration = session.exec(
            select(Registration)
            .where(Registration.event_id == event_id)
            .where(Registration.attendee_id == attendee.id)
        ).first()
        
        # Encrypt the custom answers before saving at rest
        encrypted_custom_answers = encrypt_dict(custom_answers)
        
        if registration:
            is_new_registration = False
            print(f"Updating existing registration {registration.id} for attendee {attendee.id}")
            message = "Duplicate detected: You are already registered for this event. Your record has been updated." if is_attending else "Your registration has been submitted."
            registration.custom_answers = encrypted_custom_answers
            registration.status = reg_status
            if reg_status == "declined":
                registration.checked_in = False
            session.add(registration)
            session.commit()
            session.refresh(registration)
        else:
            pin = str(random.randint(1000, 9999))
            registration = Registration(
                event_id=event_id, 
                attendee_id=attendee.id, 
                custom_answers=encrypted_custom_answers,
                pin=pin,
                status=reg_status
            )
            session.add(registration)
            session.commit()
            session.refresh(registration)
    except Exception as e:
        session.rollback()
        print(f"Error saving registration record: {e}")
        raise HTTPException(status_code=500, detail=f"Database error during registration: {e}")
 
    # 3. Trigger webhook dispatch
    webhook_event = "registration.created" if is_new_registration else "registration.updated"
    webhook_payload = {
        "registration_id": str(registration.id),
        "pin": registration.pin,
        "status": registration.status,
        "created_at": registration.created_at.isoformat() + "Z" if registration.created_at else "",
        "attendee": {
            "first_name": attendee.first_name,
            "last_name": attendee.last_name,
            "email": attendee.email,
            "company": attendee.company
        },
        "event_id": event.id,
        "event_slug": event.slug,
        "event_title": event.title
    }
    trigger_webhooks(webhook_event, webhook_payload, session, background_tasks, client_id=event.client_id)

    # 4. Send confirmation email (asynchronously via dispatch abstraction layer)
    try:
        if event:
            config = get_event_email_config(event, session)
            dispatch_send_confirmation_email(
                background_tasks=background_tasks,
                to_email=attendee.email,
                first_name=attendee.first_name,
                event_title=event.title,
                clearance_id=registration.pin,
                event_details={
                    "start_date": event.start_date,
                    "location": event.location,
                    "address": event.address
                },
                config=config,
                is_attending=is_attending
            )
    except Exception as e:
        print(f"Error dispatching confirmation email: {e}")

    return {
        "id": str(registration.id),
        "pin": registration.pin,
        "message": message,
        "version": "1.3-multi-identity"
    }

@router.get("/events/{event_id}/registrations")
def get_event_registrations(
    event_id: int, 
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    verify_event_access(current_user, event, session)
    
    registrations = session.exec(
        select(Registration, Attendee)
        .join(Attendee)
        .where(Registration.event_id == event_id)
    ).all()
    
    return [
        {
            "id": reg.id,
            "status": reg.status,
            "checked_in": reg.checked_in,
            "checked_in_days": reg.checked_in_days if isinstance(reg.checked_in_days, list) else [],
            "created_at": reg.created_at,
            "custom_answers": decrypt_dict(reg.custom_answers),  # Decrypt for authorized clients
            "pin": reg.pin,
            "attendee": att
        } for reg, att in registrations
    ]

@router.get("/events/{event_id}/qrcodes/zip")
def download_event_qrcodes_zip(
    event_id: int,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    verify_event_access(current_user, event, session)
    
    registrations = session.exec(
        select(Registration, Attendee)
        .join(Attendee)
        .where(Registration.event_id == event_id)
        .where(Registration.status == "confirmed")
    ).all()
    
    if not registrations:
        raise HTTPException(status_code=400, detail="No confirmed registrants found for this event")
        
    zip_buffer = BytesIO()
    
    with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
        for reg, att in registrations:
            pin = reg.pin or str(reg.id)[:8]
            
            qr = qrcode.QRCode(version=1, box_size=10, border=4)
            qr.add_data(pin)
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")
            
            qr_bytes = BytesIO()
            img.save(qr_bytes, format="PNG")
            qr_bytes.seek(0)
            
            filename = f"{att.first_name.strip()}_{att.last_name.strip()}_{pin}.png"
            filename = "".join(c for c in filename if c.isalnum() or c in (' ', '_', '-', '.')).strip()
            filename = filename.replace(" ", "_")
            
            zip_file.writestr(filename, qr_bytes.read())
            
    zip_buffer.seek(0)
    
    headers = {
        "Content-Disposition": f"attachment; filename={event.slug}_qrcodes.zip",
        "Access-Control-Expose-Headers": "Content-Disposition"
    }
    return StreamingResponse(zip_buffer, media_type="application/x-zip-compressed", headers=headers)

@router.post("/events/{event_id}/registrations/bulk")
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
            
            registration = session.exec(
                select(Registration)
                .where(Registration.event_id == event_id)
                .where(Registration.attendee_id == attendee.id)
            ).first()
            
            encrypted_custom_answers = encrypt_dict(custom_answers)
            is_new = True
            
            if registration:
                is_new = False
                registration.custom_answers = encrypted_custom_answers
                registration.status = "confirmed"
                session.add(registration)
                session.commit()
                session.refresh(registration)
            else:
                pin = str(random.randint(1000, 9999))
                registration = Registration(
                    event_id=event_id,
                    attendee_id=attendee.id,
                    custom_answers=encrypted_custom_answers,
                    pin=pin,
                    status="confirmed"
                )
                session.add(registration)
                session.commit()
                session.refresh(registration)
            
            # Dispatch webhook subscription triggers
            webhook_event = "registration.created" if is_new else "registration.updated"
            webhook_payload = {
                "registration_id": str(registration.id),
                "pin": registration.pin,
                "status": registration.status,
                "created_at": registration.created_at.isoformat() + "Z" if registration.created_at else "",
                "attendee": {
                    "first_name": attendee.first_name,
                    "last_name": attendee.last_name,
                    "email": attendee.email,
                    "company": attendee.company
                },
                "event_id": event.id,
                "event_slug": event.slug,
                "event_title": event.title
            }
            trigger_webhooks(webhook_event, webhook_payload, session, background_tasks, client_id=event.client_id)

            # Asynchronous email dispatch via tasks.py helper
            dispatch_send_confirmation_email(
                background_tasks=background_tasks,
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

@router.delete("/registrations/{registration_id}")
def delete_registration(
    registration_id: str,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
        
    registration = None
    try:
        val = UUID(registration_id)
        registration = session.get(Registration, val)
    except (ValueError, AttributeError):
        pass
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
        
    session.delete(registration)
    session.commit()
    return {"ok": True}

@router.put("/registrations/{registration_id}/checkin")
@limiter.limit("60/minute")
def toggle_checkin(
    request: Request,
    registration_id: str,
    background_tasks: BackgroundTasks,
    mode: str = "toggle",
    day: Optional[int] = None,
    session: Session = Depends(get_session)
):
    registration = None
    try:
        val = UUID(registration_id)
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
        
    was_checked_in = registration.checked_in
    registration = perform_checkin_logic(registration, day, mode, session)
    
    session.add(registration)
    session.commit()
    session.refresh(registration)
    
    # Webhook triggers for checkin
    if registration.checked_in and not was_checked_in:
        webhook_event = "checkin.created"
    elif not registration.checked_in and was_checked_in:
        webhook_event = "checkin.deleted"
    else:
        webhook_event = "checkin.updated"
        
    webhook_payload = {
        "registration_id": str(registration.id),
        "pin": registration.pin,
        "event_id": registration.event_id,
        "attendee": {
            "first_name": registration.attendee.first_name,
            "last_name": registration.attendee.last_name,
            "email": registration.attendee.email
        },
        "checked_in": registration.checked_in,
        "checked_in_days": registration.checked_in_days if isinstance(registration.checked_in_days, list) else []
    }
    event = session.get(Event, registration.event_id)
    trigger_webhooks(webhook_event, webhook_payload, session, background_tasks, client_id=event.client_id if event else None)

    return {
        "id": str(registration.id),
        "status": registration.status,
        "checked_in": registration.checked_in,
        "checked_in_days": registration.checked_in_days if isinstance(registration.checked_in_days, list) else [],
        "created_at": registration.created_at,
        "custom_answers": decrypt_dict(registration.custom_answers),
        "pin": registration.pin,
        "attendee": {
            "id": registration.attendee.id,
            "first_name": registration.attendee.first_name,
            "last_name": registration.attendee.last_name,
            "email": registration.attendee.email,
            "company": registration.attendee.company,
        }
    }

@router.post("/events/{event_id}/checkin-by-pin")
@limiter.limit("60/minute")
def checkin_by_pin(
    request: Request,
    event_id: int,
    data: Dict[str, Any],
    background_tasks: BackgroundTasks,
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
    
    # Webhook trigger
    webhook_payload = {
        "registration_id": str(registration.id),
        "pin": registration.pin,
        "event_id": registration.event_id,
        "attendee": {
            "first_name": registration.attendee.first_name,
            "last_name": registration.attendee.last_name,
            "email": registration.attendee.email
        },
        "checked_in": registration.checked_in,
        "checked_in_days": registration.checked_in_days if isinstance(registration.checked_in_days, list) else []
    }
    event = session.get(Event, event_id)
    trigger_webhooks("checkin.created", webhook_payload, session, background_tasks, client_id=event.client_id if event else None)

    return {
        "id": str(registration.id),
        "status": registration.status,
        "checked_in": registration.checked_in,
        "checked_in_days": registration.checked_in_days if isinstance(registration.checked_in_days, list) else [],
        "created_at": registration.created_at,
        "custom_answers": decrypt_dict(registration.custom_answers),
        "pin": registration.pin,
        "attendee": registration.attendee
    }

@router.post("/events/{event_id}/test-email")
def test_email(
    event_id: int,
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

@router.post("/registrations/{registration_id}/resend-email")
def resend_registration_email(
    registration_id: str,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
        
    registration = None
    try:
        val = UUID(registration_id)
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
            config=config,
            is_attending=(registration.status == "confirmed")
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
            
        config = get_event_email_config(event, session)
        
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

@router.post("/events/{event_id}/resend-all-tickets")
def resend_all_tickets(
    event_id: int,
    background_tasks: BackgroundTasks,
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    background_tasks.add_task(bulk_send_tickets_task, event_id, engine)
    return {"ok": True, "message": "Bulk ticket dispatch started in the background."}

@router.post("/events/{event_id}/broadcast")
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
        
    config = get_event_email_config(event, session)
    
    event_details = {
        "start_date": event.start_date,
        "location": event.location,
        "address": event.address
    }
    
    dispatch_send_broadcast_email(
        background_tasks=background_tasks,
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
