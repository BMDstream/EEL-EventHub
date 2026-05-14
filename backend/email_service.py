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
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 40px; border: 1px solid #f1f5f9; border-radius: 32px; background-color: #ffffff; color: #0f172a;">
        <div style="text-align: center; margin-bottom: 40px;">
            <div style="display: inline-block; background: #f8fafc; padding: 12px 24px; rounded-radius: 12px; border: 1px solid #e2e8f0;">
                <span style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.3em; color: #94a3b8;">Official Dispatch</span>
            </div>
        </div>

        <h2 style="font-size: 32px; font-weight: 900; color: #0f172a; margin-bottom: 24px; text-transform: uppercase; font-style: italic; letter-spacing: -0.02em;">Access <span style="color: #94a3b8;">Granted.</span></h2>
        
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
            Hello <strong>{first_name}</strong>,<br><br>
            Your orchestration for <strong>{event_title}</strong> is confirmed. Below are your secure credentials for entry verification.
        </p>
        
        <div style="background: #f8fafc; padding: 40px; border-radius: 24px; text-align: center; border: 1px solid #f1f5f9; margin-bottom: 32px;">
            <img src="data:image/png;base64,{qr_base64}" width="180" height="180" alt="Clearance QR Code" style="margin-bottom: 24px; border-radius: 16px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);" />
            <p style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; color: #64748b; margin-bottom: 12px;">Unique Clearance ID</p>
            <div style="display: inline-block; background: #ffffff; padding: 12px 24px; border-radius: 12px; border: 2px solid #f1f5f9;">
                <code style="font-size: 24px; font-weight: 900; color: #0f172a; letter-spacing: 0.2em;">{clearance_id}</code>
            </div>
        </div>

        <div style="background: #fffbeb; padding: 24px; border-radius: 16px; border: 1px solid #fef3c7; margin-bottom: 40px;">
            <p style="color: #b45309; font-size: 13px; font-weight: 600; margin: 0; line-height: 1.5;">
                Please present this digital clearance or the 4-digit PIN at the registration desk on arrival.
            </p>
        </div>
        
        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-bottom: 32px;" />
        
        <div style="text-align: center;">
            <p style="font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Excellence Entertainment Logistics</p>
            <p style="font-size: 11px; color: #cbd5e1; margin-bottom: 24px;">
                Automated Event Management System<br>
                Johannesburg, South Africa
            </p>
            <p style="font-size: 10px; color: #e2e8f0;">
                You are receiving this because you registered for {event_title}.
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
