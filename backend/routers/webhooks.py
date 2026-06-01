from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlmodel import Session, select
from typing import List, Dict, Any, Optional
import hmac
import hashlib
import json
import requests
import secrets
from datetime import datetime

from backend.database import get_session
from backend.models import User, WebhookSubscription, Client
from backend.utils import get_current_user_from_request, verify_client_access

router = APIRouter()

# --- Signature Verification Helper ---
def sign_payload(payload_bytes: bytes, secret: str) -> str:
    """Generate HMAC-SHA256 signature for the payload bytes."""
    return hmac.new(secret.encode(), payload_bytes, hashlib.sha256).hexdigest()

def send_webhook_request(url: str, secret: str, event_type: str, payload: dict):
    """Sends the HTTP POST request to the webhook URL with HMAC-SHA256 signature."""
    payload_data = {
        "event": event_type,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "data": payload
    }
    try:
        payload_bytes = json.dumps(payload_data).encode("utf-8")
        signature = sign_payload(payload_bytes, secret)
        headers = {
            "Content-Type": "application/json",
            "X-EEL-Signature": signature,
            "X-EEL-Event": event_type
        }
        res = requests.post(url, headers=headers, data=payload_bytes, timeout=10)
        print(f"Webhook dispatch to {url} status: {res.status_code}")
    except Exception as e:
        print(f"Webhook dispatch failed to {url}: {e}")

def trigger_webhooks(
    event_type: str,
    payload: dict,
    session: Session,
    background_tasks: BackgroundTasks,
    client_id: Optional[int] = None
):
    """
    Finds active webhook subscriptions matching the event and client,
    and dispatches them asynchronously.
    """
    query = select(WebhookSubscription).where(WebhookSubscription.is_active == True)
    if client_id is not None:
        query = query.where(
            (WebhookSubscription.client_id == client_id) | (WebhookSubscription.client_id == None)
        )
    subscriptions = session.exec(query).all()
    
    for sub in subscriptions:
        if not sub.event_types or event_type in sub.event_types or "*" in sub.event_types:
            background_tasks.add_task(
                send_webhook_request,
                url=sub.url,
                secret=sub.secret,
                event_type=event_type,
                payload=payload
            )

# --- CRUD Webhook Endpoints ---
@router.get("", response_model=List[WebhookSubscription])
def get_webhook_subscriptions(
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    if current_user.role == "admin":
        return session.exec(select(WebhookSubscription)).all()
    elif current_user.role == "manager":
        # Get allowed clients for manager
        from sqlalchemy import text
        stmt = text('SELECT client_id FROM "userclientlink" WHERE user_id = :user_id')
        rows = session.execute(stmt, {"user_id": current_user.id}).all()
        allowed_client_ids = [row[0] for row in rows]
        return session.exec(select(WebhookSubscription).where(WebhookSubscription.client_id.in_(allowed_client_ids))).all()
    else:
        raise HTTPException(status_code=403, detail="Forbidden: Staff cannot manage webhooks")

@router.post("", response_model=WebhookSubscription, status_code=status.HTTP_201_CREATED)
def create_webhook_subscription(
    subscription: WebhookSubscription,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if current_user.role != "admin":
        if current_user.role == "manager":
            verify_client_access(current_user, subscription.client_id, session)
        else:
            raise HTTPException(status_code=403, detail="Forbidden: Only admin or managers can register webhooks")
            
    # Auto-generate a signing secret if not provided
    if not subscription.secret:
        subscription.secret = secrets.token_hex(32)
        
    session.add(subscription)
    session.commit()
    session.refresh(subscription)
    return subscription

@router.get("/{subscription_id}", response_model=WebhookSubscription)
def get_webhook_subscription(
    subscription_id: int,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    sub = session.get(WebhookSubscription, subscription_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Webhook subscription not found")
    
    if current_user.role != "admin":
        if current_user.role == "manager":
            verify_client_access(current_user, sub.client_id, session)
        else:
            raise HTTPException(status_code=403, detail="Forbidden")
    return sub

@router.put("/{subscription_id}", response_model=WebhookSubscription)
def update_webhook_subscription(
    subscription_id: int,
    sub_data: WebhookSubscription,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    db_sub = session.get(WebhookSubscription, subscription_id)
    if not db_sub:
        raise HTTPException(status_code=404, detail="Webhook subscription not found")
        
    if current_user.role != "admin":
        if current_user.role == "manager":
            verify_client_access(current_user, db_sub.client_id, session)
            if sub_data.client_id != db_sub.client_id:
                verify_client_access(current_user, sub_data.client_id, session)
        else:
            raise HTTPException(status_code=403, detail="Forbidden")
            
    for key, value in sub_data.dict(exclude_unset=True).items():
        if key != "id":
            setattr(db_sub, key, value)
            
    session.add(db_sub)
    session.commit()
    session.refresh(db_sub)
    return db_sub

@router.delete("/{subscription_id}")
def delete_webhook_subscription(
    subscription_id: int,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    sub = session.get(WebhookSubscription, subscription_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Webhook subscription not found")
        
    if current_user.role != "admin":
        if current_user.role == "manager":
            verify_client_access(current_user, sub.client_id, session)
        else:
            raise HTTPException(status_code=403, detail="Forbidden")
            
    session.delete(sub)
    session.commit()
    return {"ok": True}
