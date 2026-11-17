"""
SQLAlchemy engine, session, and declarative Base.

Safety:
- SQLite: foreign_keys PRAGMA is enabled per-connection via an event listener.
- Upload paths are resolved to absolute on write (handled in ticket_service).
- SECRET_KEY is validated at startup in main.py.
- Schema auto-check ensures columns like is_blocked and tables like ticket_journey exist.
"""

import logging
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import get_settings

logger = logging.getLogger("resolvehub.database")
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


def ensure_schema_compatibility():
    """Ensure all tables and backward-compatible columns exist in the active database."""
    try:
        # Import all models to ensure metadata is populated
        import app.models  # noqa: F401
        Base.metadata.create_all(bind=engine)

        if settings.DATABASE_URL.startswith("sqlite"):
            with engine.connect() as conn:
                # Check tickets table columns
                cols_res = conn.execute(text("PRAGMA table_info(tickets)")).fetchall()
                existing_cols = {col[1] for col in cols_res}

                if existing_cols:
                    if "is_blocked" not in existing_cols:
                        conn.execute(text("ALTER TABLE tickets ADD COLUMN is_blocked BOOLEAN DEFAULT 0"))
                        logger.info("Added 'is_blocked' column to tickets table.")
                    if "blocked_reason" not in existing_cols:
                        conn.execute(text("ALTER TABLE tickets ADD COLUMN blocked_reason TEXT"))
                        logger.info("Added 'blocked_reason' column to tickets table.")
                    if "blocked_at" not in existing_cols:
                        conn.execute(text("ALTER TABLE tickets ADD COLUMN blocked_at DATETIME"))
                        logger.info("Added 'blocked_at' column to tickets table.")
                    if "blocked_by_id" not in existing_cols:
                        conn.execute(text("ALTER TABLE tickets ADD COLUMN blocked_by_id VARCHAR(36)"))
                        logger.info("Added 'blocked_by_id' column to tickets table.")
                    conn.commit()
    except Exception as exc:
        logger.warning(f"Schema compatibility check warning: {exc}")


def get_db():
    """FastAPI dependency that yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
