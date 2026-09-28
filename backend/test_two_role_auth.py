import os
import sys
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.main import app
from app.database import SessionLocal
from app.models.ticket import Ticket, TicketStatus
from app.models.category import Category

client = TestClient(app)


def test_two_role_architecture_flow():
    print("\n--- TEST 1: EMPLOYEE Login ---")
    emp_res = client.post("/api/auth/login", json={
        "email": "employee@resolvehub.com",
        "password": "Employee123!"
    })
    assert emp_res.status_code == 200, f"Employee login failed: {emp_res.text}"
    emp_data = emp_res.json()
    assert emp_data["role"] == "EMPLOYEE"
    emp_token = emp_data["access_token"]
    emp_headers = {"Authorization": f"Bearer {emp_token}"}
    print(f"Employee login successful. Role: {emp_data['role']}")

    print("\n--- TEST 2: SUPER_ADMIN Login ---")
    admin_res = client.post("/api/auth/login", json={
        "email": "admin@resolvehub.com",
        "password": "Admin123!"
    })
    assert admin_res.status_code == 200, f"Admin login failed: {admin_res.text}"
    admin_data = admin_res.json()
    assert admin_data["role"] == "SUPER_ADMIN"
    admin_token = admin_data["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print(f"Super Admin login successful. Role: {admin_data['role']}")

    print("\n--- TEST 3: Invalid Login ---")
    invalid_res = client.post("/api/auth/login", json={
        "email": "employee@resolvehub.com",
        "password": "WrongPassword!"
    })
    assert invalid_res.status_code == 401, f"Invalid login should return 401, got: {invalid_res.status_code}"
    print("Invalid login correctly returned 401 Unauthorized.")

    print("\n--- TEST 4: JWT Generation & Profile Verification (/users/me) ---")
    me_res = client.get("/api/users/me", headers=emp_headers)
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == "employee@resolvehub.com"
    assert me_data["role"] == "EMPLOYEE"
    print(f"JWT decoded & profile verified for {me_data['name']} (Role: {me_data['role']})")

    # Fetch category for creating test tickets
    cat_res = client.get("/api/categories", headers=emp_headers)
    assert cat_res.status_code == 200
    category_id = cat_res.json()[0]["id"]

    print("\n--- TEST 5: Employee Resolving Authorized Assigned Ticket ---")
    # Login staff employee
    staff_res = client.post("/api/auth/login", json={
        "email": "resolver@resolvehub.com",
        "password": "Resolver123!"
    })
    assert staff_res.status_code == 200
    staff_data = staff_res.json()
    assert staff_data["role"] == "EMPLOYEE"
    staff_token = staff_data["access_token"]
    staff_user_id = staff_data["user_id"]
    staff_headers = {"Authorization": f"Bearer {staff_token}"}

    # Employee creates a ticket
    create_res = client.post("/api/tickets", json={
        "title": "VPN connection drops",
        "description": "VPN connection drops every 10 minutes.",
        "category_id": category_id,
        "priority": "HIGH"
    }, headers=emp_headers)
    assert create_res.status_code == 201
    ticket_id = create_res.json()["id"]

    # Assign ticket to staff_user_id
    db = SessionLocal()
    t = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    t.assigned_to = staff_user_id
    db.commit()
    db.close()

    # Staff Employee resolves the assigned ticket
    resolve_res = client.put(f"/api/tickets/{ticket_id}/resolve", json={
        "resolution_notes": "Reset VPN config profile."
    }, headers=staff_headers)
    assert resolve_res.status_code == 200, f"Assigned employee resolve failed: {resolve_res.text}"
    assert resolve_res.json()["status"] == "RESOLVED"
    print("Assigned Employee successfully resolved ticket!")

    print("\n--- TEST 6: Unauthorized Employee Attempting Restricted Ticket Action ---")
    # Employee creates ticket 2 (unassigned)
    create_res2 = client.post("/api/tickets", json={
        "title": "Printer paper jam",
        "description": "2nd floor printer jammed.",
        "category_id": category_id,
        "priority": "LOW"
    }, headers=emp_headers)
    assert create_res2.status_code == 201
    t2_id = create_res2.json()["id"]

    # Staff Employee (who is NOT creator and NOT assigned to t2) tries to access or resolve t2
    unauth_res = client.put(f"/api/tickets/{t2_id}/resolve", json={
        "resolution_notes": "Unauthorized resolve attempt."
    }, headers=staff_headers)
    assert unauth_res.status_code == 403, f"Unauthorized resolve should return 403, got: {unauth_res.status_code}"
    print("Unauthorized Employee resolve attempt correctly returned 403 Forbidden.")

    print("\n--- TEST 7: Super Admin Resolving & Closing Ticket ---")
    # Super Admin resolves ticket 2
    admin_resolve_res = client.put(f"/api/tickets/{t2_id}/resolve", json={
        "resolution_notes": "Admin cleared paper jam."
    }, headers=admin_headers)
    assert admin_resolve_res.status_code == 200
    assert admin_resolve_res.json()["status"] == "RESOLVED"

    # Super Admin closes ticket 2
    admin_close_res = client.put(f"/api/tickets/{t2_id}/close", headers=admin_headers)
    assert admin_close_res.status_code == 200
    assert admin_close_res.json()["status"] == "CLOSED"
    print("Super Admin successfully resolved and closed ticket!")

    print("\n=== ALL TWO-ROLE ARCHITECTURE TARGETED TESTS PASSED PERFECTLY! ===")


if __name__ == "__main__":
    test_two_role_architecture_flow()
