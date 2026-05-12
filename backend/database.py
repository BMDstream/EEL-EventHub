import os
from sqlmodel import create_engine, SQLModel, Session
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Use a connection pooler-friendly configuration if needed
# Neon recommends certain settings for serverless
engine = create_engine(
    DATABASE_URL,
    echo=True,
    connect_args={"sslmode": "require"} if DATABASE_URL and "localhost" not in DATABASE_URL and "sqlite" not in DATABASE_URL else {}
)

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
