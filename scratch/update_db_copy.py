import os
import sys
import json
from sqlmodel import Session, select, create_engine

# Set path so we can import from backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.database import engine
from backend.models import RegistrationFormTemplate, Event

with Session(engine) as session:
    # 1. Update RegistrationFormTemplates post_submit_config
    templates = session.exec(select(RegistrationFormTemplate)).all()
    print("Checking templates...")
    for t in templates:
        config = t.post_submit_config or {}
        desc = config.get("onscreen_description", "")
        if desc and "We looking forward to hosting you in Dullstroom." in desc:
            print(f"Updating template ID {t.id} description...")
            config["onscreen_description"] = desc.replace(
                "We looking forward to hosting you in Dullstroom.",
                "We look forward to hosting you in Dullstroom."
            )
            t.post_submit_config = config
            session.add(t)
            
    # 2. Update Events banner_settings and disclaimer_checkbox_label
    events = session.exec(select(Event)).all()
    print("Checking events...")
    for e in events:
        banner = e.banner_settings or {}
        label = banner.get("disclaimer_checkbox_label", "")
        if label and "I have read andaccept the Disclaimer and Indemnity" in label:
            print(f"Updating event ID {e.id} banner settings...")
            banner["disclaimer_checkbox_label"] = label.replace(
                "I have read andaccept the Disclaimer and Indemnity",
                "I have read and accept the Disclaimer and Indemnity"
            )
            e.banner_settings = banner
            session.add(e)
            
    session.commit()
    print("Database updates committed successfully.")
