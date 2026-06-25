import re
import os
import random
import string
from uuid import UUID, uuid4
from datetime import datetime
from typing import Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator, ValidationInfo
from sqlmodel import SQLModel, Field, Session, select
import resend

from backend.database import get_session
from backend.email_service import get_template_from_db, parse_template, parse_template_meta

# Create FastAPI Router
router = APIRouter(prefix="/api/py/tournament", tags=["tournament"])

# ---------------------------------------------------------
# 1. SQLModel Database Entities
# ---------------------------------------------------------

class Player(SQLModel, table=True):
    __tablename__ = "players"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    email: str = Field(unique=True, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

class EventCheckin(SQLModel, table=True):
    __tablename__ = "event_checkins"
    id: Optional[int] = Field(default=None, primary_key=True)
    player_id: int = Field(foreign_key="players.id", nullable=False)
    qr_hash: UUID = Field(default_factory=uuid4, unique=True, index=True, nullable=False)
    pin: str = Field(max_length=6, nullable=False)
    checked_in: bool = Field(default=False, nullable=False)
    checked_in_at: Optional[datetime] = Field(default=None, nullable=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

class Match(SQLModel, table=True):
    __tablename__ = "matches"
    id: Optional[int] = Field(default=None, primary_key=True)
    challenger_id: int = Field(foreign_key="players.id", nullable=False)
    partner_id: int = Field(foreign_key="players.id", nullable=False)
    status: str = Field(default="pending", nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

# ---------------------------------------------------------
# 2. Pydantic Payload Schemas
# ---------------------------------------------------------

email_regex = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

class DualRegistrationRequest(BaseModel):
    challenger_name: str
    challenger_email: str
    partner_name: str
    partner_email: str

    @field_validator("challenger_name", "partner_name")
    def validate_name_not_empty(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Name cannot be empty")
        return cleaned

    @field_validator("challenger_email", "partner_email")
    def validate_email(cls, v: str) -> str:
        cleaned = v.strip().lower()
        if not email_regex.match(cleaned):
            raise ValueError("Invalid email address format")
        return cleaned

    @field_validator("partner_email")
    def validate_different_emails(cls, v: str, info: ValidationInfo) -> str:
        challenger_email = info.data.get("challenger_email")
        if challenger_email and v.strip().lower() == challenger_email.strip().lower():
            raise ValueError("Challenger and Partner emails cannot be the same")
        return v.strip().lower()

# ---------------------------------------------------------
# 3. Helper Functions
# ---------------------------------------------------------

def generate_backup_pin() -> str:
    """Generates a secure 6-digit numeric PIN code."""
    return "".join(random.choices(string.digits, k=6))

def send_resend_email(to_email: str, name: str, role: str, opponent_name: str, pin: str, qr_hash: str, profile_update_link: Optional[str] = None) -> Optional[str]:
    """Sends a tournament matchup pass email, checking the database for the customizable template first."""
    resend.api_key = os.getenv("RESEND_API_KEY")
    mock_email = os.getenv("MOCK_EMAIL_SERVICE", "false").lower() == "true"
    
    qr_img_url = f"https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={qr_hash}"
    
    subject = f"Tournament Registration Confirmed: {role} Pass"
    
    button_html = ""
    if profile_update_link:
        button_html = f"""
        <div style="text-align: center; margin-top: 10px; margin-bottom: 30px;">
            <a href="{profile_update_link}" target="_blank" style="background-color: #eab308; color: #000000; padding: 14px 28px; border-radius: 12px; font-size: 13px; font-weight: 900; text-decoration: none; text-transform: uppercase; letter-spacing: 0.1em; display: inline-block; box-shadow: 0 4px 12px rgba(234,179,8,0.2);">
                Update Your Ticket Details
            </a>
            <p style="font-size: 11px; color: #64748b; margin-top: 10px; margin-bottom: 0; font-weight: 500;">
                Dietary requirements, T-shirt size, and options.
            </p>
        </div>
        """

    html_content = f"""
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #030712; color: #ffffff; padding: 40px; border-radius: 24px; max-width: 600px; margin: 0 auto; border: 1px solid #1f2937;">
        <div style="text-align: center; margin-bottom: 30px;">
            <span style="background-color: #eab308; color: #000000; padding: 8px 16px; border-radius: 12px; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.25em;">Tournament Dispatch</span>
        </div>
        
        <h2 style="font-size: 28px; font-weight: 900; color: #ffffff; margin-bottom: 10px; font-style: italic; text-transform: uppercase; letter-spacing: -0.02em; text-align: center;">
            Championship <span style="color: #eab308;">Access Granted</span>
        </h2>
        
        <p style="font-size: 16px; color: #9ca3af; text-align: center; margin-bottom: 30px; font-weight: 500;">
            Hello <strong>{name}</strong>, you have been registered as the <strong>{role}</strong>.
        </p>
 
        <div style="background-color: #090d16; border: 1px solid #1e293b; border-radius: 20px; padding: 24px; margin-bottom: 30px; text-align: center;">
            <p style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; color: #eab308; margin: 0 0 10px 0;">Partnered With</p>
            <p style="font-size: 18px; font-weight: 800; color: #ffffff; margin: 0;">{name} vs {opponent_name}</p>
            <p style="font-size: 13px; color: #64748b; margin: 5px 0 0 0;">Sports Tournament Series</p>
        </div>
 
        <div style="background-color: #ffffff; padding: 32px; border-radius: 20px; text-align: center; margin-bottom: 30px; box-shadow: 0 10px 25px rgba(0,0,0,0.3);">
            <img src="{qr_img_url}" width="200" height="200" alt="Check-in QR Code" style="display: block; margin: 0 auto 20px auto; border-radius: 12px;" />
            <p style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.25em; color: #64748b; margin: 0 0 8px 0;">Backup Clearance PIN</p>
            <div style="display: inline-block; background-color: #f1f5f9; padding: 8px 20px; border-radius: 10px; border: 1.5px solid #0f172a;">
                <code style="font-size: 24px; font-weight: 900; color: #0f172a; letter-spacing: 0.15em;">{pin}</code>
            </div>
        </div>

        {button_html}
 
        <div style="background-color: #1c1917; padding: 20px; border-radius: 16px; border: 1px solid #292524; text-align: center; margin-bottom: 30px;">
            <p style="color: #e7e5e4; font-size: 12px; font-weight: 600; margin: 0; line-height: 1.5;">
                Present this QR code or backup PIN at the venue gates for terminal clearance.
            </p>
        </div>
 
        <hr style="border: 0; border-top: 1px solid #1f2937; margin: 30px 0;" />
        
        <div style="text-align: center;">
            <p style="font-size: 10px; color: #4b5563; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.15em;">
                Automated Tournament Clearance System • Secure Tier Level 4
            </p>
            <p style="font-size: 8px; color: #374151; margin: 0;">
                This transmission is confidential and intended solely for {to_email}.
            </p>
        </div>
    </div>
    """

    db_subject = None
    db_html = None
    
    # Load global email settings config for dynamic font styling and sender options
    font_family = "Calibri, sans-serif"
    font_size = "16px"
    sender_name = "Tournament Hub"
    sender_email = "events@eelogistics.co.za"
    try:
        from backend.database import engine
        from backend.models import SystemSetting
        with Session(engine) as db_session:
            email_setting = db_session.exec(select(SystemSetting).where(SystemSetting.key == "email_config")).first()
            if email_setting and email_setting.value:
                font_family = email_setting.value.get("font_family", "Calibri, sans-serif")
                font_size = email_setting.value.get("font_size", "16px")
                if email_setting.value.get("sender_name"):
                    sender_name = email_setting.value["sender_name"]
                if email_setting.value.get("sender_email"):
                    sender_email = email_setting.value["sender_email"]
    except Exception as db_err:
        print(f"Error fetching global email config for tournament email: {db_err}")

    try:
        db_template = get_template_from_db("tournament_matchup")
        if db_template:
            variables = {
                "name": name,
                "role": role,
                "opponent_name": opponent_name,
                "pin": pin,
                "qr_code_url": qr_img_url,
                "button_html": button_html,
                "event_title": "Sports Tournament Series",
                "to_email": to_email,
                "font_family": font_family,
                "font_size": font_size
            }
            db_subject = parse_template(db_template.subject, variables)
            db_html = parse_template(db_template.body_html, variables)
    except Exception as ex:
        print(f"Error applying database template override: {ex}")

    if not resend.api_key or mock_email:
        if db_subject and db_html:
            print(f"MOCK EMAIL (DB Template): Sent to {to_email} (Role: {role}). Subject: {db_subject}")
        else:
            print(f"MOCK EMAIL: Sent to {to_email} (Role: {role}). QR Hash: {qr_hash}, PIN: {pin}")
        return "mock-email-id"

    try:
        db_template = get_template_from_db("tournament_matchup")
        if db_template:
            meta = parse_template_meta(db_template.body_html)
            if meta and meta.get("sender_name"):
                sender_name = meta["sender_name"]
                
        email_params = {
            "from": f"{sender_name} <{sender_email}>",
            "to": to_email,
            "subject": db_subject if (db_subject and db_html) else subject,
            "html": db_html if (db_subject and db_html) else html_content
        }
        res = resend.Emails.send(email_params)
        print(f"Resend success for {to_email}: {res}")
        return res.get("id") if isinstance(res, dict) else str(res)
    except Exception as e:
        print(f"Resend dispatch error to {to_email}: {e}")
        return None

# ---------------------------------------------------------
# 4. Registration API Endpoint
# ---------------------------------------------------------

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_challenger_and_partner(
    payload: DualRegistrationRequest,
    session: Session = Depends(get_session)
):
    """
    Registers a Challenger and a Partner as players, creates check-in credentials
    for both players, and inserts a pending match linking them.
    All operations are committed atomically in a transaction block.
    Two check-in emails are sent via the Resend SDK.
    """
    try:
        # --- ATOMIC TRANSACTION BLOCK ---
        # 1. Upsert Challenger Player Profile
        challenger = session.exec(
            select(Player).where(Player.email == payload.challenger_email)
        ).first()
        if not challenger:
            challenger = Player(name=payload.challenger_name, email=payload.challenger_email)
        else:
            challenger.name = payload.challenger_name
        session.add(challenger)
        
        # 2. Upsert Partner Player Profile
        partner = session.exec(
            select(Player).where(Player.email == payload.partner_email)
        ).first()
        if not partner:
            partner = Player(name=payload.partner_name, email=payload.partner_email)
        else:
            partner.name = payload.partner_name
        session.add(partner)

        # Flush to generate database IDs for the players
        session.flush()

        # 3. Create Challenger Event Check-in Pass
        challenger_pin = generate_backup_pin()
        challenger_checkin = EventCheckin(
            player_id=challenger.id,
            qr_hash=uuid4(),
            pin=challenger_pin,
            checked_in=False
        )
        session.add(challenger_checkin)

        # 4. Create Partner Event Check-in Pass
        partner_pin = generate_backup_pin()
        partner_checkin = EventCheckin(
            player_id=partner.id,
            qr_hash=uuid4(),
            pin=partner_pin,
            checked_in=False
        )
        session.add(partner_checkin)

        # 5. Create Match Entity linking Challenger and Partner
        match = Match(
            challenger_id=challenger.id,
            partner_id=partner.id,
            status="pending"
        )
        session.add(match)

        # Commit all entities atomically
        session.commit()

        # Refresh objects to obtain generated timestamps and fields
        session.refresh(challenger)
        session.refresh(partner)
        session.refresh(challenger_checkin)
        session.refresh(partner_checkin)
        session.refresh(match)

    except Exception as e:
        session.rollback()
        print(f"Tournament registration database transaction failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database transaction failure: {e}"
        )

    # --- EMAIL DISPATCH BLOCK ---
    # Dispatch individual, branded emails containing QR code images & backup PINs
    challenger_email_id = send_resend_email(
        to_email=challenger.email,
        name=challenger.name,
        role="Challenger",
        opponent_name=partner.name,
        pin=challenger_checkin.pin,
        qr_hash=str(challenger_checkin.qr_hash)
    )

    partner_email_id = send_resend_email(
        to_email=partner.email,
        name=partner.name,
        role="Challenged Partner",
        opponent_name=challenger.name,
        pin=partner_checkin.pin,
        qr_hash=str(partner_checkin.qr_hash)
    )

    return {
        "status": "success",
        "message": "Tournament dual-registration processed successfully.",
        "match_id": match.id,
        "challenger": {
            "id": challenger.id,
            "name": challenger.name,
            "email": challenger.email,
            "pin": challenger_checkin.pin,
            "qr_hash": str(challenger_checkin.qr_hash),
            "email_dispatched": challenger_email_id is not None
        },
        "partner": {
            "id": partner.id,
            "name": partner.name,
            "email": partner.email,
            "pin": partner_checkin.pin,
            "qr_hash": str(partner_checkin.qr_hash),
            "email_dispatched": partner_email_id is not None
        }
    }
