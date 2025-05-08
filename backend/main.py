# backend/main.py

import os
import shutil
import uuid
from io import BytesIO
from typing import Dict, Optional

from fastapi import FastAPI, UploadFile, File, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
import uvicorn

from utils.transcription import transcribe_audio
from agent import Agent
from config import ELEVENLABS_API_KEY, Voices
from elevenlabs.client import ElevenLabs

# --- Firebase Admin SDK Setup (to be done by USER) ---
# 1. Install Firebase Admin SDK: pip install firebase-admin
# 2. Download your Firebase project's service account key JSON file.
# 3. Set the GOOGLE_APPLICATION_CREDENTIALS environment variable to the path of this JSON file.
import firebase_admin
from firebase_admin import credentials, firestore

try:
    cred = credentials.ApplicationDefault()
    firebase_admin.initialize_app(cred)
except Exception as e:
    # Fallback for local development if GOOGLE_APPLICATION_CREDENTIALS is not set
    # User needs to replace 'path/to/your/serviceAccountKey.json' with actual path
    try:
        cred = credentials.Certificate('c:\\Users\\FCI\\CODES\\int_chat\\interchat-27029-firebase-adminsdk-fbsvc-444e56fd92.json') 
        firebase_admin.initialize_app(cred)
        print("Firebase Admin SDK initialized with local credentials.")
    except Exception as e_local:
        print(f"Firebase Admin SDK not initialized. App will not connect to Firebase. Error: {e_local}")
        # In a real app, you might want to prevent startup or run in a degraded mode.
        pass # Allow app to run without Firebase for now, with operations failing gracefully

db = firestore.client() # Firestore client instance

# --- App setup ---
app = FastAPI()
# Only mount when static/index.html exists (i.e. after npm run build in prod)
if os.path.isdir("static") and os.path.isfile(os.path.join("static", "index.html")):
    app.mount("/", StaticFiles(directory="static", html=True), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],    # In production, set your frontend origin here
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Globals ---
UPLOAD_DIR = "temp_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# agent = Agent() # Assuming Agent class is defined elsewhere or to be defined
# xi_client = ElevenLabs(api_key=ELEVENLABS_API_KEY) # Assuming ElevenLabs and API key are set up

# --- Mockups for Agent and ElevenLabs if not fully implemented yet ---
class MockAgent:
    def get_response(self, text):
        return f"Agent response to: {text}"

class MockElevenLabs:
    def generate(self, text, voice, model):
        print(f"Generating audio for: {text} with voice {voice} using model {model}")
        # In a real scenario, this would return audio data or a path to it.
        # For this backend, we might not directly return audio from /chat, 
        # but if TTS is part of the flow, it would be called here.
        return b"mock_audio_bytes"

agent = Agent() # Replace with actual Agent initialization
# xi_client = MockElevenLabs() # Replace with actual ElevenLabs client if needed for chat response flow

# --- Plan Definitions & User Data Store ---
PLANS = {
    "free": {"name": "Free", "responses": 50, "price_rs": 0},
    "pro": {"name": "Pro", "responses": 300, "price_rs": 499},
    "business": {"name": "Business", "responses": 2000, "price_rs": 1599},
}

# Pydantic Models for API
from pydantic import BaseModel

class UserAuth(BaseModel):
    google_id: str
    email: Optional[str] = None # Email might be useful to store

class PlanSelection(BaseModel):
    plan_id: str # 'free', 'pro', 'business'

class UserStatusResponse(BaseModel):
    user_id: str
    email: Optional[str]
    current_plan: str
    responses_total: int
    responses_used: int
    responses_remaining: int

# --- Helper Functions (Adapted for Firebase Firestore - conceptual) ---
def get_user_or_raise(user_id: str) -> Dict:
    """Fetches user data from Firestore or raises HTTPException if not found."""
    user_ref = db.collection('users').document(user_id)
    user_doc = user_ref.get()
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="User not found in Firebase")
    return user_doc.to_dict()

def initialize_user(user_id: str, email: Optional[str] = None) -> Dict:
    """Initializes a new user in Firestore with the free plan."""
    user_ref = db.collection('users').document(user_id)
    user_data = {
        "email": email,
        "current_plan": "free",
        "responses_total": PLANS["free"]["responses"],
        "responses_used": 0,
        "created_at": firestore.SERVER_TIMESTAMP # Optional: track creation time
    }
    user_ref.set(user_data) # Use .set() with merge=True if you want to update or create
    return user_data

# --- Routes (Adapted for Firebase Firestore - conceptual) ---

@app.post("/register_or_login", response_model=UserStatusResponse)
async def register_or_login_user(payload: UserAuth):
    user_id = payload.google_id # This should be the Firebase UID from Google Sign-In
    
    try:
        user_data = get_user_or_raise(user_id)
    except HTTPException as e:
        if e.status_code == 404: # User not found, initialize them
            user_data = initialize_user(user_id, payload.email)
        else:
            raise e # Re-raise other HTTPExceptions
    except Exception as e:
        # Catch other potential errors during Firebase interaction
        raise HTTPException(status_code=500, detail=f"Firebase error during user check/init: {str(e)}")

    return UserStatusResponse(
        user_id=user_id,
        email=user_data.get("email"),
        current_plan=user_data["current_plan"],
        responses_total=user_data["responses_total"],
        responses_used=user_data["responses_used"],
        responses_remaining=user_data["responses_total"] - user_data["responses_used"]
    )

