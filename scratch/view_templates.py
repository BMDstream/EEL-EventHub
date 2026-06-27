import os
from sqlmodel import Session, select, create_engine
from backend.models import EmailTemplate

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    from dotenv import load_dotenv
    load_dotenv()
    DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL, connect_args={"sslmode": "require"})

with Session(engine) as session:
    templates = session.exec(select(EmailTemplate)).all()
    for t in templates:
        print(f"=== KEY: {t.key} ===")
        print(f"Subject: {t.subject}")
        print("Body snippet:")
        print(t.body_html[:500])
        print("Looking for QR Code image tag in body:")
        # Find any img tags containing qr
        import re
        qr_tags = re.findall(r'<img[^>]*qr[^>]*>', t.body_html, re.IGNORECASE)
        print("QR Tags found:", qr_tags)
        print("="*40)
