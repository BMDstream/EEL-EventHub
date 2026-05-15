import os
import resend
import qrcode
import base64
from io import BytesIO
from typing import List, Dict, Any
from dotenv import load_dotenv

load_dotenv()

resend.api_key = os.getenv("RESEND_API_KEY")
MOCK_EMAIL_SERVICE = os.getenv("MOCK_EMAIL_SERVICE", "false").lower() == "true"

def generate_qr_base64(data: str):
    """Generates a QR code and returns it as a base64 string."""
    # Use standard settings to match the frontend look
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode()

def send_confirmation_email(to_email: str, first_name: str, event_title: str, clearance_id: str, qr_code_url: str = None):
    """Sends a registration confirmation email with an embedded QR code."""
    if not resend.api_key or MOCK_EMAIL_SERVICE:
        print(f"MOCK CONFIRMATION to {to_email}: Welcome to {event_title}! Your ID is {clearance_id}")
        return {"id": "mock-confirmation-id"}

    qr_base64 = generate_qr_base64(clearance_id)

    html_content = f"""
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 40px; border: 1px solid #f1f5f9; border-radius: 40px; background-color: #ffffff; color: #0f172a; box-shadow: 0 20px 50px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 48px;">
            <div style="display: inline-block; background: #0f172a; padding: 12px 28px; border-radius: 16px;">
                <span style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.4em; color: #ffffff;">Official Dispatch</span>
            </div>
        </div>

        <h2 style="font-size: 38px; font-weight: 900; color: #0f172a; margin-bottom: 28px; text-transform: uppercase; font-style: italic; letter-spacing: -0.04em; line-height: 1;">Access <span style="color: #94a3b8;">Granted.</span></h2>
        
        <p style="font-size: 17px; line-height: 1.7; margin-bottom: 40px; color: #475569;">
            Hello <strong>{first_name}</strong>,<br><br>
            Your orchestration for <strong>{event_title}</strong> has been authorized. Below are your secure credentials for terminal verification.
        </p>
        
        <div style="background: #f8fafc; padding: 48px; border-radius: 32px; text-align: center; border: 1px solid #f1f5f9; margin-bottom: 40px; position: relative; overflow: hidden;">
            <div style="position: absolute; top: -10px; right: -10px; font-size: 120px; font-weight: 900; color: #000; opacity: 0.02; font-style: italic;">EEL</div>
            <img src="data:image/png;base64,{qr_base64}" width="200" height="200" alt="Clearance QR Code" style="margin-bottom: 32px; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15);" />
            <p style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.3em; color: #64748b; margin-bottom: 16px;">Unique Clearance ID</p>
            <div style="display: inline-block; background: #ffffff; padding: 16px 32px; border-radius: 20px; border: 2px solid #0f172a;">
                <code style="font-size: 32px; font-weight: 900; color: #0f172a; letter-spacing: 0.25em;">{clearance_id}</code>
            </div>
        </div>

        <div style="background: #fffbeb; padding: 28px; border-radius: 24px; border: 1px solid #fef3c7; margin-bottom: 48px; text-align: center;">
            <p style="color: #b45309; font-size: 14px; font-weight: 700; margin: 0; line-height: 1.5; text-transform: uppercase; letter-spacing: 0.05em;">
                Present this digital clearance at the registration desk.
            </p>
        </div>
        
        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-bottom: 40px;" />
        
        <div style="text-align: center;">
            <p style="font-size: 11px; color: #94a3b8; margin-bottom: 32px; line-height: 1.6;">
                Automated Event Management System<br>
                Security Tier: Level 4 Authorized
            </p>
            <p style="font-size: 9px; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.1em;">
                Confidentiality Notice: This dispatch is intended solely for {to_email}.
            </p>
        </div>
    </div>
    """

    try:
        r = resend.Emails.send({
            "from": "EEL-EventHub <events@eelogistics.co.za>",
            "to": to_email,
            "subject": f"Access Granted: {event_title}",
            "html": html_content,
            "headers": {
                "X-Entity-Ref-ID": clearance_id
            }
        })
        print(f"RESEND SUCCESS: {r}")
        return r
    except Exception as e:
        print(f"Failed to send email: {e}")
        return None

def send_broadcast_email(to_emails: List[str], subject: str, body: str, event_title: str, signature: str = None):
    """Sends a broadcast email to multiple attendees."""
    if not resend.api_key or MOCK_EMAIL_SERVICE:
        print(f"MOCK BROADCAST to {len(to_emails)} users: {subject}")
        return True

    signature_html = f'<div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-style: italic; color: #64748b;">{signature.replace("\r\n", "<br>").replace("\n", "<br>")}</div>' if signature else ""

    html_content = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 40px; border: 1px solid #eee; border-radius: 20px;">
        <h2 style="color: #0f172a; text-transform: uppercase; font-style: italic;">Update: {event_title}</h2>
        <div style="line-height: 1.6; color: #334155;">
            {body.replace("\r\n", "<br>").replace("\n", "<br>")}
        </div>
        {signature_html}
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
    </div>
    """

    try:
        for email in to_emails:
            resend.Emails.send({
                "from": "EEL-EventHub <events@eelogistics.co.za>",
                "to": email,
                "subject": subject,
                "html": html_content
            })
        return True
    except Exception as e:
        print(f"Failed to send broadcast: {e}")
        return False
