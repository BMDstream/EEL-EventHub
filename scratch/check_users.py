import os
from sqlmodel import Session, create_engine, select
from backend.models import User
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

with Session(engine) as session:
    users = session.exec(select(User)).all()
    print("Users in database:")
    for u in users:
        print(f"ID: {u.id} | Email: {u.email} | Role: {u.role} | Active: {u.is_active}")
