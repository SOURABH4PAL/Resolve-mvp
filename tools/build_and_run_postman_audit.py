import json
import os
import csv
import sys
from datetime import datetime
from io import BytesIO

# Ensure backend can be imported
workspace_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_dir = os.path.join(workspace_root, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, init_db_schema
from app.models.user import User

init_db_schema()

# Setup Postman Environment
environment_data = {
    "id": "resolvehub-local-env-001",
    "name": "ResolveHub_Local",
    "values": [
        {"key": "baseUrl", "value": "http://127.0.0.1:8000", "type": "default", "enabled": True},
        {"key": "admin_email", "value": "admin@resolvehub.com", "type": "default", "enabled": True},
        {"key": "admin_password", "value": "Admin123!", "type": "secret", "enabled": True},
        {"key": "employee_email", "value": "employee@resolvehub.com", "type": "default", "enabled": True},
        {"key": "employee_password", "value": "Employee123!", "type": "secret", "enabled": True},
        {"key": "resolver_email", "value": "resolver@resolvehub.com", "type": "default", "enabled": True},
        {"key": "resolver_password", "value": "Resolver123!", "type": "secret", "enabled": True},
        {"key": "admin_token", "value": "", "type": "secret", "enabled": True},
        {"key": "employee_token", "value": "", "type": "secret", "enabled": True},
        {"key": "resolver_token", "value": "", "type": "secret", "enabled": True},
        {"key": "admin_user_id", "value": "", "type": "default", "enabled": True},
        {"key": "employee_user_id", "value": "", "type": "default", "enabled": True},
        {"key": "department_id", "value": "", "type": "default", "enabled": True},
        {"key": "category_id", "value": "", "type": "default", "enabled": True},
        {"key": "subcategory_id", "value": "", "type": "default", "enabled": True},
        {"key": "ticket_id", "value": "", "type": "default", "enabled": True},
        {"key": "ticket_number", "value": "", "type": "default", "enabled": True},
        {"key": "comment_id", "value": "", "type": "default", "enabled": True},
        {"key": "attachment_id", "value": "", "type": "default", "enabled": True},
        {"key": "notification_id", "value": "", "type": "default", "enabled": True},
        {"key": "sla_policy_id", "value": "", "type": "default", "enabled": True},
        {"key": "faq_id", "value": "", "type": "default", "enabled": True},
        {"key": "support_team_id", "value": "", "type": "default", "enabled": True},
        {"key": "routing_rule_id", "value": "", "type": "default", "enabled": True},
        {"key": "escalation_id", "value": "", "type": "default", "enabled": True}
    ],
    "_postman_variable_scope": "environment",
    "_postman_exported_at": datetime.utcnow().isoformat() + "Z",
    "_postman_exported_using": "ResolveHub Generator v1.0"
}

env_file_path = os.path.join(workspace_root, "ResolveHub_Local.postman_environment.json")
with open(env_file_path, "w", encoding="utf-8") as f:
    json.dump(environment_data, f, indent=2)

print(f"Generated {env_file_path}")
