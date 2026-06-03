import os
import resend
import qrcode
import base64
from io import BytesIO
from typing import List, Dict, Any
from dotenv import load_dotenv
from urllib.parse import quote

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

def send_confirmation_email(to_email: str, first_name: str, event_title: str, clearance_id: str, event_details: Dict[str, Any] = None, qr_code_url: str = None, config: Dict[str, Any] = None, is_attending: bool = True):
    """Sends a registration confirmation email with an embedded QR code and event details."""
    if not resend.api_key or MOCK_EMAIL_SERVICE:
        print(f"MOCK CONFIRMATION to {to_email} (attending={is_attending}): Welcome to {event_title}! Your ID is {clearance_id}")
        return {"id": "mock-confirmation-id"}

    if not config:
        config = {
            "primary_color": "#0f172a",
            "accent_color": "#94a3b8",
            "heading_text": "Access Granted.",
            "body_text": "Your registration for **{event_title}** has been confirmed. Below are your secure credentials for terminal verification.",
            "footer_text": "Automated Event Management System\nSecurity Tier: Level 4 Authorized"
        }

    # Process branding colors and headers
    primary_color = config.get("primary_color", "#0f172a")
    accent_color = config.get("accent_color", "#94a3b8")
    footer_html = config.get("footer_text", "").replace("\n", "<br>")
    logo_url = config.get("logo_url")

    # Set badge, heading, and body texts depending on RSVP status
    badge_text = "Official Dispatch" if is_attending else "Response Recorded"
    
    if is_attending:
        heading_text = config.get("heading_text", "Access Granted.")
        body_text_raw = config.get("body_text", "")
        if not body_text_raw:
            body_text_raw = "Your registration for **{event_title}** has been confirmed. Below are your secure credentials for terminal verification."
    else:
        heading_text = config.get("decline_heading_text", "Response Recorded.")
        body_text_raw = config.get(
            "decline_body_text", 
            "We have recorded your response that you are unable to attend **{event_title}**. Thank you for letting us know, and we hope to connect with you at future events."
        )

    body_html = body_text_raw.replace("**{event_title}**", f"<strong>{event_title}</strong>").replace("{event_title}", event_title).replace("\n", "<br>")

    # Format event details if provided (only if they are attending)
    details_html = ""
    if event_details and is_attending:
        from datetime import datetime
        try:
            # Handle both string and datetime objects
            dt_raw = event_details.get('start_date')
            if isinstance(dt_raw, str):
                dt = datetime.fromisoformat(dt_raw.replace('Z', '+00:00'))
            else:
                dt = dt_raw
            
            date_str = dt.strftime("%A, %B %d, %Y")
            time_str = dt.strftime("%I:%M %p")
        except:
            date_str = str(event_details.get('start_date'))
            time_str = "TBA"

        address_html = ""
        if event_details.get('address'):
            query_str = f"{event_details.get('location', '')} {event_details.get('address', '')}".strip()
            maps_url = f"https://www.google.com/maps/search/?api=1&query={quote(query_str)}"
            address_html = f"""
            <div style="margin-top: 20px;">
                <p style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin: 0 0 4px 0;">Address</p>
                <p style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0 0 10px 0;">{event_details.get('address')}</p>
                <a href="{maps_url}" target="_blank" style="display: inline-block; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; color: #ffffff; background-color: {primary_color}; text-decoration: none; padding: 10px 20px; border-radius: 12px; margin-top: 4px;">
                    🗺️ Open in Google Maps
                </a>
            </div>
            """

        details_html = f"""
        <div style="background: #ffffff; padding: 32px; border: 1px solid #f1f5f9; border-radius: 32px; margin-bottom: 40px;">
            <p style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.3em; color: {accent_color}; margin-bottom: 24px;">Engagement Details</p>
            
            <div style="margin-bottom: 20px;">
                <p style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin: 0 0 4px 0;">Event</p>
                <p style="font-size: 18px; font-weight: 800; color: {primary_color}; margin: 0;">{event_title}</p>
            </div>

            <div style="margin-bottom: 20px;">
                <p style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin: 0 0 4px 0;">Date & Time</p>
                <p style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0;">{date_str} @ {time_str}</p>
            </div>

            <div style="margin-bottom: 20px;">
                <p style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin: 0 0 4px 0;">Venue</p>
                <p style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0;">{event_details.get('location', 'TBA')}</p>
            </div>
            {address_html}
        </div>
        """



    qr_block_html = ""
    warning_block_html = ""
    if is_attending:
        qr_base64 = generate_qr_base64(clearance_id)
        qr_block_html = f"""
        <div style="background: #f8fafc; padding: 48px; border-radius: 32px; text-align: center; border: 1px solid #f1f5f9; margin-bottom: 40px; position: relative; overflow: hidden;">
            <img src="data:image/png;base64,{qr_base64}" width="200" height="200" alt="Clearance QR Code" style="margin-bottom: 32px; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15);" />
            <p style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.3em; color: #64748b; margin-bottom: 16px;">Unique Clearance ID</p>
            <div style="display: inline-block; background: #ffffff; padding: 16px 32px; border-radius: 20px; border: 2px solid {primary_color};">
                <code style="font-size: 32px; font-weight: 900; color: {primary_color}; letter-spacing: 0.25em;">{clearance_id}</code>
            </div>
        </div>
        """
        warning_block_html = f"""
        <div style="background: #fffbeb; padding: 28px; border-radius: 24px; border: 1px solid #fef3c7; margin-bottom: 48px; text-align: center;">
            <p style="color: #b45309; font-size: 14px; font-weight: 700; margin: 0; line-height: 1.5; text-transform: uppercase; letter-spacing: 0.05em;">
                Present this digital clearance at the registration desk.
            </p>
        </div>
        """

    # Format header details
    heading_parts = heading_text.split('.')
    heading_title = heading_parts[0]
    heading_subtitle = heading_parts[1] if len(heading_parts) > 1 else ''

    logo_td_html = ""
    if logo_url:
        logo_td_html = f"""
        <td align="right" valign="middle" style="padding-bottom: 0px;">
            <img src="{logo_url}" style="max-height: 48px; max-width: 140px; object-fit: contain; display: block;" alt="Client Logo" />
        </td>
        """

    html_content = f"""
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="width: 100%; table-layout: fixed; margin: 0; padding: 0;">
      <tr>
        <td align="center" style="padding: 40px 0;">
          <!--[if mso]>
          <table width="600" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td>
          <![endif]-->
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="width: 100%; max-width: 600px; border: 1px solid #f1f5f9; border-radius: 40px; background-color: #ffffff; color: {primary_color}; box-shadow: 0 20px 50px rgba(0,0,0,0.05); overflow: hidden; border-collapse: separate;">
            <tr>
              <td style="padding: 40px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 48px;">
                  <tr>
                    <td align="left" valign="middle">
                      <table border="0" cellspacing="0" cellpadding="0" style="display: inline-block;">
                        <tr>
                          <td align="center" style="background: {primary_color}; padding: 12px 28px; border-radius: 16px;">
                            <span style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.4em; color: #ffffff;">{badge_text}</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                    {logo_td_html}
                  </tr>
                </table>

                <h2 style="font-size: 38px; font-weight: 900; color: {primary_color}; margin-bottom: 28px; text-transform: uppercase; font-style: italic; letter-spacing: -0.04em; line-height: 1; margin-top: 0;">
                    {heading_title} <span style="color: {accent_color};">{heading_subtitle}</span>
                </h2>
                
                <p style="font-size: 17px; line-height: 1.7; margin-bottom: 40px; color: #475569;">
                    Hello <strong>{first_name}</strong>,<br><br>
                    {body_html}
                </p>
                
                {details_html}

                {qr_block_html}

                {warning_block_html}
                
                <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-bottom: 40px; margin-top: 40px;" />
                
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td align="center">
                      <p style="font-size: 11px; color: #94a3b8; margin-bottom: 32px; line-height: 1.6; margin-top: 0;">
                          {footer_html}
                      </p>
                      <p style="font-size: 9px; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.1em; margin: 0;">
                          Confidentiality Notice: This dispatch is intended solely for {to_email}.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          <!--[if mso]>
              </td>
            </tr>
          </table>
          <![endif]-->
        </td>
      </tr>
    </table>
    """

    try:
        sender_name = config.get("sender_name") if config else None
        if not sender_name:
            sender_name = "BMD-EventHub"
            
        sender_email = config.get("sender_email") if config else None
        if not sender_email:
            sender_email = "events@eelogistics.co.za"
            
        from_address = f"{sender_name} <{sender_email}>"
        subject = f"Access Granted: {event_title}" if is_attending else f"RSVP Confirmed: {event_title}"
        
        email_params = {
            "from": from_address,
            "to": to_email,
            "subject": subject,
            "html": html_content,
            "headers": {
                "X-Entity-Ref-ID": clearance_id
            }
        }
        
        reply_to = config.get("reply_to") if config else None
        if reply_to:
            email_params["reply_to"] = reply_to
            
        r = resend.Emails.send(email_params)
        print(f"RESEND SUCCESS: {r}")
        return r
    except Exception as e:
        print(f"Failed to send email: {e}")
        return None

