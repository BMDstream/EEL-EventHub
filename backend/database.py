import os
from sqlmodel import create_engine, SQLModel, Session
from sqlalchemy.pool import NullPool
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
# Handle cases where the engine must be running serverless or locally
IS_SERVERLESS = DATABASE_URL and "localhost" not in DATABASE_URL and "sqlite" not in DATABASE_URL
is_sqlite = DATABASE_URL and DATABASE_URL.startswith("sqlite")

engine_args = {
    "echo": False,
    "connect_args": {"sslmode": "require", "connect_timeout": 20} if IS_SERVERLESS else {}
}

if not is_sqlite:
    engine_args["pool_size"] = 5
    engine_args["max_overflow"] = 10
    engine_args["pool_recycle"] = 1800

engine = create_engine(DATABASE_URL, **engine_args)

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

def run_db_initialization(session: Session, check_only_migrations: bool = False):
    """
    Executes database schema setup, fallback column migrations, default seeding, indexes, and sweeps.
    Can be run during application startup or triggered on-demand via the dashboard admin panel.
    """
    from sqlmodel import select
    from sqlalchemy import inspect, text
    from backend.models import User, Client, SystemSetting, EmailTemplate, UserSession, AuditLog
    from datetime import datetime
    
    # 1. Ensure core schema tables are created
    init_db()
    
    # 2. Check and apply fallback migrations
    inspector = inspect(engine)
    
    # permissions column on user
    user_columns = [col['name'] for col in inspector.get_columns('user')] if inspector.has_table('user') else []
    if user_columns and 'permissions' not in user_columns:
        try:
            session.execute(text('ALTER TABLE "user" ADD COLUMN permissions JSON'))
            session.commit()
            print("Permissions column added to user table.")
        except Exception:
            session.rollback()

    # role column on userclientlink
    ucl_columns = [col['name'] for col in inspector.get_columns('userclientlink')] if inspector.has_table('userclientlink') else []
    if ucl_columns and 'role' not in ucl_columns:
        try:
            session.execute(text('ALTER TABLE "userclientlink" ADD COLUMN role TEXT DEFAULT \'staff\''))
            session.commit()
            print("Role column added to userclientlink table.")
            try:
                session.execute(text('''
                    UPDATE "userclientlink"
                    SET role = 'manager'
                    WHERE user_id IN (SELECT id FROM "user" WHERE role = 'manager')
                '''))
                session.commit()
                print("Migrated existing user roles to userclientlink links.")
            except Exception as e:
                session.rollback()
                print(f"Role migration warning: {e}")
        except Exception:
            session.rollback()

    # role column on usereventlink
    uel_columns = [col['name'] for col in inspector.get_columns('usereventlink')] if inspector.has_table('usereventlink') else []
    if uel_columns and 'role' not in uel_columns:
        try:
            session.execute(text('ALTER TABLE "usereventlink" ADD COLUMN role TEXT DEFAULT \'staff\''))
            session.commit()
            print("Role column added to usereventlink table.")
        except Exception:
            session.rollback()

    # event columns
    event_columns = [col['name'] for col in inspector.get_columns('event')] if inspector.has_table('event') else []
    if event_columns:
        dialect_name = session.bind.dialect.name
        is_sqlite = dialect_name == "sqlite"
        bool_true = "1" if is_sqlite else "TRUE"
        bool_false = "0" if is_sqlite else "FALSE"
        datetime_type = "DATETIME" if is_sqlite else "TIMESTAMP"
        
        for col_name, col_type in [
            ("registration_active", f"BOOLEAN DEFAULT {bool_true}"),
            ("send_emails", f"BOOLEAN DEFAULT {bool_true}"),
            ("registration_start", datetime_type),
            ("registration_end", datetime_type),
            ("disclaimer_enabled", f"BOOLEAN DEFAULT {bool_false}"),
            ("disclaimer_text", "TEXT"),
            ("logo_url", "TEXT"),
            ("sender_email", "TEXT"),
            ("sender_name", "TEXT"),
            ("reply_to", "TEXT"),
            ("company_required", f"BOOLEAN DEFAULT {bool_false}"),
            ("background_url", "TEXT")
        ]:
            if col_name not in event_columns:
                try:
                    session.execute(text(f'ALTER TABLE "event" ADD COLUMN {col_name} {col_type}'))
                    session.commit()
                    print(f"Column '{col_name}' added to event table.")
                except Exception:
                    session.rollback()

    # client columns
    client_columns = [col['name'] for col in inspector.get_columns('client')] if inspector.has_table('client') else []
    if client_columns:
        for col_name, col_type in [
            ("font_family", "TEXT DEFAULT 'Calibri, sans-serif'"),
            ("font_size", "TEXT DEFAULT '16px'")
        ]:
            if col_name not in client_columns:
                try:
                    session.execute(text(f'ALTER TABLE "client" ADD COLUMN {col_name} {col_type}'))
                    session.commit()
                    print(f"Column '{col_name}' added to client table.")
                except Exception:
                    session.rollback()

    # registrationformtemplate columns
    rft_columns = [col['name'] for col in inspector.get_columns('registrationformtemplate')] if inspector.has_table('registrationformtemplate') else []
    if rft_columns:
        for col_name in ["email_config", "operator_config"]:
            if col_name not in rft_columns:
                try:
                    session.execute(text(f'ALTER TABLE "registrationformtemplate" ADD COLUMN "{col_name}" JSON'))
                    session.commit()
                    print(f"Column '{col_name}' added to registrationformtemplate table.")
                except Exception:
                    session.rollback()

    if check_only_migrations:
        return

    # Seed default system settings
    default_email = session.exec(select(SystemSetting).where(SystemSetting.key == "email_config")).first()
    if not default_email:
        config = {
            "primary_color": "#0f172a",
            "accent_color": "#94a3b8",
            "heading_text": "Access Granted.",
            "body_text": "Your registration for **{event_title}** has been confirmed. Below are your secure credentials for terminal verification.",
            "footer_text": "Automated Event Management System\nSecurity Tier: Level 4 Authorized",
            "font_family": "Calibri, sans-serif",
            "font_size": "16px"
        }
        session.add(SystemSetting(key="email_config", value=config))
        session.commit()
        print("Default system email settings seeded.")
    else:
        config = default_email.value
        dirty = False
        if not config.get("font_family"):
            config["font_family"] = "Calibri, sans-serif"
            dirty = True
        if not config.get("font_size"):
            config["font_size"] = "16px"
            dirty = True
        if dirty:
            default_email.value = config
            session.add(default_email)
            session.commit()
            print("Updated existing default system email settings with fonts.")

    # Create emailtemplate table and seed defaults
    if not inspector.has_table('emailtemplate'):
        try:
            SQLModel.metadata.tables['emailtemplate'].create(engine)
            session.commit()
            print("Created emailtemplate table.")
        except Exception as e:
            session.rollback()
            print(f"Error creating emailtemplate table: {e}")
            
    try:
        inspector = inspect(engine)
        if inspector.has_table('emailtemplate'):
            from backend.default_templates import DEFAULT_TEMPLATES
            existing = session.exec(select(EmailTemplate)).all()
            existing_keys = {t.key for t in existing}
            added_any = False
            for k, val in DEFAULT_TEMPLATES.items():
                if k not in existing_keys:
                    session.add(EmailTemplate(
                        key=k,
                        name=val["name"],
                        subject=val["subject"],
                        body_html=val["body_html"]
                    ))
                    added_any = True
            if added_any:
                session.commit()
                print("Seeded missing default email templates successfully.")
    except Exception as e:
        session.rollback()
        print(f"Email template seeding error: {e}")

    # Seed default client BMD
    default_client = session.exec(select(Client).where(Client.slug == "bmd")).first()
    if not default_client:
        default_client = Client(
            name="BMD Computing",
            slug="bmd",
            primary_color="#25678e",
            accent_color="#1d2a33",
            heading_text="Access Granted.",
            body_text="Your registration for **{event_title}** has been confirmed. Below are your secure credentials for terminal verification.",
            footer_text="Automated Event Management System\nSecurity Tier: Level 4 Authorized"
        )
        session.add(default_client)
        session.commit()
        print(f"Seeded default BMD client.")

    # Terminology sweep
    sweep_completed = session.exec(select(SystemSetting).where(SystemSetting.key == "terminology_sweep_completed")).first()
    if not sweep_completed:
        print("Running database sweep to update orchestration/authorized text...")
        settings_to_sweep = session.exec(select(SystemSetting)).all()
        for setting in settings_to_sweep:
            if isinstance(setting.value, dict):
                updated = False
                new_val = {}
                for k, v in setting.value.items():
                    if isinstance(v, str):
                        new_v = v.replace("orchestration", "registration").replace("Orchestration", "Registration").replace("has been authorized", "has been confirmed")
                        if new_v != v:
                            updated = True
                        new_val[k] = new_v
                    else:
                        new_val[k] = v
                if updated:
                    setting.value = new_val
                    session.add(setting)
                    print(f"Updated SystemSetting key: {setting.key}")

        clients_to_sweep = session.exec(select(Client)).all()
        for client in clients_to_sweep:
            client_updated = False
            for attr in ["body_text", "heading_text", "footer_text"]:
                val = getattr(client, attr)
                if isinstance(val, str):
                    new_val = val.replace("orchestration", "registration").replace("Orchestration", "Registration").replace("has been authorized", "has been confirmed")
                    if new_val != val:
                        setattr(client, attr, new_val)
                        client_updated = True
            if client_updated:
                session.add(client)
                print(f"Updated Client slug: {client.slug}")
        
        session.add(SystemSetting(key="terminology_sweep_completed", value={"completed": True, "timestamp": datetime.utcnow().isoformat()}))
        session.commit()
        print("Database sweep correction complete.")

    # Seed tournament tables
    try:
        from backend.routers.tournament import Player, EventCheckin, Match
        Player.metadata.create_all(engine)
        print("Tournament tables verified.")
    except Exception as e:
        print(f"Tournament tables creation warning: {e}")

    # Seed indexes
    try:
        indexes_to_create = [
            ("idx_attendee_email", "attendee", "email"),
            ("idx_registration_event_id", "registration", "event_id"),
            ("idx_registration_attendee_id", "registration", "attendee_id"),
            ("idx_registration_pin", "registration", "pin"),
            ("idx_event_checkins_player_id", "event_checkins", "player_id"),
            ("idx_matches_challenger_id", "matches", "challenger_id"),
            ("idx_matches_partner_id", "matches", "partner_id"),
            ("idx_matches_status", "matches", "status"),
            ("idx_registration_event_status", "registration", "event_id, status"),
            ("idx_registration_event_created", "registration", "event_id, created_at DESC"),
            ("idx_registration_checked_in", "registration", "event_id, checked_in"),
            ("idx_userclientlink_user_role", "userclientlink", "user_id, role"),
            ("idx_usereventlink_user_role", "usereventlink", "user_id, role")
        ]
        for idx_name, table, column in indexes_to_create:
            try:
                session.execute(text(f"CREATE INDEX IF NOT EXISTS {idx_name} ON {table} ({column})"))
                session.commit()
            except Exception:
                session.rollback()
        print("Performance indexes verified.")
    except Exception as e:
        print(f"Performance indexes creation warning: {e}")

    # Auto-correct capitalization for all existing attendee names in the database (Self-Healing casing sweep)
    try:
        from backend.models import Attendee
        from backend.utils import clean_name_capitalization
        attendees = session.query(Attendee).all()
        count = 0
        for attendee in attendees:
            clean_first = clean_name_capitalization(attendee.first_name)
            clean_last = clean_name_capitalization(attendee.last_name)
            if clean_first != attendee.first_name or clean_last != attendee.last_name:
                attendee.first_name = clean_first
                attendee.last_name = clean_last
                session.add(attendee)
                count += 1
        if count > 0:
            session.commit()
            print(f"INFO: Successfully capitalized {count} existing attendee names in database.")
    except Exception as e:
        session.rollback()
        print(f"Attendee casing sweep warning: {e}")

    # Auto-optimize and migrate existing base64 assets to Vercel Blob
    try:
        import base64
        from backend.models import Client, SystemSetting
        from backend.media_service import upload_media
        from sqlalchemy.orm.attributes import flag_modified

        def upload_base64_string(b64_str: str, name_hint: str) -> str:
            if not b64_str or not b64_str.startswith("data:image/"):
                return b64_str
            try:
                meta, data = b64_str.split(",", 1)
                content_type = meta.split(";")[0].split(":")[1]
                ext = content_type.split("/")[1]
                file_bytes = base64.b64decode(data)
                url = upload_media(file_bytes, f"{name_hint}.{ext}", content_type)
                if url and url.startswith("http"):
                    return url
            except Exception as ex:
                print(f"Failed to auto-upload base64 asset '{name_hint}': {ex}")
            return b64_str

        # 1. Clean up clients
        clients = session.query(Client).all()
        clients_updated = False
        for client in clients:
            if client.logo_url and client.logo_url.startswith("data:image/"):
                url = upload_base64_string(client.logo_url, f"client_{client.id}_logo")
                if url != client.logo_url:
                    client.logo_url = url
                    clients_updated = True
            if client.banner_url and client.banner_url.startswith("data:image/"):
                url = upload_base64_string(client.banner_url, f"client_{client.id}_banner")
                if url != client.banner_url:
                    client.banner_url = url
                    clients_updated = True
        if clients_updated:
            session.commit()
            print("INFO: Successfully optimized client base64 logo/banners into Vercel Blob.")

        # 2. Clean up SystemSetting default settings
        banner_setting = session.query(SystemSetting).filter(SystemSetting.key == "email_config").first()
        if banner_setting and isinstance(banner_setting.value, dict):
            config = banner_setting.value
            banner_url = config.get("banner_url")
            logo_url = config.get("logo_url")
            updated_config = False
            if banner_url and banner_url.startswith("data:image/"):
                url = upload_base64_string(banner_url, "default_banner")
                if url != banner_url:
                    config["banner_url"] = url
                    updated_config = True
            if logo_url and logo_url.startswith("data:image/"):
                url = upload_base64_string(logo_url, "default_logo")
                if url != logo_url:
                    config["logo_url"] = url
                    updated_config = True
            if updated_config:
                banner_setting.value = config
                flag_modified(banner_setting, "value")
                session.add(banner_setting)
                session.commit()
                print("INFO: Successfully optimized system default base64 logo/banners into Vercel Blob.")
    except Exception as e:
        session.rollback()
        print(f"Base64 auto-migration warning: {e}")
