from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from sqlalchemy import func
from typing import List, Dict, Any, Optional

from backend.database import get_session
from backend.models import User
from backend.utils import (
    get_current_user_from_request,
    hash_password
)

router = APIRouter()

@router.get("", response_model=List[Dict[str, Any]])
def read_users(
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user or current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view users")
    users = session.exec(select(User)).all()
    result = []
    from sqlalchemy import text
    for user in users:
        u_dict = user.dict()
        u_dict["password"] = None  # Security check: redact passwords
        
        clients_enriched = []
        for client in user.clients:
            c_dict = client.dict()
            link = session.execute(
                text('SELECT role FROM "userclientlink" WHERE user_id = :user_id AND client_id = :client_id'),
                {"user_id": user.id, "client_id": client.id}
            ).first()
            c_dict["role"] = link[0] if link else "staff"
            clients_enriched.append(c_dict)
            
        u_dict["clients"] = clients_enriched
        result.append(u_dict)
    return result

@router.post("", response_model=User)
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

@router.post("/bulk")
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

@router.get("/me", response_model=User)
def get_current_user(email: str, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(func.lower(User.email) == email.lower())).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/{user_id}", response_model=User)
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

@router.delete("/{user_id}")
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
