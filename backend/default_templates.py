DEFAULT_TEMPLATES = {
    "registration_confirmed": {
        "name": "Attendee Confirmation Email",
        "subject": "Access Granted: {event_title}",
        "body_html": """<table width="100%" border="0" cellspacing="0" cellpadding="0" style="width: 100%; table-layout: fixed; margin: 0; padding: 0;">
  <tr>
    <td align="center" style="padding: 40px 0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="width: 100%; max-width: 600px; border: 1px solid #f1f5f9; border-radius: 40px; background-color: #ffffff; color: {primary_color}; box-shadow: 0 20px 50px rgba(0,0,0,0.05); overflow: hidden; border-collapse: separate;">
        <tr>
          <td style="padding: 40px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 48px;">
              <tr>
                <td align="left" valign="middle">
                  <table border="0" cellspacing="0" cellpadding="0" style="display: inline-block;">
                    <tr>
                      <td align="center" style="background: {primary_color}; padding: 12px 28px; border-radius: 16px;">
                        <span style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.4em; color: #ffffff;">Attendee Pass</span>
                      </td>
                    </tr>
                  </table>
                </td>
                {logo_html}
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
            {button_block_html}
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-bottom: 40px; margin-top: 40px;" />
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center">
                  <p style="font-size: 11px; color: #94a3b8; margin-bottom: 32px; line-height: 1.6; margin-top: 0;">
                      {footer_text}
                  </p>
                  <p style="font-size: 9px; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.1em; margin: 0;">
                      This confirmation email was sent to {to_email}.
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
    },
    "registration_declined": {
        "name": "RSVP Declined Notification",
        "subject": "Response Recorded: {event_title}",
        "body_html": """<table width="100%" border="0" cellspacing="0" cellpadding="0" style="width: 100%; table-layout: fixed; margin: 0; padding: 0;">
  <tr>
    <td align="center" style="padding: 40px 0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="width: 100%; max-width: 600px; border: 1px solid #f1f5f9; border-radius: 40px; background-color: #ffffff; color: {primary_color}; box-shadow: 0 20px 50px rgba(0,0,0,0.05); overflow: hidden; border-collapse: separate;">
        <tr>
          <td style="padding: 40px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 48px;">
              <tr>
                <td align="left" valign="middle">
                  <table border="0" cellspacing="0" cellpadding="0" style="display: inline-block;">
                    <tr>
                      <td align="center" style="background: {primary_color}; padding: 12px 28px; border-radius: 16px;">
                        <span style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.4em; color: #ffffff;">Response Recorded</span>
                      </td>
                    </tr>
                  </table>
                </td>
                {logo_html}
              </tr>
            </table>
            <h2 style="font-size: 38px; font-weight: 900; color: {primary_color}; margin-bottom: 28px; text-transform: uppercase; font-style: italic; letter-spacing: -0.04em; line-height: 1; margin-top: 0;">
                {heading_title} <span style="color: {accent_color};">{heading_subtitle}</span>
            </h2>
            <p style="font-size: 17px; line-height: 1.7; margin-bottom: 40px; color: #475569;">
                Hello <strong>{first_name}</strong>,<br><br>
                {body_html}
            </p>
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-bottom: 40px; margin-top: 40px;" />
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center">
                  <p style="font-size: 11px; color: #94a3b8; margin-bottom: 32px; line-height: 1.6; margin-top: 0;">
                      {footer_text}
                  </p>
                  <p style="font-size: 9px; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.1em; margin: 0;">
                      This email was sent to {to_email}.
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
    },
    "partner_pending": {
        "name": "Co-Registrant Action Required",
        "subject": "Action Required: Complete your details for {event_title}",
        "body_html": """<table width="100%" border="0" cellspacing="0" cellpadding="0" style="width: 100%; table-layout: fixed; margin: 0; padding: 0;">
  <tr>
    <td align="center" style="padding: 40px 0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="width: 100%; max-width: 600px; border: 1px solid #f1f5f9; border-radius: 40px; background-color: #ffffff; color: {primary_color}; box-shadow: 0 20px 50px rgba(0,0,0,0.05); overflow: hidden; border-collapse: separate;">
        <tr>
          <td style="padding: 40px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 48px;">
              <tr>
                <td align="left" valign="middle">
                  <table border="0" cellspacing="0" cellpadding="0" style="display: inline-block;">
                    <tr>
                      <td align="center" style="background: {primary_color}; padding: 12px 28px; border-radius: 16px;">
                        <span style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.4em; color: #ffffff;">Action Required</span>
                      </td>
                    </tr>
                  </table>
                </td>
                {logo_html}
              </tr>
            </table>
            <h2 style="font-size: 38px; font-weight: 900; color: {primary_color}; margin-bottom: 28px; text-transform: uppercase; font-style: italic; letter-spacing: -0.04em; line-height: 1; margin-top: 0;">
                Action <span style="color: {accent_color};">Required.</span>
            </h2>
            
            <div style="background-color: #fff7ed; border: 2px solid #ea580c; padding: 24px; border-radius: 20px; margin-bottom: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                <p style="color: #c2410c; font-size: 11px; font-weight: 950; text-transform: uppercase; letter-spacing: 0.15em; margin: 0 0 8px 0;">
                    ⚠️ Action Required ASAP
                </p>
                <p style="color: #7c2d12; font-size: 15px; font-weight: 800; margin: 0 0 12px 0; line-height: 1.4;">
                    Complete your registration details to secure your spot.
                </p>
                <p style="color: #9a3412; font-size: 13px; line-height: 1.5; margin: 0;">
                    Your partner has registered you, but we still need your specific information (such as T-shirt size and dietary preferences) to complete your booking. Please click the <strong>"Update Your Ticket Details"</strong> button below to submit this information immediately.
                </p>
            </div>
            
            <p style="font-size: 17px; line-height: 1.7; margin-bottom: 40px; color: #475569;">
                Hello <strong>{first_name}</strong>,<br><br>
                Your partner has registered you for <strong>{event_title}</strong>. Please complete your ticket details to finalize your registration.
            </p>
            
            <div style="text-align: center; margin-top: 10px; margin-bottom: 40px;">
                <a href="{profile_update_link}" target="_blank" style="background-color: #eab308; color: #000000; padding: 16px 32px; border-radius: 16px; font-size: 13px; font-weight: 950; text-decoration: none; text-transform: uppercase; letter-spacing: 0.1em; display: inline-block; box-shadow: 0 4px 12px rgba(234,179,8,0.2);">
                    Update Your Ticket Details
                </a>
                <p style="font-size: 11px; color: #b45309; margin-top: 10px; margin-bottom: 0; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">
                    ⚠️ MUST DO ASAP - Required to finalize registration!
                </p>
            </div>
            
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-bottom: 40px; margin-top: 40px;" />
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center">
                  <p style="font-size: 11px; color: #94a3b8; margin-bottom: 32px; line-height: 1.6; margin-top: 0;">
                      {footer_text}
                  </p>
                  <p style="font-size: 9px; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.1em; margin: 0;">
                      This email was sent to {to_email}.
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
    },
    "broadcast": {
        "name": "Personalized Broadcast Dispatch",
        "subject": "{subject}",
        "body_html": """<table width="100%" border="0" cellspacing="0" cellpadding="0" style="width: 100%; table-layout: fixed; margin: 0; padding: 0;">
  <tr>
    <td align="center" style="padding: 40px 0;">
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
                {logo_html}
              </tr>
            </table>
            <p style="font-size: 17px; line-height: 1.7; margin-bottom: 40px; color: #475569;">
                Hello <strong>{first_name}</strong>,<br><br>
                {broadcast_body}
            </p>
            {details_html}
            <p style="font-size: 15px; font-weight: 800; color: {primary_color}; margin-top: 30px;">
                {broadcast_signature}
            </p>
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-bottom: 40px; margin-top: 40px;" />
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center">
                  <p style="font-size: 11px; color: #94a3b8; margin-bottom: 32px; line-height: 1.6; margin-top: 0;">
                      {footer_text}
                  </p>
                  <p style="font-size: 9px; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.1em; margin: 0;">
                      This email was sent to {to_email}.
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
    },
    "tournament_matchup": {
        "name": "Tournament Matchup Access Dispatch",
        "subject": "Championship Access Granted: {event_title}",
        "body_html": """<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #030712; color: #ffffff; padding: 40px; border-radius: 24px; max-width: 600px; margin: 0 auto; border: 1px solid #1f2937;">
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
        <img src="{qr_code_url}" width="200" height="200" alt="Check-in QR Code" style="display: block; margin: 0 auto 20px auto; border-radius: 12px;" />
        <p style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.25em; color: #64748b; margin: 0 0 8px 0;">Backup Clearance PIN</p>
        <div style="display: inline-block; background-color: #f1f5f9; padding: 8px 20px; border-radius: 10px; border: 1.5px solid #0f172a;">
            <code style="font-size: 24px; font-weight: 900; color: #0f172a; letter-spacing: 0.15em;">{pin}</code>
        </div>
    </div>

    {button_html}

    <div style="background-color: #1c1917; padding: 20px; border-radius: 16px; border: 1px solid #292524; text-align: center; margin-bottom: 30px;">
        <p style="color: #e7e5e4; font-size: 12px; font-weight: 600; margin: 0; line-height: 1.5;">
            EXCELLENCE ENTERTAINMENT LOGISTICS<br>
            <span style="color: #a8a29e; font-size: 10px; font-weight: 500;">Clearance Level: Tier 1 Authorized Tournament Series</span>
        </p>
    </div>
</div>"""
    }
}
