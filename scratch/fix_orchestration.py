import os
from sqlmodel import Session, create_engine, select
from backend.models import Client, SystemSetting
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def run_fix():
    with Session(engine) as session:
        # 1. Check & Fix SystemSetting (email_config)
        settings = session.exec(select(SystemSetting)).all()
        print("Scanning SystemSettings...")
        for setting in settings:
            val_str = str(setting.value)
            if "orchestration" in val_str or "Orchestration" in val_str:
                print(f"Fixing SystemSetting: {setting.key}")
                new_value = {}
                for k, v in setting.value.items():
                    if isinstance(v, str):
                        new_value[k] = v.replace("orchestration", "registration").replace("Orchestration", "Registration")
                    else:
                        new_value[k] = v
                setting.value = new_value
                session.add(setting)
        
        # 2. Check & Fix Client templates
        clients = session.exec(select(Client)).all()
        print("\nScanning Clients...")
        for client in clients:
            updated = False
            for attr in ["body_text", "heading_text", "footer_text"]:
                val = getattr(client, attr)
                if val and ("orchestration" in val or "Orchestration" in val):
                    print(f"Fixing Client {client.slug} field {attr}: {val}")
                    new_val = val.replace("orchestration", "registration").replace("Orchestration", "Registration")
                    setattr(client, attr, new_val)
                    updated = True
            if updated:
                session.add(client)
                
        session.commit()
        print("\nDatabase scan and correction complete.")

if __name__ == "__main__":
    run_fix()
