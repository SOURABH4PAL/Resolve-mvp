"""
Shared test fixtures for ResolveHub backend tests.

Uses an in-memory SQLite database so tests are fast, isolated, and need no
external services.  Each test gets its own clean database via the `db` fixture.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.models.user import User, UserRole
from app.models.ticket import Ticket, TicketStatus, TicketPriority
from app.models.category import Category
from app.models.subcategory import Subcategory
from app.models.department import Department
from app.utils.security import get_password_hash, create_access_token

from sqlalchemy.pool import StaticPool

# ---------------------------------------------------------------------------
# In-memory database setup
# ---------------------------------------------------------------------------

TEST_DATABASE_URL = "sqlite:///:memory:"


@pytest.fixture(scope="function")
def db():
    """Yield a fresh SQLAlchemy session backed by an in-memory SQLite DB."""
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def _fk_pragma(dbapi_conn, _record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture(scope="function")
def client(db):
    """TestClient wired to the in-memory database via dependency override."""
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Common seed helpers
# ---------------------------------------------------------------------------

def make_department(db, name="IT"):
    dept = Department(name=name, department_email=f"{name.lower()}@example.com", is_active=True)
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


def make_category(db, dept_id, name="Hardware"):
    cat = Category(department_id=dept_id, name=name, description="", is_active=True)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


def make_subcategory(db, category_id, name="Laptop"):
    sub = Subcategory(category_id=category_id, name=name, description="", is_active=True)
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


def make_user(db, employee_id="EMP001", name="Alice", role=UserRole.EMPLOYEE, is_active=True):
    user = User(
        employee_id=employee_id,
        name=name,
        email=f"{employee_id}@example.com",
        password_hash=get_password_hash("password123"),
        role=role,
        is_active=is_active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def make_admin(db, employee_id="ADM001", name="Admin"):
    return make_user(db, employee_id=employee_id, name=name, role=UserRole.SUPER_ADMIN)


def auth_headers(user: User) -> dict:
    token = create_access_token({"sub": user.id})
    return {"Authorization": f"Bearer {token}"}


def make_ticket(db, creator: User, category_id: str, subcategory_id=None,
                status=TicketStatus.OPEN, assigned_to=None):
    from app.utils.ticket_number import generate_ticket_number
    ticket = Ticket(
        ticket_number=generate_ticket_number(db),
        title="Test Ticket",
        description="A test ticket description",
        created_by=creator.id,
        category_id=category_id,
        subcategory_id=subcategory_id,
        priority=TicketPriority.MEDIUM,
        status=status,
        assigned_to=assigned_to,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket
