"""
Database Configuration
──────────────────────
SQLAlchemy engine + session factory using PostgreSQL.
Falls back to SQLite if DATABASE_URL is not set.
"""

import os
import logging
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool

load_dotenv()
logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "")

def get_engine():
    global DATABASE_URL
    if not DATABASE_URL:
        DB_PATH = os.path.join(os.path.dirname(__file__), "medai.db")
        DATABASE_URL = f"sqlite:///{DB_PATH}"

    if DATABASE_URL.startswith("sqlite"):
        return create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    
    # Try PostgreSQL, fallback if fail
    logger.info(f"Attempting PostgreSQL connection to {DATABASE_URL.split('@')[-1]}...")
    try:
        engine = create_engine(DATABASE_URL, poolclass=NullPool)
        with engine.connect() as conn:
            pass # just checking connection
        logger.info("✅ PostgreSQL connection successful.")
        return engine
    except Exception as e:
        logger.error(f"❌ PostgreSQL connection failed ({type(e).__name__}). Falling back to SQLite.")
        DB_PATH = os.path.join(os.path.dirname(__file__), "medai.db")
        DATABASE_URL = f"sqlite:///{DB_PATH}"
        return create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

engine = get_engine()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a DB session, auto-closes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables if they don't exist."""
    from models import User, Consultation, ChatSession, ChatMessage, ImageScan  # noqa
    Base.metadata.create_all(bind=engine)
