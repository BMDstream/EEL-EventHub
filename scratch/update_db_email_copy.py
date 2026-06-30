import os
import sys
from sqlmodel import Session, select

# Set path so we can import from backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.database import engine
from backend.models import EmailTemplate

with Session(engine) as session:
    # Update EmailTemplate for registration_confirmed
    template = session.exec(select(EmailTemplate).where(EmailTemplate.key == "registration_confirmed")).first()
    if template:
        print("Updating database EmailTemplate body_html...")
        # Update greeting to remove comma and ensure new copy
        body = template.body_html
        if "Hello <strong>{first_name}</strong>," in body:
            body = body.replace("Hello <strong>{first_name}</strong>,", "Hello <strong>{first_name}</strong>")
        
        template.body_html = body
        session.add(template)
        session.commit()
        print("EmailTemplate updated in database.")
    else:
        print("EmailTemplate registration_confirmed not found.")
