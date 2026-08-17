"""Medications API tests - CRUD, validation, toggle-taken persistence"""
import os
import uuid
import pytest
import requests
from datetime import datetime

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL') or 'https://easy-productivity-1.preview.emergentagent.com'
BASE_URL = BASE_URL.rstrip('/')
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def device_id():
    return f"TEST_dev_{uuid.uuid4().hex[:12]}"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def created_ids():
    return []


# --- Basic health ---
def test_list_empty_for_new_device(client, device_id):
    r = client.get(f"{API}/medications", params={"device_id": device_id})
    assert r.status_code == 200
    data = r.json()
    assert "medications" in data
    assert data["medications"] == []


# --- Create ---
def test_create_medication_success(client, device_id, created_ids):
    payload = {
        "device_id": device_id,
        "name": "TEST_Metformin",
        "dosage": "500 mg",
        "times": ["08:00", "20:00"],
        "days": [0, 1, 2, 3, 4, 5, 6],
        "notes": "Take with food",
        "color": "#64B5F6",
    }
    r = client.post(f"{API}/medications", json=payload)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["name"] == "TEST_Metformin"
    assert body["dosage"] == "500 mg"
    assert body["times"] == ["08:00", "20:00"]
    assert body["days"] == [0, 1, 2, 3, 4, 5, 6]
    assert body["color"] == "#64B5F6"
    assert body["taken_times"] == []
    assert "id" in body
    assert "_id" not in body
    created_ids.append(body["id"])


def test_create_persisted_visible_in_list(client, device_id, created_ids):
    r = client.get(f"{API}/medications", params={"device_id": device_id, "date": datetime.utcnow().strftime("%Y-%m-%d")})
    assert r.status_code == 200
    meds = r.json()["medications"]
    ids = [m["id"] for m in meds]
    assert created_ids[0] in ids
    m = [x for x in meds if x["id"] == created_ids[0]][0]
    assert "_id" not in m
    assert m["taken_times"] == []


# --- Validation ---
def test_create_missing_name_returns_422(client, device_id):
    r = client.post(f"{API}/medications", json={
        "device_id": device_id, "name": "", "times": ["08:00"], "days": [0]
    })
    assert r.status_code == 422


def test_create_missing_times_returns_422(client, device_id):
    r = client.post(f"{API}/medications", json={
        "device_id": device_id, "name": "TEST_x", "times": [], "days": [0]
    })
    assert r.status_code == 422


def test_create_missing_days_returns_422(client, device_id):
    r = client.post(f"{API}/medications", json={
        "device_id": device_id, "name": "TEST_x", "times": ["08:00"], "days": []
    })
    assert r.status_code == 422


def test_create_missing_device_id_returns_422(client):
    r = client.post(f"{API}/medications", json={
        "name": "TEST_x", "times": ["08:00"], "days": [0]
    })
    assert r.status_code == 422


# --- Update ---
def test_update_medication(client, created_ids):
    med_id = created_ids[0]
    update = {
        "name": "TEST_Metformin_Updated",
        "dosage": "1000 mg",
        "times": ["09:00"],
        "days": [1, 3, 5],
        "notes": "Updated notes",
        "color": "#81C784",
    }
    r = client.put(f"{API}/medications/{med_id}", json=update)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["name"] == "TEST_Metformin_Updated"
    assert body["times"] == ["09:00"]
    assert body["days"] == [1, 3, 5]


def test_update_not_found(client):
    r = client.put(f"{API}/medications/nonexistent-id", json={
        "name": "x", "times": ["08:00"], "days": [0]
    })
    assert r.status_code == 404


# --- Toggle Taken ---
def test_toggle_taken_marks_taken(client, device_id, created_ids):
    med_id = created_ids[0]
    today = datetime.utcnow().strftime("%Y-%m-%d")
    r = client.post(f"{API}/medications/{med_id}/toggle-taken", json={
        "device_id": device_id, "date": today, "time": "09:00"
    })
    assert r.status_code == 200
    assert r.json()["taken"] is True

    # Verify persisted
    r2 = client.get(f"{API}/medications", params={"device_id": device_id, "date": today})
    assert r2.status_code == 200
    meds = r2.json()["medications"]
    m = [x for x in meds if x["id"] == med_id][0]
    assert "09:00" in m["taken_times"]


def test_toggle_taken_untakes(client, device_id, created_ids):
    med_id = created_ids[0]
    today = datetime.utcnow().strftime("%Y-%m-%d")
    r = client.post(f"{API}/medications/{med_id}/toggle-taken", json={
        "device_id": device_id, "date": today, "time": "09:00"
    })
    assert r.status_code == 200
    assert r.json()["taken"] is False

    r2 = client.get(f"{API}/medications", params={"device_id": device_id, "date": today})
    m = [x for x in r2.json()["medications"] if x["id"] == med_id][0]
    assert "09:00" not in m["taken_times"]


def test_toggle_taken_med_not_found(client, device_id):
    r = client.post(f"{API}/medications/nonexistent-id/toggle-taken", json={
        "device_id": device_id, "date": "2026-01-01", "time": "08:00"
    })
    assert r.status_code == 404


# --- Delete ---
def test_delete_medication(client, device_id, created_ids):
    med_id = created_ids[0]
    r = client.delete(f"{API}/medications/{med_id}")
    assert r.status_code == 200
    assert r.json()["success"] is True

    # Verify gone
    r2 = client.get(f"{API}/medications", params={"device_id": device_id})
    ids = [m["id"] for m in r2.json()["medications"]]
    assert med_id not in ids


def test_delete_not_found(client):
    r = client.delete(f"{API}/medications/nonexistent-id")
    assert r.status_code == 404


# --- Cleanup any strays for this device ---
def test_cleanup(client, device_id):
    r = client.get(f"{API}/medications", params={"device_id": device_id})
    for m in r.json().get("medications", []):
        client.delete(f"{API}/medications/{m['id']}")
