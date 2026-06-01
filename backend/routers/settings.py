from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from sqlalchemy import text
from typing import List, Dict, Any, Optional

from backend.database import get_session
from backend.models import User, Client, SystemSetting, Event
from backend.utils import get_current_user_from_request

router = APIRouter()

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
    
    client_ids = payload.get("client_ids", [])
    if not isinstance(client_ids, list):
        raise HTTPException(status_code=422, detail="client_ids must be a list")
    
    session.execute(text('DELETE FROM "userclientlink" WHERE user_id = :user_id'), {"user_id": user_id})
    session.commit()
    
    for c_id in client_ids:
        client = session.get(Client, c_id)
        if client:
            session.execute(
                text('INSERT INTO "userclientlink" (user_id, client_id) VALUES (:user_id, :client_id)'),
                {"user_id": user_id, "client_id": c_id}
            )
    session.commit()
    return {"ok": True}
