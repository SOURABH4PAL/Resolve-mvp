import os
import sys
import io

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_full_m1_m2_flow():
    print("--- 1. Testing Login ---")
    response = client.post("/api/auth/login", json={
        "email": "employee@resolvehub.com",
        "password": "Employee123!"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    token = data["access_token"]
    assert token is not None
    headers = {"Authorization": f"Bearer {token}"}
    print("Login successful! Token acquired.")

    print("\n--- 2. Fetching User Profile ---")
    res_me = client.get("/api/users/me", headers=headers)
    assert res_me.status_code == 200
    user_info = res_me.json()
    assert user_info["email"] == "employee@resolvehub.com"
    print(f"User profile fetched: {user_info['name']} ({user_info['role']})")

    print("\n--- 3. Fetching Categories ---")
    res_cats = client.get("/api/categories", headers=headers)
    assert res_cats.status_code == 200
    categories = res_cats.json()
    assert len(categories) > 0
    category_id = categories[0]["id"]
    print(f"Found {len(categories)} categories. Using category_id: {category_id}")

    print("\n--- 4. Creating Ticket ---")
    ticket_payload = {
        "title": "Laptop display flickering",
        "description": "My laptop display flickering constantly when connected to power.",
        "category_id": category_id,
        "priority": "HIGH"
    }
    res_ticket = client.post("/api/tickets", json=ticket_payload, headers=headers)
    assert res_ticket.status_code == 201, f"Ticket creation failed: {res_ticket.text}"
    ticket_data = res_ticket.json()
    ticket_id = ticket_data["id"]
    ticket_number = ticket_data["ticket_number"]
    assert ticket_number.startswith("TKT-")
    print(f"Ticket created successfully! Number: {ticket_number}, ID: {ticket_id}")

    print("\n--- 5. Listing My Tickets ---")
    res_my_tickets = client.get("/api/tickets", headers=headers)
    assert res_my_tickets.status_code == 200
    my_tickets = res_my_tickets.json()
    assert any(t["id"] == ticket_id for t in my_tickets)
    print(f"My Tickets list contains created ticket {ticket_number}.")

    print("\n--- 6. Getting Ticket Detail ---")
    res_detail = client.get(f"/api/tickets/{ticket_id}", headers=headers)
    assert res_detail.status_code == 200
    detail_data = res_detail.json()
    assert detail_data["status"] == "OPEN"
    print(f"Ticket detail fetched: {detail_data['title']} (Status: {detail_data['status']})")

    print("\n--- 7. Adding Comment ---")
    comment_payload = {
        "content": "Please check if display driver update is needed.",
        "is_internal": False
    }
    res_comment = client.post(f"/api/tickets/{ticket_id}/comments", json=comment_payload, headers=headers)
    assert res_comment.status_code == 201
    print("Comment added successfully.")

    print("\n--- 8. Uploading Attachment ---")
    file_content = b"Mock log content for flickering issue."
    files = {"file": ("screen_log.txt", io.BytesIO(file_content), "text/plain")}
    res_attach = client.post(f"/api/tickets/{ticket_id}/attachments", files=files, headers=headers)
    assert res_attach.status_code == 201, f"Attachment upload failed: {res_attach.text}"
    attach_data = res_attach.json()
    print(f"Attachment uploaded successfully! File ID: {attach_data['id']}")

    print("\n--- 9. Assigned Employee Login & Status Update ---")
    res_staff_login = client.post("/api/auth/login", json={
        "email": "resolver@resolvehub.com",
        "password": "Resolver123!"
    })
    assert res_staff_login.status_code == 200
    staff_data = res_staff_login.json()
    assert staff_data["role"] == "EMPLOYEE"
    staff_token = staff_data["access_token"]
    staff_user_id = staff_data["user_id"]
    staff_headers = {"Authorization": f"Bearer {staff_token}"}

    # Assign ticket to staff employee for resolution testing
    from app.database import SessionLocal
    from app.models.ticket import Ticket
    db = SessionLocal()
    db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    db_ticket.assigned_to = staff_user_id
    db.commit()
    db.close()

    # Update status to IN_PROGRESS by assigned Employee
    res_status = client.put(f"/api/tickets/{ticket_id}/status", json={"status": "IN_PROGRESS", "comment": "Investigating GPU drivers."}, headers=staff_headers)
    assert res_status.status_code == 200
    assert res_status.json()["status"] == "IN_PROGRESS"
    print("Ticket status updated to IN_PROGRESS by assigned Employee.")

    print("\n--- 10. Resolving Ticket by Assigned Employee ---")
    res_resolve = client.put(f"/api/tickets/{ticket_id}/resolve", json={"resolution_notes": "Replaced display connector cable."}, headers=staff_headers)
    assert res_resolve.status_code == 200
    assert res_resolve.json()["status"] == "RESOLVED"
    print("Ticket resolved successfully by assigned Employee.")

    print("\n--- 11. Closing Ticket ---")
    res_close = client.put(f"/api/tickets/{ticket_id}/close", headers=headers)
    assert res_close.status_code == 200
    assert res_close.json()["status"] == "CLOSED"
    print("Ticket closed successfully.")

    print("\n=== ALL M1 & M2 BACKEND TESTS PASSED PERFECTLY! ===")

if __name__ == "__main__":
    test_full_m1_m2_flow()
