import sys
import os

# Add backend directory to sys.path
backend_path = os.path.join(os.path.dirname(__file__), "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.database import SessionLocal, engine, init_db_schema
from app.models.user import User, UserRole
from app.models.department import Department
from app.models.category import Category
from app.models.subcategory import Subcategory
from app.utils.security import get_password_hash

def seed_database():
    print("Initializing database schema...")
    init_db_schema()

    db = SessionLocal()
    try:
        print("Seeding demo data...")

        # 1. Departments
        depts = {
            "IT Support": "it@resolvehub.com",
            "Human Resources": "hr@resolvehub.com",
            "General": "general@resolvehub.com",
        }
        dept_objs = {}
        for name, email in depts.items():
            dept = db.query(Department).filter(Department.name == name).first()
            if not dept:
                dept = Department(name=name, department_email=email)
                db.add(dept)
            dept_objs[name] = dept

        db.commit()
        for dept in dept_objs.values():
            db.refresh(dept)

        it_dept = dept_objs["IT Support"]
        hr_dept = dept_objs["Human Resources"]
        gen_dept = dept_objs["General"]

        # 2. Categories
        hw_cat = db.query(Category).filter(Category.name == "Hardware", Category.department_id == it_dept.id).first()
        if not hw_cat:
            hw_cat = Category(name="Hardware", description="Physical hardware issues", department_id=it_dept.id)
            db.add(hw_cat)

        sw_cat = db.query(Category).filter(Category.name == "Software", Category.department_id == it_dept.id).first()
        if not sw_cat:
            sw_cat = Category(name="Software", description="Software & OS issues", department_id=it_dept.id)
            db.add(sw_cat)

        payroll_cat = db.query(Category).filter(Category.name == "Payroll", Category.department_id == hr_dept.id).first()
        if not payroll_cat:
            payroll_cat = Category(name="Payroll", description="Payroll & compensation queries", department_id=hr_dept.id)
            db.add(payroll_cat)

        gen_cat = db.query(Category).filter(Category.name == "General Inquiry", Category.department_id == gen_dept.id).first()
        if not gen_cat:
            gen_cat = Category(name="General Inquiry", description="General workplace questions and service requests", department_id=gen_dept.id)
            db.add(gen_cat)

        db.commit()
        db.refresh(hw_cat)
        db.refresh(sw_cat)
        db.refresh(payroll_cat)
        db.refresh(gen_cat)

        # 3. Subcategories
        subcats = [
            (hw_cat.id, "Laptop Issue", "Laptop battery, display, or keyboard problems"),
            (hw_cat.id, "Monitor Issue", "External monitor connectivity"),
            (sw_cat.id, "OS Crash", "Operating system blue screen or crash"),
            (sw_cat.id, "VPN Access", "Virtual Private Network connection issues"),
            (payroll_cat.id, "Salary Discrepancy", "Issues with pay stub or bank transfer"),
            (gen_cat.id, "Workplace Request", "Desk, access card, or general request"),
        ]

        for cat_id, sub_name, desc in subcats:
            exists = db.query(Subcategory).filter(Subcategory.name == sub_name, Subcategory.category_id == cat_id).first()
            if not exists:
                db.add(Subcategory(category_id=cat_id, name=sub_name, description=desc))

        db.commit()

        # 4. Users (Including Department Leads & Normal Employees with Dailoqa company domains)
        users_to_create = [
            {
                "employee_id": "EMP001",
                "name": "Super Admin",
                "email": "admin@resolvehub.com",
                "password": "Admin123!",
                "role": UserRole.SUPER_ADMIN,
                "department_id": it_dept.id,
            },
            {
                "employee_id": "EMP101",
                "name": "Sourabh Pal",
                "email": "sourabh.pal@dailoqa.com",
                "password": "Password123!",
                "role": UserRole.EMPLOYEE,
                "department_id": it_dept.id,
            },
            {
                "employee_id": "EMP102",
                "name": "Aditya Yadav",
                "email": "aditya.yadav@dailoqa.com",
                "password": "Password123!",
                "role": UserRole.EMPLOYEE,
                "department_id": hr_dept.id,
            },
            {
                "employee_id": "EMP103",
                "name": "Saksham Gupta",
                "email": "saksham.gupta@dailoqa.com",
                "password": "Password123!",
                "role": UserRole.EMPLOYEE,
                "department_id": gen_dept.id,
            },
            {
                "employee_id": "EMP104",
                "name": "Jayesh Kansal",
                "email": "jayesh.kansal@dailoqa.com",
                "password": "Password123!",
                "role": UserRole.EMPLOYEE,
                "department_id": gen_dept.id,
            },
            {
                "employee_id": "EMP105",
                "name": "Ashish Rai",
                "email": "ashish.rai@dailoqa.com",
                "password": "Password123!",
                "role": UserRole.EMPLOYEE,
                "department_id": it_dept.id,
            },
            {
                "employee_id": "EMP002",
                "name": "IT Support Staff",
                "email": "resolver@resolvehub.com",
                "password": "Resolver123!",
                "role": UserRole.EMPLOYEE,
                "department_id": it_dept.id,
            },
            {
                "employee_id": "EMP003",
                "name": "Jane Doe",
                "email": "employee@resolvehub.com",
                "password": "Employee123!",
                "role": UserRole.EMPLOYEE,
                "department_id": hr_dept.id,
            },
        ]

        user_objs = {}
        for udata in users_to_create:
            existing = db.query(User).filter(
                (User.employee_id == udata["employee_id"]) | (User.email == udata["email"])
            ).first()
            if not existing:
                user = User(
                    employee_id=udata["employee_id"],
                    name=udata["name"],
                    email=udata["email"],
                    password_hash=get_password_hash(udata["password"]),
                    role=udata["role"],
                    department_id=udata["department_id"],
                )
                db.add(user)
                user_objs[udata["email"]] = user
                print(f"Created demo user: {udata['email']} / {udata['password']} ({udata['role'].value})")
            else:
                existing.name = udata["name"]
                existing.email = udata["email"]
                existing.role = udata["role"]
                existing.department_id = udata["department_id"]
                existing.password_hash = get_password_hash(udata["password"])
                user_objs[udata["email"]] = existing
                print(f"Updated demo user profile & email: {udata['email']}")

        db.commit()

        # Re-fetch users for setting department responsibilities
        sourabh = db.query(User).filter(User.email == "sourabh.pal@dailoqa.com").first()
        aditya = db.query(User).filter(User.email == "aditya.yadav@dailoqa.com").first()
        saksham = db.query(User).filter(User.email == "saksham.gupta@dailoqa.com").first()

        # 5. Set Department Responsibility Mapping:
        # IT Support -> Sourabh Pal
        # Human Resources -> Aditya Yadav
        # General -> Saksham Gupta
        if sourabh and it_dept:
            it_dept.responsible_user_id = sourabh.id
        if aditya and hr_dept:
            hr_dept.responsible_user_id = aditya.id
        if saksham and gen_dept:
            gen_dept.responsible_user_id = saksham.id

        db.commit()
        print("Database seeded successfully with Dailoqa company email mappings!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
