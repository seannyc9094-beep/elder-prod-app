"""Backend Auth API quick re-verify tests.
Covers: register, login (good/bad), me, forgot-password (email send).
Does NOT test full reset-password (requires the 6-digit code from actual email).
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://easy-productivity-1.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

EXISTING_EMAIL = "testsenior@example.com"
EXISTING_PASSWORD = "newpass123"


@pytest.fixture(scope="module")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---- health ----
def test_root(api_client):
    r = api_client.get(f"{API}/")
    assert r.status_code == 200
    assert "message" in r.json()


# ---- register ----
class TestRegister:
    def test_register_success(self, api_client):
        email = f"TEST_uitest_{int(time.time())}@example.com"
        r = api_client.post(f"{API}/auth/register", json={
            "name": "TEST User", "email": email, "password": "test123"
        })
        assert r.status_code == 201, r.text
        data = r.json()
        assert "access_token" in data and "user" in data
        assert data["user"]["email"] == email.lower()
        assert data["user"]["name"] == "TEST User"
        assert "id" in data["user"]

    def test_register_duplicate_email_409(self, api_client):
        r = api_client.post(f"{API}/auth/register", json={
            "name": "Dup", "email": EXISTING_EMAIL, "password": "test123"
        })
        assert r.status_code == 409

    def test_register_short_password_422(self, api_client):
        r = api_client.post(f"{API}/auth/register", json={
            "name": "Short", "email": f"TEST_short_{int(time.time())}@example.com", "password": "abc"
        })
        assert r.status_code == 422


# ---- login ----
class TestLogin:
    def test_login_success(self, api_client):
        r = api_client.post(f"{API}/auth/login", json={
            "email": EXISTING_EMAIL, "password": EXISTING_PASSWORD
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert "access_token" in data
        assert data["user"]["email"] == EXISTING_EMAIL

    def test_login_wrong_password_401(self, api_client):
        r = api_client.post(f"{API}/auth/login", json={
            "email": EXISTING_EMAIL, "password": "wrongpass123"
        })
        assert r.status_code == 401
        assert "Incorrect email or password" in r.json().get("detail", "")

    def test_login_unknown_email_401(self, api_client):
        r = api_client.post(f"{API}/auth/login", json={
            "email": "nosuch_TEST@example.com", "password": "test123"
        })
        assert r.status_code == 401


# ---- me ----
class TestMe:
    def test_me_with_valid_token(self, api_client):
        login = api_client.post(f"{API}/auth/login", json={
            "email": EXISTING_EMAIL, "password": EXISTING_PASSWORD
        })
        token = login.json()["access_token"]
        r = api_client.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        body = r.json()
        assert body["email"] == EXISTING_EMAIL
        assert "id" in body and "name" in body

    def test_me_missing_auth_401(self, api_client):
        r = api_client.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_invalid_token_401(self, api_client):
        r = api_client.get(f"{API}/auth/me", headers={"Authorization": "Bearer not.a.jwt"})
        assert r.status_code == 401


# ---- forgot-password ----
class TestForgotPassword:
    def test_forgot_password_known_email_sends(self, api_client):
        # Uses delivered@resend.dev per test_credentials.md so we don't leak real emails
        r = api_client.post(f"{API}/auth/forgot-password", json={"email": "delivered@resend.dev"})
        assert r.status_code == 200, r.text
        assert "message" in r.json()

    def test_forgot_password_unknown_email_still_200(self, api_client):
        # Endpoint should not leak existence -> returns generic 200
        r = api_client.post(f"{API}/auth/forgot-password", json={"email": "TEST_unknown@example.com"})
        assert r.status_code == 200

    def test_reset_password_invalid_code_400(self, api_client):
        r = api_client.post(f"{API}/auth/reset-password", json={
            "email": EXISTING_EMAIL, "code": "000000", "new_password": "newpass123"
        })
        assert r.status_code == 400
