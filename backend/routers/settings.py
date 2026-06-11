from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from sqlalchemy import text
from typing import List, Dict, Any, Optional

from backend.database import get_session
from backend.models import User, Client, SystemSetting, Event, EmailTemplate
from backend.utils import get_current_user_from_request
from datetime import datetime
from pydantic import BaseModel

router = APIRouter()

@router.get("/settings/sender-domains", response_model=List[str])
def get_sender_domains(
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can list sender domains")
    
    import os
    import resend
    
    resend.api_key = os.getenv("RESEND_API_KEY")
    mock_email = os.getenv("MOCK_EMAIL_SERVICE", "false").lower() == "true"
    
    domains_list = []
    if resend.api_key and not mock_email:
        try:
            res = resend.Domains.list()
            if hasattr(res, "data") and res.data:
                for item in res.data:
                    if hasattr(item, "name"):
                        domains_list.append(item.name)
                    elif isinstance(item, dict) and "name" in item:
                        domains_list.append(item["name"])
            elif isinstance(res, dict) and "data" in res:
                for item in res["data"]:
                    if isinstance(item, dict) and "name" in item:
                        domains_list.append(item["name"])
        except Exception as e:
            print(f"Error fetching domains from Resend: {e}")
            
    if not domains_list:
        domains_list = ["eelogistics.co.za", "bmdcomputing.com"]
        
    sender_emails = [f"events@{domain}" for domain in domains_list]
    return sender_emails



@router.get("/clients", response_model=List[Client])
def get_clients(
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    if current_user.role == "admin":
        return session.exec(select(Client)).all()
    return current_user.clients

@router.post("/clients", response_model=Client)
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

@router.get("/clients/{client_id}", response_model=Client)
def get_client_by_id(client_id: int, session: Session = Depends(get_session)):
    client = session.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client

@router.put("/clients/{client_id}", response_model=Client)
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

@router.delete("/clients/{client_id}")
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

@router.get("/users/{user_id}/clients", response_model=List[Client])
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

@router.post("/users/{user_id}/clients")
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
    
    client_ids = payload.get("client_ids")
    client_roles = payload.get("client_roles")
    
    session.execute(text('DELETE FROM "userclientlink" WHERE user_id = :user_id'), {"user_id": user_id})
    session.commit()
    
    if client_roles is not None:
        for cr in client_roles:
            c_id = cr.get("client_id")
            role = cr.get("role", "staff")
            client = session.get(Client, c_id)
            if client:
                session.execute(
                    text('INSERT INTO "userclientlink" (user_id, client_id, role) VALUES (:user_id, :client_id, :role)'),
                    {"user_id": user_id, "client_id": c_id, "role": role}
                )
    elif client_ids is not None:
        for c_id in client_ids:
            client = session.get(Client, c_id)
            if client:
                session.execute(
                    text('INSERT INTO "userclientlink" (user_id, client_id, role) VALUES (:user_id, :client_id, :role)'),
                    {"user_id": user_id, "client_id": c_id, "role": "staff"}
                )
    session.commit()
    return {"ok": True}

# Pydantic models for request bodies
class EmailTemplateUpdate(BaseModel):
    subject: str
    body_html: str

class SendTestEmailPayload(BaseModel):
    email: str

@router.get("/settings/templates", response_model=List[EmailTemplate])
def get_all_templates(
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user or current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view email templates")
    
    # Self-healing: Check if any default templates are missing and seed them on the fly
    from backend.default_templates import DEFAULT_TEMPLATES
    existing_templates = session.exec(select(EmailTemplate)).all()
    existing_keys = {t.key for t in existing_templates}
    
    added_any = False
    for key, val in DEFAULT_TEMPLATES.items():
        if key not in existing_keys:
            new_template = EmailTemplate(
                key=key,
                name=val["name"],
                subject=val["subject"],
                body_html=val["body_html"]
            )
            session.add(new_template)
            added_any = True
            
    if added_any:
        try:
            session.commit()
            # Refresh list
            existing_templates = session.exec(select(EmailTemplate)).all()
        except Exception as e:
            session.rollback()
            print(f"Error seeding missing templates: {e}")
            
    return existing_templates

@router.get("/settings/templates/{key}", response_model=EmailTemplate)
def get_template(
    key: str,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user or current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view email templates")
    template = session.exec(select(EmailTemplate).where(EmailTemplate.key == key)).first()
    if not template:
        # Self-healing: Check if this is a default template and seed it
        from backend.default_templates import DEFAULT_TEMPLATES
        if key in DEFAULT_TEMPLATES:
            val = DEFAULT_TEMPLATES[key]
            template = EmailTemplate(
                key=key,
                name=val["name"],
                subject=val["subject"],
                body_html=val["body_html"]
            )
            session.add(template)
            try:
                session.commit()
                session.refresh(template)
            except Exception as e:
                session.rollback()
                raise HTTPException(status_code=500, detail=f"Failed to auto-seed template: {e}")
        else:
            raise HTTPException(status_code=404, detail="Email template not found")
    return template

@router.put("/settings/templates/{key}", response_model=EmailTemplate)
def update_template(
    key: str,
    payload: EmailTemplateUpdate,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user or current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can edit email templates")
    template = session.exec(select(EmailTemplate).where(EmailTemplate.key == key)).first()
    if not template:
        raise HTTPException(status_code=404, detail="Email template not found")
    
    template.subject = payload.subject
    template.body_html = payload.body_html
    template.updated_at = datetime.utcnow()
    
    session.add(template)
    session.commit()
    session.refresh(template)
    return template

@router.post("/settings/templates/{key}/reset", response_model=EmailTemplate)
def reset_template(
    key: str,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user or current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can reset email templates")
    template = session.exec(select(EmailTemplate).where(EmailTemplate.key == key)).first()
    if not template:
        raise HTTPException(status_code=404, detail="Email template not found")
    
    from backend.default_templates import DEFAULT_TEMPLATES
    if key not in DEFAULT_TEMPLATES:
        raise HTTPException(status_code=400, detail="Default template not configured for this key")
        
    default_t = DEFAULT_TEMPLATES[key]
    template.subject = default_t["subject"]
    template.body_html = default_t["body_html"]
    template.updated_at = datetime.utcnow()
    
    session.add(template)
    session.commit()
    session.refresh(template)
    return template

@router.post("/settings/templates/{key}/test")
def test_send_template(
    key: str,
    payload: SendTestEmailPayload,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user or current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can send test emails")
    
    # Verify template exists
    template = session.exec(select(EmailTemplate).where(EmailTemplate.key == key)).first()
    if not template:
        raise HTTPException(status_code=404, detail="Email template not found")
        
    from backend.email_service import send_confirmation_email, send_broadcast_email
    from backend.routers.tournament import send_resend_email
    
    test_email = payload.email
    success = False
    details = ""
    
    try:
        if key == "registration_confirmed":
            res = send_confirmation_email(
                to_email=test_email,
                first_name="John",
                event_title="Padels Tournament 2026",
                clearance_id="ABCDEF",
                event_details={"start_date": "2026-06-25T10:00:00Z", "location": "Arena Center", "address": "123 Padel Court Way"},
                is_attending=True
            )
            success = res is not None
            details = f"Confirmation email send result: {res}"
        elif key == "registration_declined":
            res = send_confirmation_email(
                to_email=test_email,
                first_name="John",
                event_title="Padels Tournament 2026",
                clearance_id="ABCDEF",
                is_attending=False
            )
            success = res is not None
            details = f"Decline email send result: {res}"
        elif key == "partner_pending":
            res = send_confirmation_email(
                to_email=test_email,
                first_name="John",
                event_title="Padels Tournament 2026",
                clearance_id="ABCDEF",
                is_attending=True,
                profile_update_link="https://events.eelogistics.co.za/update/ABCDEF"
            )
            success = res is not None
            details = f"Partner details pending email send result: {res}"
        elif key == "broadcast":
            res = send_broadcast_email(
                registrations_data=[{"email": test_email, "first_name": "John", "last_name": "Doe", "pin": "123456"}],
                subject="Test Broadcast Subject",
                body="This is a test broadcast email message. Custom variables like {first_name} parse automatically.",
                event_title="Padels Tournament 2026",
                signature="Event Logistics Admin Team",
                event_details={"start_date": "2026-06-25T10:00:00Z", "location": "Arena Center"}
            )
            success = res is True
            details = f"Broadcast dispatch status: {res}"
        elif key == "tournament_matchup":
            res = send_resend_email(
                to_email=test_email,
                name="John Doe",
                role="Challenger",
                opponent_name="Jane Smith",
                pin="123456",
                qr_hash="test-qr-hash",
                profile_update_link="https://events.eelogistics.co.za/update/ABCDEF"
            )
            success = res is not None
            details = f"Tournament matchup send result: {res}"
        else:
            raise HTTPException(status_code=400, detail="Unknown template key")
            
        return {"status": "success", "success": success, "details": details}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send test email: {str(e)}")

@router.get("/settings/{key}")
def get_setting(
    key: str,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    setting = session.exec(select(SystemSetting).where(SystemSetting.key == key)).first()
    if not setting:
        return {"key": key, "value": {}}
    return setting

@router.put("/settings/{key}")
def update_setting(
    key: str,
    data: Dict[str, Any],
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user or current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Clearance level not met to update settings")
    setting = session.exec(select(SystemSetting).where(SystemSetting.key == key)).first()
    if not setting:
        setting = SystemSetting(key=key, value=data)
    else:
        setting.value = data
    session.add(setting)
    session.commit()
    session.refresh(setting)
    return setting
