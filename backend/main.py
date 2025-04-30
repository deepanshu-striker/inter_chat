# backend/main.py

import os
import shutil
import uuid
from io import BytesIO

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
import uvicorn

from utils.transcription import transcribe_audio
from agent import Agent
from config import ELEVENLABS_API_KEY, Voices
from elevenlabs.client import ElevenLabs
from fastapi.staticfiles import StaticFiles

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

agent = Agent()
xi_client = ElevenLabs(api_key=ELEVENLABS_API_KEY)

# --- Routes ---

@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    """
    Accepts a .wav upload, saves it, runs transcription (Groq/OpenAI),
    then returns the text and cleans up the file.
    """
    filename = f"{uuid.uuid4()}.wav"
    path = os.path.join(UPLOAD_DIR, filename)
    with open(path, "wb") as buf:
        shutil.copyfileobj(file.file, buf)

    text = transcribe_audio(path)
    os.remove(path)
    return {"transcript": text}


@app.post("/chat")
async def chat(payload: dict):
    """
    Accepts JSON {"text": "..."} and returns {"reply": "..."} from Agent.
    """
    user_text = payload.get("text", "").strip()
    if not user_text:
        return {"reply": ""}
    reply = agent.chat(user_text)
    return {"reply": reply}


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
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)