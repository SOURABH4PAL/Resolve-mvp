from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.tickets import router as tickets_router
from app.routers.comments import router as comments_router
from app.routers.attachments import router as attachments_router
from app.routers.departments import router as departments_router
from app.routers.categories import router as categories_router
from app.routers.subcategories import router as subcategories_router
from app.routers.reports import router as reports_router
from app.routers.notifications import router as notifications_router
from app.routers.sla_policies import router as sla_policies_router
from app.routers.escalations import router as escalations_router
from app.routers.faqs import router as faqs_router
from app.routers.support_teams import router as support_teams_router
from app.routers.routing_rules import router as routing_rules_router
from app.routers.dashboard import router as dashboard_router

__all__ = [
    "auth_router",
    "users_router",
    "tickets_router",
    "comments_router",
    "attachments_router",
    "departments_router",
    "categories_router",
    "subcategories_router",
    "reports_router",
    "notifications_router",
    "sla_policies_router",
    "escalations_router",
    "faqs_router",
    "support_teams_router",
    "routing_rules_router",
    "dashboard_router",
]
