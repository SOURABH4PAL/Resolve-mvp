"""
SQLAlchemy engine, session, and declarative Base.

Safety:
- SQLite: foreign_keys PRAGMA is enabled per-connection via an event listener.
- Upload paths are resolved to absolute on write (handled in ticket_service).
- SECRET_KEY is validated at startup in main.py.
"""

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import get_settings

settings = get_settings()

db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+psycopg://", 1)
elif db_url.startswith("postgresql://") and not db_url.startswith("postgresql+"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)

if db_url.startswith("sqlite"):
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False},
    )

    # Enable FK enforcement for every new SQLite connection
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_conn, connection_record):  # noqa: ANN001
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

else:
    engine = create_engine(
        db_url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        pool_recycle=3600,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db_schema():
    """Ensure all tables and missing columns exist without losing existing data."""
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        # Check if responsible_user_id exists in departments
        try:
            conn.execute(text("SELECT responsible_user_id FROM departments LIMIT 1"))
        except Exception:
            try:
                conn.execute(text("ALTER TABLE departments ADD COLUMN responsible_user_id VARCHAR(36) REFERENCES users(id)"))
                conn.commit()
            except Exception:
                pass

