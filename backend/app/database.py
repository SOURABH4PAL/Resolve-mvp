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

        # Seed baseline FAQs if none exist
        from app.models.faq import FAQ
        if db.query(FAQ).count() == 0:
            it_dept = db.query(Department).filter(Department.name.ilike("%IT%")).first()
            hr_dept = db.query(Department).filter(Department.name.ilike("%Human Resources%")).first()
            fin_dept = db.query(Department).filter(Department.name.ilike("%Finance%")).first() or it_dept

            hw_cat = db.query(Category).filter(Category.name.ilike("%Hardware%")).first()
            leave_cat = db.query(Category).filter(Category.name.ilike("%Leave%")).first() or db.query(Category).first()
            pay_cat = db.query(Category).filter(Category.name.ilike("%Payroll%")).first() or db.query(Category).first()

            default_faqs = [
                FAQ(
                    question="How do I request a replacement laptop charger?",
                    answer="Submit an IT Support ticket under Hardware Issues. The responsible IT employee will arrange pickup at the 3rd floor reception.",
                    department_id=it_dept.id if it_dept else None,
                    category_id=hw_cat.id if hw_cat else None,
                    views=420,
                    helpful_count=85,
                    is_published=True,
                ),
                FAQ(
                    question="Where can I download my annual Form 16 / tax statement?",
                    answer="Form 16 is published annually by the Finance department in the payroll portal under Tax Documents every June 15.",
                    department_id=fin_dept.id if fin_dept else None,
                    category_id=pay_cat.id if pay_cat else None,
                    views=890,
                    helpful_count=210,
                    is_published=True,
                ),
                FAQ(
                    question="What is the policy for carry-forward leaves?",
                    answer="Up to 15 earned leaves can be carried over into the new calendar year. Unused leaves beyond 15 lapse on Dec 31.",
                    department_id=hr_dept.id if hr_dept else None,
                    category_id=leave_cat.id if leave_cat else None,
                    views=650,
                    helpful_count=140,
                    is_published=True,
                ),
            ]
            db.add_all(default_faqs)
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

        # Check if helpful_count exists in faqs
        try:
            conn.execute(text("SELECT helpful_count FROM faqs LIMIT 1"))
        except Exception:
            try:
                conn.execute(text("ALTER TABLE faqs ADD COLUMN helpful_count INTEGER DEFAULT 0 NOT NULL"))
                conn.commit()
            except Exception:
                pass

        # Check if views exists in faqs
        try:
            conn.execute(text("SELECT views FROM faqs LIMIT 1"))
        except Exception:
            try:
                conn.execute(text("ALTER TABLE faqs ADD COLUMN views INTEGER DEFAULT 0 NOT NULL"))
                conn.commit()
            except Exception:
                pass

    ensure_initial_seed()

