from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from backend.database import init_db, engine
from backend.utils import limiter
from backend.models import SystemSetting, Client
from backend.routers import auth, events, registrations, settings, users, webhooks, tasks

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
        init_db()
        
        with Session(engine) as session:
            # Safely ensure permissions column is added to user table (fallback migration)
            from sqlalchemy import text
            try:
                session.execute(text('ALTER TABLE "user" ADD COLUMN permissions JSON'))
                session.commit()
                print("Permissions column added to user table.")
            except Exception:
                session.rollback()

            # Safely ensure registration and disclaimer columns are added to event table (fallback migration)
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
                ("disclaimer_text", "TEXT")
            ]:
                try:
                    session.execute(text(f'ALTER TABLE "event" ADD COLUMN {col_name} {col_type}'))
                    session.commit()
                    print(f"Column '{col_name}' added to event table.")
                except Exception:
                    session.rollback()

            # 1. Initialize default email settings if not present
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

            # 2. Seed default BMD client if it doesn't exist yet.
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
                
            # 3. Sweep existing settings and clients to replace "orchestration" and "authorized"
            print("Running database sweep to update orchestration/authorized text...")
            settings = session.exec(select(SystemSetting)).all()
            for setting in settings:
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

            clients = session.exec(select(Client)).all()
            for client in clients:
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
            
            if settings or clients:
                session.commit()
                print("Database correction complete.")
                
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

@app.get("/api/py/healthcheck")
def healthcheck():
    return {"status": "ok", "version": "1.3-modular"}
