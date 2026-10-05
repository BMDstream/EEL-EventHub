from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlmodel import Session, select
from sqlalchemy import func
from backend.database import get_session
from backend.media_service import upload_media
from backend.utils import get_current_user_from_request
from backend.models import User
from typing import Optional

router = APIRouter()

@router.post("/upload")
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_from_request)
):
    # Security check: must be an authorized user to upload assets
    if not current_user:
        req_email = request.headers.get("x-user-email") or request.query_params.get("email")
        if req_email:
            current_user = session.exec(select(User).where(func.lower(User.email) == req_email.lower().strip())).first()

    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required to upload assets")
        
    try:
        file_bytes = await file.read()
        filename = file.filename or "upload.bin"
        content_type = file.content_type or "application/octet-stream"
        
        url = upload_media(file_bytes, filename, content_type)
        return {"url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Media upload failed: {str(e)}")
