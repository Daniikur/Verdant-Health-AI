"""Backend tests for Verdant Health API."""
import os
import json
import time
import uuid
import requests
import pytest
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

PATIENT = {"email": "patient@verdant.health", "password": "patient123"}
DOCTOR = {"email": "amara@verdant.health", "password": "doctor123"}
ADMIN = {"email": "admin@verdant.health", "password": "admin123"}


# --------------- Shared session/state ---------------
state: dict = {}


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=30)
    assert r.status_code == 200, f"login failed {creds['email']}: {r.status_code} {r.text}"
    return r.json()


@pytest.fixture(scope="module", autouse=True)
def bootstrap():
    # ensure seeded
    requests.post(f"{API}/seed", timeout=30)
    p = _login(PATIENT)
    d = _login(DOCTOR)
    a = _login(ADMIN)
    state["patient_token"] = p["token"]
    state["patient_user"] = p["user"]
    state["doctor_token"] = d["token"]
    state["doctor_user"] = d["user"]
    state["admin_token"] = a["token"]
    state["admin_user"] = a["user"]
    yield


def H(tok):
    return {"Authorization": f"Bearer {tok}"}


# ============== AUTH ==============
class TestAuth:
    def test_login_patient(self):
        assert state["patient_user"]["email"] == PATIENT["email"]
        assert state["patient_user"]["role"] == "patient"
        assert len(state["patient_token"]) > 20

    def test_me_with_token(self):
        r = requests.get(f"{API}/auth/me", headers=H(state["patient_token"]))
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == PATIENT["email"]
        assert data["role"] == "patient"

    def test_me_unauthenticated_returns_401(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_register_new_patient(self):
        email = f"test_{uuid.uuid4().hex[:8]}@verdant.health"
        r = requests.post(f"{API}/auth/register", json={
            "name": "TEST New Patient", "email": email, "password": "Pass1234", "role": "patient"
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert "token" in data and len(data["token"]) > 20
        assert data["user"]["email"] == email
        assert data["user"]["role"] == "patient"
        # verify /me works with new token
        r2 = requests.get(f"{API}/auth/me", headers=H(data["token"]))
        assert r2.status_code == 200 and r2.json()["email"] == email


# ============== DOCTORS ==============
class TestDoctors:
    def test_list_doctors_returns_six(self):
        r = requests.get(f"{API}/doctors")
        assert r.status_code == 200
        docs = r.json()
        assert isinstance(docs, list)
        assert len(docs) >= 6, f"expected 6, got {len(docs)}"
        state["doctors"] = docs

    def test_filter_doctors_by_specialty(self):
        r = requests.get(f"{API}/doctors", params={"specialty": "Cardiology"})
        assert r.status_code == 200
        docs = r.json()
        assert len(docs) >= 1
        for d in docs:
            assert d["specialty"] == "Cardiology"

    def test_get_doctor_by_id(self):
        did = state["doctors"][0]["id"]
        r = requests.get(f"{API}/doctors/{did}")
        assert r.status_code == 200
        assert r.json()["id"] == did


# ============== APPOINTMENTS ==============
class TestAppointments:
    def test_create_appointment_video(self):
        # pick first doctor with slots
        doc = next((d for d in state["doctors"] if d.get("available_slots")), state["doctors"][0])
        slot = doc["available_slots"][0]
        r = requests.post(f"{API}/appointments",
                          headers=H(state["patient_token"]),
                          json={"doctor_id": doc["id"], "appointment_date": slot,
                                "reason": "TEST chest pain", "mode": "video"})
        assert r.status_code == 200, r.text
        appt = r.json()
        assert appt["status"] == "scheduled"
        assert appt["mode"] == "video"
        assert appt["video_link"].startswith("https://meet.jit.si/")
        assert appt["doctor_id"] == doc["id"]
        state["appt_id"] = appt["id"]
        state["doctor_for_appt"] = doc

    def test_list_appointments_for_patient(self):
        r = requests.get(f"{API}/appointments", headers=H(state["patient_token"]))
        assert r.status_code == 200
        ids = [a["id"] for a in r.json()]
        assert state["appt_id"] in ids

    def test_patch_appointment_completed(self):
        r = requests.patch(f"{API}/appointments/{state['appt_id']}",
                           headers=H(state["patient_token"]),
                           json={"status": "completed"})
        assert r.status_code == 200
        assert r.json()["status"] == "completed"

    def test_delete_cancels_appointment(self):
        r = requests.delete(f"{API}/appointments/{state['appt_id']}",
                            headers=H(state["patient_token"]))
        assert r.status_code == 200
        r2 = requests.get(f"{API}/appointments/{state['appt_id']}",
                          headers=H(state["patient_token"]))
        assert r2.status_code == 200
        assert r2.json()["status"] == "cancelled"


# ============== MEDICAL RECORDS ==============
class TestMedicalRecords:
    def test_create_medical_record_as_patient(self):
        r = requests.post(f"{API}/medical-records",
                          headers=H(state["patient_token"]),
                          json={"patient_id": state["patient_user"]["id"],
                                "title": "TEST Annual Checkup",
                                "diagnosis": "Healthy", "notes": "Routine"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["title"] == "TEST Annual Checkup"
        assert data["patient_id"] == state["patient_user"]["id"]
        state["rec_id"] = data["id"]

    def test_list_medical_records(self):
        r = requests.get(f"{API}/medical-records", headers=H(state["patient_token"]))
        assert r.status_code == 200
        ids = [x["id"] for x in r.json()]
        assert state["rec_id"] in ids


# ============== PRESCRIPTIONS / RBAC ==============
class TestPrescriptions:
    def test_patient_cannot_create_prescription(self):
        r = requests.post(f"{API}/prescriptions",
                          headers=H(state["patient_token"]),
                          json={"patient_id": state["patient_user"]["id"],
                                "medications": [{"name": "Test", "dosage": "1mg",
                                                 "frequency": "qd", "duration": "5d"}],
                                "instructions": "n/a", "diagnosis": "n/a"})
        assert r.status_code == 403

    def test_doctor_creates_prescription(self):
        r = requests.post(f"{API}/prescriptions",
                          headers=H(state["doctor_token"]),
                          json={"patient_id": state["patient_user"]["id"],
                                "medications": [{"name": "Aspirin", "dosage": "100mg",
                                                 "frequency": "qd", "duration": "30d"}],
                                "instructions": "After meals", "diagnosis": "TEST hypertension"})
        assert r.status_code == 200, r.text
        rx = r.json()
        assert rx["patient_id"] == state["patient_user"]["id"]
        assert len(rx["medications"]) == 1
        state["rx_id"] = rx["id"]

    def test_doctor_lists_prescriptions(self):
        r = requests.get(f"{API}/prescriptions", headers=H(state["doctor_token"]))
        assert r.status_code == 200
        ids = [x["id"] for x in r.json()]
        assert state["rx_id"] in ids


# ============== NOTIFICATIONS ==============
class TestNotifications:
    def test_patient_notifications(self):
        # Booking earlier should have created notifications
        r = requests.get(f"{API}/notifications", headers=H(state["patient_token"]))
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        # Should have at least 1 notification from the booking flow
        assert any(n.get("type") == "appointment" for n in items) or len(items) >= 1


# ============== ADMIN ==============
class TestAdmin:
    def test_admin_stats(self):
        r = requests.get(f"{API}/admin/stats", headers=H(state["admin_token"]))
        assert r.status_code == 200
        data = r.json()
        for k in ["total_users", "total_doctors", "total_appointments",
                  "total_prescriptions", "total_records"]:
            assert k in data and isinstance(data[k], int)
        assert data["total_doctors"] >= 6

    def test_admin_users_list(self):
        r = requests.get(f"{API}/admin/users", headers=H(state["admin_token"]))
        assert r.status_code == 200
        users = r.json()
        assert isinstance(users, list) and len(users) >= 8

    def test_admin_activity_7days(self):
        r = requests.get(f"{API}/admin/activity", headers=H(state["admin_token"]))
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list) and len(arr) == 7
        for d in arr:
            assert "date" in d and "appointments" in d and "registrations" in d

    def test_non_admin_forbidden(self):
        r = requests.get(f"{API}/admin/stats", headers=H(state["patient_token"]))
        assert r.status_code == 403


# ============== AI ==============
class TestAI:
    def test_symptom_checker(self):
        r = requests.post(f"{API}/ai/symptom-checker",
                          headers=H(state["patient_token"]),
                          json={"symptoms": "headache, fever, sore throat for 3 days",
                                "age": 30, "gender": "male", "duration": "3 days"},
                          timeout=120)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data["possible_conditions"], list) and len(data["possible_conditions"]) >= 1
        assert data["risk_level"] in {"low", "moderate", "high", "critical"}
        assert isinstance(data["recommendations"], list) and len(data["recommendations"]) >= 1
        assert isinstance(data["specialist_suggestion"], str) and data["specialist_suggestion"]
        assert isinstance(data["summary"], str) and data["summary"]

    def test_recommend_doctor(self):
        r = requests.post(f"{API}/ai/recommend-doctor",
                          headers=H(state["patient_token"]),
                          json={"concern": "I keep getting chest pain when I climb stairs"},
                          timeout=120)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "recommended_specialty" in data
        assert "reasoning" in data
        assert isinstance(data["doctors"], list) and len(data["doctors"]) >= 1

    def test_summarize_report_claude(self):
        clinical = ("Patient is a 54-year-old male with hypertension and type 2 diabetes. "
                    "Reports increased fatigue, polyuria and blurred vision over past 2 weeks. "
                    "HbA1c 9.2%, BP 152/96. Recommend medication adjustment and dietary review.")
        r = requests.post(f"{API}/ai/summarize-report",
                          headers=H(state["patient_token"]),
                          json={"text": clinical}, timeout=120)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data.get("summary"), str) and len(data["summary"]) > 30

    def test_chat_stream_sse(self):
        session_id = f"test-{uuid.uuid4().hex[:8]}"
        with requests.post(f"{API}/ai/chat/stream",
                           headers=H(state["patient_token"]),
                           json={"session_id": session_id,
                                 "message": "What are common causes of headache?"},
                           stream=True, timeout=120) as r:
            assert r.status_code == 200
            saw_delta = False
            saw_done = False
            for line in r.iter_lines(decode_unicode=True):
                if not line:
                    continue
                if line.startswith("data:"):
                    payload = line[5:].strip()
                    try:
                        obj = json.loads(payload)
                    except Exception:
                        continue
                    if obj.get("done"):
                        saw_done = True
                        break
                    if "delta" in obj:
                        saw_delta = True
            assert saw_delta, "no delta tokens received"
            assert saw_done, "stream did not end with done=true"
        state["chat_session"] = session_id

    def test_chat_history(self):
        # give a moment to persist
        time.sleep(1)
        sid = state.get("chat_session")
        assert sid
        r = requests.get(f"{API}/ai/chat/{sid}/history", headers=H(state["patient_token"]))
        assert r.status_code == 200
        msgs = r.json()
        roles = [m["role"] for m in msgs]
        assert "user" in roles and "assistant" in roles
