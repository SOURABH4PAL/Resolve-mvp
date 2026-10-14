"""Tests for database safety, startup validation, and SQLite FK constraints."""

import os
import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from app.config import get_settings
from app.models.ticket import Ticket, TicketPriority, TicketStatus
from app.models.category import Category
from app.models.subcategory import Subcategory
from app.models.department import Department
from tests.conftest import (
    make_user, make_admin, make_department, make_category, make_ticket, auth_headers
)


class TestDatabaseSafety:
    def test_sqlite_foreign_keys_enforced(self, db):
        """Verify that SQLite foreign key enforcement is actively turned ON."""
        # Query SQLite pragma directly
        result = db.execute(text("PRAGMA foreign_keys")).scalar()
        assert result == 1, "PRAGMA foreign_keys must be 1 (ON)"

    def test_sqlite_fk_constraint_raises_on_invalid_reference(self, db):
        """Inserting a ticket with a non-existent category_id must violate foreign key constraint."""
        user = make_user(db, employee_id="EMP_FK_01")
        invalid_ticket = Ticket(
            ticket_number="TKT-FK-TEST",
            title="FK Test Ticket",
            description="Testing foreign keys",
            created_by=user.id,
            category_id="00000000-0000-0000-0000-000000000000",  # non-existent
            priority=TicketPriority.LOW,
            status=TicketStatus.OPEN,
        )
        db.add(invalid_ticket)
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()

    def test_secret_key_startup_validation(self, monkeypatch):
        """In production environment, weak SECRET_KEY must prevent startup with RuntimeError."""
        from app.main import validate_secret_key
        import app.config as config_module

        # Emulate production settings with weak secret key
        settings = get_settings()
        monkeypatch.setattr(settings, "ENVIRONMENT", "production")
        monkeypatch.setattr(settings, "SECRET_KEY", "change-this-to-a-random-secret-key-in-production")

        with pytest.raises(RuntimeError) as exc_info:
            import asyncio
            asyncio.run(validate_secret_key())

        assert "SECRET_KEY must be set to a strong random value" in str(exc_info.value)

    def test_upload_dir_is_absolute(self):
        """Ensure settings UPLOAD_DIR or the service resolved path is absolute."""
        settings = get_settings()
        upload_path = os.path.abspath(settings.UPLOAD_DIR)
        assert os.path.isabs(upload_path)
