import os
from sqlmodel import create_engine, SQLModel, Session
from sqlalchemy.pool import NullPool
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
IS_SERVERLESS = DATABASE_URL and "localhost" not in DATABASE_URL and "sqlite" not in DATABASE_URL

# A small pool size of 1 with 0 max_overflow allows warm serverless lambda instances 
# to keep and reuse a single active connection, eliminating SSL handshake overhead
# without risk of connection limit exhaustion under high concurrency.
engine = create_engine(
    DATABASE_URL,
    echo=False,
    pool_size=1 if IS_SERVERLESS else 5,
    max_overflow=0 if IS_SERVERLESS else 10,
    pool_recycle=120,
    connect_args={"sslmode": "require"} if IS_SERVERLESS else {}
)

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
