import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

from prompt import SYSTEM_PROMPT

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")

GEMINI_API_KEY = (
    os.getenv("GEMINI_API_KEY", "").strip()
    or os.getenv("GOOGLE_API_KEY", "").strip()
)
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip() or "gemini-2.5-flash"

app = FastAPI(title="Retro Chatbot 1997")
app.mount("/static", StaticFiles(directory=ROOT / "static"), name="static")


class ChatMessage(BaseModel):
    role: str
    content: str = Field(min_length=1, max_length=8000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=40)


class ChatResponse(BaseModel):
    reply: str
    model: str
    year: int = 1997


def _to_gemini_contents(messages: list[ChatMessage]) -> list[types.Content]:
    contents: list[types.Content] = []
    for msg in messages:
        role = "user" if msg.role == "user" else "model"
        text = msg.content.strip()
        if not text:
            continue
        contents.append(
            types.Content(role=role, parts=[types.Part(text=text)])
        )
    if not contents:
        raise HTTPException(status_code=400, detail="Boş mesaj.")
    if contents[-1].role != "user":
        raise HTTPException(status_code=400, detail="Son mesaj kullanıcıdan olmalı.")
    return contents


@app.get("/")
async def index():
    return FileResponse(ROOT / "static" / "index.html")


@app.get("/api/health")
async def health():
    return {
        "ok": True,
        "year": 1997,
        "model": GEMINI_MODEL,
        "key_configured": bool(GEMINI_API_KEY),
    }


@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY .env dosyasında yok. Anahtarı ekleyip sunucuyu yeniden başlat.",
        )

    client = genai.Client(api_key=GEMINI_API_KEY)
    contents = _to_gemini_contents(req.messages)

    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=0.85,
            ),
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gemini hattı meşgul: {exc}") from exc

    reply = (response.text or "").strip()
    if not reply:
        reply = "*statik* ... bağlantı koptu. (56K) Tekrar dener misin?"

    return ChatResponse(reply=reply, model=GEMINI_MODEL)
