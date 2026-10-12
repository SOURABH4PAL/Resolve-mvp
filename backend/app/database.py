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


def ensure_initial_seed():
    """Ensure baseline admin and employee accounts exist if the users table is empty."""
    import app.models  # noqa: F401
    from app.models.user import User, UserRole
    from app.models.department import Department
    from app.models.category import Category
    from app.models.subcategory import Subcategory
    from app.utils.security import get_password_hash

    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        if user_count == 0:
            depts = {
                "IT Support": "it@resolvehub.com",
                "Human Resources": "hr@resolvehub.com",
                "General": "general@resolvehub.com",
            }
            dept_map = {}
            for d_name, d_email in depts.items():
                dept = db.query(Department).filter(Department.name == d_name).first()
                if not dept:
                    dept = Department(name=d_name, department_email=d_email)
                    db.add(dept)
                    db.flush()
                dept_map[d_name] = dept

            it_dept = dept_map.get("IT Support")
            hr_dept = dept_map.get("Human Resources")
            gen_dept = dept_map.get("General")

            hw = Category(name="Hardware", description="Physical hardware issues", department_id=it_dept.id)
            sw = Category(name="Software", description="Software & OS issues", department_id=it_dept.id)
            pay = Category(name="Payroll", description="Payroll queries", department_id=hr_dept.id)
            gen = Category(name="General Inquiry", description="Workplace queries", department_id=gen_dept.id)
            db.add_all([hw, sw, pay, gen])
            db.flush()

            subcats = [
                (hw.id, "Laptop Issue", "Laptop battery, display, or keyboard problems"),
                (hw.id, "Monitor Issue", "External monitor connectivity"),
                (sw.id, "OS Crash", "Operating system blue screen or crash"),
                (sw.id, "VPN Access", "Virtual Private Network connection issues"),
                (pay.id, "Salary Discrepancy", "Issues with pay stub or bank transfer"),
                (gen.id, "Workplace Request", "Desk, access card, or general request"),
            ]
            for c_id, s_name, s_desc in subcats:
                db.add(Subcategory(category_id=c_id, name=s_name, description=s_desc))
            db.flush()

            admin = User(
                employee_id="EMP001",
                name="Super Admin",
                email="admin@resolvehub.com",
                password_hash=get_password_hash("Admin123!"),
                role=UserRole.SUPER_ADMIN,
                department_id=it_dept.id if it_dept else None,
            )
            emp = User(
                employee_id="EMP003",
                name="Jane Doe",
                email="employee@resolvehub.com",
                password_hash=get_password_hash("Employee123!"),
                role=UserRole.EMPLOYEE,
                department_id=hr_dept.id if hr_dept else None,
            )
            resolver = User(
                employee_id="EMP002",
                name="IT Support Staff",
                email="resolver@resolvehub.com",
                password_hash=get_password_hash("Resolver123!"),
                role=UserRole.EMPLOYEE,
                department_id=it_dept.id if it_dept else None,
            )
            db.add_all([admin, emp, resolver])
            db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


def init_db_schema():
    """Ensure all tables and missing columns exist without losing existing data."""
    import app.models  # noqa: F401 - Import all models so metadata knows all tables
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
    ensure_initial_seed()

