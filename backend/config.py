import os

OPENAI_API_KEY     = os.getenv("OPENAI_API_KEY")
GROQ_API_KEY       = os.getenv("GROQ_API_KEY")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")

class Voices:
    ADAM = "your-elevenlabs-voice-id-here"
