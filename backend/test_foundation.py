import os
import sys
from unittest.mock import patch
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.main import app
from app.config import get_settings

client = TestClient(app, raise_server_exceptions=False)
settings = get_settings()


def test_health_endpoints():
    print("--- Testing /health ---")
    res1 = client.get("/health")
    assert res1.status_code == 200, f"Expected 200, got {res1.status_code}: {res1.text}"
    data1 = res1.json()
    assert data1["status"] == "healthy"
    assert data1["database"] == "connected"
    assert "version" in data1
    assert "environment" in data1
    print(f"Root /health OK: {data1}")

    print("\n--- Testing /api/health ---")
    res2 = client.get("/api/health")
    assert res2.status_code == 200, f"Expected 200, got {res2.status_code}: {res2.text}"
    data2 = res2.json()
    assert data2["status"] == "healthy"
    assert data2["database"] == "connected"
    print(f"API /api/health OK: {data2}")


def test_cors_configuration():
    print("\n--- Testing CORS Configuration ---")
    # Allowed origin
    allowed_origin = "http://localhost:3000"
    res = client.get("/health", headers={"Origin": allowed_origin})
    assert res.status_code == 200
    assert res.headers.get("access-control-allow-origin") == allowed_origin
    assert res.headers.get("access-control-allow-credentials") == "true"
    print(f"Allowed origin '{allowed_origin}' correctly handled.")

    # Preflight OPTIONS request
    opt_res = client.options("/health", headers={
        "Origin": allowed_origin,
        "Access-Control-Request-Method": "GET"
    })
    assert opt_res.status_code == 200
    assert opt_res.headers.get("access-control-allow-origin") == allowed_origin
    print("Preflight OPTIONS correctly answered.")

    # Disallowed origin (should not return access-control-allow-origin)
    disallowed = "http://malicious-site.com"
    dis_res = client.get("/health", headers={"Origin": disallowed})
    assert dis_res.headers.get("access-control-allow-origin") is None
    print(f"Disallowed origin '{disallowed}' correctly rejected.")


def test_error_handling_http_exception():
    print("\n--- Testing HTTPException Handler ---")
    # 401 Unauthorized (missing token on protected endpoint)
    res_401 = client.get("/api/users/me")
    assert res_401.status_code == 401
    data_401 = res_401.json()
    assert "detail" in data_401
    assert data_401["status_code"] == 401
    print(f"HTTPException 401 returned uniform schema: {data_401}")


def test_error_handling_validation_error():
    print("\n--- Testing RequestValidationError Handler ---")
    # 422 Validation Error (missing required fields in login)
    res_422 = client.post("/api/auth/login", json={"invalid_field": 123})
    assert res_422.status_code == 422
    data_422 = res_422.json()
    assert data_422["detail"] == "Request validation failed"
    assert data_422["status_code"] == 422
    assert "errors" in data_422
    assert len(data_422["errors"]) > 0
    print(f"RequestValidationError 422 returned uniform schema with {len(data_422['errors'])} errors.")


def test_error_handling_500():
    print("\n--- Testing 500 Unhandled Exception Handler ---")
    # Mock database ping failure in perform_health_check or an endpoint
    with patch("app.main.perform_health_check", side_effect=RuntimeError("Simulated critical failure")):
        res_500 = client.get("/health")
        assert res_500.status_code == 500
        data_500 = res_500.json()
        assert data_500["detail"] == "Internal server error"
        assert data_500["status_code"] == 500
        print(f"500 Internal error caught cleanly: {data_500}")


def run_all_foundation_tests():
    test_health_endpoints()
    test_cors_configuration()
    test_error_handling_http_exception()
    test_error_handling_validation_error()
    test_error_handling_500()
    print("\n=== ALL BACKEND FOUNDATION TESTS PASSED PERFECTLY! ===")


if __name__ == "__main__":
    run_all_foundation_tests()
