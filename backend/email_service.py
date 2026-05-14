import os
import resend
import qrcode
import base64
from io import BytesIO
from typing import List, Dict, Any
from dotenv import load_dotenv

load_dotenv()

resend.api_key = os.getenv("RESEND_API_KEY")

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
    if not resend.api_key:
        print(f"MOCK EMAIL to {to_email}: Welcome to {event_title}! Your ID is {clearance_id}")
        return None

    qr_base64 = generate_qr_base64(clearance_id)

    html_content = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 40px; border: 1px solid #eee; border-radius: 20px;">
        <h2 style="color: #0f172a; text-transform: uppercase; font-style: italic;">Access Granted.</h2>
        <p>Hello <strong>{first_name}</strong>,</p>
        <p>Your orchestration for <strong>{event_title}</strong> is confirmed. Below are your secure credentials for entry.</p>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 20px; text-align: center; margin: 30px 0;">
            <img src="data:image/png;base64,{qr_base64}" width="160" height="160" alt="QR Code" style="margin-bottom: 20px; border-radius: 10px;" />
            <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em; color: #64748b; margin-bottom: 10px;">Unique Clearance ID</p>
            <code style="font-size: 20px; font-weight: bold; color: #eab308;">{clearance_id}</code>
        </div>

        <p style="color: #64748b; font-size: 14px;">Please present your Clearance ID or the QR code at the registration desk on arrival.</p>
        
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="font-size: 12px; color: #94a3b8;">Excellence Entertainment Logistics • Automated Dispatch</p>
    </div>
    """

    try:
        r = resend.Emails.send({
            "from": "EEL-EventHub <events@eelogistics.co.za>",
            "to": to_email,
            "subject": f"Access Granted: {event_title}",
            "html": html_content
        })
        print(f"RESEND SUCCESS: {r}")
        return r
    except Exception as e:
        print(f"Failed to send email: {e}")
        return None

def send_broadcast_email(to_emails: List[str], subject: str, body: str, event_title: str):
    """Sends a broadcast email to multiple attendees."""
    if not resend.api_key:
        print(f"MOCK BROADCAST to {len(to_emails)} users: {subject}")
        return None

    html_content = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 40px; border: 1px solid #eee; border-radius: 20px;">
        <h2 style="color: #0f172a; text-transform: uppercase; font-style: italic;">Update: {event_title}</h2>
        <div style="line-height: 1.6; color: #334155;">
            {body.replace('\\n', '<br>')}
        </div>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="font-size: 12px; color: #94a3b8;">Excellence Entertainment Logistics • Important Announcement</p>
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
