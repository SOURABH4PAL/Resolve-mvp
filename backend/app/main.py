import os
import logging
from fastapi import FastAPI, Request, status, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.config import get_settings
from app.routers import (
    auth_router,
    users_router,
    tickets_router,
    comments_router,
    attachments_router,
    departments_router,
    categories_router,
    subcategories_router,
    notifications_router,
)
from app.database import engine, init_db_schema

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("resolvehub")

settings = get_settings()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)


@app.on_event("startup")
async def validate_secret_key() -> None:
    """Initialize DB schema and validate secret key."""
    init_db_schema()

    weak_defaults = {
        "change-this-to-a-random-secret-key-in-production",
        "secret",
        "supersecret",
        "",
    }
    if settings.ENVIRONMENT != "development" and settings.SECRET_KEY in weak_defaults:
        raise RuntimeError(
            "SECRET_KEY must be set to a strong random value in non-development environments. "
            "Set the SECRET_KEY environment variable before starting the server."
        )
    if settings.SECRET_KEY in weak_defaults:
        logger.warning(
            "WARNING: Using a weak default SECRET_KEY. "
            "This is only acceptable in development. Set SECRET_KEY in production."
        )


# CORS Middleware (environment-driven, explicit origins without wildcard)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Centralized Exception Handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Uniform error response for HTTP exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "status_code": exc.status_code,
        },
        headers=getattr(exc, "headers", None) or None,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Uniform error response for request validation failures."""
    formatted_errors = []
    for error in exc.errors():
        loc = " -> ".join(str(l) for l in error.get("loc", []))
        formatted_errors.append({
            "field": loc,
            "message": error.get("msg", "Invalid value"),
            "type": error.get("type", "value_error"),
        })
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Request validation failed",
            "status_code": status.HTTP_422_UNPROCESSABLE_ENTITY,
            "errors": formatted_errors,
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Catch-all error handler for unexpected 500 internal server errors."""
    logger.error(f"Unexpected server error on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Internal server error",
            "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
        },
    )


# Database-aware Health Check
def perform_health_check():
    db_status = "connected"
    is_healthy = True
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        logger.error(f"Health-check database ping failed: {exc}")
        db_status = "disconnected"
        is_healthy = False

    payload = {
        "status": "healthy" if is_healthy else "unhealthy",
        "database": db_status,
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
    }
    status_code = status.HTTP_200_OK if is_healthy else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(status_code=status_code, content=payload)


@app.get("/health", tags=["Health"])
def health():
    """Root health-check endpoint verifying service and database status."""
    return perform_health_check()


@app.get(f"{settings.API_PREFIX}/health", tags=["Health"])
def api_health():
    """API health-check endpoint verifying service and database status."""
    return perform_health_check()


# Include API Routers
app.include_router(auth_router, prefix=settings.API_PREFIX)
app.include_router(users_router, prefix=settings.API_PREFIX)
app.include_router(tickets_router, prefix=settings.API_PREFIX)
app.include_router(comments_router, prefix=settings.API_PREFIX)
app.include_router(attachments_router, prefix=settings.API_PREFIX)
app.include_router(departments_router, prefix=settings.API_PREFIX)
app.include_router(categories_router, prefix=settings.API_PREFIX)
app.include_router(subcategories_router, prefix=settings.API_PREFIX)
app.include_router(notifications_router, prefix=settings.API_PREFIX)

# Create Upload Directory
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

# Mount Frontend static directory
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend"))

if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
else:
    @app.get("/")
    def root():
        return {
            "name": settings.PROJECT_NAME,
            "status": "online",
            "docs": "/docs"
        }
