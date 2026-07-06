import os
import sys
import tempfile
import sqlite3

# Create a temporary file for the SQLite database
temp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
temp_db_path = temp_db.name
temp_db.close()  # Close the handle so sqlite3 can open it

os.environ["DB_PATH"] = temp_db_path

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import pytest
from fastapi.testclient import TestClient
from server import app, init_db


@pytest.fixture(scope="module", autouse=True)
def setup_database():
    # Initialize the database table
    init_db()
    yield
    # Clean up the database file after all tests
    if os.path.exists(temp_db_path):
        os.unlink(temp_db_path)


@pytest.fixture
def client():
    # Clear the database table before each test to ensure test isolation
    conn = sqlite3.connect(temp_db_path)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM status_checks")
    conn.commit()
    conn.close()
    
    return TestClient(app)


def test_root(client):
    response = client.get("/api/")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello World"}


def test_create_status_check(client):
    payload = {"client_name": "Test Client"}
    response = client.post("/api/status", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["client_name"] == "Test Client"
    assert "timestamp" in data


def test_get_status_checks(client):
    # Create two checks via the API
    client.post("/api/status", json={"client_name": "Client A"})
    client.post("/api/status", json={"client_name": "Client B"})

    # Fetch them back
    response = client.get("/api/status")
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["client_name"] == "Client A"
    assert data[1]["client_name"] == "Client B"
