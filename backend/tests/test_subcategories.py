"""
Automated tests for Category & Subcategory Management, CRUD, and Seeding (Requirement 7).
"""

import pytest
from app.models.category import Category
from app.models.subcategory import Subcategory
from app.utils.seed_data import seed_it_taxonomies
from tests.conftest import (
    make_department,
    make_category,
    make_subcategory,
    make_user,
    make_admin,
    make_ticket,
    auth_headers,
)


def test_create_subcategory_admin(client, db):
    dept = make_department(db)
    cat = make_category(db, dept.id, name="IT Hardware")
    admin = make_admin(db)

    payload = {
        "category_id": cat.id,
        "name": "Printers & Scanners",
        "description": "Network printers and scanner maintenance",
        "is_active": True,
    }
    response = client.post("/api/subcategories", json=payload, headers=auth_headers(admin))
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Printers & Scanners"
    assert data["category_id"] == cat.id


def test_create_subcategory_employee_forbidden(client, db):
    dept = make_department(db)
    cat = make_category(db, dept.id)
    emp = make_user(db, employee_id="EMP101")

    payload = {
        "category_id": cat.id,
        "name": "Unauthorized Subcategory",
    }
    response = client.post("/api/subcategories", json=payload, headers=auth_headers(emp))
    assert response.status_code == 403


def test_create_subcategory_invalid_parent(client, db):
    admin = make_admin(db)
    payload = {
        "category_id": "non-existent-cat-uuid",
        "name": "Invalid Parent",
    }
    response = client.post("/api/subcategories", json=payload, headers=auth_headers(admin))
    assert response.status_code == 404


def test_create_subcategory_duplicate_name(client, db):
    dept = make_department(db)
    cat = make_category(db, dept.id)
    sub = make_subcategory(db, cat.id, name="Docking Station")
    admin = make_admin(db)

    payload = {
        "category_id": cat.id,
        "name": "Docking Station",
    }
    response = client.post("/api/subcategories", json=payload, headers=auth_headers(admin))
    assert response.status_code == 409


def test_get_subcategory_by_id(client, db):
    dept = make_department(db)
    cat = make_category(db, dept.id)
    sub = make_subcategory(db, cat.id, name="Webcam Fault")
    emp = make_user(db)

    response = client.get(f"/api/subcategories/{sub.id}", headers=auth_headers(emp))
    assert response.status_code == 200
    assert response.json()["name"] == "Webcam Fault"


def test_update_subcategory_admin(client, db):
    dept = make_department(db)
    cat = make_category(db, dept.id)
    sub = make_subcategory(db, cat.id, name="Old Sub Name")
    admin = make_admin(db)

    update_payload = {"name": "New Sub Name", "description": "Updated description"}
    response = client.put(f"/api/subcategories/{sub.id}", json=update_payload, headers=auth_headers(admin))
    assert response.status_code == 200
    assert response.json()["name"] == "New Sub Name"
    assert response.json()["description"] == "Updated description"


def test_update_subcategory_employee_forbidden(client, db):
    dept = make_department(db)
    cat = make_category(db, dept.id)
    sub = make_subcategory(db, cat.id)
    emp = make_user(db)

    response = client.put(f"/api/subcategories/{sub.id}", json={"name": "Attempt"}, headers=auth_headers(emp))
    assert response.status_code == 403


def test_safe_delete_subcategory_without_tickets(client, db):
    dept = make_department(db)
    cat = make_category(db, dept.id)
    sub = make_subcategory(db, cat.id, name="Temporary Sub")
    admin = make_admin(db)

    response = client.delete(f"/api/subcategories/{sub.id}", headers=auth_headers(admin))
    assert response.status_code == 200
    assert response.json().get("deleted") is True

    # Confirm it's gone
    assert db.query(Subcategory).filter(Subcategory.id == sub.id).first() is None


def test_safe_delete_subcategory_with_tickets(client, db):
    dept = make_department(db)
    cat = make_category(db, dept.id)
    sub = make_subcategory(db, cat.id, name="Referenced Sub")
    emp = make_user(db)
    admin = make_admin(db)
    # Create ticket referencing this subcategory
    make_ticket(db, emp, cat.id, subcategory_id=sub.id)

    response = client.delete(f"/api/subcategories/{sub.id}", headers=auth_headers(admin))
    assert response.status_code == 200
    data = response.json()
    assert data.get("deactivated") is True

    # Subcategory remains in DB but marked is_active=False
    db_sub = db.query(Subcategory).filter(Subcategory.id == sub.id).first()
    assert db_sub is not None
    assert db_sub.is_active is False


def test_category_crud_and_safe_deletion(client, db):
    dept = make_department(db)
    admin = make_admin(db)
    emp = make_user(db)

    # 1. Create Category
    create_resp = client.post(
        "/api/categories",
        json={"department_id": dept.id, "name": "Cloud Infrastructure", "description": "AWS & GCP"},
        headers=auth_headers(admin),
    )
    assert create_resp.status_code == 201
    cat_id = create_resp.json()["id"]

    # 2. Read Category
    get_resp = client.get(f"/api/categories/{cat_id}", headers=auth_headers(emp))
    assert get_resp.status_code == 200
    assert get_resp.json()["name"] == "Cloud Infrastructure"

    # 3. Update Category
    update_resp = client.put(
        f"/api/categories/{cat_id}",
        json={"name": "Cloud & DevOps"},
        headers=auth_headers(admin),
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["name"] == "Cloud & DevOps"

    # 4. Safe Delete with Ticket
    make_ticket(db, emp, category_id=cat_id)
    del_resp = client.delete(f"/api/categories/{cat_id}", headers=auth_headers(admin))
    assert del_resp.status_code == 200
    assert del_resp.json().get("deactivated") is True

    db_cat = db.query(Category).filter(Category.id == cat_id).first()
    assert db_cat.is_active is False


def test_seed_it_taxonomies_idempotence(db):
    summary1 = seed_it_taxonomies(db, department_name="IT Support")
    assert summary1["categories_created"] >= 5
    assert summary1["subcategories_created"] >= 15

    # Run again - must be completely idempotent (0 newly created)
    summary2 = seed_it_taxonomies(db, department_name="IT Support")
    assert summary2["categories_created"] == 0
    assert summary2["subcategories_created"] == 0
