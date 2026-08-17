"""Emergency Contacts & SOS Alert API tests - CRUD, validation, alert flow"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL') or 'https://easy-productivity-1.preview.emergentagent.com'
BASE_URL = BASE_URL.rstrip('/')
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def device_id():
    return f"TEST_sos_{uuid.uuid4().hex[:10]}"


@pytest.fixture(scope="module")
def empty_device_id():
    return f"TEST_empty_{uuid.uuid4().hex[:10]}"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def state():
    # shared across tests to track ids
    return {"ids": []}


# --- Cleanup fixture ---
@pytest.fixture(scope="module", autouse=True)
def _cleanup(client, device_id, empty_device_id, state):
    yield
    try:
        r = client.get(f"{API}/emergency/contacts", params={"device_id": device_id})
        if r.ok:
            for c in r.json().get("contacts", []):
                client.delete(f"{API}/emergency/contacts/{c['id']}")
    except Exception:
        pass


# --- Create contacts ---
class TestCreateContacts:
    def test_create_contact_priority_0(self, client, device_id, state):
        payload = {
            "device_id": device_id,
            "name": "Sarah Thompson",
            "relationship": "Daughter",
            "phone": "+1 416 555 0199",
            "priority": 0,
        }
        r = client.post(f"{API}/emergency/contacts", json=payload)
        assert r.status_code == 201, r.text
        data = r.json()
        assert "id" in data and data["id"]
        assert "created_at" in data
        assert data["name"] == payload["name"]
        assert data["phone"] == payload["phone"]
        assert data["relationship"] == payload["relationship"]
        assert data["priority"] == 0
        assert data["device_id"] == device_id
        assert "_id" not in data
        state["ids"].append(data["id"])
        state["contact_0"] = data

    def test_create_contact_priority_1(self, client, device_id, state):
        payload = {
            "device_id": device_id,
            "name": "John Smith",
            "relationship": "Son",
            "phone": "+1 416 555 0200",
            "priority": 1,
        }
        r = client.post(f"{API}/emergency/contacts", json=payload)
        assert r.status_code == 201, r.text
        data = r.json()
        assert data["priority"] == 1
        state["ids"].append(data["id"])
        state["contact_1"] = data

    def test_create_contact_priority_2(self, client, device_id, state):
        payload = {
            "device_id": device_id,
            "name": "Emily Rose",
            "relationship": "Neighbor",
            "phone": "+1 416 555 0201",
            "priority": 2,
        }
        r = client.post(f"{API}/emergency/contacts", json=payload)
        assert r.status_code == 201, r.text
        data = r.json()
        assert data["priority"] == 2
        state["ids"].append(data["id"])
        state["contact_2"] = data


# --- Get list ---
class TestListContacts:
    def test_get_returns_all_sorted(self, client, device_id, state):
        r = client.get(f"{API}/emergency/contacts", params={"device_id": device_id})
        assert r.status_code == 200
        data = r.json()
        assert "contacts" in data
        contacts = data["contacts"]
        assert len(contacts) == 3
        priorities = [c["priority"] for c in contacts]
        assert priorities == sorted(priorities), f"Not sorted asc: {priorities}"
        assert priorities == [0, 1, 2]
        # No mongo _id
        for c in contacts:
            assert "_id" not in c


# --- Update ---
class TestUpdateContact:
    def test_update_first_contact(self, client, state):
        cid = state["contact_0"]["id"]
        payload = {
            "name": "Sarah Thompson-Lee",
            "relationship": "Daughter",
            "phone": "+1 416 555 0250",
            "priority": 5,
        }
        r = client.put(f"{API}/emergency/contacts/{cid}", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["name"] == "Sarah Thompson-Lee"
        assert data["phone"] == "+1 416 555 0250"
        assert data["priority"] == 5
        assert data["id"] == cid
        assert "_id" not in data

    def test_update_persists_verified_via_get(self, client, device_id, state):
        r = client.get(f"{API}/emergency/contacts", params={"device_id": device_id})
        assert r.status_code == 200
        found = next((c for c in r.json()["contacts"] if c["id"] == state["contact_0"]["id"]), None)
        assert found is not None
        assert found["name"] == "Sarah Thompson-Lee"
        assert found["priority"] == 5

    def test_update_nonexistent_returns_404(self, client):
        payload = {"name": "Nobody", "relationship": "x", "phone": "000", "priority": 0}
        r = client.put(f"{API}/emergency/contacts/does-not-exist-{uuid.uuid4().hex}", json=payload)
        assert r.status_code == 404


# --- Delete ---
class TestDeleteContact:
    def test_delete_contact(self, client, state):
        # Delete the priority=2 contact
        cid = state["contact_2"]["id"]
        r = client.delete(f"{API}/emergency/contacts/{cid}")
        assert r.status_code == 200
        assert r.json() == {"success": True}
        state["deleted_id"] = cid

    def test_deleted_not_in_get(self, client, device_id, state):
        r = client.get(f"{API}/emergency/contacts", params={"device_id": device_id})
        ids = [c["id"] for c in r.json()["contacts"]]
        assert state["deleted_id"] not in ids
        assert len(ids) == 2

    def test_delete_nonexistent_returns_404(self, client):
        r = client.delete(f"{API}/emergency/contacts/nope-{uuid.uuid4().hex}")
        assert r.status_code == 404


# --- Alert ---
class TestEmergencyAlert:
    def test_alert_returns_top_contact(self, client, device_id, state):
        # Remaining contacts: contact_0 (priority 5 after update), contact_1 (priority 1)
        # Lowest priority number = contact_1 (priority 1) should be top_contact
        payload = {
            "device_id": device_id,
            "message": "SOS triggered from Emergency dashboard",
            "contact_id": state["contact_1"]["id"],
            "triggered_from": "sos_button",
        }
        r = client.post(f"{API}/emergency/alert", json=payload)
        assert r.status_code == 201, r.text
        data = r.json()
        assert "alert" in data and "top_contact" in data
        alert = data["alert"]
        assert alert["device_id"] == device_id
        assert alert["message"] == payload["message"]
        assert alert["triggered_from"] == "sos_button"
        assert alert["contact_id"] == state["contact_1"]["id"]
        assert "id" in alert
        assert "_id" not in alert

        top = data["top_contact"]
        assert top is not None
        assert top["id"] == state["contact_1"]["id"], f"Expected priority 1 contact, got priority {top.get('priority')}"
        assert top["priority"] == 1

    def test_alert_with_lat_long(self, client, device_id):
        payload = {
            "device_id": device_id,
            "latitude": 43.6532,
            "longitude": -79.3832,
        }
        r = client.post(f"{API}/emergency/alert", json=payload)
        assert r.status_code == 201, r.text
        data = r.json()
        assert data["alert"]["latitude"] == 43.6532
        assert data["alert"]["longitude"] == -79.3832
        # triggered_from defaults to sos_button
        assert data["alert"]["triggered_from"] == "sos_button"

    def test_alert_with_no_contacts_returns_null_top(self, client, empty_device_id):
        payload = {"device_id": empty_device_id, "message": "no contacts"}
        r = client.post(f"{API}/emergency/alert", json=payload)
        assert r.status_code == 201, r.text
        data = r.json()
        assert data["top_contact"] is None


# --- Validation ---
class TestValidation:
    def test_create_contact_missing_name_422(self, client, device_id):
        payload = {"device_id": device_id, "relationship": "x", "phone": "+1", "priority": 0}
        r = client.post(f"{API}/emergency/contacts", json=payload)
        assert r.status_code == 422

    def test_create_contact_empty_name_422(self, client, device_id):
        payload = {"device_id": device_id, "name": "", "phone": "+1"}
        r = client.post(f"{API}/emergency/contacts", json=payload)
        assert r.status_code == 422

    def test_alert_missing_device_id_422(self, client):
        r = client.post(f"{API}/emergency/alert", json={"message": "no device"})
        assert r.status_code == 422
