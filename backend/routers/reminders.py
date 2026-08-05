from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlmodel import Session, select
from typing import Optional, Dict, Any
from backend.database import get_session
from backend.models import Event, User, Registration, Attendee
from backend.utils import get_current_user_from_request, verify_event_access, get_event_email_config, log_audit
from backend.tasks import dispatch_send_confirmation_email, dispatch_send_confirmation_sms

router = APIRouter()

@router.post("/events/{event_id}/remind", status_code=status.HTTP_200_OK)
def send_pre_event_reminders(
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
        
    verify_event_access(current_user, event, session)
    
    # Fetch all active/confirmed registrations for the event
    registrations = session.exec(
        select(Registration)
        .where(Registration.event_id == event_id)
        .where(Registration.status == "confirmed")
    ).all()
    
    if not registrations:
        return {"status": "success", "sent_count": 0, "message": "No confirmed registrants to remind."}
        
    config = get_event_email_config(event, session)
    
    # Adjust heading text to signify this is a reminder
    reminder_config = config.copy()
    original_heading = reminder_config.get("heading_text", "Access Granted.")
    if not original_heading.lower().startswith("reminder:"):
        reminder_config["heading_text"] = f"Reminder: {original_heading}"
        
    sent_count_email = 0
    sent_count_sms = 0
    
    for reg in registrations:
        attendee = session.get(Attendee, reg.attendee_id)
        if not attendee:
            continue
            
        # Send Email Reminder
        if attendee.email:
            dispatch_send_confirmation_email(
                background_tasks=background_tasks,
                to_email=attendee.email,
                first_name=attendee.first_name,
                event_title=event.title,
                clearance_id=reg.pin,
                event_details={
                    "start_date": event.start_date,
                    "location": event.location,
                    "address": event.address
                },
                config=reminder_config,
                is_attending=True,
                registration_id=str(reg.id)
            )
            sent_count_email += 1
            
        # Send SMS Reminder if enabled for the event and phone number exists
        if getattr(event, "send_sms", False) and attendee.phone:
            dispatch_send_confirmation_sms(
                background_tasks=background_tasks,
                to_phone=attendee.phone,
                first_name=attendee.first_name,
                event_title=event.title,
                clearance_id=str(reg.id),
                pin=reg.pin,
                event_slug=event.slug
            )
            sent_count_sms += 1
            
    # Log to audit trail
    log_audit(
        user_email=current_user.email,
        action="send_pre_event_reminders",
        description=f"Sent {sent_count_email} email and {sent_count_sms} SMS reminders for event {event.title}.",
        event_id=event.id
    )
            
    return {
        "status": "success", 
        "sent_emails": sent_count_email, 
        "sent_sms": sent_count_sms,
        "message": f"Successfully queued {sent_count_email} emails and {sent_count_sms} SMS reminders."
    }