def send_broadcast_email(
    registrations_data: List[Dict[str, Any]], 
    subject: str, 
    body: str, 
    event_title: str, 
    signature: str = None, 
    config: Dict[str, Any] = None,
    attachments: List[Dict[str, Any]] = None,
    event_details: Dict[str, Any] = None
):
    """Sends a personalized broadcast email to multiple attendees with premium styling and optional attachments."""
    if not resend.api_key or MOCK_EMAIL_SERVICE:
        print(f"MOCK BROADCAST to {len(registrations_data)} users: {subject}")
        for reg in registrations_data:
            print(f"  -> MOCK SEND to {reg['email']} | Hello {reg['first_name']} {reg['last_name']}! Pin is {reg['pin']}. Attachments: {len(attachments) if attachments else 0}")
        return True

    if not config:
        config = {
            "primary_color": "#0f172a",
            "accent_color": "#94a3b8"
        }

    primary_color = config.get("primary_color", "#0f172a")
    accent_color = config.get("accent_color", "#94a3b8")
    logo_url = config.get("logo_url")

    logo_td_html = ""
    if logo_url:
        logo_td_html = f"""
        <td align="right" valign="middle" style="padding-bottom: 0px;">
            <img src="{logo_url}" style="max-height: 48px; max-width: 140px; object-fit: contain; display: block;" alt="Client Logo" />
        </td>
        """

    sender_name = config.get("sender_name") if config else None
    if not sender_name:
        sender_name = "BMD-EventHub"
        
    sender_email = config.get("sender_email") if config else None
    if not sender_email:
        sender_email = "events@eelogistics.co.za"
        
    from_address = f"{sender_name} <{sender_email}>"
    reply_to = config.get("reply_to") if config else None

    # Handle event details formatting
    date_str = "TBA"
    time_str = "TBA"
    location_str = "TBA"
    if event_details:
        location_str = event_details.get('location', 'TBA')
        from datetime import datetime
        try:
            dt_raw = event_details.get('start_date')
            if isinstance(dt_raw, str):
                dt = datetime.fromisoformat(dt_raw.replace('Z', '+00:00'))
            else:
                dt = dt_raw
            date_str = dt.strftime("%A, %B %d, %Y")
            time_str = dt.strftime("%I:%M %p")
        except:
            date_str = str(event_details.get('start_date', 'TBA'))

    for reg in registrations_data:
        to_email = reg["email"]
        first_name = reg["first_name"]
        last_name = reg["last_name"]
        pin = reg["pin"]

        # Compile personalized subject and body
        p_subject = (
            subject.replace("{first_name}", first_name)
            .replace("{last_name}", last_name)
            .replace("{pin}", pin)
            .replace("{event_title}", event_title)
            .replace("{location}", location_str)
            .replace("{start_date}", f"{date_str} @ {time_str}")
        )

        p_body = (
            body.replace("{first_name}", first_name)
            .replace("{last_name}", last_name)
            .replace("{pin}", pin)
            .replace("{event_title}", event_title)
            .replace("{location}", location_str)
            .replace("{start_date}", f"{date_str} @ {time_str}")
        )

        # Inject QR Code if requested
        if "{qr_code}" in p_body:
            qr_base64 = generate_qr_base64(pin)
            qr_code_html = f"""
            <div style="background: #f8fafc; padding: 32px; border-radius: 24px; text-align: center; border: 1px solid #e2e8f0; margin: 24px auto; max-width: 240px; box-shadow: 0 10px 25px rgba(0,0,0,0.03);">
                <img src="data:image/png;base64,{qr_base64}" width="160" height="160" alt="Clearance QR Code" style="border-radius: 12px; display: block; margin: 0 auto 16px auto;" />
                <p style="font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.25em; color: #64748b; margin: 0 0 6px 0;">Clearance ID</p>
                <div style="display: inline-block; background: #ffffff; padding: 8px 18px; border-radius: 12px; border: 1.5px solid {primary_color};">
                    <code style="font-size: 20px; font-weight: 900; color: {primary_color}; letter-spacing: 0.15em;">{pin}</code>
                </div>
            </div>
            """
            p_body = p_body.replace("{qr_code}", qr_code_html)

        signature_html = f'<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-style: italic; color: #64748b; font-size: 14px;">{signature.replace("\r\n", "<br>").replace("\n", "<br>")}</div>' if signature else ""

        html_content = f"""
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="width: 100%; table-layout: fixed; margin: 0; padding: 0;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <!--[if mso]>
              <table width="600" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
              <![endif]-->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="width: 100%; max-width: 600px; border: 1px solid #f1f5f9; border-radius: 40px; background-color: #ffffff; color: {primary_color}; box-shadow: 0 20px 50px rgba(0,0,0,0.05); overflow: hidden; border-collapse: separate;">
                <tr>
                  <td style="padding: 40px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 48px;">
                      <tr>
                        <td align="left" valign="middle">
                          <table border="0" cellspacing="0" cellpadding="0" style="display: inline-block;">
                            <tr>
                              <td align="center" style="background: {primary_color}; padding: 12px 28px; border-radius: 16px;">
                                <span style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.4em; color: #ffffff;">Broadcast Dispatch</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                        {logo_td_html}
                      </tr>
                    </table>

                    <h2 style="font-size: 32px; font-weight: 900; color: {primary_color}; margin-bottom: 28px; text-transform: uppercase; font-style: italic; letter-spacing: -0.04em; line-height: 1.1; margin-top: 0;">
                        Update: <span style="color: {accent_color};">{event_title}</span>
                    </h2>
                    
                    <div style="font-size: 16px; line-height: 1.8; color: #334155; margin-bottom: 40px;">
                        {p_body.replace("\r\n", "<br>").replace("\n", "<br>")}
                    </div>

                    {signature_html}
                    
                    <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-bottom: 40px; margin-top: 40px;" />
                    
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center">
                          <p style="font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.2em; margin: 0;">
                              Automated Event Management System • Security Tier 4
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <!--[if mso]>
                  </td>
                </tr>
              </table>
              <![endif]-->
            </td>
          </tr>
        </table>
        """

        email_params = {
            "from": from_address,
            "to": to_email,
            "subject": p_subject,
            "html": html_content
        }
        
        if reply_to:
            email_params["reply_to"] = reply_to
            
        if attachments:
            email_params["attachments"] = attachments
            
        try:
            resend.Emails.send(email_params)
            print(f"Personalized broadcast email sent successfully to {to_email}")
        except Exception as e:
            print(f"Failed to send personalized broadcast email to {to_email}: {e}")

    return True
