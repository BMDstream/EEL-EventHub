import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Dict, Any
from dotenv import load_dotenv

load_dotenv()

# SMTP Configuration (Recommended for Microsoft/Office 365)
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.office365.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER") # e.g. hello@yourdomain.com
SMTP_PASS = os.getenv("SMTP_PASS")

def send_smtp_email(to_email: str, subject: str, html_content: str):
    """Generic SMTP sender."""
    if not SMTP_USER or not SMTP_PASS:
        print(f"MOCK SMTP EMAIL to {to_email}: {subject}")
        return False

    msg = MIMEMultipart()
    msg['From'] = SMTP_USER
    msg['To'] = to_email
    msg['Subject'] = subject

    msg.attach(MIMEText(html_content, 'html'))

    try:
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"SMTP Error: {e}")
        return False

def send_confirmation_email(to_email: str, first_name: str, event_title: str, clearance_id: str, qr_code_url: str = None):
    """Sends a registration confirmation email with the QR code and PIN."""
    
    html_content = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 40px; border: 1px solid #eee; border-radius: 20px;">
        <h2 style="color: #0f172a; text-transform: uppercase; font-style: italic;">Access Granted.</h2>
        <p>Hello <strong>{first_name}</strong>,</p>
        <p>Your orchestration for <strong>{event_title}</strong> is confirmed. Below are your secure credentials for entry.</p>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 20px; text-align: center; margin: 30px 0;">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data={clearance_id}" alt="QR Code" style="margin-bottom: 20px; border-radius: 10px;" />
            <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em; color: #64748b; margin-bottom: 10px;">Unique Clearance ID</p>
            <code style="font-size: 20px; font-weight: bold; color: #eab308;">{clearance_id}</code>
        </div>

        <p style="color: #64748b; font-size: 14px;">Please present your Clearance ID or the QR code at the registration desk on arrival.</p>
        
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="font-size: 12px; color: #94a3b8;">Excellence Entertainment Logistics • Automated Dispatch</p>
    </div>
    """

    return send_smtp_email(to_email, f"Access Granted: {event_title}", html_content)

def send_broadcast_email(to_emails: List[str], subject: str, body: str, event_title: str):
    """Sends a broadcast email to multiple attendees."""
    
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

    success_count = 0
    for email in to_emails:
        if send_smtp_email(email, subject, html_content):
            success_count += 1
    
    return success_count > 0
