"""
Automated tests for Category & Subcategory Employee Routing Rule Persistence and Auto-routing.
Verifies:
1. Category-level assignment (e.g., Sarthak to API & Integrations) persists in database.
2. Subcategory-level assignment persists with correct subcategory ID and isolated from other subcategories.
3. Empty-string IDs are sanitized to prevent foreign key constraint integrity errors.
4. Duplicate routing rules are prevented via upsert logic.
5. Auto-routing precedence: subcategory rule -> category rule -> department lead.
6. Deletion of routing rules (soft delete).
"""

import pytest
from app.models.category import Category
from app.models.subcategory import Subcategory
from app.models.routing_rule import RoutingRule
from app.models.ticket import TicketStatus
from tests.conftest import (
    make_department,
    make_category,
    make_subcategory,
    make_user,
    make_admin,
    auth_headers,
)


def test_assign_employee_to_category_persists(client, db):
    """Assign an employee (e.g., Sarthak) to a category and verify persistence and retrieval."""
    dept = make_department(db, name="Engineering & Development")
    cat = make_category(db, dept.id, name="API & Integrations")
    sarthak = make_user(db, employee_id="DLQ-ENG-001", name="Sarthak", email="sarthak@dailoqa.com")
    admin = make_admin(db)

    payload = {
        "category_id": cat.id,
        "department_id": dept.id,
        "assigned_user_id": sarthak.id,
        "default_priority": "HIGH",
    }
    response = client.post("/api/routing-rules", json=payload, headers=auth_headers(admin))
    assert response.status_code == 201
    data = response.json()
    assert data["category_id"] == cat.id
    assert data["assigned_user_id"] == sarthak.id
    assert data["subcategory_id"] is None
    assert data["is_active"] is True
    assert data["assigned_user"] is not None
    assert data["assigned_user"]["name"] == "Sarthak"

    # Verify retrieval from GET /api/routing-rules
    list_res = client.get("/api/routing-rules", headers=auth_headers(admin))
    assert list_res.status_code == 200
    rules = list_res.json()
    matching = [r for r in rules if r["category_id"] == cat.id and not r.get("subcategory_id")]
    assert len(matching) == 1
    assert matching[0]["assigned_user_id"] == sarthak.id
    assert matching[0]["assigned_user"]["name"] == "Sarthak"


def test_assign_employee_to_subcategory_persists(client, db):
    """Assign an employee to a subcategory and verify persistence."""
    dept = make_department(db, name="Engineering & Development")
    cat = make_category(db, dept.id, name="API & Integrations")
    sub = make_subcategory(db, cat.id, name="Webhook Not Firing")
    emp = make_user(db, employee_id="DLQ-ENG-002", name="Priya Sharma", email="priya.sharma@dailoqa.com")
    admin = make_admin(db)

    payload = {
        "category_id": cat.id,
        "subcategory_id": sub.id,
        "department_id": dept.id,
        "assigned_user_id": emp.id,
        "default_priority": "MEDIUM",
    }
    response = client.post("/api/routing-rules", json=payload, headers=auth_headers(admin))
    assert response.status_code == 201
    data = response.json()
    assert data["category_id"] == cat.id
    assert data["subcategory_id"] == sub.id
    assert data["assigned_user_id"] == emp.id
    assert data["assigned_user"]["name"] == "Priya Sharma"

    # Verify in DB
    rule_in_db = db.query(RoutingRule).filter(RoutingRule.subcategory_id == sub.id).first()
    assert rule_in_db is not None
    assert rule_in_db.assigned_user_id == emp.id


def test_category_and_subcategory_assignments_are_isolated(client, db):
    """Assigning one subcategory does not overwrite category or sibling subcategories."""
    dept = make_department(db)
    cat = make_category(db, dept.id, name="Cloud & Infra")
    sub1 = make_subcategory(db, cat.id, name="Docker Containers")
    sub2 = make_subcategory(db, cat.id, name="Kubernetes Clusters")

    emp_cat = make_user(db, employee_id="EMP-CAT", name="Category Resolver", email="cat@dailoqa.com")
    emp_sub1 = make_user(db, employee_id="EMP-SUB1", name="Docker Specialist", email="docker@dailoqa.com")
    admin = make_admin(db)

    # 1. Assign Category
    res_cat = client.post(
        "/api/routing-rules",
        json={"category_id": cat.id, "assigned_user_id": emp_cat.id},
        headers=auth_headers(admin),
    )
    assert res_cat.status_code == 201

    # 2. Assign Subcategory 1
    res_sub1 = client.post(
        "/api/routing-rules",
        json={"category_id": cat.id, "subcategory_id": sub1.id, "assigned_user_id": emp_sub1.id},
        headers=auth_headers(admin),
    )
    assert res_sub1.status_code == 201

    # Query all active rules
    list_res = client.get("/api/routing-rules", headers=auth_headers(admin))
    rules = list_res.json()

    cat_rule = next(r for r in rules if r["category_id"] == cat.id and not r.get("subcategory_id"))
    sub1_rule = next(r for r in rules if r.get("subcategory_id") == sub1.id)
    sub2_rules = [r for r in rules if r.get("subcategory_id") == sub2.id]

    assert cat_rule["assigned_user_id"] == emp_cat.id
    assert sub1_rule["assigned_user_id"] == emp_sub1.id
    assert len(sub2_rules) == 0  # Subcategory 2 has no direct rule, correctly inherits or unassigned


