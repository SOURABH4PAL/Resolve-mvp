import sys
import os

# Add backend directory to sys.path
backend_path = os.path.join(os.path.dirname(__file__), "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.database import SessionLocal, engine, Base
from app.models.user import User, UserRole
from app.models.department import Department
from app.models.category import Category
from app.models.subcategory import Subcategory
from app.utils.security import get_password_hash

def seed_database():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        print("Seeding demo data...")

        # 1. Departments
        it_dept = db.query(Department).filter(Department.name == "IT Support").first()
        if not it_dept:
            it_dept = Department(name="IT Support", department_email="it@resolvehub.com")
            db.add(it_dept)
        
        hr_dept = db.query(Department).filter(Department.name == "Human Resources").first()
        if not hr_dept:
            hr_dept = Department(name="Human Resources", department_email="hr@resolvehub.com")
            db.add(hr_dept)

        db.commit()
        db.refresh(it_dept)
        db.refresh(hr_dept)

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

        db.commit()
        db.refresh(hw_cat)
        db.refresh(sw_cat)
        db.refresh(payroll_cat)

        # 3. Subcategories
        subcats = [
            (hw_cat.id, "Laptop Issue", "Laptop battery, display, or keyboard problems"),
            (hw_cat.id, "Monitor Issue", "External monitor connectivity"),
            (sw_cat.id, "OS Crash", "Operating system blue screen or crash"),
            (sw_cat.id, "VPN Access", "Virtual Private Network connection issues"),
            (payroll_cat.id, "Salary Discrepancy", "Issues with pay stub or bank transfer"),
        ]

        for cat_id, sub_name, desc in subcats:
            exists = db.query(Subcategory).filter(Subcategory.name == sub_name, Subcategory.category_id == cat_id).first()
            if not exists:
                db.add(Subcategory(category_id=cat_id, name=sub_name, description=desc))

        db.commit()

        # 4. Users
        users_to_create = [
            {
                "employee_id": "EMP001",
                "name": "Super Admin",
                "email": "admin@resolvehub.com",
                "password": "Admin123!",
                "role": UserRole.SUPER_ADMIN,
                "department_id": it_dept.id
            },
            {
                "employee_id": "EMP002",
                "name": "IT Support Resolver",
                "email": "resolver@resolvehub.com",
                "password": "Resolver123!",
                "role": UserRole.RESOLVER,
                "department_id": it_dept.id
            },
            {
                "employee_id": "EMP003",
                "name": "Jane Doe",
                "email": "employee@resolvehub.com",
                "password": "Employee123!",
                "role": UserRole.EMPLOYEE,
                "department_id": hr_dept.id
            }
        ]

        for udata in users_to_create:
            existing = db.query(User).filter(User.email == udata["email"]).first()
            if not existing:
                user = User(
                    employee_id=udata["employee_id"],
                    name=udata["name"],
                    email=udata["email"],
                    password_hash=get_password_hash(udata["password"]),
                    role=udata["role"],
                    department_id=udata["department_id"]
                )
                db.add(user)
                print(f"Created demo user: {udata['email']} / {udata['password']} ({udata['role'].value})")
            else:
                existing.password_hash = get_password_hash(udata["password"])
                print(f"Updated demo user password: {udata['email']}")


        db.commit()
        print("Database seeded successfully!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
