import os
import re
import resend
import qrcode
import base64
from io import BytesIO
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from urllib.parse import quote

from sqlmodel import Session, select
from backend.database import engine
from backend.models import EmailTemplate

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

# Simple in-process template cache — only caches successfully fetched templates.
# Unlike lru_cache, this will NOT cache None, so the self-healing seeder can
# always retry on the next call if a template was missing on a cold start.
_template_cache: dict = {}

def get_template_from_db(key: str) -> Optional[EmailTemplate]:
    if key in _template_cache:
        return _template_cache[key]
    try:
        with Session(engine) as session:
            template = session.exec(select(EmailTemplate).where(EmailTemplate.key == key)).first()
            if not template:
                # Self-healing: Check if this is a default template and seed it
                from backend.default_templates import DEFAULT_TEMPLATES
                if key in DEFAULT_TEMPLATES:
                    val = DEFAULT_TEMPLATES[key]
                    template = EmailTemplate(
                        key=key,
                        name=val["name"],
                        subject=val["subject"],
                        body_html=val["body_html"]
                    )
                    session.add(template)
                    session.commit()
                    session.refresh(template)
                    print(f"Auto-seeded missing template '{key}' during email dispatch.")
            if template:
                _template_cache[key] = template
            return template
    except Exception as e:
        print(f"Error fetching/seeding email template '{key}': {e}")
        return None

def invalidate_template_cache(key: str = None):
    """Call this after any template update so the next email uses fresh data."""
    global _template_cache
    if key:
        _template_cache.pop(key, None)
    else:
        _template_cache.clear()

def process_inline_base64_images(html_content: str) -> tuple[str, list]:
    import uuid
    attachments = []
    if not html_content:
        return html_content, attachments
        
    # Pattern to match src="data:image/xyz;base64,abc"
    pattern = r'src=["\'](data:(image/[a-zA-Z0-9+.-]+);base64,([^"\']+\S))["\']'
    matches = re.findall(pattern, html_content)
    
    for idx, (full_data_url, mime_type, base64_data) in enumerate(matches):
        cid = f"img_{idx}_{uuid.uuid4().hex[:8]}"
        ext = mime_type.split("/")[-1]
        if ext == "jpeg":
            ext = "jpg"
        filename = f"{cid}.{ext}"
        
        attachments.append({
            "content": base64_data.strip(),
            "filename": filename,
            "content_id": cid
        })
        
        html_content = html_content.replace(full_data_url, f"cid:{cid}")
        
    return html_content, attachments

def inject_banner_placeholder_if_missing(html_str: str) -> str:
    if not html_str:
        return html_str
    if "{banner_html}" in html_str:
        return html_str
    
    match = re.search(r'(<table[^>]*?border-collapse:\s*separate[^>]*?>)', html_str, re.IGNORECASE)
    if match:
        tag = match.group(0)
        return html_str.replace(tag, tag + "\n        {banner_html}")
    return html_str

def parse_template(text: str, variables: Dict[str, Any]) -> str:
    if not text:
        return ""
    for k, v in variables.items():
        placeholder = "{" + k + "}"
        text = text.replace(placeholder, str(v) if v is not None else "")
    return text

def parse_template_meta(html: str) -> dict:
    import re
    import json
    if not html:
        return {}
    match = re.search(r'<!-- TEMPLATE_META: ({.*?}) -->', html)
    if match:
        try:
            return json.loads(match.group(1))
        except Exception as e:
            print(f"Failed to parse template meta in email service: {e}")
    return {}

def get_logo_html(config: Optional[dict], meta: dict, primary_color: str) -> str:
    logo_url = config.get("logo_url") if config else None
    if logo_url:
        return f"""
        <td align="right" valign="middle" style="padding-bottom: 0px;">
            <img src="{logo_url}" style="max-height: 48px; max-width: 140px; object-fit: contain; display: block;" alt="Client Logo" />
        </td>
        """
    show_logo = meta.get("show_logo", "true") != "false"
    if show_logo:
        logo_image_url = meta.get("logo_image_url")
        if logo_image_url:
            return f"""
            <td align="right" valign="middle" style="padding-bottom: 0px;">
                <img src="{logo_image_url}" style="max-height: 48px; max-width: 140px; object-fit: contain; display: block;" alt="Logo" />
            </td>
            """
        logo_text = meta.get("logo_text", "BMD")
        logo_bg = primary_color or meta.get("primary_color", "#0f172a")
        font_family = "Calibri, sans-serif"
        if config and isinstance(config, dict):
            font_family = config.get("font_family", "Calibri, sans-serif")
        return f"""
        <td align="right" valign="middle">
            <div style="background-color:{logo_bg};padding:8px 16px;border-radius:8px;color:#fff;font-weight:bold;font-size:14px;display:inline-block;font-family:{font_family};">
                {logo_text}
            </div>
        </td>
        """
    return ""

