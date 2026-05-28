from sqlmodel import Session, text
from backend.database import engine

def migrate():
    with Session(engine) as session:
        try:
            print("Running migration to add allowed_domains...")
            session.execute(text("ALTER TABLE \"event\" ADD COLUMN allowed_domains JSON"))
            session.commit()
            print("Successfully added allowed_domains column.")
        except Exception as e:
            session.rollback()
            print(f"Failed to add allowed_domains (it might already exist): {e}")

if __name__ == "__main__":
    migrate()
