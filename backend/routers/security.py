from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, desc
from typing import List, Dict, Any, Optional
from datetime import datetime

from backend.database import get_session
from backend.models import User, UserSession, AuditLog
from backend.utils import get_current_user_from_request

router = APIRouter()

@router.get("/sessions", response_model=List[Dict[str, Any]])
def get_active_sessions(
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user or current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin authorization required")
        
    sessions = session.exec(
        select(UserSession).order_by(desc(UserSession.last_active))
    ).all()
    
    return [s.dict() for s in sessions]

@router.get("/logs", response_model=Dict[str, Any])
def get_audit_logs(
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    if not current_user or current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin authorization required")
        
    query = select(AuditLog)
    
    if search:
        search_term = f"%{search.lower()}%"
        # Since SQLModel supports SQL statements, we filter search terms on email/action/description
        from sqlalchemy import func
        query = query.where(
            func.lower(AuditLog.user_email).like(search_term) |
            func.lower(AuditLog.action).like(search_term) |
            func.lower(AuditLog.description).like(search_term)
        )
        
    # Count total matching records
    from sqlalchemy import select as sa_select
    count_query = sa_select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()
    
    # Fetch paginated results
    logs = session.exec(
        query.order_by(desc(AuditLog.timestamp)).offset(offset).limit(limit)
    ).all()
    
    return {
        "total": total,
        "logs": [l.dict() for l in logs]
    }