def send_confirmation_email(
    to_email: str, 
    first_name: str, 
    event_title: str, 
    clearance_id: str, 
    event_details: Dict[str, Any] = None, 
    qr_code_url: str = None, 
    config: Dict[str, Any] = None, 
    is_attending: bool = True,
    matchup: Optional[str] = None,
    profile_update_link: Optional[str] = None,
    registration_id: Optional[str] = None
):
    """Sends a registration confirmation email with an embedded QR code and event details."""
    if not resend.api_key or MOCK_EMAIL_SERVICE:
        print(f"MOCK CONFIRMATION to {to_email} (attending={is_attending}): Welcome to {event_title}! Your ID is {clearance_id}. Matchup: {matchup}. Link: {profile_update_link}")
        return {"id": "mock-confirmation-id"}

    if not config:
        config = {
            "primary_color": "#0f172a",
            "accent_color": "#94a3b8",
            "heading_text": "Registration Confirmed.",
            "body_text": "Your registration for **{event_title}** has been successfully confirmed. We look forward to seeing you at the event!",
            "footer_text": "Excellence Logistics & Entertainment\nAutomated Event Hub System"
        }

    # Process branding colors and headers
    primary_color = config.get("primary_color", "#0f172a")
    accent_color = config.get("accent_color", "#94a3b8")
    font_family = config.get("font_family", "Calibri, sans-serif")
    font_size = config.get("font_size", "16px")
    
    footer_text_raw = config.get("footer_text", "")
    if "Security Tier" in footer_text_raw or "Level 4 Authorized" in footer_text_raw:
        footer_html = "Excellence Logistics & Entertainment<br>Automated Event Hub System"
    else:
        footer_html = footer_text_raw.replace("\n", "<br>")
        
    t_key = "registration_confirmed"
    if profile_update_link:
        t_key = "partner_pending"
    elif not is_attending:
        t_key = "registration_declined"
    elif config:
        t_key = config.get("confirmation_template_key", "registration_confirmed")

    db_template = get_template_from_db(t_key)
    meta = parse_template_meta(db_template.body_html) if db_template else {}

    show_banner_meta = meta.get("show_banner", "false") if meta else "false"
    
    # CRITICAL BANNER OVERRIDE:
    # If this event uses a template selected by ID from the UI, we MUST NOT
    # inject any banner from the event config. The template HTML is the sole
    # authority for its own banner. This prevents the double-banner bug.
    uses_custom_template_id = config.get("uses_custom_template_id", False)
    if uses_custom_template_id:
        if meta:
            primary_color = meta.get("primary_color", primary_color)
            accent_color = meta.get("accent_color", accent_color)
        banner_url = config.get("banner_url") or (meta.get("banner_image_url") if meta else "") or ""
        show_banner = bool(banner_url)
    else:
        show_banner = show_banner_meta == "true" or (show_banner_meta != "false" and (config.get("show_banner_in_email", False) or t_key == "banner_email"))
        banner_url = (meta.get("banner_image_url") if meta else None) or config.get("banner_url") or "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800"

    banner_html = ""
    if show_banner:
        banner_html = f"""
        <tr>
          <td align="center" style="padding: 0; margin: 0; line-height: 0;">
            <img src="{banner_url}" width="600" style="width: 100%; max-width: 600px; height: auto; display: block; border-top-left-radius: 38px; border-top-right-radius: 38px; margin: 0; padding: 0;" alt="Event Banner" />
          </td>
        </tr>
        """

    # Format list/columns for banner_email template if active
    itinerary_html = ""
    bring_along_html = ""
    included_html = ""
    if t_key == "banner_email":
        if meta:
            primary_color = meta.get("primary_color", primary_color)
            accent_color = meta.get("accent_color", accent_color)
            heading_title = meta.get("heading_title", "MAZIV")
            heading_subtitle = meta.get("heading_subtitle", "GROUP")
            body_text_raw = meta.get("body_text", "")
            footer_html = meta.get("footer_text", "events@maziv.com")
            
            # Format lists
            itinerary_body = meta.get("itinerary_body", "")
            if itinerary_body:
                itinerary_lines = itinerary_body.split("\n")
                html_lines = []
                for line in itinerary_lines:
                    line = line.strip()
                    if not line:
                        continue
                    parts = line.split(":")
                    if len(parts) > 1:
                        html_lines.append(f'<div style="margin-bottom: 6px; font-family: {font_family};"><strong>{parts[0].strip()}:</strong> {":".join(parts[1:]).strip()}</div>')
                    else:
                        html_lines.append(f'<div style="margin-bottom: 6px; font-family: {font_family};">{line}</div>')
                itinerary_html = "".join(html_lines)

            bring_along_body = meta.get("bring_along_body", "")
            if bring_along_body:
                bring_along_lines = bring_along_body.split("\n")
                html_lines = []
                for line in bring_along_lines:
                    line = line.strip()
                    if not line:
                        continue
                    html_lines.append(f'<div style="margin-bottom: 4px; font-family: {font_family};">{line}</div>')
                bring_along_html = "".join(html_lines)

            included_body = meta.get("included_body", "")
            if included_body:
                included_lines = included_body.split("\n")
                html_lines = []
                for line in included_lines:
                    line = line.strip()
                    if not line:
                        continue
                    html_lines.append(f'<li style="margin-bottom: 4px; font-family: {font_family};">{line}</li>')
                included_html = "".join(html_lines)
        else:
            heading_title = "MAZIV"
            heading_subtitle = "GROUP"
            body_text_raw = "Thank you for joining us."
            footer_html = "events@maziv.com"

        badge_text = "Attendee Pass" if is_attending else "Response Recorded"
        body_html = body_text_raw.replace("**{event_title}**", f"<strong>{event_title}</strong>").replace("{event_title}", event_title).replace("\n", "<br>")
        body_html = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', body_html)
        heading_text = f"{heading_title}.{heading_subtitle}"
    else:
        # Set badge, heading, and body texts depending on RSVP status
        badge_text = "Attendee Pass" if is_attending else "Response Recorded"
        
        if is_attending:
            if profile_update_link:
                heading_text = "Action Required."
                body_text_raw = "Your partner has registered you for **{event_title}**. Please complete your ticket details to finalize your registration."
            else:
                heading_text = config.get("heading_text", "Registration Confirmed.")
                if "Access Granted" in heading_text:
                    heading_text = "Registration Confirmed."
                body_text_raw = config.get("body_text", "")
                if not body_text_raw or "credentials" in body_text_raw or "terminal verification" in body_text_raw:
                    body_text_raw = "Your registration for **{event_title}** has been successfully confirmed. We look forward to seeing you at the event!"
        else:
            heading_text = config.get("decline_heading_text", "Response Recorded.")
            body_text_raw = config.get(
                "decline_body_text", 
                "We have recorded your response that you are unable to attend **{event_title}**. Thank you for letting us know, and we hope to connect with you at future events."
            )

        body_html = body_text_raw.replace("**{event_title}**", f"<strong>{event_title}</strong>").replace("{event_title}", event_title).replace("\n", "<br>")
        body_html = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', body_html)

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
            <div style="margin-top: 20px; font-family: {font_family};">
                <p style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin: 0 0 4px 0; font-family: {font_family};">Address</p>
                <p style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0 0 10px 0; font-family: {font_family};">{event_details.get('address')}</p>
                <a href="{maps_url}" target="_blank" style="display: inline-block; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; color: #ffffff; background-color: {primary_color}; text-decoration: none; padding: 10px 20px; border-radius: 12px; margin-top: 4px; font-family: {font_family};">
                    🗺️ Open in Google Maps
                </a>
            </div>
            """

        matchup_html = ""
        if matchup:
            details_title = meta.get("details_title", "Partnered With")
            matchup_html = f"""
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-family: {font_family};">
                <p style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; color: #eab308; margin: 0 0 4px 0; font-family: {font_family};">{details_title}</p>
                <p style="font-size: 18px; font-weight: 800; color: {primary_color}; margin: 0; font-family: {font_family};">{matchup}</p>
                <p style="font-size: 11px; color: #64748b; margin: 2px 0 0 0; font-family: {font_family};">Sports Tournament Series</p>
            </div>
            """

        engagement_title = meta.get("engagement_title", "Engagement Details")
        details_html = f"""
        <div style="background: #ffffff; padding: 32px; border: 1px solid #f1f5f9; border-radius: 32px; margin-bottom: 40px; font-family: {font_family};">
            <p style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.3em; color: {accent_color}; margin-bottom: 24px; font-family: {font_family};">{engagement_title}</p>
            
            <div style="margin-bottom: 20px; font-family: {font_family};">
                <p style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin: 0 0 4px 0; font-family: {font_family};">Event</p>
                <p style="font-size: 18px; font-weight: 800; color: {primary_color}; margin: 0; font-family: {font_family};">{event_title}</p>
            </div>

            <div style="margin-bottom: 20px; font-family: {font_family};">
                <p style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin: 0 0 4px 0; font-family: {font_family};">Date & Time</p>
                <p style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0; font-family: {font_family};">{date_str} @ {time_str}</p>
            </div>

            <div style="margin-bottom: 20px; font-family: {font_family};">
                <p style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin: 0 0 4px 0; font-family: {font_family};">Venue</p>
                <p style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0; font-family: {font_family};">{event_details.get('location', 'TBA')}</p>
            </div>
            {address_html}
            {matchup_html}
        </div>
        """

    qr_block_html = ""
    warning_block_html = ""
    button_block_html = ""
    urgent_banner_html = ""
    if is_attending:
        qr_data = registration_id or clearance_id
        qr_url = f"https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={quote(qr_data)}"
        qr_block_html = f"""
        <div style="background: #f8fafc; padding: 48px; border-radius: 32px; text-align: center; border: 1px solid #f1f5f9; margin-bottom: 40px; position: relative; overflow: hidden; font-family: {font_family};">
            <img src="{qr_url}" width="200" height="200" alt="Registration QR Code" style="margin-bottom: 32px; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15);" />
            <p style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.3em; color: #64748b; margin-bottom: 16px; font-family: {font_family};">Ticket Reference ID</p>
            <div style="display: inline-block; background: #ffffff; padding: 16px 32px; border-radius: 20px; border: 2px solid {primary_color}; font-family: {font_family};">
                <code style="font-size: 32px; font-weight: 900; color: {primary_color}; letter-spacing: 0.25em; font-family: monospace;">{clearance_id}</code>
            </div>
        </div>
        """
        warning_block_html = f"""
        <div style="background: #fffbeb; padding: 28px; border-radius: 24px; border: 1px solid #fef3c7; margin-bottom: 40px; text-align: center; font-family: {font_family};">
            <p style="color: #b45309; font-size: 14px; font-weight: 700; margin: 0; line-height: 1.5; text-transform: uppercase; letter-spacing: 0.05em; font-family: {font_family};">
                Please present this QR code or code at the check-in desk.
            </p>
        </div>
        """
        if profile_update_link:
            urgent_banner_html = f"""
            <div style="background-color: #fff7ed; border: 2px solid #ea580c; padding: 24px; border-radius: 20px; margin-bottom: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); font-family: {font_family};">
                <p style="color: #c2410c; font-size: 11px; font-weight: 950; text-transform: uppercase; letter-spacing: 0.15em; margin: 0 0 8px 0; font-family: {font_family};">
                    ⚠️ Action Required ASAP
                </p>
                <p style="color: #7c2d12; font-size: 15px; font-weight: 800; margin: 0 0 12px 0; line-height: 1.4; font-family: {font_family};">
                    Complete your registration details to secure your spot.
                </p>
                <p style="color: #9a3412; font-size: 13px; line-height: 1.5; margin: 0; font-family: {font_family};">
                    Your partner has registered you, but we still need your specific information (such as T-shirt size and dietary preferences) to complete your booking. Please click the <strong>"Update Your Ticket Details"</strong> button below to submit this information immediately.
                </p>
            </div>
            """
            button_block_html = f"""
            <div style="text-align: center; margin-top: 10px; margin-bottom: 40px; font-family: {font_family};">
                <a href="{profile_update_link}" target="_blank" style="background-color: #eab308; color: #000000; padding: 16px 32px; border-radius: 16px; font-size: 13px; font-weight: 950; text-decoration: none; text-transform: uppercase; letter-spacing: 0.1em; display: inline-block; box-shadow: 0 4px 12px rgba(234,179,8,0.2); font-family: {font_family};">
                    Update Your Ticket Details
                </a>
                <p style="font-size: 11px; color: #b45309; margin-top: 10px; margin-bottom: 0; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; font-family: {font_family};">
                    ⚠️ MUST DO ASAP - Required to finalize registration!
                </p>
            </div>
            """

    # Format header details
    heading_parts = heading_text.split('.')
    heading_title = heading_parts[0]
    heading_subtitle = heading_parts[1] if len(heading_parts) > 1 else ''

    logo_td_html = get_logo_html(config, meta, primary_color)

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
            {banner_html}
            <tr>
              <td style="padding: 40px; font-family: {font_family}; font-size: {font_size};">
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
                
                {urgent_banner_html}
                
                <p style="font-size: {font_size}; line-height: 1.7; margin-bottom: 40px; color: #475569;">
                    Hello <strong>{first_name}</strong>,<br><br>
                    {body_html}
                </p>
                
                {details_html}

                {qr_block_html}

                {warning_block_html}

                {button_block_html}
                
                <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-bottom: 40px; margin-top: 40px;" />
                
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td align="center">
                      <p style="font-size: 11px; color: #94a3b8; margin-bottom: 32px; line-height: 1.6; margin-top: 0; font-family: {font_family};">
                          {footer_html}
                      </p>
                      <p style="font-size: 9px; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.1em; margin: 0; font-family: {font_family};">
                          This confirmation email was sent to {to_email}.
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

    # Database Template Override
    db_subject = None
    db_html = None
    try:
        if db_template:
            variables = {
                "first_name": first_name,
                "event_title": event_title,
                "to_email": to_email,
                "pin": clearance_id,
                "primary_color": primary_color,
                "accent_color": accent_color,
                "heading_title": heading_title,
                "heading_subtitle": heading_subtitle,
                "logo_html": logo_td_html,
                "body_html": body_html,
                "details_html": details_html,
                "qr_block_html": qr_block_html,
                "warning_block_html": warning_block_html,
                "button_block_html": button_block_html,
                "footer_text": footer_html,
                "profile_update_link": profile_update_link or "",
                "font_family": font_family,
                "font_size": font_size,
                "banner_html": banner_html,
                "itinerary_title": meta.get("itinerary_title", "") if meta else "",
                "itinerary_html": itinerary_html,
                "bring_along_title": meta.get("bring_along_title", "") if meta else "",
                "bring_along_html": bring_along_html,
                "bring_along_note": meta.get("bring_along_note", "") if meta else "",
                "included_title": meta.get("included_title", "") if meta else "",
                "included_html": included_html
            }
            db_subject = parse_template(db_template.subject, variables)
            db_body = inject_banner_placeholder_if_missing(db_template.body_html)
            db_html = parse_template(db_body, variables)
    except Exception as ex:
        print(f"Error applying database template override: {ex}")

    try:
        sender_name = meta.get("sender_name") or (config.get("sender_name") if config else None)
        if not sender_name:
            sender_name = "BMD-EventHub"
            
        sender_email = config.get("sender_email") if config else None
        if not sender_email:
            sender_email = "events@eelogistics.co.za"
            
        from_address = f"{sender_name} <{sender_email}>"
        
        if db_subject and db_html:
            subject = db_subject
            html_content = db_html
        else:
            if profile_update_link:
                subject = f"Action Required: Complete your details for {event_title}"
            else:
                subject = f"Registration Confirmed: {event_title}" if is_attending else f"RSVP Recorded: {event_title}"
        
        # Process inline base64 images and convert them to inline attachments
        html_content, inline_attachments = process_inline_base64_images(html_content)
        
        email_params = {
            "from": from_address,
            "to": to_email,
            "subject": subject,
            "html": html_content,
            "headers": {
                "X-Entity-Ref-ID": clearance_id
            }
        }
        
        if inline_attachments:
            email_params["attachments"] = inline_attachments
        
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
    font_family = config.get("font_family", "Calibri, sans-serif")
    font_size = config.get("font_size", "16px")
    
    db_template = get_template_from_db("broadcast")
    meta = parse_template_meta(db_template.body_html) if db_template else {}
    logo_td_html = get_logo_html(config, meta, primary_color)

    show_banner_meta = meta.get("show_banner", "false") if meta else "false"
    show_banner = show_banner_meta == "true" or (show_banner_meta != "false" and config.get("show_banner_in_email", False))
    banner_url = (meta.get("banner_image_url") if meta else None) or config.get("banner_url") or "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800"
    banner_html = ""
    if show_banner:
        banner_html = f"""
        <tr>
          <td align="center" style="padding: 0; margin: 0; line-height: 0;">
            <img src="{banner_url}" width="600" style="width: 100%; max-width: 600px; height: auto; display: block; border-top-left-radius: 38px; border-top-right-radius: 38px; margin: 0; padding: 0;" alt="Event Banner" />
          </td>
        </tr>
        """

    sender_name = meta.get("sender_name") or (config.get("sender_name") if config else None)
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

        # Define variables dictionary for parsing templates
        variables = {
            "first_name": first_name,
            "last_name": last_name,
            "to_email": to_email,
            "pin": pin,
            "event_title": event_title,
            "location": location_str,
            "start_date": f"{date_str} @ {time_str}",
            "primary_color": primary_color,
            "accent_color": accent_color,
            "logo_html": logo_td_html,
            "broadcast_body": body.replace("{first_name}", first_name).replace("{last_name}", last_name).replace("{pin}", pin).replace("{event_title}", event_title).replace("\n", "<br>"),
            "broadcast_signature": signature.replace("\n", "<br>") if signature else "",
            "footer_text": "Automated Event Management System • Security Tier 4",
            "font_family": font_family,
            "font_size": font_size,
            "banner_html": banner_html
        }

        # Inject QR Code if requested in custom template or default body
        qr_code_html = ""
        if (db_template and "{qr_code}" in db_template.body_html) or (not db_template and "{qr_code}" in body):
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
        variables["qr_code"] = qr_code_html

        details_html = f"""
        <div style="background: #ffffff; padding: 24px; border: 1px solid #f1f5f9; border-radius: 24px; margin-bottom: 24px; margin-top: 24px;">
            <div style="margin-bottom: 12px;">
                <p style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin: 0 0 2px 0;">Event</p>
                <p style="font-size: 15px; font-weight: 800; color: {primary_color}; margin: 0;">{event_title}</p>
            </div>
            <div style="margin-bottom: 12px;">
                <p style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin: 0 0 2px 0;">Date & Time</p>
                <p style="font-size: 15px; font-weight: 800; color: {primary_color}; margin: 0;">{date_str} @ {time_str}</p>
            </div>
            <div style="margin-bottom: 12px;">
                <p style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin: 0 0 2px 0;">Venue</p>
                <p style="font-size: 15px; font-weight: 800; color: {primary_color}; margin: 0;">{location_str}</p>
            </div>
        </div>
        """
        variables["details_html"] = details_html

        if db_template:
            p_subject = parse_template(db_template.subject, variables)
            db_body = inject_banner_placeholder_if_missing(db_template.body_html)
            html_content = parse_template(db_body, variables)
        else:
            # Fallback to hardcoded layout
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
            if "{qr_code}" in p_body:
                p_body = p_body.replace("{qr_code}", qr_code_html)

            signature_html = f'<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-style: italic; color: #64748b; font-size: 14px;">{signature.replace("\n", "<br>")}</div>' if signature else ""

            html_content = f"""
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="width: 100%; table-layout: fixed; margin: 0; padding: 0;">
              <tr>
                <td align="center" style="padding: 40px 0;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="width: 100%; max-width: 600px; border: 1px solid #f1f5f9; border-radius: 40px; background-color: #ffffff; color: {primary_color}; box-shadow: 0 20px 50px rgba(0,0,0,0.05); overflow: hidden; border-collapse: separate;">
                    {banner_html}
                    <tr>
                      <td style="padding: 40px; font-family: {font_family}; font-size: {font_size};">
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
                        <div style="font-size: {font_size}; line-height: 1.8; color: #334155; margin-bottom: 40px;">
                            {p_body.replace("\n", "<br>")}
                        </div>
                        {signature_html}
                        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-bottom: 40px; margin-top: 40px;" />
                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                          <tr>
                            <td align="center">
                              <p style="font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.2em; margin: 0; font-family: {font_family};">
                                  Automated Event Management System • Security Tier 4
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>"""

        # Process inline base64 images and convert them to inline attachments
        html_content, inline_attachments = process_inline_base64_images(html_content)
        
        email_params = {
            "from": from_address,
            "to": to_email,
            "subject": p_subject,
            "html": html_content
        }
        
        if reply_to:
            email_params["reply_to"] = reply_to
            
        combined_attachments = []
        if attachments:
            combined_attachments.extend(attachments)
        if inline_attachments:
            combined_attachments.extend(inline_attachments)
            
        if combined_attachments:
            email_params["attachments"] = combined_attachments
            
        try:
            resend.Emails.send(email_params)
            print(f"Personalized broadcast email sent successfully to {to_email}")
        except Exception as e:
            print(f"Failed to send personalized broadcast email to {to_email}: {e}")

    return True