def test_empty_string_sanitization_prevents_fk_failure(client, db):
    """Verify empty string foreign keys (e.g. department_id='', subcategory_id='') do not cause SQL IntegrityError."""
    dept = make_department(db)
    cat = make_category(db, dept.id, name="Network Operations")
    emp = make_user(db, employee_id="EMP-NET", name="Network Admin", email="net@dailoqa.com")
    admin = make_admin(db)

    # Payload with empty strings
    payload = {
        "category_id": cat.id,
        "department_id": "",
        "subcategory_id": "",
        "assigned_user_id": emp.id,
    }
    response = client.post("/api/routing-rules", json=payload, headers=auth_headers(admin))
    assert response.status_code == 201
    data = response.json()
    assert data["category_id"] == cat.id
    assert data["assigned_user_id"] == emp.id
    # department_id was backfilled from category
    assert data["department_id"] == dept.id
    assert data["subcategory_id"] is None


def test_upsert_prevents_duplicate_rules(client, db):
    """Reassigning an existing category or subcategory updates the record instead of creating duplicates."""
    dept = make_department(db)
    cat = make_category(db, dept.id, name="Security Operations")
    emp1 = make_user(db, employee_id="SEC-1", name="Sec Lead 1", email="sec1@dailoqa.com")
    emp2 = make_user(db, employee_id="SEC-2", name="Sec Lead 2", email="sec2@dailoqa.com")
    admin = make_admin(db)

    # First assignment
    res1 = client.post(
        "/api/routing-rules",
        json={"category_id": cat.id, "assigned_user_id": emp1.id},
        headers=auth_headers(admin),
    )
    assert res1.status_code == 201

    # Second assignment to same category
    res2 = client.post(
        "/api/routing-rules",
        json={"category_id": cat.id, "assigned_user_id": emp2.id},
        headers=auth_headers(admin),
    )
    assert res2.status_code == 201

    # Verify only ONE rule exists in DB for this category
    count = db.query(RoutingRule).filter(
        RoutingRule.category_id == cat.id,
        (RoutingRule.subcategory_id.is_(None)) | (RoutingRule.subcategory_id == ""),
        RoutingRule.is_active == True,
    ).count()
    assert count == 1

    rule = db.query(RoutingRule).filter(RoutingRule.category_id == cat.id).first()
    assert rule.assigned_user_id == emp2.id


def test_auto_routing_ticket_creation_precedence(client, db):
    """Verify auto-routing on ticket creation: subcategory rule > category rule."""
    dept = make_department(db)
    cat = make_category(db, dept.id, name="Database Systems")
    sub_postgres = make_subcategory(db, cat.id, name="PostgreSQL Performance")
    sub_redis = make_subcategory(db, cat.id, name="Redis Cache")

    emp_dba = make_user(db, employee_id="DBA-01", name="DBA General Lead", email="dba@dailoqa.com")
    emp_postgres = make_user(db, employee_id="DBA-02", name="Postgres Expert", email="postgres@dailoqa.com")
    creator = make_user(db, employee_id="USR-01", name="Ticket Creator", email="creator@dailoqa.com")
    admin = make_admin(db)

    # Setup rules: category -> emp_dba, subcategory postgres -> emp_postgres
    client.post(
        "/api/routing-rules",
        json={"category_id": cat.id, "assigned_user_id": emp_dba.id},
        headers=auth_headers(admin),
    )
    client.post(
        "/api/routing-rules",
        json={"category_id": cat.id, "subcategory_id": sub_postgres.id, "assigned_user_id": emp_postgres.id},
        headers=auth_headers(admin),
    )

    # 1. Create ticket for PostgreSQL -> routes to emp_postgres (direct subcategory rule)
    t1_res = client.post(
        "/api/tickets",
        json={
            "title": "Slow Postgres Query",
            "description": "Index scan taking 12 seconds",
            "category_id": cat.id,
            "subcategory_id": sub_postgres.id,
            "priority": "HIGH",
        },
        headers=auth_headers(creator),
    )
    assert t1_res.status_code == 201
    t1 = t1_res.json()
    assert t1["assigned_to"] == emp_postgres.id
    assert t1["assignee"] is not None
    assert t1["assignee"]["name"] == "Postgres Expert"
    assert t1["status"] == TicketStatus.ASSIGNED.value

    # 2. Create ticket for Redis -> routes to emp_dba (inherits category rule)
    t2_res = client.post(
        "/api/tickets",
        json={
            "title": "Redis Eviction",
            "description": "Memory full on redis cache",
            "category_id": cat.id,
            "subcategory_id": sub_redis.id,
            "priority": "MEDIUM",
        },
        headers=auth_headers(creator),
    )
    assert t2_res.status_code == 201
    t2 = t2_res.json()
    assert t2["assigned_to"] == emp_dba.id
    assert t2["assignee"] is not None
    assert t2["assignee"]["name"] == "DBA General Lead"
    assert t2["status"] == TicketStatus.ASSIGNED.value


def test_delete_routing_rule_soft_deletes(client, db):
    """Verify deleting a routing rule soft-deletes it."""
    dept = make_department(db)
    cat = make_category(db, dept.id, name="Testing Deletion")
    emp = make_user(db, employee_id="DEL-01")
    admin = make_admin(db)

    res = client.post(
        "/api/routing-rules",
        json={"category_id": cat.id, "assigned_user_id": emp.id},
        headers=auth_headers(admin),
    )
    rule_id = res.json()["id"]

    del_res = client.delete(f"/api/routing-rules/{rule_id}", headers=auth_headers(admin))
    assert del_res.status_code == 204

    # Verify no longer returned in active list
    list_res = client.get("/api/routing-rules", headers=auth_headers(admin))
    active_ids = [r["id"] for r in list_res.json()]
    assert rule_id not in active_ids

    # Rule in DB is_active is False
    rule = db.query(RoutingRule).filter(RoutingRule.id == rule_id).first()
    assert rule is not None
    assert rule.is_active is False
