import io
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from app.main import app, perform_health_check
from app.database import Base, get_db
from app.models.user import User, UserRole
from app.models.ticket import Ticket, TicketStatus, TicketPriority
from app.models.category import Category
from app.models.department import Department
from app.utils.security import get_password_hash
from tests.conftest import auth_headers, make_department, make_category, make_user, make_admin


class TestPostmanFindingsRegression:
    """Complete regression suite for all Postman findings and test cases."""

    # TC-HEALTH-01
    def test_tc_health_01_health_responds_healthy(self, client):
        res = client.get("/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert data["database"] == "connected"
        assert data["schema"] == "ready"

    # TC-HEALTH-02
    def test_tc_health_02_schema_readiness_fails_when_tables_missing(self, monkeypatch):
        # Create a fresh engine with an empty SQLite database (no tables)
        empty_engine = create_engine("sqlite:///:memory:")
        monkeypatch.setattr("app.main.engine", empty_engine)

        res = perform_health_check()
        assert res.status_code == 503
        data = res.body.decode()
        assert "not-ready" in data

    # TC-AUTH-01
    def test_tc_auth_01_admin_login_succeeds(self, client, db):
        admin = make_admin(db, employee_id="ADM_POSTMAN", name="Admin Postman")
        admin.password_hash = get_password_hash("Admin123!")
        db.commit()

        res = client.post("/api/auth/login", json={"email": admin.email, "password": "Admin123!"})
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["role"] == "SUPER_ADMIN"
        assert data["user_id"] == admin.id

    # TC-AUTH-02
    def test_tc_auth_02_employee_login_succeeds(self, client, db):
        emp = make_user(db, employee_id="EMP_POSTMAN", name="Emp Postman", role=UserRole.EMPLOYEE)
        emp.password_hash = get_password_hash("Employee123!")
        db.commit()

        res = client.post("/api/auth/login", json={"email": emp.email, "password": "Employee123!"})
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert data["role"] == "EMPLOYEE"

    # TC-AUTH-03
    def test_tc_auth_03_wrong_password_rejected(self, client, db):
        emp = make_user(db, employee_id="EMP_WRONG_PW")
        res = client.post("/api/auth/login", json={"email": emp.email, "password": "WrongPassword!"})
        assert res.status_code == 401
        assert "access_token" not in res.json()

    # TC-AUTH-04
    def test_tc_auth_04_missing_login_fields_rejected(self, client):
        res = client.post("/api/auth/login", json={})
        assert res.status_code == 422

    # TC-USERS-01
    def test_tc_users_01_current_user_profile(self, client, db):
        emp = make_user(db, employee_id="EMP_PROF")
        headers = auth_headers(emp)
        res = client.get("/api/users/me", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["email"] == emp.email
        assert "password_hash" not in data

    # TC-USERS-02
    def test_tc_users_02_employee_cannot_access_admin_listing(self, client, db):
        emp = make_user(db, employee_id="EMP_FORBIDDEN")
        headers = auth_headers(emp)
        res = client.get("/api/users", headers=headers)
        assert res.status_code == 403

    # TC-TICKET-01
    def test_tc_ticket_01_employee_creates_valid_ticket(self, client, db):
        dept = make_department(db)
        cat = make_category(db, dept.id)
        emp = make_user(db, employee_id="EMP_TKT_CREATE")
        headers = auth_headers(emp)

        payload = {
            "title": "Hardware Issue",
            "description": "Keyboard not functioning",
            "category_id": cat.id,
            "priority": "HIGH",
        }
        res = client.post("/api/tickets", json=payload, headers=headers)
        assert res.status_code in (200, 201)
        data = res.json()
        assert "id" in data
        assert data["title"] == "Hardware Issue"
        assert data["ticket_number"].startswith("TKT-")

    # TC-TICKET-02
    def test_tc_ticket_02_missing_required_fields_rejected(self, client, db):
        emp = make_user(db, employee_id="EMP_MISSING_FIELDS")
        headers = auth_headers(emp)
        res = client.post("/api/tickets", json={"title": "No category or description"}, headers=headers)
        assert res.status_code == 422

    # TC-TICKET-03
    def test_tc_ticket_03_employee_cannot_assign_ticket(self, client, db):
        dept = make_department(db)
        cat = make_category(db, dept.id)
        emp1 = make_user(db, employee_id="EMP_OWNER")
        emp2 = make_user(db, employee_id="EMP_ASSIGN_ATTEMPT")
        from tests.conftest import make_ticket
        ticket = make_ticket(db, creator=emp1, category_id=cat.id)

        headers = auth_headers(emp2)
        res = client.put(f"/api/tickets/{ticket.id}/assign", json={"assigned_to_user_id": emp2.id}, headers=headers)
        assert res.status_code == 403

    # TC-TICKET-04
    def test_tc_ticket_04_invalid_status_transition_rejected(self, client, db):
        dept = make_department(db)
        cat = make_category(db, dept.id)
        emp = make_user(db, employee_id="EMP_INVALID_TRANS")
        from tests.conftest import make_ticket
        ticket = make_ticket(db, creator=emp, category_id=cat.id, status=TicketStatus.OPEN)

        headers = auth_headers(emp)
        # OPEN directly to RESOLVED without assigned employee/in_progress is rejected
        res = client.put(f"/api/tickets/{ticket.id}/status", json={"status": "RESOLVED"}, headers=headers)
        assert res.status_code in (403, 422)

    # TC-COMMENT-01
    def test_tc_comment_01_add_comment(self, client, db):
        dept = make_department(db)
        cat = make_category(db, dept.id)
        emp = make_user(db, employee_id="EMP_COMMENT")
        from tests.conftest import make_ticket
        ticket = make_ticket(db, creator=emp, category_id=cat.id)

        headers = auth_headers(emp)
        res = client.post(f"/api/tickets/{ticket.id}/comments", json={"content": "Please check urgently"}, headers=headers)
        assert res.status_code in (200, 201)
        data = res.json()
        assert data["content"] == "Please check urgently"

    # TC-ATTACH-01
    def test_tc_attach_01_upload_attachment(self, client, db):
        dept = make_department(db)
        cat = make_category(db, dept.id)
        emp = make_user(db, employee_id="EMP_ATTACH")
        from tests.conftest import make_ticket
        ticket = make_ticket(db, creator=emp, category_id=cat.id)

        headers = auth_headers(emp)
        file_bytes = b"Sample diagnostic screenshot content"
        files = {"file": ("diagnostic.txt", io.BytesIO(file_bytes), "text/plain")}
        res = client.post(f"/api/tickets/{ticket.id}/attachments", files=files, headers=headers)
        assert res.status_code in (200, 201)
        data = res.json()
        assert data["file_name"] == "diagnostic.txt"

    # TC-CAT-01
    def test_tc_cat_01_nonexistent_category_rejected(self, client, db):
        emp = make_user(db, employee_id="EMP_CAT_TEST")
        headers = auth_headers(emp)
        payload = {
            "title": "Invalid Cat Ticket",
            "description": "Test",
            "category_id": "nonexistent-category-id-12345",
        }
        res = client.post("/api/tickets", json=payload, headers=headers)
        assert res.status_code == 422

    # TC-SLA-01
    def test_tc_sla_01_sla_policy_crud_and_calculation(self, client, db):
        admin = make_admin(db, employee_id="ADM_SLA")
        headers = auth_headers(admin)

        # 1. Create SLA Policy
        create_res = client.post(
            "/api/sla-policies",
            json={"name": "Critical Enterprise SLA", "first_response_hours": 1, "resolution_hours": 4, "priority": "CRITICAL"},
            headers=headers,
        )
        assert create_res.status_code == 201
        policy = create_res.json()
        policy_id = policy["id"]
        assert policy["name"] == "Critical Enterprise SLA"

        # 2. List SLA Policies
        list_res = client.get("/api/sla-policies", headers=headers)
        assert list_res.status_code == 200
        assert any(p["id"] == policy_id for p in list_res.json())

        # 3. Calculate Due Times
        calc_res = client.post(
            "/api/sla-policies/calculate-due",
            json={"priority": "CRITICAL", "sla_policy_id": policy_id},
            headers=headers,
        )
        assert calc_res.status_code == 200
        calc_data = calc_res.json()
        assert calc_data["first_response_hours"] == 1
        assert calc_data["resolution_hours"] == 4

    # TC-ESC-01
    def test_tc_esc_01_escalation_by_owner_and_denial_for_unrelated_user(self, client, db):
        dept = make_department(db)
        cat = make_category(db, dept.id)
        owner = make_user(db, employee_id="EMP_OWNER_ESC")
        unrelated_user = make_user(db, employee_id="EMP_STRANGER")
        from tests.conftest import make_ticket
        ticket = make_ticket(db, creator=owner, category_id=cat.id)

        # Unrelated user attempting to escalate gets 403
        stranger_headers = auth_headers(unrelated_user)
        denied_res = client.post(
            f"/api/tickets/{ticket.id}/escalate",
            json={"reason": "I want to escalate someone else's ticket"},
            headers=stranger_headers,
        )
        assert denied_res.status_code == 403

        # Ticket owner escalating succeeds
        owner_headers = auth_headers(owner)
        success_res = client.post(
            f"/api/tickets/{ticket.id}/escalate",
            json={"reason": "No response for 48 hours, blocking urgent launch."},
            headers=owner_headers,
        )
        assert success_res.status_code == 201
        esc_data = success_res.json()
        assert esc_data["ticket_id"] == ticket.id
        assert esc_data["status"] == "OPEN"

    # TC-NOTIF-01
    def test_tc_notif_01_notification_read_unread(self, client, db):
        user = make_user(db, employee_id="EMP_NOTIF")
        from app.models.notification import Notification
        notif = Notification(
            user_id=user.id,
            sender_email="system@resolvehub.com",
            recipient_email=user.email,
            title="Test Notification",
            message="Action required",
        )
        db.add(notif)
        db.commit()

        headers = auth_headers(user)
        list_res = client.get("/api/notifications", headers=headers)
        assert list_res.status_code == 200
        assert len(list_res.json()) >= 1

        mark_res = client.put(f"/api/notifications/{notif.id}/read", headers=headers)
        assert mark_res.status_code == 200
        assert mark_res.json()["is_read"] is True

    # TC-E2E-01
    def test_tc_e2e_01_full_lifecycle(self, client, db):
        dept = make_department(db)
        cat = make_category(db, dept.id)
        admin = make_admin(db, employee_id="ADM_E2E")
        emp = make_user(db, employee_id="EMP_E2E")
        resolver = make_user(db, employee_id="RES_E2E")
        admin_h = auth_headers(admin)
        emp_h = auth_headers(emp)
        res_h = auth_headers(resolver)

        # 1. Employee creates ticket
        t_res = client.post(
            "/api/tickets",
            json={"title": "E2E Ticket Lifecycle", "description": "Full end-to-end flow", "category_id": cat.id},
            headers=emp_h,
        )
        assert t_res.status_code in (200, 201)
        t_id = t_res.json()["id"]

        # 2. Add comment
        c_res = client.post(f"/api/tickets/{t_id}/comments", json={"content": "Adding initial clarification"}, headers=emp_h)
        assert c_res.status_code in (200, 201)

        # 3. Admin assigns to resolver
        assign_res = client.put(f"/api/tickets/{t_id}/assign", json={"assigned_to_user_id": resolver.id}, headers=admin_h)
        assert assign_res.status_code == 200

        # 4. Resolver transitions to IN_PROGRESS
        prog_res = client.put(f"/api/tickets/{t_id}/status", json={"status": "IN_PROGRESS"}, headers=res_h)
        assert prog_res.status_code == 200

        # 5. Resolver resolves ticket
        res_solve = client.put(f"/api/tickets/{t_id}/status", json={"status": "RESOLVED"}, headers=res_h)
        assert res_solve.status_code == 200

        # 6. Creator closes ticket
        close_res = client.put(f"/api/tickets/{t_id}/close", headers=emp_h)
        assert close_res.status_code == 200
        assert close_res.json()["status"] == "CLOSED"
