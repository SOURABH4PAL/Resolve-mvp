import sys
import os

backend_path = os.path.join(os.path.dirname(__file__), "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.database import SessionLocal, init_db_schema
from app.models.user import User, UserRole
from app.models.department import Department
from app.models.category import Category
from app.models.subcategory import Subcategory
from app.models.sla_policy import SlaPolicy
from app.utils.security import get_password_hash

INTERNS_RAW = """Aditya Yadav,aditya.yadav@dailoqa.com,INTERN
Pranav Suresh,pranav.suresh@dailoqa.com,INTERN
Jatin,jatin@dailoqa.com,INTERN
Aakash Yadav,aakash.yadav@dailoqa.com,INTERN
Ayush V Panicker,ayush.v.panicker@dailoqa.com,INTERN
Sarthak,sarthak@dailoqa.com,INTERN
Divyom Agrawal,divyom.agrawal@dailoqa.com,INTERN
Nikhil Bisla,nikhil.bisla@dailoqa.com,INTERN
D Anil Kumar,d.anil.kumar@dailoqa.com,INTERN
Kanak Varshney,kanak.varshney@dailoqa.com,INTERN
Aditi,aditi@dailoqa.com,INTERN
Anshuman Mishra,anshuman.mishra@dailoqa.com,INTERN
J. Chaitanya Sai,j.chaitanya.sai@dailoqa.com,INTERN
Korrapati Sridhar Reddy,korrapati.sridhar.reddy@dailoqa.com,INTERN
Ashish Rai,ashish.rai@dailoqa.com,INTERN
sameer,sameer@dailoqa.com,INTERN
K.Sriram Naveen,k.sriram.naveen@dailoqa.com,INTERN
Penmetsa Harsha Surya Gopal pradeep,penmetsa.harsha.surya.gopal.pradeep@dailoqa.com,INTERN
Manisha Parihar,manisha.parihar@dailoqa.com,INTERN
Nitin Aman,nitin.aman@dailoqa.com,INTERN
Maddirala Namitha Reddy,maddirala.namitha.reddy@dailoqa.com,INTERN
mahendra reddy,mahendra.reddy@dailoqa.com,INTERN
Krish Jain,krish.jain@dailoqa.com,INTERN
Anant Sharma,anant.sharma@dailoqa.com,INTERN
Nikhil sai vamshi krishna manam,nikhil.sai.vamshi.krishna.manam@dailoqa.com,INTERN
Rohit Raghav,rohit.raghav@dailoqa.com,INTERN
Tanvi Kad,tanvi.kad@dailoqa.com,INTERN
Saloni Rana,saloni.rana@dailoqa.com,INTERN
Pandraju Ganya Srihitha,pandraju.ganya.srihitha@dailoqa.com,INTERN
Sivaram Saran Alla,sivaram.saran.alla@dailoqa.com,INTERN
Jasleen Kaur,jasleen.kaur@dailoqa.com,INTERN
Yash Tanwar,yash.tanwar@dailoqa.com,INTERN
Sanka Maruthi Srujan,sanka.maruthi.srujan@dailoqa.com,INTERN
Darsheel Jaiswal,darsheel.jaiswal@dailoqa.com,INTERN
Ansh Kukreti,ansh.kukreti@dailoqa.com,INTERN
Anushka Sharma,anushka.sharma@dailoqa.com,INTERN
Somepalli Raviteja,somepalli.raviteja@dailoqa.com,INTERN
harsh kumar,harsh.kumar@dailoqa.com,INTERN
Akshat Bansal,akshat.bansal@dailoqa.com,INTERN
Athira Ravi Pillai,athira.ravi.pillai@dailoqa.com,INTERN
Sourabh Pal,sourabh.pal@dailoqa.com,INTERN
Nitin Singh,nitin.singh@dailoqa.com,INTERN
Ananya,ananya@dailoqa.com,INTERN
Aarth Saxena,aarth.saxena@dailoqa.com,INTERN
Vakkalagadga Naga Venkata Sai Lakshmi Kanishka,vakkalagadga.naga.venkata.sai.lakshmi.kanishka@dailoqa.com,INTERN
Anshuman Mathur,anshuman.mathur@dailoqa.com,INTERN
Akansha,akansha@dailoqa.com,INTERN
Titirtha Singh,titirtha.singh@dailoqa.com,INTERN
Yayivi Vinay,yayivi.vinay@dailoqa.com,INTERN
Bharat Yadav,bharat.yadav@dailoqa.com,INTERN
Akshat Awasthi,akshat.awasthi@dailoqa.com,INTERN
Khushi Bainsla,khushi.bainsla@dailoqa.com,INTERN
Somanadh,somanadh@dailoqa.com,INTERN
Garvita Singh,garvita.singh@dailoqa.com,INTERN
Jatin Malik,jatin.malik@dailoqa.com,INTERN
Nishant Sindhu,nishant.sindhu@dailoqa.com,INTERN
Khushal Nivas Gourishetty,khushal.nivas.gourishetty@dailoqa.com,INTERN
Mann Upadhyay,mann.upadhyay@dailoqa.com,INTERN
Aditya,aditya@dailoqa.com,INTERN
Piyush Yadav,piyush.yadav@dailoqa.com,INTERN
Pramod,pramod@dailoqa.com,INTERN
Prince Kumar,prince.kumar@dailoqa.com,INTERN
Aryan Sharma,aryan.sharma@dailoqa.com,INTERN
Divyansh Agrawal,divyansh.agrawal@dailoqa.com,INTERN
Saksham Gupta,saksham.gupta@dailoqa.com,INTERN
Ayush rai,ayush.rai@dailoqa.com,INTERN
Anushka Khare,anushka.khare@dailoqa.com,INTERN
Anant Vaibhav,anant.vaibhav@dailoqa.com,INTERN
Siddhesh Chawande,siddhesh.chawande@dailoqa.com,INTERN
Deepanshu,deepanshu@dailoqa.com,INTERN
Keshav Gupta,keshav.gupta@dailoqa.com,INTERN
Vaivashvat Upadhyay,vaivashvat.upadhyay@dailoqa.com,INTERN
Talapanti Rajesh,talapanti.rajesh@dailoqa.com,INTERN
Rudraraju sriram Sathvik varma,rudraraju.sriram.sathvik.varma@dailoqa.com,INTERN
Bhavya Bhutani,bhavya.bhutani@dailoqa.com,INTERN
Himanshu Gupta,himanshu.gupta@dailoqa.com,INTERN
Keshav Agarwal,keshav.agarwal@dailoqa.com,INTERN
Mayank jain,mayank.jain@dailoqa.com,INTERN
Jayesh Kansal,jayesh.kansal@dailoqa.com,INTERN
Tanmay Garg,tanmay.garg@dailoqa.com,INTERN"""

def populate():
    init_db_schema()
    db = SessionLocal()

    print("1. Updating Superadmin credentials...")
    admin = db.query(User).filter(User.email == "admin@resolvehub.com").first()
    if admin:
        admin.password_hash = get_password_hash("superadmin123")
        admin.role = UserRole.SUPER_ADMIN
    else:
        admin = User(
            employee_id="ADM-001",
            name="Super Admin",
            email="admin@resolvehub.com",
            password_hash=get_password_hash("superadmin123"),
            role=UserRole.SUPER_ADMIN,
            is_active=True,
        )
        db.add(admin)
    db.commit()

    print("2. Populating organizational departments & categories...")
    departments_data = [
        {
            "name": "Engineering & Development",
            "email": "engineering@resolvehub.com",
            "categories": [
                {
                    "name": "Software Bugs & Incidents",
                    "description": "Defects, runtime exceptions, and regression issues in production or staging",
                    "subcategories": ["Frontend UI Crash", "Backend API Error (500)", "Database Query Failure", "Authentication Loop"],
                },
                {
                    "name": "CI/CD & Cloud Infrastructure",
                    "description": "Build pipelines, container deployments, and AWS/GCP infrastructure",
                    "subcategories": ["GitHub Actions Failure", "AWS Permission Access", "Staging Environment Down", "SSL Certificate Issue"],
                },
                {
                    "name": "API & Integrations",
                    "description": "Third-party and internal API endpoint connectivity and schemas",
                    "subcategories": ["Webhook Not Firing", "Rate Limit Exceeded", "Schema Validation Failure"],
                },
            ],
        },
        {
            "name": "IT Support & Infrastructure",
            "email": "it@resolvehub.com",
            "categories": [
                {
                    "name": "Hardware & Equipment",
                    "description": "Laptops, monitors, chargers, and workstation hardware",
                    "subcategories": ["Laptop Battery/Display", "Monitor & Docking Station", "Keyboard/Mouse Replacement"],
                },
                {
                    "name": "VPN, Network & Access",
                    "description": "Corporate VPN, Wi-Fi credentials, and remote connectivity",
                    "subcategories": ["VPN Connection Failure", "Office Wi-Fi Access", "Slow Network Throughput"],
                },
                {
                    "name": "Software & SaaS Licenses",
                    "description": "Google Workspace, Slack, Figma, GitHub, and IDE license access",
                    "subcategories": ["Google Workspace Account", "Slack Channel Access", "Figma/GitHub Seat Request"],
                },
            ],
        },
        {
            "name": "Human Resources",
            "email": "hr@resolvehub.com",
            "categories": [
                {
                    "name": "Onboarding & Documentation",
                    "description": "Internship agreements, ID verification, and joining letters",
                    "subcategories": ["Offer Letter & NDA", "Background Verification", "Internship Certificate Request"],
                },
                {
                    "name": "Leave, Attendance & Policies",
                    "description": "Leave applications, shift timings, and company policy queries",
                    "subcategories": ["Sick Leave Query", "Exam / Academic Leave", "Attendance Correction"],
                },
                {
                    "name": "Stipend & Compensation",
                    "description": "Monthly stipend payouts, bank account update, and tax forms",
                    "subcategories": ["Stipend Delay / Query", "Bank Account Update", "Form 16 / TDS Query"],
                },
            ],
        },
        {
            "name": "Operations & Facilities",
            "email": "facilities@resolvehub.com",
            "categories": [
                {
                    "name": "Workplace Access & Seating",
                    "description": "Access cards, office passes, and seating allocation",
                    "subcategories": ["RFID Access Card Lost/Issue", "Desk / Seating Allocation", "Meeting Room Access"],
                },
                {
                    "name": "Asset & Inventory Management",
                    "description": "Return, transfer, or receipt of company assets",
                    "subcategories": ["Asset Handover", "Asset Transfer", "Courier & Logistics"],
                },
            ],
        },
        {
            "name": "Product & Design",
            "email": "product@resolvehub.com",
            "categories": [
                {
                    "name": "Feature Requests & Feedback",
                    "description": "Product usability suggestions and roadmap ideas",
                    "subcategories": ["New Feature Suggestion", "UI Enhancement Request", "Documentation Improvement"],
                },
            ],
        },
    ]

    dept_map = {}
    for d_data in departments_data:
        dept = db.query(Department).filter(Department.name == d_data["name"]).first()
        if not dept:
            dept = Department(
                name=d_data["name"],
                department_email=d_data["email"],
                is_active=True,
            )
            db.add(dept)
            db.commit()
            db.refresh(dept)
        dept_map[d_data["name"]] = dept

        for c_data in d_data["categories"]:
            cat = db.query(Category).filter(
                Category.name == c_data["name"],
                Category.department_id == dept.id,
            ).first()
            if not cat:
                cat = Category(
                    name=c_data["name"],
                    description=c_data["description"],
                    department_id=dept.id,
                    is_active=True,
                )
                db.add(cat)
                db.commit()
                db.refresh(cat)
            
            for s_name in c_data["subcategories"]:
                sub = db.query(Subcategory).filter(
                    Subcategory.name == s_name,
                    Subcategory.category_id == cat.id,
                ).first()
                if not sub:
                    sub = Subcategory(
                        name=s_name,
                        description=f"{s_name} under {cat.name}",
                        category_id=cat.id,
                    )
                    db.add(sub)
            db.commit()

    print("3. Populating 80 intern/employee accounts from CSV...")
    dept_keys = list(dept_map.keys())
    lines = [line.strip() for line in INTERNS_RAW.strip().split("\n") if line.strip()]
    
    intern_pass_hash = get_password_hash("Password123!")

    created_count = 0
    updated_count = 0

    for idx, line in enumerate(lines, start=1):
        parts = [p.strip() for p in line.split(",")]
        if len(parts) < 2:
            continue
        name = parts[0]
        email = parts[1]
        emp_id = f"DLQ-INT-{idx:03d}"

        # Assign department cyclically
        assigned_dept_name = dept_keys[(idx - 1) % len(dept_keys)]
        dept_obj = dept_map[assigned_dept_name]

        existing = db.query(User).filter(User.email == email).first()
        if not existing:
            user = User(
                employee_id=emp_id,
                name=name,
                email=email,
                password_hash=intern_pass_hash,
                role=UserRole.EMPLOYEE,
                department_id=dept_obj.id,
                is_active=True,
            )
            db.add(user)
            created_count += 1
        else:
            existing.name = name
            existing.password_hash = intern_pass_hash
            existing.department_id = dept_obj.id
            existing.is_active = True
            updated_count += 1

    db.commit()
    print(f"Users processed: {created_count} created, {updated_count} updated.")

    print("4. Configuring SLA Policies (Urgent: 4h, High: 8h, Medium: 24h, Low: 48h)...")
    sla_configs = [
        {"name": "Urgent / Critical SLA", "priority": "CRITICAL", "first_response_hours": 4, "resolution_hours": 12},
        {"name": "High Priority SLA", "priority": "HIGH", "first_response_hours": 8, "resolution_hours": 24},
        {"name": "Medium Priority SLA", "priority": "MEDIUM", "first_response_hours": 24, "resolution_hours": 48},
        {"name": "Low Priority SLA", "priority": "LOW", "first_response_hours": 48, "resolution_hours": 96},
    ]

    for sc in sla_configs:
        policy = db.query(SlaPolicy).filter(SlaPolicy.priority == sc["priority"]).first()
        if not policy:
            policy = SlaPolicy(
                name=sc["name"],
                priority=sc["priority"],
                first_response_hours=sc["first_response_hours"],
                resolution_hours=sc["resolution_hours"],
                is_active=True,
            )
            db.add(policy)
        else:
            policy.name = sc["name"]
            policy.first_response_hours = sc["first_response_hours"]
            policy.resolution_hours = sc["resolution_hours"]
            policy.is_active = True
    db.commit()

    total_users = db.query(User).count()
    total_depts = db.query(Department).count()
    total_cats = db.query(Category).count()
    total_subs = db.query(Subcategory).count()
    print(f"DONE! Database summary: {total_users} Users, {total_depts} Departments, {total_cats} Categories, {total_subs} Subcategories.")

if __name__ == "__main__":
    populate()
