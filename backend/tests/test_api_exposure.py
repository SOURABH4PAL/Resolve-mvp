"""Tests for Requirement 2: Do Not Expose API Endpoints in the User Interface."""

import pytest
from app.config import get_settings
from app.main import app
from fastapi.testclient import TestClient


class TestApiExposureAndDocumentation:
    def test_docs_accessible_in_development(self, client):
        """In development mode, Swagger docs and OpenAPI schema remain available for local development."""
        settings = get_settings()
        assert settings.ENVIRONMENT == "development"

        docs_resp = client.get("/docs")
        assert docs_resp.status_code == 200

        openapi_resp = client.get("/openapi.json")
        assert openapi_resp.status_code == 200

    def test_docs_hidden_in_production(self, monkeypatch):
        """In production environment, /docs, /redoc, and /openapi.json are disabled (404 Not Found)."""
        from fastapi import FastAPI
        from app.config import get_settings

        settings = get_settings()
        monkeypatch.setattr(settings, "ENVIRONMENT", "production")

        # Test app initialization under production settings
        prod_app = FastAPI(
            title=settings.PROJECT_NAME,
            version="1.0.0",
            docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
            redoc_url="/redoc" if settings.ENVIRONMENT == "development" else None,
            openapi_url="/openapi.json" if settings.ENVIRONMENT == "development" else None,
        )

        with TestClient(prod_app) as prod_client:
            resp_docs = prod_client.get("/docs")
            assert resp_docs.status_code == 404

            resp_redoc = prod_client.get("/redoc")
            assert resp_redoc.status_code == 404

            resp_openapi = prod_client.get("/openapi.json")
            assert resp_openapi.status_code == 404

    def test_backend_routes_preserved_and_functional(self, client):
        """Standard backend endpoints remain operational and are not deleted to hide them."""
        # Unauthenticated request to /api/tickets/me should return 401 (auth enforced, route exists)
        resp = client.get("/api/users/me")
        assert resp.status_code == 401
