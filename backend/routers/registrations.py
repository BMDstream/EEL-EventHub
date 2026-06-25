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
    verify_event_manager_access,
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
    
    # Domain restriction and status check
    if event_id:
        event = session.get(Event, event_id)
        if event:
            # Check manual active flag (defaults to True)
            if not getattr(event, "registration_active", True):
                raise HTTPException(
                    status_code=400,
                    detail="Registration is currently closed for this event."
                )

            # Check scheduling start/end times
            from datetime import datetime
            now = datetime.utcnow()

            reg_start = getattr(event, "registration_start", None)
            if reg_start and now < reg_start:
                raise HTTPException(
                    status_code=400,
                    detail=f"Registration has not opened yet. It is scheduled to open on {reg_start.strftime('%Y-%m-%d %H:%M UTC')}."
                )

            reg_end = getattr(event, "registration_end", None)
            if reg_end and now > reg_end:
                raise HTTPException(
                    status_code=400,
                    detail="Registration for this event has closed."
                )

            if event.allowed_domains:
                email_parts = email.split("@")
                if len(email_parts) > 1:
                    email_domain = email_parts[-1].strip().lower()
                    allowed = [d.strip().lower() for d in event.allowed_domains if d.strip()]
                    if allowed and email_domain not in allowed:
                        raise HTTPException(
                            status_code=400,
                            detail=f"This event is restricted. Please register using your corporate email address (e.g. ending in @{', @'.join(allowed)})."
                        )
            
            # Enforce required company check if enabled
            if getattr(event, "collect_company", True) and getattr(event, "company_required", False):
                company_val = data.get("company", "").strip()
                if not company_val:
                    raise HTTPException(
                        status_code=400,
                        detail="Organization / Company name is required for this event."
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
            is_partner = False
            try:
                from backend.routers.tournament import Player, Match
                player = session.exec(select(Player).where(Player.email == email)).first()
                if player:
                    match = session.exec(select(Match).where(Match.partner_id == player.id)).first()
                    if match:
                        is_partner = True
            except Exception as e:
                print(f"Error checking if partner: {e}")

            if is_partner or data.get("is_partner_update", False):
                message = "Your record has been updated." if is_attending else "Your registration has been submitted."
            else:
                message = "Duplicate detected: You are already registered for this event. Your record has been updated." if is_attending else "Your registration has been submitted."
            
            # Merge custom answers to avoid overwriting previously stored answers (e.g. Partner details)
            existing_answers = {}
            if registration.custom_answers:
                existing_answers = decrypt_dict(registration.custom_answers)
                if "error" in existing_answers:
                    existing_answers = {}
            
            merged_answers = {**existing_answers, **custom_answers}
            registration.custom_answers = encrypt_dict(merged_answers)
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

    # 4. Check if partner card is present and execute tournament co-registration
    partner_details = None
    if event and event.custom_fields_schema:
        for field in event.custom_fields_schema:
            if field.get("type") == "partner_card":
                field_id = field.get("id")
                ans = custom_answers.get(field_id)
                if isinstance(ans, dict) and ans.get("email") and ans.get("first_name") and ans.get("last_name"):
                    partner_details = {
                        "first_name": str(ans["first_name"]).strip(),
                        "last_name": str(ans["last_name"]).strip(),
                        "email": str(ans["email"]).strip().lower()
                    }
                break

    if partner_details and is_attending:
        try:
            partner_email = partner_details["email"]
            partner_first = partner_details["first_name"]
            partner_last = partner_details["last_name"]
            
            # Co-register partner as a core Attendee
            partner_attendee = session.exec(
                select(Attendee)
                .where(func.lower(Attendee.email) == partner_email)
                .where(func.lower(Attendee.first_name) == partner_first.lower())
                .where(func.lower(Attendee.last_name) == partner_last.lower())
            ).first()
            
            if not partner_attendee:
                print(f"Tournament co-registration: Creating core attendee for partner {partner_first} {partner_last}")
                partner_attendee = Attendee(
                    email=partner_email,
                    first_name=partner_first,
                    last_name=partner_last,
                    company=company or attendee.company
                )
                session.add(partner_attendee)
                session.commit()
                session.refresh(partner_attendee)
            
            # Co-register partner as a core Registration for the event
            partner_reg = session.exec(
                select(Registration)
                .where(Registration.event_id == event_id)
                .where(Registration.attendee_id == partner_attendee.id)
            ).first()
            
            if not partner_reg:
                print(f"Tournament co-registration: Creating core registration for partner {partner_attendee.id}")
                partner_pin = str(random.randint(1000, 9999))
                partner_reg = Registration(
                    event_id=event_id,
                    attendee_id=partner_attendee.id,
                    pin=partner_pin,
                    status="confirmed"
                )
                session.add(partner_reg)
                session.commit()
                session.refresh(partner_reg)

            # Tournament database setup
            from backend.routers.tournament import Player, EventCheckin, Match, generate_backup_pin, send_resend_email
            from uuid import uuid4
            
            # Upsert Challenger Player Profile
            challenger_player = session.exec(
                select(Player).where(Player.email == email)
            ).first()
            if not challenger_player:
                challenger_player = Player(name=f"{first_name} {last_name}", email=email)
                session.add(challenger_player)
            else:
                challenger_player.name = f"{first_name} {last_name}"
                session.add(challenger_player)
                
            # Upsert Partner Player Profile
            partner_player = session.exec(
                select(Player).where(Player.email == partner_email)
            ).first()
            if not partner_player:
                partner_player = Player(name=f"{partner_first} {partner_last}", email=partner_email)
                session.add(partner_player)
            else:
                partner_player.name = f"{partner_first} {partner_last}"
                session.add(partner_player)
                
            session.flush()
            
            # Create Challenger Pass Check-in
            challenger_checkin = session.exec(
                select(EventCheckin).where(EventCheckin.player_id == challenger_player.id)
            ).first()
            if not challenger_checkin:
                challenger_pass_pin = generate_backup_pin()
                challenger_checkin = EventCheckin(
                    player_id=challenger_player.id,
                    qr_hash=uuid4(),
                    pin=challenger_pass_pin,
                    checked_in=False
                )
                session.add(challenger_checkin)
                
            # Create Partner Pass Check-in
            partner_checkin = session.exec(
                select(EventCheckin).where(EventCheckin.player_id == partner_player.id)
            ).first()
            if not partner_checkin:
                partner_pass_pin = generate_backup_pin()
                partner_checkin = EventCheckin(
                    player_id=partner_player.id,
                    qr_hash=uuid4(),
                    pin=partner_pass_pin,
                    checked_in=False
                )
                session.add(partner_checkin)
                
            # Synchronize core registration PINs with tournament check-in PINs
            registration.pin = challenger_checkin.pin
            partner_reg.pin = partner_checkin.pin
            session.add(registration)
            session.add(partner_reg)
                
            # Create Match in matches table
            existing_match = session.exec(
                select(Match)
                .where(Match.challenger_id == challenger_player.id)
                .where(Match.partner_id == partner_player.id)
            ).first()
            if not existing_match:
                tournament_match = Match(
                    challenger_id=challenger_player.id,
                    partner_id=partner_player.id,
                    status="pending"
                )
                session.add(tournament_match)
                
            session.commit()
            session.refresh(challenger_checkin)
            session.refresh(partner_checkin)
            
            # Get host dynamically to construct absolute URLs
            host = request.headers.get("host", "eel-event-hub-q61e.vercel.app")
            scheme = "http" if "localhost" in host else "https"
            challenger_update_link = f"{scheme}://{host}/register/{event.slug}?email={email}&first_name={first_name}&last_name={last_name}"
            partner_update_link = f"{scheme}://{host}/register/{event.slug}?email={partner_email}&first_name={partner_first}&last_name={partner_last}"

            # Send standardised confirmation emails using dispatch_send_confirmation_email
            config = get_event_email_config(event, session)
            
            # 1. Send Challenger confirmation email (with matchup details, NO profile update link)
            dispatch_send_confirmation_email(
                background_tasks=background_tasks,
                to_email=email,
                first_name=first_name,
                event_title=event.title,
                clearance_id=challenger_checkin.pin,
                event_details={
                    "start_date": event.start_date,
                    "location": event.location,
                    "address": event.address
                },
                config=config,
                is_attending=is_attending,
                matchup=f"{first_name} {last_name} vs {partner_first} {partner_last}",
                registration_id=str(registration.id)
            )

            # 2. Send Partner confirmation email (with matchup details AND profile update link)
            dispatch_send_confirmation_email(
                background_tasks=background_tasks,
                to_email=partner_email,
                first_name=partner_first,
                event_title=event.title,
                clearance_id=partner_checkin.pin,
                event_details={
                    "start_date": event.start_date,
                    "location": event.location,
                    "address": event.address
                },
                config=config,
                is_attending=is_attending,
                matchup=f"{partner_first} {partner_last} vs {first_name} {last_name}",
                profile_update_link=partner_update_link,
                registration_id=str(partner_reg.id)
            )
            
            print(f"Tournament co-registration and match creation complete for Challenger: {email} & Partner: {partner_email}")
            
        except Exception as e:
            session.rollback()
            print(f"Error executing tournament partner co-registration: {e}")

    # 5. Send confirmation email (only if NOT a tournament registration)
    if not partner_details or not is_attending:
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
                    is_attending=is_attending,
                    registration_id=str(registration.id)
                )
        except Exception as e:
            print(f"Error dispatching confirmation email: {e}")

    return {
        "id": str(registration.id),
        "pin": registration.pin,
        "message": message,
        "version": "1.4-tournament-integrated"
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
                config=config,
                registration_id=str(registration.id)
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
            config=config,
            registration_id="test-uuid"
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
            is_attending=(registration.status == "confirmed"),
            registration_id=str(registration.id)
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
                    config=config,
                    registration_id=str(reg.id)
                )
                print(f"Successfully resent ticket to {att.email}")
            except Exception as e:
                print(f"Failed to resend ticket to {att.email}: {e}")

