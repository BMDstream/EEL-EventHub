from sqlmodel import Session, select
from backend.database import engine
from backend.models import User
import datetime

def seed_users():
    users_to_create = [
        {
            "email": "Barton@bmdcomputing.com",
            "password": "EEL-Admin-2026!",
            "role": "admin"
        },
        {
            "email": "Alareez@eelogistics.co.za",
            "password": "EEL-Manager-2026!",
            "role": "manager"
        },
        {
            "email": "Lysander@eelogistics.co.za",
            "password": "EEL-Staff-2026!",
            "role": "staff"
        }
    ]

    with Session(engine) as session:
        for u_data in users_to_create:
            # Check if user already exists
            statement = select(User).where(User.email == u_data["email"])
            existing_user = session.exec(statement).first()
            
            if existing_user:
                print(f"User {u_data['email']} already exists. Updating password/role.")
                existing_user.password = u_data["password"]
                existing_user.role = u_data["role"]
                session.add(existing_user)
            else:
                print(f"Creating user {u_data['email']}...")
                user = User(
                    email=u_data["email"],
                    password=u_data["password"],
                    role=u_data["role"],
                    is_active=True,
                    created_at=datetime.datetime.utcnow()
                )
                session.add(user)
        
        session.commit()
        print("User seeding completed successfully.")

if __name__ == "__main__":
    seed_users()
