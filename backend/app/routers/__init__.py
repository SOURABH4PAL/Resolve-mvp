from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.tickets import router as tickets_router
from app.routers.comments import router as comments_router
from app.routers.attachments import router as attachments_router
from app.routers.departments import router as departments_router
from app.routers.categories import router as categories_router
from app.routers.subcategories import router as subcategories_router
from app.routers.notifications import router as notifications_router

__all__ = [
    "auth_router",
    "users_router",
    "tickets_router",
    "comments_router",
    "attachments_router",
    "departments_router",
    "categories_router",
    "subcategories_router",
    "notifications_router",
]