@router.post("/events/{event_id}/resend-all-tickets")
def resend_all_tickets(
    event_id: int,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    verify_event_manager_access(current_user, event, session)
    background_tasks.add_task(bulk_send_tickets_task, event_id, engine)
    return {"ok": True, "message": "Bulk ticket dispatch started in the background."}

@router.post("/events/{event_id}/broadcast")
def broadcast_to_attendees(
    event_id: int,
    data: Dict[str, Any],
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    verify_event_manager_access(current_user, event, session)
    
    subject = data.get("subject", f"Reminder: {event.title}")
    body = data.get("body", "")
    signature = data.get("signature", "")
    attachments = data.get("attachments", [])
    target = data.get("target", "confirmed") # confirmed, checked_in
    
    query = (
        select(Registration, Attendee)
        .join(Attendee)
        .where(Registration.event_id == event_id)
        .where(Registration.status == "confirmed")
    )
    if target == "checked_in":
        query = query.where(Registration.checked_in == True)
        
    registrations = session.exec(query).all()
    
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

@router.post("/events/{event_id}/bulk-checkin")
def bulk_checkin(
    event_id: int,
    data: List[Dict[str, Any]],
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    verify_event_manager_access(current_user, event, session)
    
    synced = []
    conflicts = []
    errors = []
    
    # Pre-parse UUIDs and bulk-fetch registrations with their attendees eager-loaded
    uuid_map = {}
    for item in data:
        reg_id = item.get("registration_id")
        if reg_id:
            try:
                uuid_map[reg_id] = UUID(reg_id)
            except ValueError:
                pass

    reg_lookup = {}
    if uuid_map:
        from sqlalchemy.orm import selectinload
        db_regs = session.exec(
            select(Registration)
            .where(Registration.id.in_(list(uuid_map.values())))
            .options(selectinload(Registration.attendee))
        ).all()
        for r in db_regs:
            reg_lookup[r.id] = r
            
    for item in data:
        reg_id = item.get("registration_id")
        day = item.get("day")
        timestamp_str = item.get("timestamp")
        mode = item.get("mode", "checkin")
        
        try:
            reg_uuid = UUID(reg_id)
        except Exception as e:
            errors.append({"registration_id": reg_id, "detail": f"Invalid UUID: {str(e)}"})
            continue
            
        registration = reg_lookup.get(reg_uuid)
            
        if not registration or registration.event_id != event_id:
            errors.append({"registration_id": reg_id, "detail": "Registration not found"})
            continue
            
        if registration.status == "declined":
            errors.append({"registration_id": reg_id, "detail": "Declined registration cannot be checked in"})
            continue
            
        # Conflict check
        target_day = day if day is not None else 1
        days = list(registration.checked_in_days) if isinstance(registration.checked_in_days, list) else []
        was_checked_in = target_day in days
        
        if was_checked_in:
            conflicts.append({
                "registration_id": reg_id,
                "first_name": registration.attendee.first_name,
                "last_name": registration.attendee.last_name,
                "detail": f"Already checked in for Day {target_day} on server"
            })
            continue
            
        try:
            registration = perform_checkin_logic(registration, day, mode, session)
            session.add(registration)
            session.commit()
            session.refresh(registration)
            
            # Fire webhook
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
                "checked_in_days": registration.checked_in_days if isinstance(registration.checked_in_days, list) else [],
                "offline_timestamp": timestamp_str
            }
            trigger_webhooks("checkin.created", webhook_payload, session, background_tasks, client_id=event.client_id)
            
            synced.append({
                "id": str(registration.id),
                "first_name": registration.attendee.first_name,
                "last_name": registration.attendee.last_name,
                "checked_in": registration.checked_in,
                "checked_in_days": registration.checked_in_days
            })
        except Exception as e:
            session.rollback()
            errors.append({"registration_id": reg_id, "detail": f"Database error: {str(e)}"})
            
    return {
        "ok": True,
        "synced": synced,
        "conflicts": conflicts,
        "errors": errors
    }
