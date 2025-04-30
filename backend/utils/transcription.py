# backend/utils/transcription.py

import os
import requests
import openai

# Toggle via your .env: USE_GROQ=true/false
USE_GROQ = os.getenv("USE_GROQ", "false").lower() == "true"


def transcribe_audio(file_path: str) -> str:
    """
    Transcribe the audio at `file_path` using either Groq or OpenAI Whisper.
    If Groq fails (e.g. Unicode errors), it falls back to OpenAI.
    """
    if USE_GROQ:
        try:
            return _transcribe_with_groq(file_path)
        except Exception as e:
            print(f"⚠️ Groq transcription failed ({e}), falling back to OpenAI Whisper.")
    return _transcribe_with_openai(file_path)


def _transcribe_with_groq(file_path: str) -> str:
    """
    Use Groq Whisper-large-v3 model to transcribe. May raise on Unicode issues.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("Missing GROQ_API_KEY")

    url = "https://api.groq.com/openai/v1/audio/transcriptions"
    with open(file_path, "rb") as f:
        # Explicitly name the file and mime type to avoid weird header generation
        files = {"file": ("temp.wav", f, "audio/wav")}
        data = {"model": "whisper-large-v3"}
        headers = {"Authorization": f"Bearer {api_key}"}
        response = requests.post(url, headers=headers, files=files, data=data)
    response.raise_for_status()
    return response.json().get("text", "")


def _transcribe_with_openai(file_path: str) -> str:
    """
    Use OpenAI's Whisper-1 model to transcribe audio.
    """
    openai.api_key = os.getenv("OPENAI_API_KEY")
    if not openai.api_key:
        raise ValueError("Missing OPENAI_API_KEY")

    with open(file_path, "rb") as f:
        transcript = openai.Audio.transcribe("whisper-1", f)

    return transcript.get("text", "")
