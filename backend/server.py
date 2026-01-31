from fastapi import FastAPI, APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import httpx
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import base64
from emergentintegrations.llm.chat import LlmChat, UserMessage
from elevenlabs import ElevenLabs

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="CareFollow - Sistema de Pós-Atendimento")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer(auto_error=False)
JWT_SECRET = os.environ.get('JWT_SECRET', 'care-follow-secret-key-2024')
JWT_ALGORITHM = "HS256"

# ElevenLabs client
eleven_client = ElevenLabs(api_key=os.environ.get('ELEVENLABS_API_KEY', ''))

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: Literal["staff", "patient"] = "staff"
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str
    role: str
    phone: Optional[str] = None
    picture: Optional[str] = None
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class PatientCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    birth_date: Optional[str] = None
    notes: Optional[str] = None

class PatientResponse(BaseModel):
    patient_id: str
    name: str
    email: str
    phone: str
    birth_date: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    created_by: str

class AppointmentCreate(BaseModel):
    patient_id: str
    procedure: str
    diagnosis: str
    notes: Optional[str] = None
    appointment_date: Optional[str] = None

class AppointmentResponse(BaseModel):
    appointment_id: str
    patient_id: str
    patient_name: Optional[str] = None
    procedure: str
    diagnosis: str
    notes: Optional[str] = None
    appointment_date: Optional[str] = None
    created_at: datetime
    created_by: str

class CareInstructionCreate(BaseModel):
    appointment_id: str
    generate_audio: bool = True

class CareInstructionResponse(BaseModel):
    instruction_id: str
    appointment_id: str
    patient_id: str
    text_content: str
    audio_url: Optional[str] = None
    created_at: datetime

class ReminderCreate(BaseModel):
    patient_id: str
    appointment_id: Optional[str] = None
    message: str
    reminder_type: Literal["email", "sms", "whatsapp"] = "email"
    scheduled_for: str

class ReminderResponse(BaseModel):
    reminder_id: str
    patient_id: str
    appointment_id: Optional[str] = None
    message: str
    reminder_type: str
    scheduled_for: datetime
    sent: bool = False
    sent_at: Optional[datetime] = None
    created_at: datetime

class FollowUpCreate(BaseModel):
    patient_id: str
    appointment_id: Optional[str] = None
    follow_up_date: str
    reason: str
    notes: Optional[str] = None

class FollowUpResponse(BaseModel):
    followup_id: str
    patient_id: str
    patient_name: Optional[str] = None
    appointment_id: Optional[str] = None
    follow_up_date: datetime
    reason: str
    notes: Optional[str] = None
    completed: bool = False
    created_at: datetime

# ============== AUTH HELPERS ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user_optional(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0, "password": 0})
        return user
    except:
        return None

