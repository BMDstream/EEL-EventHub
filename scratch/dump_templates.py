import os
import sys
from sqlmodel import Session, select, create_engine

# Set path so we can import from backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.database import engine
from backend.models import RegistrationFormTemplate, Event

with Session(engine) as session:
    templates = session.exec(select(RegistrationFormTemplate)).all()
    print("--- TEMPLATES ---")
    for t in templates:
        print(f"ID: {t.id}, Name: {t.name}")
        print(f"  Theme Config: {t.theme_config}")
        print(f"  Post Submit Config: {t.post_submit_config}")
        print(f"  Layout Schema: {t.layout_schema}")
        print("-" * 40)

    events = session.exec(select(Event)).all()
    print("\n--- EVENTS ---")
    for e in events:
        print(f"ID: {e.id}, Title: {e.title}, Slug: {e.slug}")
        print(f"  Disclaimer Enabled: {e.disclaimer_enabled}")
        print(f"  Disclaimer Text length: {len(e.disclaimer_text) if e.disclaimer_text else 0}")
        print(f"  Banner Settings: {e.banner_settings}")
        print("-" * 40)
