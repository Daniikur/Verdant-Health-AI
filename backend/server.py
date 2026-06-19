from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import base64
import json
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Literal, Any
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt as pyjwt
import google.generativeai as genai

# Load environment variables first
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ----------- Constants -----------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
JWT_EXPIRY_HOURS = int(os.environ.get("JWT_EXPIRY_HOURS", "168"))
GEMINI_API_KEY = os.environ["GEMINI_API_KEY"]

# Configure Gemini AFTER the key exists
genai.configure(api_key=GEMINI_API_KEY)
gemini_model = genai.GenerativeModel("gemini-2.5-flash")

# ----------- DB -----------
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Verdant Health API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# ============================================================
# MODELS
# ============================================================
RoleType = Literal["patient", "doctor", "admin"]
AppointmentStatus = Literal["scheduled", "completed", "cancelled", "in_progress"]
RiskLevel = Literal["low", "moderate", "high", "critical"]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class UserPublic(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: RoleType
    avatar_url: Optional[str] = None
    created_at: str


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: RoleType = "patient"
    # doctor-only fields (optional)
    specialty: Optional[str] = None
    experience_years: Optional[int] = None
    bio: Optional[str] = None
    consultation_fee: Optional[float] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    token: str
    user: UserPublic


class DoctorProfile(BaseModel):
    id: str
    user_id: str
    name: str
    email: EmailStr
    specialty: str
    experience_years: int
    bio: str
    consultation_fee: float
    rating: float = 4.8
    avatar_url: Optional[str] = None
    available_slots: List[str] = []  # ISO strings


class AppointmentCreate(BaseModel):
    doctor_id: str
    appointment_date: str  # ISO
    reason: str
    mode: Literal["video", "in_person"] = "video"


class Appointment(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    doctor_id: str
    doctor_name: str
    specialty: str
    appointment_date: str
    reason: str
    mode: str
    status: AppointmentStatus
    video_link: Optional[str] = None
    created_at: str


class AppointmentUpdate(BaseModel):
    appointment_date: Optional[str] = None
    status: Optional[AppointmentStatus] = None


class MedicalRecordCreate(BaseModel):
    patient_id: str
    title: str
    diagnosis: str
    notes: Optional[str] = ""
    file_name: Optional[str] = None
    file_data_base64: Optional[str] = None  # raw text/PDF base64 for AI summary


class MedicalRecord(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    doctor_id: Optional[str] = None
    doctor_name: Optional[str] = None
    title: str
    diagnosis: str
    notes: str
    file_name: Optional[str] = None
    file_data_base64: Optional[str] = None
    ai_summary: Optional[str] = None
    created_at: str


class PrescriptionCreate(BaseModel):
    patient_id: str
    appointment_id: Optional[str] = None
    medications: List[dict]  # [{name, dosage, frequency, duration}]
    instructions: str
    diagnosis: str


class Prescription(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    doctor_id: str
    doctor_name: str
    appointment_id: Optional[str] = None
    medications: List[dict]
    instructions: str
    diagnosis: str
    created_at: str


class SymptomCheckRequest(BaseModel):
    symptoms: str
    age: Optional[int] = None
    gender: Optional[str] = None
    duration: Optional[str] = None


class SymptomCheckResult(BaseModel):
    possible_conditions: List[str]
    risk_level: RiskLevel
    recommendations: List[str]
    specialist_suggestion: str
    summary: str


class ChatRequest(BaseModel):
    session_id: str
    message: str


class Notification(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    type: str
    read: bool
    created_at: str


# ============================================================
# Auth helpers
# ============================================================
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def make_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> dict:
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = pyjwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
    except pyjwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_roles(*roles: str):
    async def dep(user: dict = Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return dep


def public_user(u: dict) -> UserPublic:
    return UserPublic(
        id=u["id"], name=u["name"], email=u["email"], role=u["role"],
        avatar_url=u.get("avatar_url"), created_at=u["created_at"]
    )


# ============================================================
# AUTH ROUTES
# ============================================================
@api_router.post("/auth/register", response_model=AuthResponse)
async def register(req: RegisterRequest):
    existing = await db.users.find_one({"email": req.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "name": req.name,
        "email": req.email,
        "password_hash": hash_password(req.password),
        "role": req.role,
        "avatar_url": f"https://api.dicebear.com/7.x/initials/svg?seed={req.name}",
        "created_at": now_iso(),
    }
    await db.users.insert_one(user_doc)

    if req.role == "doctor":
        doc_profile = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "name": req.name,
            "email": req.email,
            "specialty": req.specialty or "General Practice",
            "experience_years": req.experience_years or 1,
            "bio": req.bio or f"Dr. {req.name} - {req.specialty or 'General Practice'} specialist",
            "consultation_fee": req.consultation_fee or 50.0,
            "rating": 4.8,
            "avatar_url": user_doc["avatar_url"],
            "available_slots": _gen_default_slots(),
        }
        await db.doctors.insert_one(doc_profile)

    token = make_token(user_id, req.role)
    return AuthResponse(token=token, user=public_user(user_doc))


@api_router.post("/auth/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    user = await db.users.find_one({"email": req.email}, {"_id": 0})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = make_token(user["id"], user["role"])
    return AuthResponse(token=token, user=public_user(user))


@api_router.get("/auth/me", response_model=UserPublic)
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


# ============================================================
# DOCTORS
# ============================================================
def _gen_default_slots():
    """Generate next 7 days of slots, 4 per day."""
    slots = []
    base = datetime.now(timezone.utc).replace(hour=9, minute=0, second=0, microsecond=0)
    for d in range(1, 8):
        for h in [9, 11, 14, 16]:
            slot = (base + timedelta(days=d)).replace(hour=h)
            slots.append(slot.isoformat())
    return slots


@api_router.get("/doctors", response_model=List[DoctorProfile])
async def list_doctors(specialty: Optional[str] = None, q: Optional[str] = None):
    query = {}
    if specialty and specialty != "all":
        query["specialty"] = specialty
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"specialty": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.doctors.find(query, {"_id": 0}).to_list(200)
    return docs


@api_router.get("/doctors/specialties")
async def list_specialties():
    specialties = await db.doctors.distinct("specialty")
    return {"specialties": specialties}


@api_router.get("/doctors/{doctor_id}", response_model=DoctorProfile)
async def get_doctor(doctor_id: str):
    doc = await db.doctors.find_one({"id": doctor_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Doctor not found")
    return doc


# ============================================================
# APPOINTMENTS
# ============================================================
@api_router.post("/appointments", response_model=Appointment)
async def create_appointment(req: AppointmentCreate, user: dict = Depends(get_current_user)):
    if user["role"] != "patient":
        raise HTTPException(403, "Only patients can book appointments")
    doctor = await db.doctors.find_one({"id": req.doctor_id}, {"_id": 0})
    if not doctor:
        raise HTTPException(404, "Doctor not found")

    appt_id = str(uuid.uuid4())
    video_link = f"https://meet.jit.si/verdant-{appt_id[:12]}" if req.mode == "video" else None
    appt = {
        "id": appt_id,
        "patient_id": user["id"],
        "patient_name": user["name"],
        "doctor_id": req.doctor_id,
        "doctor_name": doctor["name"],
        "specialty": doctor["specialty"],
        "appointment_date": req.appointment_date,
        "reason": req.reason,
        "mode": req.mode,
        "status": "scheduled",
        "video_link": video_link,
        "created_at": now_iso(),
    }
    await db.appointments.insert_one(appt)
    # remove slot from doctor's availability
    await db.doctors.update_one(
        {"id": req.doctor_id},
        {"$pull": {"available_slots": req.appointment_date}}
    )
    # notification
    await _create_notification(user["id"], "Appointment Booked",
                               f"Your appointment with {doctor['name']} is confirmed.", "appointment")
    await _create_notification(doctor["user_id"], "New Appointment",
                               f"You have a new appointment with {user['name']}.", "appointment")
    return appt


@api_router.get("/appointments", response_model=List[Appointment])
async def list_appointments(user: dict = Depends(get_current_user)):
    if user["role"] == "patient":
        query = {"patient_id": user["id"]}
    elif user["role"] == "doctor":
        # find doctor profile
        doc = await db.doctors.find_one({"user_id": user["id"]})
        if not doc:
            return []
        query = {"doctor_id": doc["id"]}
    else:
        query = {}
    appts = await db.appointments.find(query, {"_id": 0}).sort("appointment_date", 1).to_list(500)
    return appts


@api_router.get("/appointments/{appt_id}", response_model=Appointment)
async def get_appointment(appt_id: str, user: dict = Depends(get_current_user)):
    appt = await db.appointments.find_one({"id": appt_id}, {"_id": 0})
    if not appt:
        raise HTTPException(404, "Not found")
    return appt


@api_router.patch("/appointments/{appt_id}", response_model=Appointment)
async def update_appointment(appt_id: str, req: AppointmentUpdate, user: dict = Depends(get_current_user)):
    update_doc = {k: v for k, v in req.model_dump().items() if v is not None}
    if not update_doc:
        raise HTTPException(400, "No fields")
    await db.appointments.update_one({"id": appt_id}, {"$set": update_doc})
    appt = await db.appointments.find_one({"id": appt_id}, {"_id": 0})
    return appt


@api_router.delete("/appointments/{appt_id}")
async def cancel_appointment(appt_id: str, user: dict = Depends(get_current_user)):
    await db.appointments.update_one({"id": appt_id}, {"$set": {"status": "cancelled"}})
    return {"ok": True}


# ============================================================
# MEDICAL RECORDS
# ============================================================
@api_router.post("/medical-records", response_model=MedicalRecord)
async def create_record(req: MedicalRecordCreate, user: dict = Depends(get_current_user)):
    patient = await db.users.find_one({"id": req.patient_id})
    if not patient:
        raise HTTPException(404, "Patient not found")
    doctor_id = None
    doctor_name = None
    if user["role"] == "doctor":
        doc = await db.doctors.find_one({"user_id": user["id"]})
        if doc:
            doctor_id, doctor_name = doc["id"], doc["name"]

    rec = {
        "id": str(uuid.uuid4()),
        "patient_id": req.patient_id,
        "patient_name": patient["name"],
        "doctor_id": doctor_id,
        "doctor_name": doctor_name,
        "title": req.title,
        "diagnosis": req.diagnosis,
        "notes": req.notes or "",
        "file_name": req.file_name,
        "file_data_base64": req.file_data_base64,
        "ai_summary": None,
        "created_at": now_iso(),
    }
    await db.medical_records.insert_one(rec)
    return rec


@api_router.get("/medical-records", response_model=List[MedicalRecord])
async def list_records(patient_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    if user["role"] == "patient":
        query = {"patient_id": user["id"]}
    elif user["role"] == "doctor":
        query = {"patient_id": patient_id} if patient_id else {}
    else:
        query = {"patient_id": patient_id} if patient_id else {}
    recs = await db.medical_records.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return recs


@api_router.delete("/medical-records/{rec_id}")
async def delete_record(rec_id: str, user: dict = Depends(get_current_user)):
    await db.medical_records.delete_one({"id": rec_id})
    return {"ok": True}


# ============================================================
# PRESCRIPTIONS
# ============================================================
@api_router.post("/prescriptions", response_model=Prescription)
async def create_prescription(req: PrescriptionCreate, user: dict = Depends(require_roles("doctor"))):
    doc = await db.doctors.find_one({"user_id": user["id"]})
    if not doc:
        raise HTTPException(404, "Doctor profile not found")
    patient = await db.users.find_one({"id": req.patient_id})
    if not patient:
        raise HTTPException(404, "Patient not found")
    rx = {
        "id": str(uuid.uuid4()),
        "patient_id": req.patient_id,
        "patient_name": patient["name"],
        "doctor_id": doc["id"],
        "doctor_name": doc["name"],
        "appointment_id": req.appointment_id,
        "medications": req.medications,
        "instructions": req.instructions,
        "diagnosis": req.diagnosis,
        "created_at": now_iso(),
    }
    await db.prescriptions.insert_one(rx)
    await _create_notification(req.patient_id, "New Prescription",
                               f"Dr. {doc['name']} issued a new prescription.", "prescription")
    return rx


@api_router.get("/prescriptions", response_model=List[Prescription])
async def list_prescriptions(patient_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    if user["role"] == "patient":
        query = {"patient_id": user["id"]}
    elif user["role"] == "doctor":
        doc = await db.doctors.find_one({"user_id": user["id"]})
        query = {"doctor_id": doc["id"]} if doc else {}
        if patient_id:
            query["patient_id"] = patient_id
    else:
        query = {"patient_id": patient_id} if patient_id else {}
    items = await db.prescriptions.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


# ============================================================
# NOTIFICATIONS
# ============================================================
async def _create_notification(user_id: str, title: str, message: str, n_type: str):
    notif = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": n_type,
        "read": False,
        "created_at": now_iso(),
    }
    await db.notifications.insert_one(notif)


@api_router.get("/notifications", response_model=List[Notification])
async def list_notifications(user: dict = Depends(get_current_user)):
    items = await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return items


@api_router.post("/notifications/{notif_id}/read")
async def mark_read(notif_id: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"id": notif_id, "user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


@api_router.post("/notifications/read-all")
async def mark_all_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


# ============================================================
# ADMIN
# ============================================================
@api_router.get("/admin/stats")
async def admin_stats(user: dict = Depends(require_roles("admin"))):
    return {
        "total_users": await db.users.count_documents({}),
        "total_patients": await db.users.count_documents({"role": "patient"}),
        "total_doctors": await db.doctors.count_documents({}),
        "total_appointments": await db.appointments.count_documents({}),
        "scheduled_appointments": await db.appointments.count_documents({"status": "scheduled"}),
        "completed_appointments": await db.appointments.count_documents({"status": "completed"}),
        "total_prescriptions": await db.prescriptions.count_documents({}),
        "total_records": await db.medical_records.count_documents({}),
    }


@api_router.get("/admin/users", response_model=List[UserPublic])
async def admin_users(user: dict = Depends(require_roles("admin"))):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(500)
    return users


@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, user: dict = Depends(require_roles("admin"))):
    await db.users.delete_one({"id": user_id})
    await db.doctors.delete_one({"user_id": user_id})
    return {"ok": True}


@api_router.get("/admin/activity")
async def admin_activity(user: dict = Depends(require_roles("admin"))):
    """Simple activity by day for last 7 days."""
    out = []
    today = datetime.now(timezone.utc).date()
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        start = datetime.combine(d, datetime.min.time(), tzinfo=timezone.utc).isoformat()
        end = datetime.combine(d, datetime.max.time(), tzinfo=timezone.utc).isoformat()
        appts = await db.appointments.count_documents({"created_at": {"$gte": start, "$lte": end}})
        regs = await db.users.count_documents({"created_at": {"$gte": start, "$lte": end}})
        out.append({"date": d.isoformat(), "appointments": appts, "registrations": regs})
    return out


# ============================================================
# AI FEATURES
# ============================================================

SYMPTOM_SYSTEM = (
    "You are a medical triage assistant. "
    "Given a patient's symptoms, return ONLY valid JSON."
)


@api_router.post("/ai/symptom-checker", response_model=SymptomCheckResult)
async def symptom_checker(
    req: SymptomCheckRequest,
    user: dict = Depends(get_current_user),
):
    prompt = f"""
You are a medical triage assistant.

Symptoms: {req.symptoms}
Age: {req.age or "Unknown"}
Gender: {req.gender or "Unknown"}
Duration: {req.duration or "Unknown"}

Return ONLY this JSON:

{{
  "possible_conditions": [],
  "risk_level": "low",
  "recommendations": [],
  "specialist_suggestion": "",
  "summary": ""
}}
"""

    try:
        response = gemini_model.generate_content(prompt)

        text = response.text.strip()
        text = text.replace("```json", "").replace("```", "").strip()

        data = json.loads(text)

    except Exception:
        data = {
            "possible_conditions": ["Unable to analyze symptoms"],
            "risk_level": "moderate",
            "recommendations": [
                "Please consult a healthcare professional."
            ],
            "specialist_suggestion": "General Practice",
            "summary": "AI analysis failed."
        }

    await db.ai_symptom_history.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "input": req.model_dump(),
        "result": data,
        "created_at": now_iso(),
    })

    return SymptomCheckResult(**data)


CHATBOT_SYSTEM = """
You are Verdant, a friendly AI health assistant.

Help users with healthcare questions, basic medical guidance,
appointment assistance and healthcare education.

Always remind users that AI is not a replacement for a licensed doctor.
"""


@api_router.post("/ai/chat/stream")
async def chat_stream(req: ChatRequest, user: dict = Depends(get_current_user)):

    # Save user message
    await db.ai_chat_messages.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "session_id": req.session_id,
        "role": "user",
        "content": req.message,
        "created_at": now_iso(),
    })

    async def event_gen():

        history = await db.ai_chat_messages.find(
            {
                "user_id": user["id"],
                "session_id": req.session_id
            },
            {"_id": 0}
        ).sort("created_at", 1).to_list(20)

        ctx = "\n".join(
            f"{m['role']}: {m['content']}"
            for m in history[-10:]
        )

        prompt = f"""
{CHATBOT_SYSTEM}

Conversation history:

{ctx}

User:
{req.message}
"""

        try:
            response = gemini_model.generate_content(prompt)

            full_reply = response.text

        except Exception as e:
            full_reply = f"Sorry, AI is temporarily unavailable.\n\n{str(e)}"

        await db.ai_chat_messages.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "session_id": req.session_id,
            "role": "assistant",
            "content": full_reply,
            "created_at": now_iso(),
        })

        yield f"data: {json.dumps({'delta': full_reply})}\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@api_router.get("/ai/chat/{session_id}/history")
async def chat_history(session_id: str, user: dict = Depends(get_current_user)):
    msgs = await db.ai_chat_messages.find(
        {
            "user_id": user["id"],
            "session_id": session_id
        },
        {"_id": 0}
    ).sort("created_at", 1).to_list(200)

    return msgs


class ReportSummaryRequest(BaseModel):
    record_id: Optional[str] = None
    text: Optional[str] = None

@api_router.post("/ai/summarize-report")
async def summarize_report(
    req: ReportSummaryRequest,
    user: dict = Depends(get_current_user),
):
    raw_text = req.text or ""
    record = None

    if req.record_id:
        record = await db.medical_records.find_one(
            {"id": req.record_id},
            {"_id": 0},
        )

        if not record:
            raise HTTPException(404, "Record not found")

        if record.get("file_data_base64"):
            try:
                raw_text = base64.b64decode(
                    record["file_data_base64"]
                ).decode("utf-8", errors="ignore")[:8000]
            except Exception:
                raw_text = ""

        if not raw_text:
            raw_text = (
                (record.get("notes") or "")
                + "\n"
                + (record.get("diagnosis") or "")
            )

    if not raw_text.strip():
        raise HTTPException(400, "No text content to summarize")

    prompt = f"""
You are a clinical report summarizer.

Summarize this medical report for the patient.

Return markdown with these headings:

## Key Findings

## Diagnosis

## Recommended Next Steps

## Red Flags

Finish with a short disclaimer that the patient should consult a licensed doctor.

Medical Report:

{raw_text}
"""

    try:
        response = gemini_model.generate_content(prompt)
        summary = response.text

    except Exception as e:
        summary = f"Unable to summarize report.\n\n{str(e)}"

    if record:
        await db.medical_records.update_one(
            {"id": record["id"]},
            {
                "$set": {
                    "ai_summary": summary
                }
            },
        )

    return {
        "summary": summary
    }

class DoctorRecRequest(BaseModel):
    concern: str


@api_router.post("/ai/recommend-doctor")
async def recommend_doctor(
    req: DoctorRecRequest,
    user: dict = Depends(get_current_user),
):
    """Suggest the best specialty and recommend doctors."""

    specialties = await db.doctors.distinct("specialty")

    prompt = f"""
You are a healthcare assistant.

Patient concern:
{req.concern}

Available specialties:
{", ".join(specialties)}

Return ONLY valid JSON:

{{
  "recommended_specialty": "",
  "reasoning": ""
}}
"""

    try:
        response = gemini_model.generate_content(prompt)

        text = response.text.strip()
        text = text.replace("```json", "").replace("```", "").strip()

        data = json.loads(text)

    except Exception:
        data = {
            "recommended_specialty": specialties[0] if specialties else "General Practice",
            "reasoning": "Unable to analyze automatically."
        }

    doctors = await db.doctors.find(
        {
            "specialty": data["recommended_specialty"]
        },
        {
            "_id": 0
        }
    ).sort("rating", -1).to_list(3)

    if not doctors:
        doctors = await db.doctors.find(
            {},
            {
                "_id": 0
            }
        ).sort("rating", -1).to_list(3)

    return {
        "recommended_specialty": data["recommended_specialty"],
        "reasoning": data["reasoning"],
        "doctors": doctors,
    }

# ============================================================
# SEED ENDPOINT (DEV)
# ============================================================
@api_router.post("/seed")
async def seed():
    """Idempotent seed for demo data."""
    if await db.users.count_documents({"email": "admin@verdant.health"}) > 0:
        return {"ok": True, "msg": "already seeded"}

    # Admin
    admin_id = str(uuid.uuid4())
    await db.users.insert_one({
        "id": admin_id, "name": "Admin Verdant", "email": "admin@verdant.health",
        "password_hash": hash_password("admin123"), "role": "admin",
        "avatar_url": "https://api.dicebear.com/7.x/initials/svg?seed=AV",
        "created_at": now_iso(),
    })

    # Doctors
    docs_seed = [
        ("Dr. Amara Okafor", "amara@verdant.health", "Cardiology", 12, 120.0,
         "Cardiologist focusing on preventive care and complex arrhythmias."),
        ("Dr. Liam Bennett", "liam@verdant.health", "Dermatology", 8, 90.0,
         "Dermatologist with expertise in skin cancer screening and pediatric care."),
        ("Dr. Priya Raman", "priya@verdant.health", "Pediatrics", 10, 80.0,
         "Pediatrician committed to gentle, evidence-based child care."),
        ("Dr. Mateo Alvarez", "mateo@verdant.health", "Neurology", 15, 150.0,
         "Neurologist specializing in headache disorders and stroke rehabilitation."),
        ("Dr. Hana Yamato", "hana@verdant.health", "General Practice", 6, 60.0,
         "Family physician focused on whole-person primary care."),
        ("Dr. Noah Kelly", "noah@verdant.health", "Orthopedics", 11, 110.0,
         "Orthopedic surgeon specializing in sports injuries and joint replacement."),
    ]
    for name, email, spec, exp, fee, bio in docs_seed:
        uid = str(uuid.uuid4())
        await db.users.insert_one({
            "id": uid, "name": name, "email": email,
            "password_hash": hash_password("doctor123"), "role": "doctor",
            "avatar_url": f"https://api.dicebear.com/7.x/initials/svg?seed={name}",
            "created_at": now_iso(),
        })
        await db.doctors.insert_one({
            "id": str(uuid.uuid4()), "user_id": uid, "name": name, "email": email,
            "specialty": spec, "experience_years": exp, "consultation_fee": fee,
            "bio": bio, "rating": round(4.5 + (exp % 5) * 0.1, 1),
            "avatar_url": f"https://api.dicebear.com/7.x/initials/svg?seed={name}",
            "available_slots": _gen_default_slots(),
        })

    # Patient
    pid = str(uuid.uuid4())
    await db.users.insert_one({
        "id": pid, "name": "Test Patient", "email": "patient@verdant.health",
        "password_hash": hash_password("patient123"), "role": "patient",
        "avatar_url": "https://api.dicebear.com/7.x/initials/svg?seed=TP",
        "created_at": now_iso(),
    })

    return {"ok": True, "msg": "seeded"}


# ============================================================
# Health
# ============================================================
@api_router.get("/")
async def root():
    return {"message": "Verdant Health API", "status": "ok"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def on_startup():
    # auto-seed for demo
    try:
        await seed()
        logger.info("Auto-seed complete")
    except Exception as e:
        logger.warning(f"Seed failed: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
