from fastapi import FastAPI, APIRouter, HTTPException, Header, Depends, UploadFile, File
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import hashlib
import secrets
import bcrypt
import jwt
import httpx
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta

# Import emergentintegrations for Gemini
from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.llm.openai.speech_to_text import OpenAISpeechToText

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Gemini API Key
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')

# Auth config
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = 'HS256'
JWT_EXPIRY_DAYS = 7

# Emergent managed email proxy (constant - do not read from env)
EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMERGENT_EMAIL_KEY = os.environ.get('EMERGENT_EMAIL_KEY', '')
EMAIL_FROM_NAME = os.environ.get('EMAIL_FROM_NAME', 'Senior Productivity App')

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ChatRequest(BaseModel):
    session_id: str
    message: str

class ChatSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = "New Chat"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]


# Chat endpoints
@api_router.get("/chat/sessions")
async def get_chat_sessions():
    """Get all chat sessions"""
    sessions = await db.chat_sessions.find().sort("updated_at", -1).to_list(100)
    return [{"id": s["id"], "title": s["title"], "created_at": s["created_at"].isoformat(), "updated_at": s["updated_at"].isoformat()} for s in sessions]

@api_router.post("/chat/sessions")
async def create_chat_session():
    """Create a new chat session"""
    session = ChatSession()
    await db.chat_sessions.insert_one(session.dict())
    return {"id": session.id, "title": session.title, "created_at": session.created_at.isoformat()}

@api_router.delete("/chat/sessions/{session_id}")
async def delete_chat_session(session_id: str):
    """Delete a chat session and its messages"""
    await db.chat_sessions.delete_one({"id": session_id})
    await db.chat_messages.delete_many({"session_id": session_id})
    return {"success": True}

@api_router.get("/chat/sessions/{session_id}/messages")
async def get_chat_messages(session_id: str):
    """Get all messages for a chat session"""
    messages = await db.chat_messages.find({"session_id": session_id}).sort("timestamp", 1).to_list(1000)
    return [{"id": m["id"], "role": m["role"], "content": m["content"], "timestamp": m["timestamp"].isoformat()} for m in messages]

@api_router.post("/chat/send")
async def send_chat_message(request: ChatRequest):
    """Send a message and get AI response"""
    # Save user message
    user_msg = ChatMessage(
        session_id=request.session_id,
        role="user",
        content=request.message
    )
    await db.chat_messages.insert_one(user_msg.dict())
    
    # Get chat history for context
    history = await db.chat_messages.find({"session_id": request.session_id}).sort("timestamp", 1).to_list(50)
    
    try:
        # Initialize Gemini chat
        chat = LlmChat(
            api_key=GEMINI_API_KEY,
            session_id=request.session_id,
            system_message="""You are a friendly and helpful assistant for a senior productivity app. 
You help elderly users with their daily tasks, answer questions clearly and simply, 
and provide helpful advice. Keep responses concise, warm, and easy to understand.
Use simple language and avoid technical jargon. Be patient and supportive."""
        ).with_model("gemini", "gemini-2.5-flash")
        
        # Build message history for context
        for msg in history[:-1]:  # Exclude the message we just added
            if msg['role'] == 'user':
                chat._add_user_message(msg['content'])
            else:
                chat._add_assistant_message(msg['content'])
        
        # Create user message
        user_message = UserMessage(text=request.message)
        
        # Get response
        response = await chat.send_message(user_message)
        response_text = response.text if hasattr(response, 'text') else str(response)
        
        # Save assistant message
        assistant_msg = ChatMessage(
            session_id=request.session_id,
            role="assistant",
            content=response_text
        )
        await db.chat_messages.insert_one(assistant_msg.dict())
        
        # Update session title if it's the first message
        session = await db.chat_sessions.find_one({"id": request.session_id})
        if session and session.get("title") == "New Chat":
            # Use first few words of user message as title
            title = request.message[:30] + ("..." if len(request.message) > 30 else "")
            await db.chat_sessions.update_one(
                {"id": request.session_id},
                {"$set": {"title": title, "updated_at": datetime.utcnow()}}
            )
        else:
            await db.chat_sessions.update_one(
                {"id": request.session_id},
                {"$set": {"updated_at": datetime.utcnow()}}
            )
        
        return {
            "id": assistant_msg.id,
            "role": "assistant",
            "content": response_text,
            "timestamp": assistant_msg.timestamp.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error in chat: {str(e)}")
        return {"error": str(e)}


# ===================== Auth =====================

class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=6, max_length=72)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)
    new_password: str = Field(min_length=6, max_length=72)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except Exception:
        return False

