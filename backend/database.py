import os
from sqlmodel import create_engine, SQLModel, Session
from sqlalchemy.pool import NullPool
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
# Handle cases where the engine must be running serverless or locally
IS_SERVERLESS = DATABASE_URL and "localhost" not in DATABASE_URL and "sqlite" not in DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    echo=False,
    poolclass=NullPool if IS_SERVERLESS else None,
    connect_args={"sslmode": "require"} if IS_SERVERLESS else {}
)

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
            ("idx_matches_status", "matches", "status")
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
