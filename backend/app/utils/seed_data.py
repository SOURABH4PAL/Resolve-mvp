"""
Database seeding utility for ResolveHub MVP.
Seeds realistic IT Support taxonomy (Categories and Subcategories) idempotently.
"""

from sqlalchemy.orm import Session
from app.models.department import Department
from app.models.category import Category
from app.models.subcategory import Subcategory

TAXONOMY_DATA = {
    "Hardware": {
        "description": "Physical workplace hardware, devices, and computer peripherals",
        "subcategories": [
            ("Laptops", "Laptop battery, display, keyboard, and hardware faults"),
            ("Desktops", "Workstation hardware, power supply, and CPU issues"),
            ("Monitors", "External monitors, docking station video, and display cabling"),
            ("Peripherals", "Keyboards, mice, webcams, headsets, and USB accessories"),
            ("Printers & Scanners", "Network printers, paper jams, scan-to-email, and toner replacement"),
        ],
    },
    "Network & Connectivity": {
        "description": "Office network, remote connectivity, and corporate network infrastructure",
        "subcategories": [
            ("Wi-Fi", "Office wireless signal coverage, authentication, and speed drops"),
            ("VPN", "Remote access VPN connection failures, timeouts, and credentials"),
            ("LAN & Ethernet", "Wired office desk network drops and switch port issues"),
            ("DNS & Firewall", "Corporate firewall blocking, internal DNS lookup failures, and SSL errors"),
        ],
    },
    "Accounts & Access": {
        "description": "User identities, corporate directory, permissions, and security credentials",
        "subcategories": [
            ("Password Reset", "Active Directory domain password expiration, unlock, and self-service reset"),
            ("SSO & MFA", "Single Sign-On, Okta/Azure MFA push notification issues, and security keys"),
            ("Permissions", "Shared drive, cloud repository, and application access role requests"),
            ("Onboarding & Offboarding", "New joiner workstation setup and departing employee access revocation"),
        ],
    },
    "Software & Collaboration": {
        "description": "Desktop software, collaboration suites, operating systems, and business licenses",
        "subcategories": [
            ("Email & Outlook", "Microsoft Outlook sync errors, mailbox quota full, and meeting invite bugs"),
            ("MS Teams & Slack", "Collaboration tools, channel permissions, audio/video conferencing issues"),
            ("OS Errors", "Windows BSOD / macOS crash, kernel panic, system updates, and startup failures"),
            ("License Request", "Requests for developer tools, productivity licenses, and commercial software keys"),
        ],
    },
    "Security Incidents": {
        "description": "Security alarms, suspicious activities, vulnerability reporting, and quarantine",
        "subcategories": [
            ("Phishing", "Reported suspicious email, invoice scams, and credential harvesting links"),
            ("Malware", "Endpoint antivirus alerts, unauthorized binaries, and system ransomware protection"),
            ("Data Access Anomaly", "Unusual login locations, privileged access alerts, and data leak concerns"),
        ],
    },
}


def seed_it_taxonomies(db: Session, department_name: str = "IT Support") -> dict:
    """
    Idempotently seeds the IT Support categories and subcategories.
    Returns a summary dict of counts of created/existing entities.
    """
    dept = db.query(Department).filter(Department.name == department_name).first()
    if not dept:
        dept = Department(
            name=department_name,
            department_email="it@resolvehub.com",
            is_active=True,
        )
        db.add(dept)
        db.commit()
        db.refresh(dept)

    created_cats = 0
    created_subs = 0

    for cat_name, cat_info in TAXONOMY_DATA.items():
        cat = db.query(Category).filter(
            Category.name == cat_name,
            Category.department_id == dept.id,
        ).first()

        if not cat:
            cat = Category(
                department_id=dept.id,
                name=cat_name,
                description=cat_info["description"],
                is_active=True,
            )
            db.add(cat)
            db.commit()
            db.refresh(cat)
            created_cats += 1

        for sub_name, sub_desc in cat_info["subcategories"]:
            sub = db.query(Subcategory).filter(
                Subcategory.name == sub_name,
                Subcategory.category_id == cat.id,
            ).first()

            if not sub:
                sub = Subcategory(
                    category_id=cat.id,
                    name=sub_name,
                    description=sub_desc,
                    is_active=True,
                )
                db.add(sub)
                created_subs += 1

    db.commit()
    return {
        "department_id": dept.id,
        "categories_created": created_cats,
        "subcategories_created": created_subs,
    }
