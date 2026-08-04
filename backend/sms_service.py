import os
import re
from typing import Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_FROM_NUMBER = os.getenv("TWILIO_FROM_NUMBER")
MOCK_SMS_SERVICE = os.getenv("MOCK_SMS_SERVICE", "false").lower() == "true"
APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:3000")

def send_confirmation_sms(
    to_phone: str,
    first_name: str,
    event_title: str,
    clearance_id: str,
    pin: Optional[str] = None,
    event_slug: Optional[str] = None
) -> dict:
    """
    Sends an SMS confirmation with the attendee name, event name, check-in PIN, 
    and a direct link to their access pass.
    """
    # Stripping any HTML tags from event title
    clean_title = ' '.join(w.capitalize() for w in re.sub(r'<[^>]*>', '', event_title).split())
    
    # Construct direct-pass link (queries will directly render the pass view in Frontend)
    pass_link = f"{APP_BASE_URL}/register/{event_slug}?pass=true&reg_id={clearance_id}&pin={pin or ''}"
    
    message = (
        f"Hi {first_name}, your registration for {clean_title} is confirmed!\n"
        f"PIN: {pin or (clearance_id[:8] if clearance_id else '')}\n"
        f"Pass Link: {pass_link}"
    )
    
    if MOCK_SMS_SERVICE or not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        print(f"[MOCK SMS] Sent to {to_phone}:\n{message}")
        return {"status": "mocked", "to": to_phone, "body": message, "link": pass_link}
        
    try:
        from twilio.rest import Client
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        response = client.messages.create(
            body=message,
            from_=TWILIO_FROM_NUMBER,
            to=to_phone
        )
        print(f"SMS sent successfully: SID {response.sid}")
        return {"status": "sent", "sid": response.sid, "to": to_phone, "body": message}
    except Exception as e:
        print(f"SMS sending failed: {e}")
        raise e
