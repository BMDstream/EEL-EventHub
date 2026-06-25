from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlmodel import Session, select
from sqlalchemy import func
from backend.database import get_session
from backend.models import User
import os
import requests
from datetime import datetime, timedelta
from jose import jwt
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

# Azure Configuration
CLIENT_ID = os.getenv("AZURE_AD_CLIENT_ID")
CLIENT_SECRET = os.getenv("AZURE_AD_CLIENT_SECRET")
TENANT_ID = os.getenv("AZURE_AD_TENANT_ID", "common")
# Redirect URI for local development or production
# This should match what's registered in Azure Portal
BASE_URL = os.getenv("NEXTAUTH_URL", "http://localhost:3000").rstrip("/")
REDIRECT_URI = f"{BASE_URL}/api/py/auth/azure/callback"

# Local JWT Configuration
SECRET_KEY = os.getenv("NEXTAUTH_SECRET", "your-secret-key")
ALGORITHM = "HS256"

@router.get("/azure/login")
async def azure_login(request: Request):
    """
    Constructs the Microsoft Login URL and redirects the user.
    """
    x_forwarded_proto = request.headers.get("x-forwarded-proto", "https")
    x_forwarded_host = request.headers.get("x-forwarded-host")
    if x_forwarded_host:
        base_url = f"{x_forwarded_proto}://{x_forwarded_host}"
    else:
        base_url = str(request.base_url).rstrip("/")
    redirect_uri = f"{base_url}/api/py/auth/azure/callback"

    scope = "User.Read openid profile email"
    auth_url = (
        f"https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/authorize"
        f"?client_id={CLIENT_ID}"
        f"&response_type=code"
        f"&redirect_uri={redirect_uri}"
        f"&response_mode=query"
        f"&scope={scope}"
    )
    return RedirectResponse(url=auth_url)

@router.get("/azure/callback")
async def azure_callback(request: Request, code: str, session: Session = Depends(get_session)):
    """
    Handles the callback from Microsoft, exchanges code for token,
    fetches user info, and redirects back to frontend with local JWT.
    """
    if not code:
        raise HTTPException(status_code=400, detail="Authorization code missing")

    x_forwarded_proto = request.headers.get("x-forwarded-proto", "https")
    x_forwarded_host = request.headers.get("x-forwarded-host")
    if x_forwarded_host:
        base_url = f"{x_forwarded_proto}://{x_forwarded_host}"
    else:
        base_url = str(request.base_url).rstrip("/")
    redirect_uri = f"{base_url}/api/py/auth/azure/callback"

    # 1. Exchange Code for Access Token
    token_url = f"https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/token"
    data = {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "code": code,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }
    
    token_response = requests.post(token_url, data=data)
    if not token_response.ok:
        print(f"Token Exchange Error: {token_response.text}")
        raise HTTPException(status_code=400, detail="Failed to exchange token")
    
    token_data = token_response.json()
    access_token = token_data.get("access_token")

    # 2. Get User Profile from Microsoft Graph
    graph_url = "https://graph.microsoft.com/v1.0/me"
    headers = {"Authorization": f"Bearer {access_token}"}
    user_response = requests.get(graph_url, headers=headers)
    
    if not user_response.ok:
        print(f"Graph API Error: {user_response.text}")
        raise HTTPException(status_code=400, detail="Failed to fetch user profile")
    
    user_info = user_response.json()
    email = user_info.get("mail") or user_info.get("userPrincipalName")
    
    if not email:
        raise HTTPException(status_code=400, detail="Email not found in Microsoft profile")

    # 3. Match with Local DB
    user = session.exec(select(User).where(func.lower(User.email) == email.lower())).first()
    
    if not user:
        # Optionally create user if not exists, but usually for admin panels 
        # we want to ensure they are already invited/added.
        # For now, let's create a staff user if they don't exist
        user = User(
            email=email.lower(),
            role="staff",
            is_active=True
        )
        session.add(user)
        session.commit()
        session.refresh(user)

    # 4. Generate Local JWT Token
    expire = datetime.utcnow() + timedelta(hours=24)
    client_slugs = [c.slug for c in user.clients]
    to_encode = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "allowed_clients": client_slugs,
        "exp": expire
    }
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    # 5. Return to Frontend
    frontend_url = f"{base_url}/?token={encoded_jwt}"
    return RedirectResponse(url=frontend_url)

@router.get("/verify")
async def verify_token(token: str):
    """
    Verifies a local JWT and returns the user info.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
