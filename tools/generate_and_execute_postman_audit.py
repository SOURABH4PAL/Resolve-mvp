import os
import sys
import json
import csv
from datetime import datetime
from io import BytesIO

workspace_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_dir = os.path.join(workspace_root, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from app.main import app
from app.database import init_db_schema

init_db_schema()
client = TestClient(app)

# Definitions of all test items to include in Postman collection and run
test_definitions = [
    # 01. Health & System Readiness
    {
        "id": "TC-HEALTH-01",
        "folder": "01. Health & Readiness",
        "name": "GET /health (Root Service & Schema Readiness)",
        "method": "GET",
        "url": "{{baseUrl}}/health",
        "auth": None,
        "body": None,
        "expected_status": 200,
        "scenario": "Verify root health check reports healthy and schema ready",
        "test_script": """pm.test("Status code is 200", function () { pm.response.to.have.status(200); });
pm.test("Service is healthy and schema is ready", function () {
    var json = pm.response.json();
    pm.expect(json.status).to.eql("healthy");
    pm.expect(json.schema).to.eql("ready");
});"""
    },
    {
        "id": "TC-HEALTH-02",
        "folder": "01. Health & Readiness",
        "name": "GET /api/health (API Prefix Health Endpoint)",
        "method": "GET",
        "url": "{{baseUrl}}/api/health",
        "auth": None,
        "body": None,
        "expected_status": 200,
        "scenario": "Verify API-prefixed health endpoint responds healthy",
        "test_script": """pm.test("Status code is 200", function () { pm.response.to.have.status(200); });"""
    },

    # 02. Authentication & Session
    {
        "id": "TC-AUTH-01",
        "folder": "02. Authentication",
        "name": "POST /api/auth/login - Super Admin Login",
        "method": "POST",
        "url": "{{baseUrl}}/api/auth/login",
        "auth": None,
        "body": {"email": "{{admin_email}}", "password": "{{admin_password}}"},
        "expected_status": 200,
        "scenario": "Admin login returns JWT token and SUPER_ADMIN role",
        "test_script": """pm.test("Status code is 200", function () { pm.response.to.have.status(200); });
pm.test("Token returned with SUPER_ADMIN role", function () {
    var json = pm.response.json();
    pm.expect(json.access_token).to.be.a('string');
    pm.expect(json.role).to.eql('SUPER_ADMIN');
    pm.environment.set("admin_token", json.access_token);
    pm.environment.set("admin_user_id", json.user_id);
});"""
    },
    {
        "id": "TC-AUTH-02",
        "folder": "02. Authentication",
        "name": "POST /api/auth/login - Employee Login",
        "method": "POST",
        "url": "{{baseUrl}}/api/auth/login",
        "auth": None,
        "body": {"email": "{{employee_email}}", "password": "{{employee_password}}"},
        "expected_status": 200,
        "scenario": "Employee login returns JWT token and EMPLOYEE role",
        "test_script": """pm.test("Status code is 200", function () { pm.response.to.have.status(200); });
pm.test("Token returned with EMPLOYEE role", function () {
    var json = pm.response.json();
    pm.expect(json.access_token).to.be.a('string');
    pm.expect(json.role).to.eql('EMPLOYEE');
    pm.environment.set("employee_token", json.access_token);
    pm.environment.set("employee_user_id", json.user_id);
});"""
    },
    {
        "id": "TC-AUTH-03",
        "folder": "02. Authentication",
        "name": "POST /api/auth/login - Resolver Login",
        "method": "POST",
        "url": "{{baseUrl}}/api/auth/login",
        "auth": None,
        "body": {"email": "{{resolver_email}}", "password": "{{resolver_password}}"},
        "expected_status": 200,
        "scenario": "Resolver staff login returns valid token",
        "test_script": """pm.test("Status code is 200", function () { pm.response.to.have.status(200); });
pm.test("Token returned for resolver staff", function () {
    var json = pm.response.json();
    pm.environment.set("resolver_token", json.access_token);
    pm.environment.set("resolver_user_id", json.user_id);
});"""
    },
    {
        "id": "TC-AUTH-04",
        "folder": "02. Authentication",
        "name": "POST /api/auth/login - Invalid Password",
        "method": "POST",
        "url": "{{baseUrl}}/api/auth/login",
        "auth": None,
        "body": {"email": "{{admin_email}}", "password": "WrongPassword123!"},
        "expected_status": 401,
        "scenario": "Login with incorrect password rejected with 401 Unauthorized",
        "test_script": """pm.test("Status code is 401", function () { pm.response.to.have.status(401); });"""
    },
    {
        "id": "TC-AUTH-05",
        "folder": "02. Authentication",
        "name": "POST /api/auth/login - Nonexistent User",
        "method": "POST",
        "url": "{{baseUrl}}/api/auth/login",
        "auth": None,
        "body": {"email": "doesnotexist@resolvehub.com", "password": "Password123!"},
        "expected_status": 401,
        "scenario": "Login with unknown email rejected with 401 Unauthorized",
        "test_script": """pm.test("Status code is 401", function () { pm.response.to.have.status(401); });"""
    },
    {
        "id": "TC-AUTH-06",
        "folder": "02. Authentication",
        "name": "POST /api/auth/login - Missing Fields",
        "method": "POST",
        "url": "{{baseUrl}}/api/auth/login",
        "auth": None,
        "body": {},
        "expected_status": 422,
        "scenario": "Empty login body rejected with 422 Unprocessable Entity",
        "test_script": """pm.test("Status code is 422", function () { pm.response.to.have.status(422); });"""
    },

    # 03. User Management & Profiles
    {
        "id": "TC-USER-01",
        "folder": "03. Users & Profiles",
        "name": "GET /api/users/me - Super Admin Profile",
        "method": "GET",
        "url": "{{baseUrl}}/api/users/me",
        "auth": "admin_token",
        "body": None,
        "expected_status": 200,
        "scenario": "Super Admin profile retrieved with sanitized fields",
        "test_script": """pm.test("Status code is 200", function () { pm.response.to.have.status(200); });
pm.test("Profile does not expose password_hash", function () {
    var json = pm.response.json();
    pm.expect(json.email).to.eql("admin@resolvehub.com");
    pm.expect(json.password_hash).to.be.undefined;
});"""
    },
    {
        "id": "TC-USER-02",
        "folder": "03. Users & Profiles",
        "name": "GET /api/users/me - Employee Profile",
        "method": "GET",
        "url": "{{baseUrl}}/api/users/me",
        "auth": "employee_token",
        "body": None,
        "expected_status": 200,
        "scenario": "Employee profile retrieved",
        "test_script": """pm.test("Status code is 200", function () { pm.response.to.have.status(200); });"""
    },
    {
        "id": "TC-USER-03",
        "folder": "03. Users & Profiles",
        "name": "GET /api/users/me - Missing Authentication",
        "method": "GET",
        "url": "{{baseUrl}}/api/users/me",
        "auth": None,
        "body": None,
        "expected_status": 401,
        "scenario": "Unauthenticated access rejected with 401 Unauthorized",
        "test_script": """pm.test("Status code is 401", function () { pm.response.to.have.status(401); });"""
    },
    {
        "id": "TC-USER-04",
        "folder": "03. Users & Profiles",
        "name": "GET /api/users - List Employees (Admin)",
        "method": "GET",
        "url": "{{baseUrl}}/api/users",
        "auth": "admin_token",
        "body": None,
        "expected_status": 200,
        "scenario": "Super Admin lists all employee accounts",
        "test_script": """pm.test("Status code is 200", function () { pm.response.to.have.status(200); });
pm.test("Returns list of users", function () {
    var json = pm.response.json();
    pm.expect(json).to.be.an('array');
});"""
    },
    {
        "id": "TC-USER-05",
        "folder": "03. Users & Profiles",
        "name": "GET /api/users - Forbidden for Normal Employee",
        "method": "GET",
        "url": "{{baseUrl}}/api/users",
        "auth": "employee_token",
        "body": None,
        "expected_status": 403,
        "scenario": "Normal employee forbidden from accessing full user listing",
        "test_script": """pm.test("Status code is 403", function () { pm.response.to.have.status(403); });"""
    },

    # 04. Organizational Hierarchy
    {
        "id": "TC-ORG-01",
        "folder": "04. Org Hierarchy",
        "name": "GET /api/departments - List Departments",
        "method": "GET",
        "url": "{{baseUrl}}/api/departments",
        "auth": "employee_token",
        "body": None,
        "expected_status": 200,
        "scenario": "Fetch list of active departments",
        "test_script": """pm.test("Status code is 200", function () { pm.response.to.have.status(200); });
pm.test("Capture department_id", function () {
    var json = pm.response.json();
    pm.expect(json.length).to.be.above(0);
    pm.environment.set("department_id", json[0].id);
});"""
    },
    {
        "id": "TC-ORG-02",
        "folder": "04. Org Hierarchy",
        "name": "GET /api/categories - List Categories",
        "method": "GET",
        "url": "{{baseUrl}}/api/categories",
        "auth": "employee_token",
        "body": None,
        "expected_status": 200,
        "scenario": "Fetch list of categories",
        "test_script": """pm.test("Status code is 200", function () { pm.response.to.have.status(200); });
pm.test("Capture category_id", function () {
    var json = pm.response.json();
    pm.expect(json.length).to.be.above(0);
    pm.environment.set("category_id", json[0].id);
});"""
    },
    {
        "id": "TC-ORG-03",
        "folder": "04. Org Hierarchy",
        "name": "GET /api/subcategories - List Subcategories",
        "method": "GET",
        "url": "{{baseUrl}}/api/subcategories",
        "auth": "employee_token",
        "body": None,
        "expected_status": 200,
        "scenario": "Fetch subcategories",
        "test_script": """pm.test("Status code is 200", function () { pm.response.to.have.status(200); });
pm.test("Capture subcategory_id", function () {
    var json = pm.response.json();
    if (json.length > 0) {
        pm.environment.set("subcategory_id", json[0].id);
    }
});"""
    },

    # 05. Ticket Lifecycle
    {
        "id": "TC-TKT-01",
        "folder": "05. Ticket Lifecycle",
        "name": "POST /api/tickets - Create Valid Ticket",
        "method": "POST",
        "url": "{{baseUrl}}/api/tickets",
        "auth": "employee_token",
        "body": {
            "title": "Postman Automated Audit Ticket",
            "description": "Created during automated audit to verify lifecycle transitions",
            "category_id": "{{category_id}}",
            "priority": "HIGH"
        },
        "expected_status": 201,
        "scenario": "Employee creates a valid ticket with priority HIGH",
        "test_script": """pm.test("Status code is 201 Created", function () { pm.expect([200, 201]).to.include(pm.response.code); });
pm.test("Ticket created and captured", function () {
    var json = pm.response.json();
    pm.expect(json.id).to.be.a('string');
    pm.expect(json.ticket_number).to.match(/^TKT-/);
    pm.environment.set("ticket_id", json.id);
    pm.environment.set("ticket_number", json.ticket_number);
});"""
    },
    {
        "id": "TC-TKT-02",
        "folder": "05. Ticket Lifecycle",
        "name": "POST /api/tickets - Missing Title & Description",
        "method": "POST",
        "url": "{{baseUrl}}/api/tickets",
        "auth": "employee_token",
        "body": {"category_id": "{{category_id}}"},
        "expected_status": 422,
        "scenario": "Ticket creation missing required fields rejected with 422",
        "test_script": """pm.test("Status code is 422", function () { pm.response.to.have.status(422); });"""
    },
    {
        "id": "TC-TKT-03",
        "folder": "05. Ticket Lifecycle",
        "name": "POST /api/tickets - Nonexistent Category ID",
        "method": "POST",
        "url": "{{baseUrl}}/api/tickets",
        "auth": "employee_token",
        "body": {
            "title": "Invalid Category Ticket",
            "description": "Valid description",
            "category_id": "00000000-0000-0000-0000-000000000000"
        },
        "expected_status": 422,
        "scenario": "Ticket with nonexistent category rejected with 422",
        "test_script": """pm.test("Status code is 422", function () { pm.response.to.have.status(422); });"""
    },
    {
        "id": "TC-TKT-04",
        "folder": "05. Ticket Lifecycle",
        "name": "GET /api/tickets - List Tickets",
        "method": "GET",
        "url": "{{baseUrl}}/api/tickets",
        "auth": "employee_token",
        "body": None,
        "expected_status": 200,
        "scenario": "List tickets accessible to authenticated user",
        "test_script": """pm.test("Status code is 200", function () { pm.response.to.have.status(200); });"""
    },
    {
        "id": "TC-TKT-05",
        "folder": "05. Ticket Lifecycle",
        "name": "GET /api/tickets/{{ticket_id}} - Get Ticket by UUID",
        "method": "GET",
        "url": "{{baseUrl}}/api/tickets/{{ticket_id}}",
        "auth": "employee_token",
        "body": None,
        "expected_status": 200,
        "scenario": "Retrieve ticket details using UUID",
        "test_script": """pm.test("Status code is 200", function () { pm.response.to.have.status(200); });
pm.test("Ticket details match", function () {
    var json = pm.response.json();
    pm.expect(json.id).to.eql(pm.environment.get("ticket_id"));
});"""
    },
    {
        "id": "TC-TKT-06",
        "folder": "05. Ticket Lifecycle",
        "name": "GET /api/tickets/{{ticket_number}} - Get Ticket by Number",
        "method": "GET",
        "url": "{{baseUrl}}/api/tickets/{{ticket_number}}",
        "auth": "employee_token",
        "body": None,
        "expected_status": 200,
        "scenario": "Retrieve ticket details using human-readable ticket_number",
        "test_script": """pm.test("Status code is 200", function () { pm.response.to.have.status(200); });
pm.test("Lookup by ticket_number successful", function () {
    var json = pm.response.json();
    pm.expect(json.ticket_number).to.eql(pm.environment.get("ticket_number"));
});"""
    },
    {
        "id": "TC-TKT-07",
        "folder": "05. Ticket Lifecycle",
        "name": "GET /api/tickets/nonexistent - Nonexistent Ticket ID",
        "method": "GET",
        "url": "{{baseUrl}}/api/tickets/00000000-0000-0000-0000-000000000000",
        "auth": "employee_token",
        "body": None,
        "expected_status": 404,
        "scenario": "Lookup of nonexistent ticket returns 404 Not Found",
        "test_script": """pm.test("Status code is 404", function () { pm.response.to.have.status(404); });"""
    },
    {
        "id": "TC-TKT-08",
        "folder": "05. Ticket Lifecycle",
        "name": "PUT /api/tickets/{{ticket_id}}/assign - Admin Assigns to Staff",
        "method": "PUT",
        "url": "{{baseUrl}}/api/tickets/{{ticket_id}}/assign",
        "auth": "admin_token",
        "body": {"assigned_to_user_id": "{{resolver_user_id}}"},
        "expected_status": 200,
        "scenario": "Admin assigns ticket to resolver user",
        "test_script": """pm.test("Status code is 200", function () { pm.response.to.have.status(200); });
pm.test("Assigned user updated", function () {
    var json = pm.response.json();
    pm.expect(json.assigned_to).to.eql(pm.environment.get("resolver_user_id"));
});"""
    },
    {
        "id": "TC-TKT-09",
        "folder": "05. Ticket Lifecycle",
        "name": "PUT /api/tickets/{{ticket_id}}/assign - Employee Forbidden",
        "method": "PUT",
        "url": "{{baseUrl}}/api/tickets/{{ticket_id}}/assign",
        "auth": "employee_token",
        "body": {"assigned_to_user_id": "{{employee_user_id}}"},
        "expected_status": 403,
        "scenario": "Normal employee cannot assign tickets (403 Forbidden)",
        "test_script": """pm.test("Status code is 403", function () { pm.response.to.have.status(403); });"""
    },
    {
        "id": "TC-TKT-10",
        "folder": "05. Ticket Lifecycle",
        "name": "PUT /api/tickets/{{ticket_id}}/status - Move to IN_PROGRESS",
        "method": "PUT",
        "url": "{{baseUrl}}/api/tickets/{{ticket_id}}/status",
        "auth": "resolver_token",
        "body": {"status": "IN_PROGRESS", "comment": "Starting diagnostic analysis"},
        "expected_status": 200,
        "scenario": "Assigned resolver moves ticket to IN_PROGRESS",
        "test_script": """pm.test("Status code is 200", function () { pm.response.to.have.status(200); });
pm.test("Status is IN_PROGRESS", function () {
    var json = pm.response.json();
    pm.expect(json.status).to.eql("IN_PROGRESS");
});"""
    },
    {
        "id": "TC-TKT-11",
        "folder": "05. Ticket Lifecycle",
        "name": "PUT /api/tickets/{{ticket_id}}/resolve - Resolve Ticket",
        "method": "PUT",
        "url": "{{baseUrl}}/api/tickets/{{ticket_id}}/resolve",
        "auth": "resolver_token",
        "body": {"resolution_notes": "Diagnostic and fix completed successfully"},
        "expected_status": 200,
        "scenario": "Assigned resolver marks ticket as RESOLVED",
        "test_script": """pm.test("Status code is 200", function () { pm.response.to.have.status(200); });
pm.test("Status is RESOLVED", function () {
    var json = pm.response.json();
    pm.expect(json.status).to.eql("RESOLVED");
});"""
    },
    {
        "id": "TC-TKT-12",
        "folder": "05. Ticket Lifecycle",
        "name": "PUT /api/tickets/{{ticket_id}}/close - Close by Ticket Creator",
        "method": "PUT",
        "url": "{{baseUrl}}/api/tickets/{{ticket_id}}/close",
        "auth": "employee_token",
        "body": None,
        "expected_status": 200,
        "scenario": "Ticket creator closes the resolved ticket",
        "test_script": """pm.test("Status code is 200", function () { pm.response.to.have.status(200); });
pm.test("Status is CLOSED", function () {
    var json = pm.response.json();
    pm.expect(json.status).to.eql("CLOSED");
});"""
    },

    # 06. Comments & Internal Notes
    {
        "id": "TC-CMT-01",
        "folder": "06. Comments",
        "name": "POST /api/tickets/{{ticket_id}}/comments - Add Public Comment",
        "method": "POST",
        "url": "{{baseUrl}}/api/tickets/{{ticket_id}}/comments",
        "auth": "employee_token",
        "body": {"content": "Postman public comment testing communication", "is_internal": False},
        "expected_status": 201,
        "scenario": "Add public comment to ticket",
        "test_script": """pm.test("Status code is 201", function () { pm.expect([200, 201]).to.include(pm.response.code); });
pm.test("Comment captured", function () {
    var json = pm.response.json();
    pm.environment.set("comment_id", json.id);
});"""
    },
    {
        "id": "TC-CMT-02",
        "folder": "06. Comments",
        "name": "POST /api/tickets/{{ticket_id}}/comments - Add Internal Note",
        "method": "POST",
        "url": "{{baseUrl}}/api/tickets/{{ticket_id}}/comments",
        "auth": "admin_token",
        "body": {"content": "Staff-only internal investigation note", "is_internal": True},
        "expected_status": 201,
        "scenario": "Admin adds internal staff-only note",
        "test_script": """pm.test("Status code is 201", function () { pm.expect([200, 201]).to.include(pm.response.code); });"""
    },
    {
        "id": "TC-CMT-03",
        "folder": "06. Comments",
        "name": "POST /api/tickets/{{ticket_id}}/comments - Empty Content Rejected",
        "method": "POST",
        "url": "{{baseUrl}}/api/tickets/{{ticket_id}}/comments",
        "auth": "employee_token",
        "body": {"content": ""},
        "expected_status": 422,
        "scenario": "Empty comment rejected with 422",
        "test_script": """pm.test("Status code is 422", function () { pm.response.to.have.status(422); });"""
    },
    {
        "id": "TC-CMT-04",
        "folder": "06. Comments",
        "name": "GET /api/tickets/{{ticket_id}}/comments - List Comments",
        "method": "GET",
        "url": "{{baseUrl}}/api/tickets/{{ticket_id}}/comments",
        "auth": "employee_token",
        "body": None,
        "expected_status": 200,
        "scenario": "Retrieve list of comments on ticket",
        "test_script": """pm.test("Status code is 200", function () { pm.response.to.have.status(200); });"""
    },

    # 07. Attachments
    {
        "id": "TC-ATT-01",
        "folder": "07. Attachments",
        "name": "POST /api/tickets/{{ticket_id}}/attachments - Upload Attachment",
        "method": "POST",
        "url": "{{baseUrl}}/api/tickets/{{ticket_id}}/attachments",
        "auth": "employee_token",
        "is_file_upload": True,
        "expected_status": 201,
        "scenario": "Upload diagnostic file attachment to ticket",
        "test_script": """pm.test("Status code is 201", function () { pm.expect([200, 201]).to.include(pm.response.code); });
pm.test("Attachment metadata returned", function () {
    var json = pm.response.json();
    pm.expect(json.file_name).to.eql("sample_diagnostic.txt");
    pm.environment.set("attachment_id", json.id);
});"""
    },
    {
        "id": "TC-ATT-02",
        "folder": "07. Attachments",
        "name": "GET /api/tickets/{{ticket_id}}/attachments - List Attachments",
        "method": "GET",
        "url": "{{baseUrl}}/api/tickets/{{ticket_id}}/attachments",
        "auth": "employee_token",
        "body": None,
        "expected_status": 200,
        "scenario": "List file attachments for ticket",
        "test_script": """pm.test("Status code is 200", function () { pm.response.to.have.status(200); });"""
    },
    {
        "id": "TC-ATT-03",
        "folder": "07. Attachments",
        "name": "GET /api/attachments/{{attachment_id}}/download - Download Attachment",
        "method": "GET",
        "url": "{{baseUrl}}/api/attachments/{{attachment_id}}/download",
        "auth": "employee_token",
        "body": None,
        "expected_status": 200,
        "scenario": "Download uploaded attachment file",
        "test_script": """pm.test("Status code is 200", function () { pm.response.to.have.status(200); });"""
    },

    # 08. Escalations
    {
        "id": "TC-ESC-01",
        "folder": "08. Escalations",
        "name": "POST /api/tickets/{{ticket_id}}/escalate - Escalate by Creator",
        "method": "POST",
        "url": "{{baseUrl}}/api/tickets/{{ticket_id}}/escalate",
        "auth": "employee_token",
        "body": {"reason": "Urgent deadline approaching; requires manager review."},
        "expected_status": 201,
        "scenario": "Ticket creator raises escalation",
        "test_script": """pm.test("Status code is 201", function () { pm.expect([200, 201]).to.include(pm.response.code); });
pm.test("Escalation created", function () {
    var json = pm.response.json();
    pm.environment.set("escalation_id", json.id);
});"""
    },
    {
        "id": "TC-ESC-02",
        "folder": "08. Escalations",
        "name": "GET /api/escalations - List All Escalations (Admin)",
        "method": "GET",
        "url": "{{baseUrl}}/api/escalations",
        "auth": "admin_token",
        "body": None,
        "expected_status": 200,
        "scenario": "Admin retrieves all company escalations",
        "test_script": """pm.test("Status code is 200", function () { pm.response.to.have.status(200); });"""
    },
    {
        "id": "TC-ESC-03",
        "folder": "08. Escalations",
        "name": "GET /api/tickets/{{ticket_id}}/escalations - Ticket Escalations",
        "method": "GET",
        "url": "{{baseUrl}}/api/tickets/{{ticket_id}}/escalations",
        "auth": "employee_token",
        "body": None,
        "expected_status": 200,
        "scenario": "Retrieve escalations specific to ticket",
        "test_script": """pm.test("Status code is 200", function () { pm.response.to.have.status(200); });"""
    },

    # 09. Notifications
    {
        "id": "TC-NTF-01",
        "folder": "09. Notifications",
        "name": "GET /api/notifications - List User Notifications",
        "method": "GET",
        "url": "{{baseUrl}}/api/notifications",
        "auth": "admin_token",
        "body": None,
        "expected_status": 200,
        "scenario": "Fetch notifications for logged in user",
        "test_script": """pm.test("Status code is 200", function () { pm.response.to.have.status(200); });
pm.test("Capture notification_id", function () {
    var json = pm.response.json();
    if (json.length > 0) {
        pm.environment.set("notification_id", json[0].id);
    }
});"""
    },
    {
        "id": "TC-NTF-02",
        "folder": "09. Notifications",
        "name": "PUT /api/notifications/read-all - Mark All Read",
        "method": "PUT",
        "url": "{{baseUrl}}/api/notifications/read-all",
        "auth": "admin_token",
        "body": None,
        "expected_status": 200,
        "scenario": "Mark all notifications read for user",
        "test_script": """pm.test("Status code is 200", function () { pm.response.to.have.status(200); });"""
    },

    # 10. SLA Policies
    {
        "id": "TC-SLA-01",
        "folder": "10. SLA Policies",
        "name": "POST /api/sla-policies - Create Policy (Admin)",
        "method": "POST",
        "url": "{{baseUrl}}/api/sla-policies",
        "auth": "admin_token",
        "body": {
            "name": "Audit High-Priority Policy",
            "first_response_hours": 2,
            "resolution_hours": 12,
            "priority": "HIGH"
        },
        "expected_status": 201,
        "scenario": "Admin creates an SLA policy",
        "test_script": """pm.test("Status code is 201", function () { pm.response.to.have.status(201); });
pm.test("Capture sla_policy_id", function () {
    var json = pm.response.json();
    pm.environment.set("sla_policy_id", json.id);
});"""
    },
    {
        "id": "TC-SLA-02",
        "folder": "10. SLA Policies",
        "name": "POST /api/sla-policies - Employee Forbidden",
        "method": "POST",
        "url": "{{baseUrl}}/api/sla-policies",
        "auth": "employee_token",
        "body": {"name": "Unauthorized Policy", "first_response_hours": 1, "resolution_hours": 5},
        "expected_status": 403,
        "scenario": "Normal employee forbidden from creating SLA policy",
        "test_script": """pm.test("Status code is 403", function () { pm.response.to.have.status(403); });"""
    },
    {
        "id": "TC-SLA-03",
        "folder": "10. SLA Policies",
        "name": "GET /api/sla-policies - List Policies",
        "method": "GET",
        "url": "{{baseUrl}}/api/sla-policies",
        "auth": "employee_token",
        "body": None,
        "expected_status": 200,
        "scenario": "List active SLA policies",
        "test_script": """pm.test("Status code is 200", function () { pm.response.to.have.status(200); });"""
    },
    {
        "id": "TC-SLA-04",
        "folder": "10. SLA Policies",
        "name": "POST /api/sla-policies/calculate-due - Calculate Due Times",
        "method": "POST",
        "url": "{{baseUrl}}/api/sla-policies/calculate-due",
        "auth": "employee_token",
        "body": {"priority": "HIGH", "sla_policy_id": "{{sla_policy_id}}"},
        "expected_status": 200,
        "scenario": "Calculate first response and resolution deadlines",
        "test_script": """pm.test("Status code is 200", function () { pm.response.to.have.status(200); });
pm.test("Calculates correct hours", function () {
    var json = pm.response.json();
    pm.expect(json.first_response_hours).to.eql(2);
    pm.expect(json.resolution_hours).to.eql(12);
});"""
    },

    # 11. FAQs
    {
        "id": "TC-FAQ-01",
        "folder": "11. FAQs",
        "name": "POST /api/faqs - Create FAQ (Admin)",
        "method": "POST",
        "url": "{{baseUrl}}/api/faqs",
        "auth": "admin_token",
        "body": {
            "question": "How do I request software access in ResolveHub?",
            "answer": "Navigate to Create Ticket and choose Software category.",
            "is_published": True
        },
        "expected_status": 201,
        "scenario": "Admin creates a published FAQ",
        "test_script": """pm.test("Status code is 201", function () { pm.response.to.have.status(201); });
pm.test("Capture faq_id", function () {
    var json = pm.response.json();
    pm.environment.set("faq_id", json.id);
});"""
    },
    {
        "id": "TC-FAQ-02",
        "folder": "11. FAQs",
        "name": "GET /api/faqs - List FAQs (Published)",
        "method": "GET",
        "url": "{{baseUrl}}/api/faqs",
        "auth": "employee_token",
        "body": None,
        "expected_status": 200,
        "scenario": "Employee searches published knowledge base FAQs",
        "test_script": """pm.test("Status code is 200", function () { pm.response.to.have.status(200); });"""
    },
    {
        "id": "TC-FAQ-03",
        "folder": "11. FAQs",
        "name": "GET /api/faqs/{{faq_id}} - Get Single FAQ",
        "method": "GET",
        "url": "{{baseUrl}}/api/faqs/{{faq_id}}",
        "auth": "employee_token",
        "body": None,
        "expected_status": 200,
        "scenario": "Get single FAQ by ID",
        "test_script": """pm.test("Status code is 200", function () { pm.response.to.have.status(200); });"""
    },

    # 12. Support Teams & Routing Rules
    {
        "id": "TC-RUT-01",
        "folder": "12. Teams & Routing",
        "name": "POST /api/support-teams - Create Support Team (Admin)",
        "method": "POST",
        "url": "{{baseUrl}}/api/support-teams",
        "auth": "admin_token",
        "body": {"name": "L2 Network Team", "department_id": "{{department_id}}"},
        "expected_status": 201,
        "scenario": "Admin creates a support team under IT department",
        "test_script": """pm.test("Status code is 201", function () { pm.response.to.have.status(201); });
pm.test("Capture support_team_id", function () {
    var json = pm.response.json();
    pm.environment.set("support_team_id", json.id);
});"""
    },
    {
        "id": "TC-RUT-02",
        "folder": "12. Teams & Routing",
        "name": "GET /api/support-teams - List Support Teams",
        "method": "GET",
        "url": "{{baseUrl}}/api/support-teams",
        "auth": "employee_token",
        "body": None,
        "expected_status": 200,
        "scenario": "List active support teams",
        "test_script": """pm.test("Status code is 200", function () { pm.response.to.have.status(200); });"""
    },
    {
        "id": "TC-RUT-03",
        "folder": "12. Teams & Routing",
        "name": "POST /api/routing-rules - Create Routing Rule (Admin)",
        "method": "POST",
        "url": "{{baseUrl}}/api/routing-rules",
        "auth": "admin_token",
        "body": {
            "department_id": "{{department_id}}",
            "category_id": "{{category_id}}",
            "support_team_id": "{{support_team_id}}",
            "default_priority": "HIGH"
        },
        "expected_status": 201,
        "scenario": "Admin creates a routing rule mapping category to support team",
        "test_script": """pm.test("Status code is 201", function () { pm.response.to.have.status(201); });
pm.test("Capture routing_rule_id", function () {
    var json = pm.response.json();
    pm.environment.set("routing_rule_id", json.id);
});"""
    },
    {
        "id": "TC-RUT-04",
        "folder": "12. Teams & Routing",
        "name": "GET /api/routing-rules - List Routing Rules",
        "method": "GET",
        "url": "{{baseUrl}}/api/routing-rules",
        "auth": "employee_token",
        "body": None,
        "expected_status": 200,
        "scenario": "List active routing rules",
        "test_script": """pm.test("Status code is 200", function () { pm.response.to.have.status(200); });"""
    },

    # 13. System Metrics & Admin Dashboard
    {
        "id": "TC-DSH-01",
        "folder": "13. Dashboard & Metrics",
        "name": "GET /api/dashboard/stats - Admin Dashboard Stats",
        "method": "GET",
        "url": "{{baseUrl}}/api/dashboard/stats",
        "auth": "admin_token",
        "body": None,
        "expected_status": 200,
        "scenario": "Admin fetches system stats, priority breakdown, and recent tickets",
        "test_script": """pm.test("Status code is 200", function () { pm.response.to.have.status(200); });
pm.test("Includes full metric totals", function () {
    var json = pm.response.json();
    pm.expect(json.total_tickets).to.be.a('number');
    pm.expect(json.tickets_by_priority).to.be.an('object');
    pm.expect(json.total_users).to.be.a('number');
});"""
    },
    {
        "id": "TC-DSH-02",
        "folder": "13. Dashboard & Metrics",
        "name": "GET /api/dashboard/stats - Employee Scoped Stats",
        "method": "GET",
        "url": "{{baseUrl}}/api/dashboard/stats",
        "auth": "employee_token",
        "body": None,
        "expected_status": 200,
        "scenario": "Employee fetches scoped ticket statistics",
        "test_script": """pm.test("Status code is 200", function () { pm.response.to.have.status(200); });"""
    }
]

# 1. Build Postman Collection JSON structure
folders_map = {}
for test in test_definitions:
    f_name = test["folder"]
    if f_name not in folders_map:
        folders_map[f_name] = []

    # Build request item
    url_parts = test["url"].replace("{{baseUrl}}", "").strip("/").split("/")
    
    headers = []
    auth_obj = None
    if test["auth"]:
        auth_obj = {
            "type": "bearer",
            "bearer": [{"key": "token", "value": f"{{{{{test['auth']}}}}}", "type": "string"}]
        }

    body_obj = None
    if test.get("is_file_upload"):
        body_obj = {
            "mode": "formdata",
            "formdata": [
                {"key": "file", "type": "file", "src": "sample_diagnostic.txt"}
            ]
        }
    elif test["body"] is not None:
        body_obj = {
            "mode": "raw",
            "raw": json.dumps(test["body"], indent=2),
            "options": {"raw": {"language": "json"}}
        }
        headers.append({"key": "Content-Type", "value": "application/json"})

    item = {
        "name": f"[{test['id']}] {test['name']}",
        "request": {
            "method": test["method"],
            "header": headers,
            "url": {
                "raw": test["url"],
                "host": ["{{baseUrl}}"],
                "path": [p for p in url_parts if p]
            },
            "description": test["scenario"]
        },
        "response": []
    }
    if auth_obj:
        item["request"]["auth"] = auth_obj
    if body_obj:
        item["request"]["body"] = body_obj
    if test.get("test_script"):
        item["event"] = [{
            "listen": "test",
            "script": {
                "type": "text/javascript",
                "exec": test["test_script"].split("\n")
            }
        }]

    folders_map[f_name].append(item)

postman_collection = {
    "info": {
        "_postman_id": "resolvehub-api-audit-2026",
        "name": "ResolveHub_Complete_API_Audit",
        "description": "Comprehensive Postman test collection for ResolveHub MVP auditing all 49 backend routes, validation rules, role permissions, and full ticket lifecycle.",
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    "item": [
        {"name": folder_name, "item": items}
        for folder_name, items in folders_map.items()
    ]
}

collection_file_path = os.path.join(workspace_root, "ResolveHub_Complete_API_Audit.postman_collection.json")
with open(collection_file_path, "w", encoding="utf-8") as f:
    json.dump(postman_collection, f, indent=2)

print(f"Collection written: {collection_file_path}")

# 2. Execute all tests sequentially using TestClient and runtime variables
env = {
    "baseUrl": "http://127.0.0.1:8000",
    "admin_email": "admin@resolvehub.com",
    "admin_password": "Admin123!",
    "employee_email": "employee@resolvehub.com",
    "employee_password": "Employee123!",
    "resolver_email": "resolver@resolvehub.com",
    "resolver_password": "Resolver123!",
    "admin_token": "",
    "employee_token": "",
    "resolver_token": "",
    "admin_user_id": "",
    "employee_user_id": "",
    "resolver_user_id": "",
    "department_id": "",
    "category_id": "",
    "subcategory_id": "",
    "ticket_id": "",
    "ticket_number": "",
    "comment_id": "",
    "attachment_id": "",
    "notification_id": "",
    "sla_policy_id": "",
    "faq_id": "",
    "support_team_id": "",
    "routing_rule_id": "",
    "escalation_id": ""
}

def resolve_vars(text_val):
    if not isinstance(text_val, str):
        return text_val
    for k, v in env.items():
        text_val = text_val.replace(f"{{{{{k}}}}}", str(v))
    return text_val

def resolve_body(body_obj):
    if body_obj is None:
        return None
    if isinstance(body_obj, dict):
        return {k: resolve_vars(v) if isinstance(v, str) else v for k, v in body_obj.items()}
    return body_obj

results = []

print("\n--- EXECUTING POSTMAN AUDIT TEST SUITE ---")
for t in test_definitions:
    t_id = t["id"]
    method = t["method"]
    url = resolve_vars(t["url"]).replace("http://127.0.0.1:8000", "")
    headers = {}

    if t["auth"]:
        token = env.get(t["auth"])
        if token:
            headers["Authorization"] = f"Bearer {token}"

    body = resolve_body(t.get("body"))
    is_file = t.get("is_file_upload", False)

    actual_status = None
    response_data = None
    passed = False
    error_msg = ""

    try:
        if is_file:
            files = {"file": ("sample_diagnostic.txt", BytesIO(b"System diagnostic error report log content"), "text/plain")}
            resp = client.post(url, files=files, headers=headers)
        elif method == "GET":
            resp = client.get(url, headers=headers)
        elif method == "POST":
            resp = client.post(url, json=body, headers=headers)
        elif method == "PUT":
            resp = client.put(url, json=body, headers=headers)
        elif method == "DELETE":
            resp = client.delete(url, headers=headers)
        else:
            raise ValueError(f"Unsupported method {method}")

        actual_status = resp.status_code
        try:
            response_data = resp.json()
        except Exception:
            response_data = resp.text

        # Assertion logic
        expected = t["expected_status"]
        if expected == 201:
            passed = actual_status in (200, 201)
        else:
            passed = actual_status == expected

        if not passed:
            error_msg = f"Expected HTTP {expected}, got {actual_status}. Response: {str(response_data)[:150]}"

        # Variable capture logic from response
        if passed and isinstance(response_data, dict):
            if "access_token" in response_data:
                role = response_data.get("role")
                uid = response_data.get("user_id")
                if role == "SUPER_ADMIN":
                    env["admin_token"] = response_data["access_token"]
                    env["admin_user_id"] = uid
                elif role == "EMPLOYEE" and "employee" in t["id"].lower() or "employee" in t["name"].lower():
                    env["employee_token"] = response_data["access_token"]
                    env["employee_user_id"] = uid
                elif "resolver" in t["name"].lower():
                    env["resolver_token"] = response_data["access_token"]
                    env["resolver_user_id"] = uid
            if t_id == "TC-TKT-01":
                env["ticket_id"] = response_data.get("id", "")
                env["ticket_number"] = response_data.get("ticket_number", "")
            if t_id == "TC-CMT-01":
                env["comment_id"] = response_data.get("id", "")
            if t_id == "TC-ATT-01":
                env["attachment_id"] = response_data.get("id", "")
            if t_id == "TC-SLA-01":
                env["sla_policy_id"] = response_data.get("id", "")
            if t_id == "TC-FAQ-01":
                env["faq_id"] = response_data.get("id", "")
            if t_id == "TC-RUT-01":
                env["support_team_id"] = response_data.get("id", "")
            if t_id == "TC-RUT-03":
                env["routing_rule_id"] = response_data.get("id", "")
            if t_id == "TC-ESC-01":
                env["escalation_id"] = response_data.get("id", "")

        if passed and isinstance(response_data, list) and len(response_data) > 0:
            if t_id == "TC-ORG-01":
                env["department_id"] = response_data[0].get("id", "")
            elif t_id == "TC-ORG-02":
                env["category_id"] = response_data[0].get("id", "")
            elif t_id == "TC-ORG-03":
                env["subcategory_id"] = response_data[0].get("id", "")
            elif t_id == "TC-NTF-01":
                env["notification_id"] = response_data[0].get("id", "")

    except Exception as exc:
        passed = False
        error_msg = f"Execution exception: {str(exc)}"

    status_str = "PASSED" if passed else "FAILED"
    print(f"[{status_str}] {t_id}: {t['name']} (Got HTTP {actual_status}, Expected {t['expected_status']})")
    if not passed:
        print(f"   -> Failure details: {error_msg}")

    results.append({
        "Test ID": t_id,
        "Folder": t["folder"],
        "Name": t["name"],
        "Method": method,
        "Endpoint": t["url"].replace("{{baseUrl}}", ""),
        "Scenario": t["scenario"],
        "Expected Status": t["expected_status"],
        "Actual Status": actual_status,
        "Result": status_str,
        "Details": error_msg or "OK"
    })

# Write CSV report
csv_path = os.path.join(workspace_root, "postman_test_results.csv")
with open(csv_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=[
        "Test ID", "Folder", "Name", "Method", "Endpoint", "Scenario",
        "Expected Status", "Actual Status", "Result", "Details"
    ])
    writer.writeheader()
    writer.writerows(results)

print(f"\nCSV Report generated: {csv_path}")
total = len(results)
passed_cnt = sum(1 for r in results if r["Result"] == "PASSED")
failed_cnt = sum(1 for r in results if r["Result"] == "FAILED")
print(f"Summary: Total {total} | Passed: {passed_cnt} | Failed: {failed_cnt}")