# ============== AUTH ENDPOINTS ==============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "name": user_data.name,
        "role": user_data.role,
        "phone": user_data.phone,
        "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, user_data.role)
    user_response = UserResponse(
        user_id=user_id,
        email=user_data.email,
        name=user_data.name,
        role=user_data.role,
        phone=user_data.phone,
        created_at=datetime.now(timezone.utc)
    )
    return TokenResponse(access_token=token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["user_id"], user["role"])
    created_at = user.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
    
    user_response = UserResponse(
        user_id=user["user_id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        phone=user.get("phone"),
        picture=user.get("picture"),
        created_at=created_at
    )
    return TokenResponse(access_token=token, user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    created_at = current_user.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
    
    return UserResponse(
        user_id=current_user["user_id"],
        email=current_user["email"],
        name=current_user["name"],
        role=current_user["role"],
        phone=current_user.get("phone"),
        picture=current_user.get("picture"),
        created_at=created_at
    )

@api_router.get("/auth/session")
async def get_session_data(session_id: str):
    """Exchange session_id for user data from Emergent Auth"""
    try:
        async with httpx.AsyncClient() as http_client:
            response = await http_client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            if response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            data = response.json()
            
            # Check if user exists
            existing_user = await db.users.find_one({"email": data["email"]})
            if existing_user:
                user_id = existing_user["user_id"]
                role = existing_user["role"]
                # Update user info
                await db.users.update_one(
                    {"user_id": user_id},
                    {"$set": {"name": data["name"], "picture": data.get("picture")}}
                )
            else:
                # Create new user
                user_id = f"user_{uuid.uuid4().hex[:12]}"
                role = "staff"
                user_doc = {
                    "user_id": user_id,
                    "email": data["email"],
                    "password": "",
                    "name": data["name"],
                    "role": role,
                    "phone": None,
                    "picture": data.get("picture"),
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.users.insert_one(user_doc)
            
            # Create our own token
            token = create_token(user_id, role)
            
            return {
                "access_token": token,
                "token_type": "bearer",
                "user": {
                    "user_id": user_id,
                    "email": data["email"],
                    "name": data["name"],
                    "role": role,
                    "picture": data.get("picture")
                }
            }
    except httpx.RequestError as e:
        logger.error(f"Error fetching session data: {e}")
        raise HTTPException(status_code=500, detail="Failed to authenticate")

# ============== PATIENTS ENDPOINTS ==============

@api_router.post("/patients", response_model=PatientResponse)
async def create_patient(patient: PatientCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "staff":
        raise HTTPException(status_code=403, detail="Only staff can create patients")
    
    patient_id = f"pat_{uuid.uuid4().hex[:12]}"
    patient_doc = {
        "patient_id": patient_id,
        "name": patient.name,
        "email": patient.email,
        "phone": patient.phone,
        "birth_date": patient.birth_date,
        "notes": patient.notes,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["user_id"]
    }
    await db.patients.insert_one(patient_doc)
    
    # Also create a user account for the patient
    existing_user = await db.users.find_one({"email": patient.email})
    if not existing_user:
        user_doc = {
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": patient.email,
            "password": hash_password("temp123"),  # Temporary password
            "name": patient.name,
            "role": "patient",
            "phone": patient.phone,
            "patient_id": patient_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
    
    return PatientResponse(
        patient_id=patient_id,
        name=patient.name,
        email=patient.email,
        phone=patient.phone,
        birth_date=patient.birth_date,
        notes=patient.notes,
        created_at=datetime.now(timezone.utc),
        created_by=current_user["user_id"]
    )

@api_router.get("/patients", response_model=List[PatientResponse])
async def list_patients(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "staff":
        raise HTTPException(status_code=403, detail="Only staff can list all patients")
    
    patients = await db.patients.find({}, {"_id": 0}).to_list(1000)
    result = []
    for p in patients:
        created_at = p.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        result.append(PatientResponse(
            patient_id=p["patient_id"],
            name=p["name"],
            email=p["email"],
            phone=p["phone"],
            birth_date=p.get("birth_date"),
            notes=p.get("notes"),
            created_at=created_at,
            created_by=p["created_by"]
        ))
    return result

@api_router.get("/patients/{patient_id}", response_model=PatientResponse)
async def get_patient(patient_id: str, current_user: dict = Depends(get_current_user)):
    patient = await db.patients.find_one({"patient_id": patient_id}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Patients can only view their own data
    if current_user["role"] == "patient":
        if current_user.get("patient_id") != patient_id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    created_at = patient.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
    
    return PatientResponse(
        patient_id=patient["patient_id"],
        name=patient["name"],
        email=patient["email"],
        phone=patient["phone"],
        birth_date=patient.get("birth_date"),
        notes=patient.get("notes"),
        created_at=created_at,
        created_by=patient["created_by"]
    )

# ============== APPOINTMENTS ENDPOINTS ==============

@api_router.post("/appointments", response_model=AppointmentResponse)
async def create_appointment(appointment: AppointmentCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "staff":
        raise HTTPException(status_code=403, detail="Only staff can create appointments")
    
    # Verify patient exists
    patient = await db.patients.find_one({"patient_id": appointment.patient_id}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    appointment_id = f"apt_{uuid.uuid4().hex[:12]}"
    appointment_doc = {
        "appointment_id": appointment_id,
        "patient_id": appointment.patient_id,
        "procedure": appointment.procedure,
        "diagnosis": appointment.diagnosis,
        "notes": appointment.notes,
        "appointment_date": appointment.appointment_date or datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["user_id"]
    }
    await db.appointments.insert_one(appointment_doc)
    
    return AppointmentResponse(
        appointment_id=appointment_id,
        patient_id=appointment.patient_id,
        patient_name=patient["name"],
        procedure=appointment.procedure,
        diagnosis=appointment.diagnosis,
        notes=appointment.notes,
        appointment_date=appointment.appointment_date,
        created_at=datetime.now(timezone.utc),
        created_by=current_user["user_id"]
    )

@api_router.get("/appointments", response_model=List[AppointmentResponse])
async def list_appointments(patient_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if current_user["role"] == "patient":
        query["patient_id"] = current_user.get("patient_id")
    elif patient_id:
        query["patient_id"] = patient_id
    
    appointments = await db.appointments.find(query, {"_id": 0}).to_list(1000)
    result = []
    for a in appointments:
        patient = await db.patients.find_one({"patient_id": a["patient_id"]}, {"_id": 0, "name": 1})
        created_at = a.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        result.append(AppointmentResponse(
            appointment_id=a["appointment_id"],
            patient_id=a["patient_id"],
            patient_name=patient["name"] if patient else None,
            procedure=a["procedure"],
            diagnosis=a["diagnosis"],
            notes=a.get("notes"),
            appointment_date=a.get("appointment_date"),
            created_at=created_at,
            created_by=a["created_by"]
        ))
    return result

@api_router.get("/appointments/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment(appointment_id: str, current_user: dict = Depends(get_current_user)):
    appointment = await db.appointments.find_one({"appointment_id": appointment_id}, {"_id": 0})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    if current_user["role"] == "patient":
        if current_user.get("patient_id") != appointment["patient_id"]:
            raise HTTPException(status_code=403, detail="Access denied")
    
    patient = await db.patients.find_one({"patient_id": appointment["patient_id"]}, {"_id": 0, "name": 1})
    created_at = appointment.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
    
    return AppointmentResponse(
        appointment_id=appointment["appointment_id"],
        patient_id=appointment["patient_id"],
        patient_name=patient["name"] if patient else None,
        procedure=appointment["procedure"],
        diagnosis=appointment["diagnosis"],
        notes=appointment.get("notes"),
        appointment_date=appointment.get("appointment_date"),
        created_at=created_at,
        created_by=appointment["created_by"]
    )

# ============== CARE INSTRUCTIONS (AI + AUDIO) ==============

import re

def clean_ai_text(text: str) -> str:
    """Remove markdown formatting and clean up AI-generated text"""
    if not text:
        return ""
    # Remove markdown headers
    text = re.sub(r'#{1,6}\s*', '', text)
    # Remove bold/italic markers
    text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)
    text = re.sub(r'\*([^*]+)\*', r'\1', text)
    text = re.sub(r'__([^_]+)__', r'\1', text)
    text = re.sub(r'_([^_]+)_', r'\1', text)
    # Clean bullet points
    text = re.sub(r'^[-*•]\s*', '• ', text, flags=re.MULTILINE)
    # Remove code blocks
    text = re.sub(r'```[\s\S]*?```', '', text)
    text = re.sub(r'`([^`]+)`', r'\1', text)
    # Remove horizontal rules
    text = re.sub(r'^---+$', '', text, flags=re.MULTILINE)
    # Clean extra whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

@api_router.post("/instructions/generate", response_model=CareInstructionResponse)
async def generate_care_instructions(request: CareInstructionCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "staff":
        raise HTTPException(status_code=403, detail="Only staff can generate instructions")
    
    # Get appointment details
    appointment = await db.appointments.find_one({"appointment_id": request.appointment_id}, {"_id": 0})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Get patient details
    patient = await db.patients.find_one({"patient_id": appointment["patient_id"]}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Generate instructions using OpenAI GPT-5.2
    try:
        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY', ''),
            session_id=f"instruction_{uuid.uuid4().hex[:8]}",
            system_message="""Você é um assistente médico especializado em criar orientações pós-atendimento.
            
REGRAS IMPORTANTES:
- Use linguagem simples e acessível
- NÃO use markdown (sem **, ##, -, *)
- Use apenas texto simples e organizado
- Separe seções com linhas em branco
- Use números (1. 2. 3.) para listas
- Seja empático e claro
- Responda em português brasileiro"""
        )
        chat.with_model("openai", "gpt-5.2")
        
        prompt = f"""Crie orientações de pós-atendimento em TEXTO SIMPLES (sem markdown) para:

Paciente: {patient['name']}
Procedimento: {appointment['procedure']}
Diagnóstico: {appointment['diagnosis']}
Observações: {appointment.get('notes', 'Nenhuma')}

Organize assim (sem usar markdown):

CUIDADOS GERAIS
[orientações para as próximas 24-48 horas]

MEDICAÇÕES
[instruções sobre medicações se aplicável]

SINAIS DE ALERTA
[quando procurar atendimento de urgência]

RESTRIÇÕES
[atividades a evitar]

RETORNO
[próximos passos e quando retornar]"""
        
        user_message = UserMessage(text=prompt)
        text_content = await chat.send_message(user_message)
        
        # Clean the text to remove any markdown that slipped through
        text_content = clean_ai_text(text_content)
        
    except Exception as e:
        logger.error(f"Error generating instructions: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao gerar orientações. Tente novamente.")
    
    # Generate audio if requested (with shorter text for faster processing)
    audio_url = None
    if request.generate_audio and os.environ.get('ELEVENLABS_API_KEY'):
        try:
            # Limit text length for audio to avoid timeout
            audio_text = text_content[:3000] if len(text_content) > 3000 else text_content
            
            audio_generator = eleven_client.text_to_speech.convert(
                text=audio_text,
                voice_id="21m00Tcm4TlvDq8ikWAM",  # Rachel voice
                model_id="eleven_multilingual_v2"
            )
            
            audio_data = b""
            for chunk in audio_generator:
                audio_data += chunk
            
            audio_b64 = base64.b64encode(audio_data).decode()
            audio_url = f"data:audio/mpeg;base64,{audio_b64}"
        except Exception as e:
            logger.warning(f"Audio generation failed (continuing without audio): {e}")
    
    # Save instruction
    instruction_id = f"ins_{uuid.uuid4().hex[:12]}"
    instruction_doc = {
        "instruction_id": instruction_id,
        "appointment_id": request.appointment_id,
        "patient_id": appointment["patient_id"],
        "text_content": text_content,
        "audio_url": audio_url,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.care_instructions.insert_one(instruction_doc)
    
    return CareInstructionResponse(
        instruction_id=instruction_id,
        appointment_id=request.appointment_id,
        patient_id=appointment["patient_id"],
        text_content=text_content,
        audio_url=audio_url,
        created_at=datetime.now(timezone.utc)
    )

@api_router.get("/instructions", response_model=List[CareInstructionResponse])
async def list_instructions(patient_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if current_user["role"] == "patient":
        query["patient_id"] = current_user.get("patient_id")
    elif patient_id:
        query["patient_id"] = patient_id
    
    instructions = await db.care_instructions.find(query, {"_id": 0}).to_list(1000)
    result = []
    for i in instructions:
        created_at = i.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        result.append(CareInstructionResponse(
            instruction_id=i["instruction_id"],
            appointment_id=i["appointment_id"],
            patient_id=i["patient_id"],
            text_content=i["text_content"],
            audio_url=i.get("audio_url"),
            created_at=created_at
        ))
    return result

@api_router.get("/instructions/{instruction_id}", response_model=CareInstructionResponse)
async def get_instruction(instruction_id: str, current_user: dict = Depends(get_current_user)):
    instruction = await db.care_instructions.find_one({"instruction_id": instruction_id}, {"_id": 0})
    if not instruction:
        raise HTTPException(status_code=404, detail="Instruction not found")
    
    if current_user["role"] == "patient":
        if current_user.get("patient_id") != instruction["patient_id"]:
            raise HTTPException(status_code=403, detail="Access denied")
    
    created_at = instruction.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
    
    return CareInstructionResponse(
        instruction_id=instruction["instruction_id"],
        appointment_id=instruction["appointment_id"],
        patient_id=instruction["patient_id"],
        text_content=instruction["text_content"],
        audio_url=instruction.get("audio_url"),
        created_at=created_at
    )

@api_router.delete("/instructions/{instruction_id}", status_code=200)
async def delete_instruction(instruction_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a care instruction"""
    if current_user["role"] != "staff":
        logger.warning(f"Non-staff user attempted to delete instruction: user_id={current_user.get('user_id')}, role={current_user.get('role')}")
        raise HTTPException(status_code=403, detail="Apenas funcionários podem excluir orientações")
    
    # Validate instruction_id format
    if not instruction_id.startswith("ins_"):
        logger.warning(f"Invalid instruction_id format: {instruction_id}")
        raise HTTPException(status_code=400, detail="ID de orientação inválido")
    
    instruction = await db.care_instructions.find_one({"instruction_id": instruction_id}, {"_id": 0})
    if not instruction:
        logger.info(f"Instruction not found: {instruction_id}")
        raise HTTPException(status_code=404, detail="Orientação não encontrada")
    
    logger.info(f"Deleting instruction: {instruction_id}")
    result = await db.care_instructions.delete_one({"instruction_id": instruction_id})
    
    if result.deleted_count == 0:
        logger.error(f"Failed to delete instruction: {instruction_id}")
        raise HTTPException(status_code=500, detail="Falha ao excluir orientação")
    
    logger.info(f"Successfully deleted instruction: {instruction_id}")
    return {"message": "Orientação excluída com sucesso", "deleted": True}

# ============== REMINDERS ==============

@api_router.post("/reminders", response_model=ReminderResponse)
async def create_reminder(reminder: ReminderCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "staff":
        raise HTTPException(status_code=403, detail="Only staff can create reminders")
    
    reminder_id = f"rem_{uuid.uuid4().hex[:12]}"
    scheduled_for = datetime.fromisoformat(reminder.scheduled_for.replace('Z', '+00:00'))
    
    reminder_doc = {
        "reminder_id": reminder_id,
        "patient_id": reminder.patient_id,
        "appointment_id": reminder.appointment_id,
        "message": reminder.message,
        "reminder_type": reminder.reminder_type,
        "scheduled_for": scheduled_for.isoformat(),
        "sent": False,
        "sent_at": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.reminders.insert_one(reminder_doc)
    
    return ReminderResponse(
        reminder_id=reminder_id,
        patient_id=reminder.patient_id,
        appointment_id=reminder.appointment_id,
        message=reminder.message,
        reminder_type=reminder.reminder_type,
        scheduled_for=scheduled_for,
        sent=False,
        created_at=datetime.now(timezone.utc)
    )

@api_router.get("/reminders", response_model=List[ReminderResponse])
async def list_reminders(patient_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if current_user["role"] == "patient":
        query["patient_id"] = current_user.get("patient_id")
    elif patient_id:
        query["patient_id"] = patient_id
    
    reminders = await db.reminders.find(query, {"_id": 0}).to_list(1000)
    result = []
    for r in reminders:
        scheduled_for = r.get("scheduled_for")
        if isinstance(scheduled_for, str):
            scheduled_for = datetime.fromisoformat(scheduled_for.replace('Z', '+00:00'))
        created_at = r.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        sent_at = r.get("sent_at")
        if isinstance(sent_at, str):
            sent_at = datetime.fromisoformat(sent_at.replace('Z', '+00:00'))
        
        result.append(ReminderResponse(
            reminder_id=r["reminder_id"],
            patient_id=r["patient_id"],
            appointment_id=r.get("appointment_id"),
            message=r["message"],
            reminder_type=r["reminder_type"],
            scheduled_for=scheduled_for,
            sent=r.get("sent", False),
            sent_at=sent_at,
            created_at=created_at
        ))
    return result

# ============== FOLLOW-UPS ==============

@api_router.post("/followups", response_model=FollowUpResponse)
async def create_followup(followup: FollowUpCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "staff":
        raise HTTPException(status_code=403, detail="Only staff can create follow-ups")
    
    patient = await db.patients.find_one({"patient_id": followup.patient_id}, {"_id": 0, "name": 1})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    followup_id = f"fup_{uuid.uuid4().hex[:12]}"
    follow_up_date = datetime.fromisoformat(followup.follow_up_date.replace('Z', '+00:00'))
    
    followup_doc = {
        "followup_id": followup_id,
        "patient_id": followup.patient_id,
        "appointment_id": followup.appointment_id,
        "follow_up_date": follow_up_date.isoformat(),
        "reason": followup.reason,
        "notes": followup.notes,
        "completed": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.followups.insert_one(followup_doc)
    
    return FollowUpResponse(
        followup_id=followup_id,
        patient_id=followup.patient_id,
        patient_name=patient["name"],
        appointment_id=followup.appointment_id,
        follow_up_date=follow_up_date,
        reason=followup.reason,
        notes=followup.notes,
        completed=False,
        created_at=datetime.now(timezone.utc)
    )

@api_router.get("/followups", response_model=List[FollowUpResponse])
async def list_followups(patient_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if current_user["role"] == "patient":
        query["patient_id"] = current_user.get("patient_id")
    elif patient_id:
        query["patient_id"] = patient_id
    
    followups = await db.followups.find(query, {"_id": 0}).to_list(1000)
    result = []
    for f in followups:
        patient = await db.patients.find_one({"patient_id": f["patient_id"]}, {"_id": 0, "name": 1})
        follow_up_date = f.get("follow_up_date")
        if isinstance(follow_up_date, str):
            follow_up_date = datetime.fromisoformat(follow_up_date.replace('Z', '+00:00'))
        created_at = f.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        
        result.append(FollowUpResponse(
            followup_id=f["followup_id"],
            patient_id=f["patient_id"],
            patient_name=patient["name"] if patient else None,
            appointment_id=f.get("appointment_id"),
            follow_up_date=follow_up_date,
            reason=f["reason"],
            notes=f.get("notes"),
            completed=f.get("completed", False),
            created_at=created_at
        ))
    return result

@api_router.patch("/followups/{followup_id}/complete")
async def complete_followup(followup_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "staff":
        raise HTTPException(status_code=403, detail="Only staff can complete follow-ups")
    
    result = await db.followups.update_one(
        {"followup_id": followup_id},
        {"$set": {"completed": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    
    return {"message": "Follow-up completed"}

# ============== DASHBOARD STATS ==============

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "staff":
        raise HTTPException(status_code=403, detail="Only staff can view dashboard stats")
    
    total_patients = await db.patients.count_documents({})
    total_appointments = await db.appointments.count_documents({})
    total_instructions = await db.care_instructions.count_documents({})
    pending_followups = await db.followups.count_documents({"completed": False})
    pending_reminders = await db.reminders.count_documents({"sent": False})
    
    # Recent appointments
    recent_appointments = await db.appointments.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "total_patients": total_patients,
        "total_appointments": total_appointments,
        "total_instructions": total_instructions,
        "pending_followups": pending_followups,
        "pending_reminders": pending_reminders,
        "recent_appointments": recent_appointments
    }

# ============== PATIENT PORTAL ==============

@api_router.get("/patient/portal")
async def get_patient_portal(current_user: dict = Depends(get_current_user)):
    """Get all data for patient portal"""
    if current_user["role"] != "patient":
        raise HTTPException(status_code=403, detail="Only patients can access portal")
    
    patient_id = current_user.get("patient_id")
    if not patient_id:
        # Try to find patient by email
        patient = await db.patients.find_one({"email": current_user["email"]}, {"_id": 0})
        if patient:
            patient_id = patient["patient_id"]
            # Update user with patient_id
            await db.users.update_one(
                {"user_id": current_user["user_id"]},
                {"$set": {"patient_id": patient_id}}
            )
    
    if not patient_id:
        return {
            "patient": None,
            "appointments": [],
            "instructions": [],
            "reminders": [],
            "followups": []
        }
    
    patient = await db.patients.find_one({"patient_id": patient_id}, {"_id": 0})
    appointments = await db.appointments.find({"patient_id": patient_id}, {"_id": 0}).to_list(100)
    instructions = await db.care_instructions.find({"patient_id": patient_id}, {"_id": 0}).to_list(100)
    reminders = await db.reminders.find({"patient_id": patient_id}, {"_id": 0}).to_list(100)
    followups = await db.followups.find({"patient_id": patient_id}, {"_id": 0}).to_list(100)
    
    return {
        "patient": patient,
        "appointments": appointments,
        "instructions": instructions,
        "reminders": reminders,
        "followups": followups
    }

# ============== ROOT ==============

@api_router.get("/")
async def root():
    return {"message": "CareFollow API - Sistema de Pós-Atendimento"}

# Add CORS middleware BEFORE including routers
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the router in the main app
app.include_router(api_router)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
