import os
from sqlmodel import create_engine, SQLModel, Session
from sqlalchemy.pool import NullPool
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
IS_SERVERLESS = DATABASE_URL and "localhost" not in DATABASE_URL and "sqlite" not in DATABASE_URL

# NullPool is correct here: Neon's PgBouncer (pooler URL) already manages
# connection pooling externally. SQLAlchemy's own pool would create redundant
# connections and exhaust Neon's limit under load.
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
