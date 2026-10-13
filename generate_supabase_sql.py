import sys
import os

backend_path = os.path.join(os.path.dirname(__file__), "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.database import Base, SessionLocal
import app.models
from app.models.department import Department
from app.models.user import User
from app.models.category import Category
from app.models.subcategory import Subcategory
from app.models.sla_policy import SlaPolicy
from sqlalchemy.schema import CreateTable
from sqlalchemy.dialects import postgresql

def generate():
    tables_order = [
        'departments', 'users', 'categories', 'subcategories', 'support_teams', 'support_team_members',
        'sla_policies', 'routing_rules', 'tickets', 'ticket_comments', 'ticket_attachments',
        'ticket_escalations', 'notifications', 'faqs'
    ]

    ddl_lines = [
        "-- ============================================================================",
        "-- ResolveHub Production PostgreSQL Schema for Supabase",
        "-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New query)",
        "-- ============================================================================",
        "",
        'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";',
        "",
    ]

    for t_name in tables_order:
        if t_name in Base.metadata.tables:
            table = Base.metadata.tables[t_name]
            compiled = CreateTable(table).compile(dialect=postgresql.dialect())
            ddl_lines.append(f"-- Table: {t_name}")
            ddl_lines.append(str(compiled).strip() + ";\n")

    with open("supabase_schema.sql", "w", encoding="utf-8") as f:
        f.write("\n".join(ddl_lines))
    print("Generated supabase_schema.sql")

    # Now generate seed SQL from current local SQLite DB
    db = SessionLocal()
    seed_lines = [
        "-- ============================================================================",
        "-- ResolveHub Supabase Seed Data (Superadmin, 80 Dailoqa Interns, Departments & SLA)",
        "-- Run this in Supabase SQL Editor after running supabase_schema.sql",
        "-- ============================================================================",
        "",
    ]

    # 1. Departments
    depts = db.query(Department).all()
    seed_lines.append("-- 1. Departments")
    for d in depts:
        email_val = f"'{d.department_email}'" if d.department_email else "NULL"
        resp_user = f"'{d.responsible_user_id}'" if d.responsible_user_id else "NULL"
        safe_name = d.name.replace("'", "''")
        seed_lines.append(
            f"INSERT INTO departments (id, name, department_email, responsible_user_id, is_active, created_at, updated_at) "
            f"VALUES ('{d.id}', '{safe_name}', {email_val}, {resp_user}, {str(d.is_active).lower()}, NOW(), NOW()) "
            f"ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, department_email = EXCLUDED.department_email;"
        )
    seed_lines.append("")

    # 2. Users (Admin + 80 Interns)
    users = db.query(User).all()
    seed_lines.append("-- 2. Users (Superadmin & Interns)")
    for u in users:
        dept_id = f"'{u.department_id}'" if u.department_id else "NULL"
        role_str = u.role.value if hasattr(u.role, 'value') else str(u.role)
        safe_name = u.name.replace("'", "''")
        seed_lines.append(
            f"INSERT INTO users (id, employee_id, name, email, password_hash, role, department_id, is_active, created_at, updated_at) "
            f"VALUES ('{u.id}', '{u.employee_id}', '{safe_name}', '{u.email}', '{u.password_hash}', '{role_str}', {dept_id}, {str(u.is_active).lower()}, NOW(), NOW()) "
            f"ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, department_id = EXCLUDED.department_id;"
        )
    seed_lines.append("")

    # 3. Categories
    cats = db.query(Category).all()
    seed_lines.append("-- 3. Categories")
    for c in cats:
        safe_desc = c.description.replace("'", "''") if c.description else ""
        desc_val = f"'{safe_desc}'" if c.description else "NULL"
        safe_name = c.name.replace("'", "''")
        seed_lines.append(
            f"INSERT INTO categories (id, department_id, name, description, is_active, created_at, updated_at) "
            f"VALUES ('{c.id}', '{c.department_id}', '{safe_name}', {desc_val}, {str(c.is_active).lower()}, NOW(), NOW()) "
            f"ON CONFLICT (id) DO NOTHING;"
        )
    seed_lines.append("")

    # 4. Subcategories
    subs = db.query(Subcategory).all()
    seed_lines.append("-- 4. Subcategories")
    for s in subs:
        safe_desc = s.description.replace("'", "''") if s.description else ""
        desc_val = f"'{safe_desc}'" if s.description else "NULL"
        safe_name = s.name.replace("'", "''")
        seed_lines.append(
            f"INSERT INTO subcategories (id, category_id, name, description, is_active, created_at, updated_at) "
            f"VALUES ('{s.id}', '{s.category_id}', '{safe_name}', {desc_val}, {str(s.is_active).lower()}, NOW(), NOW()) "
            f"ON CONFLICT (id) DO NOTHING;"
        )
    seed_lines.append("")

    # 5. SLA Policies
    slas = db.query(SlaPolicy).all()
    seed_lines.append("-- 5. SLA Policies")
    for sp in slas:
        prio_val = f"'{sp.priority}'" if sp.priority else "NULL"
        safe_name = sp.name.replace("'", "''")
        seed_lines.append(
            f"INSERT INTO sla_policies (id, name, priority, first_response_hours, resolution_hours, is_active, created_at, updated_at) "
            f"VALUES ('{sp.id}', '{safe_name}', {prio_val}, {sp.first_response_hours}, {sp.resolution_hours}, {str(sp.is_active).lower()}, NOW(), NOW()) "
            f"ON CONFLICT (id) DO NOTHING;"
        )
    seed_lines.append("")

    with open("supabase_seed.sql", "w", encoding="utf-8") as f:
        f.write("\n".join(seed_lines))
    print("Generated supabase_seed.sql")

if __name__ == "__main__":
    generate()
