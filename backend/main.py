from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from backend.database import init_db, engine, IS_SERVERLESS
from backend.utils import limiter
from backend.models import SystemSetting, Client
from backend.routers import auth, events, registrations, settings, users, webhooks, tasks, tournament

app = FastAPI(docs_url="/api/py/docs", openapi_url="/api/py/openapi.json")

# Add SlowAPI rate limiter state and handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware for local frontend development or API access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    """
    On-startup initialization.
    Structural schema updates are managed by Alembic, but we seed default
    configuration data and clients here to ensure cold starts are always ready.
    """
    try:
        # For local development we can still call init_db() to build missing tables quickly,
        # but in production Alembic migrations apply schemas.
        if not IS_SERVERLESS:
            init_db()
        
        with Session(engine) as session:
            # Use SQLAlchemy inspector to check for existing columns and avoid throwing/catching database exceptions
            from sqlalchemy import inspect, text
            inspector = inspect(engine)
            
            # 1. Safely ensure permissions column is added to user table (fallback migration)
            user_columns = [col['name'] for col in inspector.get_columns('user')] if inspector.has_table('user') else []
            if user_columns and 'permissions' not in user_columns:
                try:
                    session.execute(text('ALTER TABLE "user" ADD COLUMN permissions JSON'))
                    session.commit()
                    print("Permissions column added to user table.")
                except Exception:
                    session.rollback()

            # 2. Safely ensure role column is added to userclientlink table (fallback migration)
            ucl_columns = [col['name'] for col in inspector.get_columns('userclientlink')] if inspector.has_table('userclientlink') else []
            if ucl_columns and 'role' not in ucl_columns:
                try:
                    session.execute(text('ALTER TABLE "userclientlink" ADD COLUMN role TEXT DEFAULT \'staff\''))
                    session.commit()
                    print("Role column added to userclientlink table.")
                    
                    # One-time data migration for existing user client roles, only run when role column is newly added
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

            # 3. Safely ensure registration, disclaimer, and sender_email columns are added to event table (fallback migration)
            event_columns = [col['name'] for col in inspector.get_columns('event')] if inspector.has_table('event') else []
            if event_columns:
                dialect_name = session.bind.dialect.name
                is_sqlite = dialect_name == "sqlite"
                
                bool_true = "1" if is_sqlite else "TRUE"
                bool_false = "0" if is_sqlite else "FALSE"
                datetime_type = "DATETIME" if is_sqlite else "TIMESTAMP"
                
                for col_name, col_type in [
                    ("registration_active", f"BOOLEAN DEFAULT {bool_true}"),
                    ("registration_start", datetime_type),
                    ("registration_end", datetime_type),
                    ("disclaimer_enabled", f"BOOLEAN DEFAULT {bool_false}"),
                    ("disclaimer_text", "TEXT"),
                    ("logo_url", "TEXT"),
                    ("sender_email", "TEXT")
                ]:
                    if col_name not in event_columns:
                        try:
                            session.execute(text(f'ALTER TABLE "event" ADD COLUMN {col_name} {col_type}'))
                            session.commit()
                            print(f"Column '{col_name}' added to event table.")
                        except Exception:
                            session.rollback()

            # 4. Initialize default email settings if not present
            default_email = session.exec(select(SystemSetting).where(SystemSetting.key == "email_config")).first()
            if not default_email:
                config = {
                    "primary_color": "#0f172a",
                    "accent_color": "#94a3b8",
                    "heading_text": "Access Granted.",
                    "body_text": "Your registration for **{event_title}** has been confirmed. Below are your secure credentials for terminal verification.",
                    "footer_text": "Automated Event Management System\nSecurity Tier: Level 4 Authorized"
                }
                session.add(SystemSetting(key="email_config", value=config))
                session.commit()
                print("Default system email settings seeded.")

            # 5. Seed default BMD client if it doesn't exist yet.
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
                session.refresh(default_client)
                print(f"Seeded default BMD client with id={default_client.id}")
                
            # 6. Sweep existing settings and clients to replace "orchestration" and "authorized"
            # Guarded behind a setting key terminology_sweep_completed to avoid running database sweeps on every startup
            sweep_completed = session.exec(select(SystemSetting).where(SystemSetting.key == "terminology_sweep_completed")).first()
            if not sweep_completed:
                from datetime import datetime
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
                
                # Mark sweep as completed
                session.add(SystemSetting(key="terminology_sweep_completed", value={"completed": True, "timestamp": datetime.utcnow().isoformat()}))
                session.commit()
                print("Database sweep correction complete and marked.")
                
            # 7. Safely ensure tournament tables are created (fallback for serverless cold start)
            try:
                from backend.routers.tournament import Player, EventCheckin, Match
                Player.metadata.create_all(engine)
                print("Tournament tables created/verified.")
            except Exception as e:
                print(f"Tournament tables creation warning: {e}")
                
            # 8. Safely ensure database performance indexes are created
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
                print("Performance indexes verified/created.")
            except Exception as e:
                print(f"Performance indexes creation warning: {e}")
                
    except Exception as e:
        print(f"Database initialization/seeding warning: {e}")

# Include Sub-routers with expected Vercel routes mappings
app.include_router(auth.router, prefix="/api/py/auth", tags=["auth"])
app.include_router(events.router, prefix="/api/py/events", tags=["events"])
# metrics endpoints are prefixless under /api/py
app.include_router(events.metrics_router, prefix="/api/py", tags=["metrics"])
app.include_router(registrations.router, prefix="/api/py", tags=["registrations"])
app.include_router(settings.router, prefix="/api/py", tags=["settings"])
app.include_router(users.router, prefix="/api/py/users", tags=["users"])
app.include_router(webhooks.router, prefix="/api/py/webhooks", tags=["webhooks"])
app.include_router(tasks.router, prefix="/api/py/tasks", tags=["tasks"])
app.include_router(tournament.router)

@app.get("/api/py/healthcheck")
def healthcheck():
    return {"status": "ok", "version": "1.3-modular"}