def sha256_hash(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()

def make_access_token(user_id: str) -> str:
    now = datetime.utcnow()
    claims = {"sub": user_id, "iat": now, "exp": now + timedelta(days=JWT_EXPIRY_DAYS)}
    return jwt.encode(claims, JWT_SECRET, algorithm=JWT_ALGORITHM)

def public_user(user: dict) -> dict:
    return {"id": user["id"], "name": user.get("name", ""), "email": user["email"]}

async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1]
    try:
        claims = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = await db.users.find_one({"id": claims.get("sub")})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user


async def send_reset_email(recipient: str, name: str, code: str):
    html = f"""
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F4FB;padding:32px 0;">
      <tr><td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:16px;padding:36px;font-family:Arial,sans-serif;">
          <tr><td style="font-size:24px;font-weight:bold;color:#2C3E50;padding-bottom:12px;">Password Reset</td></tr>
          <tr><td style="font-size:17px;color:#2C3E50;line-height:1.6;padding-bottom:20px;">
            Hello {name},<br/><br/>
            We received a request to reset your password. Enter this code in the app:
          </td></tr>
          <tr><td align="center" style="padding-bottom:20px;">
            <div style="display:inline-block;background-color:#F0E8FA;border-radius:12px;padding:18px 36px;font-size:36px;font-weight:bold;letter-spacing:10px;color:#5B2C9E;">{code}</div>
          </td></tr>
          <tr><td style="font-size:15px;color:#7F8C8D;line-height:1.6;">
            This code expires in 15 minutes. If you did not request a password reset, you can safely ignore this email.
          </td></tr>
        </table>
      </td></tr>
    </table>
    """
    payload = {
        "to": [recipient],
        "subject": "Your password reset code",
        "html": html,
        "from_name": EMAIL_FROM_NAME,
    }
    async with httpx.AsyncClient(timeout=30) as http_client:
        resp = await http_client.post(
            f"{EMAIL_BASE_URL}/api/v1/email/send",
            headers={"X-Email-Key": EMERGENT_EMAIL_KEY},
            json=payload,
        )
    resp.raise_for_status()


@api_router.post("/auth/register", status_code=201)
async def register(body: RegisterRequest):
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="This email is already registered. Try signing in instead.")
    user = {
        "id": str(uuid.uuid4()),
        "name": body.name.strip(),
        "email": email,
        "password_hash": hash_password(body.password),
        "created_at": datetime.utcnow(),
    }
    await db.users.insert_one(user)
    return {"access_token": make_access_token(user["id"]), "user": public_user(user)}

@api_router.post("/auth/login")
async def login(body: LoginRequest):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password. Please try again.")
    return {"access_token": make_access_token(user["id"]), "user": public_user(user)}

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return public_user(user)

@api_router.post("/auth/forgot-password")
async def forgot_password(body: ForgotPasswordRequest):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if user:
        code = f"{secrets.randbelow(1000000):06d}"
        await db.password_resets.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "code_hash": sha256_hash(code),
            "expires_at": datetime.utcnow() + timedelta(minutes=15),
            "used_at": None,
            "created_at": datetime.utcnow(),
        })
        try:
            await send_reset_email(email, user.get("name", "there"), code)
        except Exception as e:
            logger.error(f"Failed to send reset email: {e}")
            raise HTTPException(status_code=502, detail="We couldn't send the email right now. Please try again in a moment.")
    return {"message": "If that email is registered, a reset code has been sent."}

@api_router.post("/auth/reset-password")
async def reset_password(body: ResetPasswordRequest):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code.")
    record = await db.password_resets.find_one({
        "user_id": user["id"],
        "code_hash": sha256_hash(body.code),
        "used_at": None,
    })
    if not record or record["expires_at"] <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired reset code.")
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"password_hash": hash_password(body.new_password), "password_changed_at": datetime.utcnow()}},
    )
    await db.password_resets.update_one({"id": record["id"]}, {"$set": {"used_at": datetime.utcnow()}})
    return {"message": "Password reset successfully. You can now sign in with your new password."}


# ===================== Medications =====================

class MedicationBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    dosage: str = Field(default="", max_length=100)
    times: List[str] = Field(min_length=1)  # ["08:00", "20:00"] 24h format
    days: List[int] = Field(min_length=1)   # 0=Sunday ... 6=Saturday
    notes: str = Field(default="", max_length=500)
    color: str = Field(default="#64B5F6", max_length=20)

class MedicationCreate(MedicationBase):
    device_id: str = Field(min_length=1)

class MedicationUpdate(MedicationBase):
    pass