@app.get("/user/{user_id}/status", response_model=UserStatusResponse)
async def get_user_status(user_id: str):
    user = get_user_or_raise(user_id)

    return UserStatusResponse(
        user_id=user_id,
        email=user.get("email"),
        current_plan=user["current_plan"],
        responses_total=user["responses_total"],
        responses_used=user["responses_used"],
        responses_remaining=user["responses_total"] - user["responses_used"]
    )

@app.post("/user/{user_id}/select_plan", response_model=UserStatusResponse)
async def select_user_plan(user_id: str, payload: PlanSelection):
    user_data_before_update = get_user_or_raise(user_id) # Ensure user exists
    plan_id = payload.plan_id
    if plan_id not in PLANS:
        raise HTTPException(status_code=400, detail=f"Invalid plan ID: {plan_id}. Available plans: {list(PLANS.keys())}")
    
    new_plan_details = {
        "current_plan": plan_id,
        "responses_total": PLANS[plan_id]["responses"],
        "responses_used": 0, # Resetting for simplicity; or implement carry-over/proration
        "updated_at": firestore.SERVER_TIMESTAMP # Optional: track update time
    }
    db.collection('users').document(user_id).update(new_plan_details)

    updated_user_data = {**user_data_before_update, **new_plan_details} # Merge for response

    return UserStatusResponse(
        user_id=user_id,
        email=updated_user_data.get("email"),
        current_plan=updated_user_data["current_plan"],
        responses_total=updated_user_data["responses_total"],
        responses_used=updated_user_data["responses_used"],
        responses_remaining=updated_user_data["responses_total"] - updated_user_data["responses_used"]
    )


@app.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...), 
    user_id: Optional[str] = Header(None, alias="user-id")
):
    """
    Accepts a .wav upload, saves it, runs transcription (Groq/OpenAI),
    then returns the text and cleans up the file.
    TODO: Integrate user response tracking similar to /chat endpoint if transcriptions count to quota.
    """
    # Log the received user ID for debugging
    print(f"Received user ID header: {user_id}")
    
    if user_id:
        try:
            user = get_user_or_raise(user_id) 
            # Add response tracking logic here if transcriptions count towards quota
            # e.g., check user["responses_used"] < user["responses_total"]
            # db.collection('users').document(user_id).update({"responses_used": firestore.Increment(1)})
        except HTTPException as e:
            # Handle user not found or other Firebase related issues
            raise HTTPException(status_code=e.status_code, detail=f"Transcription tracking error: {e.detail}")
    else:
        # Handle anonymous transcriptions if allowed, or raise error
        raise HTTPException(status_code=401, detail="User ID required for transcription")

    filename = f"{uuid.uuid4()}.wav"
    path = os.path.join(UPLOAD_DIR, filename)
    with open(path, "wb") as buf:
        shutil.copyfileobj(file.file, buf)

    text = transcribe_audio(path)
    os.remove(path)
    return {"transcript": text}

class ChatPayload(BaseModel):
    user_id: str
    message: str

@app.post("/chat")
async def chat(payload: ChatPayload):
    user_id = payload.user_id
    user_message = payload.message

    user = get_user_or_raise(user_id)

    if user["responses_used"] >= user["responses_total"]:
        raise HTTPException(status_code=403, detail="No responses remaining. Please upgrade your plan.")

    # Call agent to get response
    try:
        text_response = agent.chat(user_message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent failed to respond: {str(e)}")

    # Update response count in Firebase
    try:
        db.collection('users').document(user_id).update({
            "responses_used": firestore.Increment(1),
            "last_activity_at": firestore.SERVER_TIMESTAMP
        })
    except Exception as e:
        print(f"Error updating Firebase response count for {user_id}: {e}")
        # Optional: raise HTTPException if necessary

    user["responses_used"] += 1

    return {
        "user_id": user_id,
        "response": text_response,
        "responses_remaining": user["responses_total"] - user["responses_used"]
    }


@app.post("/synthesize")
async def synthesize(payload: dict):
    """
    Accepts JSON:
      {
        "text": "...",
        "voice_id": "optional-voice-id"   # defaults to Voices.ADAM
      }
    Returns:
      - MP3 audio bytes of the synthesized speech
    """
    text = payload.get("text", "").strip()
    if not text:
        return Response(content=b"", media_type="audio/mpeg")

    voice_id = payload.get("voice_id", Voices.ADAM)

    # Call ElevenLabs TTS
    stream = xi_client.text_to_speech.convert(
        voice_id=voice_id,
        optimize_streaming_latency="0",
        output_format="mp3_22050_32",
        text=text,
        model_id="eleven_multilingual_v2",
    )

    # Collect into a single bytes buffer
    buf = BytesIO()
    for chunk in stream:
        if chunk:
            buf.write(chunk)
    audio_bytes = buf.getvalue()

    return Response(content=audio_bytes, media_type="audio/mpeg")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)