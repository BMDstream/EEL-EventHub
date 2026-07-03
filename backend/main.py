from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select, SQLModel
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from backend.database import init_db, engine, IS_SERVERLESS
from backend.utils import limiter
from backend.models import SystemSetting, Client, EmailTemplate
from backend.routers import auth, events, registrations, settings, users, webhooks, tasks, tournament, media

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
    if IS_SERVERLESS:
        print("Running in serverless mode. Skipping database initialization and migrations on startup.")
        return

    try:
        from backend.database import run_db_initialization
        with Session(engine) as session:
            run_db_initialization(session)
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
app.include_router(media.router, prefix="/api/py/media", tags=["media"])
app.include_router(webhooks.router, prefix="/api/py/webhooks", tags=["webhooks"])
app.include_router(tasks.router, prefix="/api/py/tasks", tags=["tasks"])
app.include_router(tournament.router)

@app.get("/api/py/healthcheck")
def healthcheck():
    return {"status": "ok", "version": "1.3-modular"}