class ToggleTakenRequest(BaseModel):
    device_id: str = Field(min_length=1)
    date: str  # "YYYY-MM-DD"
    time: str  # "08:00"


@api_router.get("/medications")
async def get_medications(device_id: str, date: Optional[str] = None):
    meds = await db.medications.find({"device_id": device_id}, {"_id": 0}).sort("created_at", 1).to_list(200)
    taken_map = {}
    if date:
        taken = await db.medication_taken.find({"device_id": device_id, "date": date}, {"_id": 0}).to_list(1000)
        for t in taken:
            taken_map.setdefault(t["medication_id"], []).append(t["time"])
    for m in meds:
        m["taken_times"] = taken_map.get(m["id"], [])
    return {"medications": meds}

@api_router.post("/medications", status_code=201)
async def create_medication(body: MedicationCreate):
    med = body.dict()
    med["id"] = str(uuid.uuid4())
    med["created_at"] = datetime.utcnow()
    med["updated_at"] = datetime.utcnow()
    await db.medications.insert_one(dict(med))
    med.pop("_id", None)
    med["taken_times"] = []
    return med

@api_router.put("/medications/{med_id}")
async def update_medication(med_id: str, body: MedicationUpdate):
    update = body.dict()
    update["updated_at"] = datetime.utcnow()
    result = await db.medications.update_one({"id": med_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Medication not found")
    med = await db.medications.find_one({"id": med_id}, {"_id": 0})
    return med

@api_router.delete("/medications/{med_id}")
async def delete_medication(med_id: str):
    result = await db.medications.delete_one({"id": med_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Medication not found")
    await db.medication_taken.delete_many({"medication_id": med_id})
    return {"success": True}

@api_router.post("/medications/{med_id}/toggle-taken")
async def toggle_taken(med_id: str, body: ToggleTakenRequest):
    med = await db.medications.find_one({"id": med_id})
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    query = {"medication_id": med_id, "date": body.date, "time": body.time}
    existing = await db.medication_taken.find_one(query)
    if existing:
        await db.medication_taken.delete_one(query)
        return {"taken": False}
    await db.medication_taken.insert_one({
        "id": str(uuid.uuid4()),
        "medication_id": med_id,
        "device_id": body.device_id,
        "date": body.date,
        "time": body.time,
        "taken_at": datetime.utcnow(),
    })
    return {"taken": True}


# ===================== Emergency Contacts & SOS =====================

class EmergencyContactBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    relationship: str = Field(default="", max_length=100)
    phone: str = Field(min_length=1, max_length=40)
    priority: int = Field(default=0, ge=0, le=999)

class EmergencyContactCreate(EmergencyContactBase):
    device_id: str = Field(min_length=1)

class EmergencyContactUpdate(EmergencyContactBase):
    pass

class EmergencyAlertRequest(BaseModel):
    device_id: str = Field(min_length=1)
    message: Optional[str] = Field(default=None, max_length=500)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    contact_id: Optional[str] = None  # top-priority contact notified
    triggered_from: Optional[str] = Field(default="sos_button", max_length=50)


@api_router.get("/emergency/contacts")
async def get_emergency_contacts(device_id: str):
    contacts = await db.emergency_contacts.find({"device_id": device_id}, {"_id": 0}).sort(
        [("priority", 1), ("created_at", 1)]
    ).to_list(200)
    return {"contacts": contacts}

@api_router.post("/emergency/contacts", status_code=201)
async def create_emergency_contact(body: EmergencyContactCreate):
    contact = body.dict()
    contact["id"] = str(uuid.uuid4())
    contact["created_at"] = datetime.utcnow()
    contact["updated_at"] = datetime.utcnow()
    await db.emergency_contacts.insert_one(dict(contact))
    contact.pop("_id", None)
    return contact

@api_router.put("/emergency/contacts/{contact_id}")
async def update_emergency_contact(contact_id: str, body: EmergencyContactUpdate):
    update = body.dict()
    update["updated_at"] = datetime.utcnow()
    result = await db.emergency_contacts.update_one({"id": contact_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    contact = await db.emergency_contacts.find_one({"id": contact_id}, {"_id": 0})
    return contact

@api_router.delete("/emergency/contacts/{contact_id}")
async def delete_emergency_contact(contact_id: str):
    result = await db.emergency_contacts.delete_one({"id": contact_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"success": True}

@api_router.post("/emergency/alert", status_code=201)
async def create_emergency_alert(body: EmergencyAlertRequest):
    alert = {
        "id": str(uuid.uuid4()),
        "device_id": body.device_id,
        "message": body.message,
        "latitude": body.latitude,
        "longitude": body.longitude,
        "contact_id": body.contact_id,
        "triggered_from": body.triggered_from or "sos_button",
        "created_at": datetime.utcnow(),
    }
    await db.emergency_alerts.insert_one(dict(alert))
    # Return the top-priority contact so the client can call them right away
    top_contact = await db.emergency_contacts.find_one(
        {"device_id": body.device_id}, {"_id": 0}, sort=[("priority", 1), ("created_at", 1)]
    )
    alert.pop("_id", None)
    return {"alert": alert, "top_contact": top_contact}


# ---------- News Feed (RSS) ----------
import re as _re
import time as _time
import asyncio as _asyncio
import feedparser

NEWS_FEEDS = [
    {"name": "CBC News", "url": "https://www.cbc.ca/webfeed/rss/rss-topstories"},
    {"name": "CBC Canada", "url": "https://www.cbc.ca/webfeed/rss/rss-canada"},
    {"name": "Global News", "url": "https://globalnews.ca/feed/"},
    {"name": "CBC Health", "url": "https://www.cbc.ca/webfeed/rss/rss-health"},
]
NEWS_CACHE_TTL = 300  # 5 minutes
_news_cache: dict = {"items": [], "fetched_at": 0.0}

_TAG_RE = _re.compile(r"<[^>]*>")

def _strip_html(text: str) -> str:
    return _TAG_RE.sub("", text or "").strip()

async def _fetch_feed(http: httpx.AsyncClient, feed: dict) -> list:
    try:
        resp = await http.get(
            feed["url"],
            headers={"User-Agent": "Mozilla/5.0 (SeniorProductivityApp RSS Reader)"},
        )
        if resp.status_code != 200:
            return []
        parsed = feedparser.parse(resp.text)
        items = []
        for entry in parsed.entries[:10]:
            title = _strip_html(entry.get("title", ""))
            link = entry.get("link", "")
            if not title or not link:
                continue
            published = None
            struct = entry.get("published_parsed") or entry.get("updated_parsed")
            if struct:
                published = datetime(*struct[:6]).isoformat() + "Z"
            items.append({
                "title": title,
                "link": link,
                "pubDate": entry.get("published", entry.get("updated", "")),
                "publishedISO": published,
                "description": _strip_html(entry.get("summary", ""))[:200],
                "source": feed["name"],
            })
        return items
    except Exception as e:
        logging.warning(f"Failed to fetch feed {feed['name']}: {e}")
        return []

@api_router.get("/news")
async def get_news():
    now = _time.time()
    if _news_cache["items"] and now - _news_cache["fetched_at"] < NEWS_CACHE_TTL:
        return {"items": _news_cache["items"], "cached": True}
    async with httpx.AsyncClient(timeout=12, follow_redirects=True) as http:
        results = await _asyncio.gather(*[_fetch_feed(http, f) for f in NEWS_FEEDS])
    all_items = [item for feed_items in results for item in feed_items]
    all_items.sort(key=lambda x: x.get("publishedISO") or "", reverse=True)
    if all_items:
        _news_cache["items"] = all_items
        _news_cache["fetched_at"] = now
    return {"items": all_items, "cached": False}


# ---------- Voice-to-Text Dictation (OpenAI Whisper via Emergent key) ----------
import tempfile

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
AUDIO_EXTENSIONS = {"mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm"}
MAX_AUDIO_BYTES = 25 * 1024 * 1024

@api_router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="The audio file is empty")
    if len(data) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Audio must be 25 MB or smaller")
    ext = Path(file.filename or "audio.m4a").suffix.lstrip('.').lower()
    if ext not in AUDIO_EXTENSIONS:
        ext = "m4a"
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as tmp:
            tmp.write(data)
            tmp_path = tmp.name
        stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)
        with open(tmp_path, 'rb') as f:
            result = await stt.transcribe(file=f, model="whisper-1", response_format="json")
        text = getattr(result, 'text', None)
        if text is None and isinstance(result, dict):
            text = result.get('text', '')
        return {"text": (text or '').strip()}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Transcription failed: {e}")
        raise HTTPException(status_code=502, detail="Transcription failed. Please try again.")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)



@app.on_event("startup")
async def create_indexes():
    await db.users.create_index("email", unique=True)
    await db.password_resets.create_index("expires_at", expireAfterSeconds=0)
    await db.medications.create_index("device_id")
    await db.medication_taken.create_index([("device_id", 1), ("date", 1)])
    await db.emergency_contacts.create_index([("device_id", 1), ("priority", 1)])
    await db.emergency_alerts.create_index([("device_id", 1), ("created_at", -1)])


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
