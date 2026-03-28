"""
CardWise Backend — FastAPI server
Endpoints for card data, ROI calculation, AI chat, and receipt analysis.
"""

import os
import json
import asyncio
import base64
from fastapi import FastAPI, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai
from google.genai import types
from PIL import Image
import io

from card_data import get_all_cards, get_card, get_cards_context_for_ai, CARD_DATABASE
from agent import get_client, get_system_instruction, calculate_roi, get_swipe_recommendation

load_dotenv()

app = FastAPI(title="CardWise API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://cardwise-frontend-382226112053.us-central1.run.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# In-memory chat history per session
chat_histories: dict = {}


# ─── Request / Response Models ────────────────────────────────────────────────

class ChatMessage(BaseModel):
    message: str
    session_id: str
    user_cards: list = []
    wealth_context: str = ""  # e.g. "net worth $88k, liquid $30k, monthly income $7.5k"


class ROIRequest(BaseModel):
    spending: dict
    card_ids: list


class SwipeRequest(BaseModel):
    card_ids: list
    category: str
    merchant: str = ""


# ─── Card Data Endpoints ───────────────────────────────────────────────────────

@app.get("/cards")
def list_cards():
    return get_all_cards()


@app.get("/cards/{card_id}")
def get_card_detail(card_id: str):
    card = get_card(card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return card


# ─── ROI Calculator ───────────────────────────────────────────────────────────

@app.post("/roi")
def calculate_card_roi(req: ROIRequest):
    results = calculate_roi(req.spending, req.card_ids)
    return {"results": results}


# ─── Swipe Advisor ────────────────────────────────────────────────────────────

@app.post("/swipe")
def swipe_advisor(req: SwipeRequest):
    recs = get_swipe_recommendation(req.card_ids, req.category, req.merchant)
    return {"recommendations": recs}


# ─── AI Chat ──────────────────────────────────────────────────────────────────

@app.post("/chat")
async def chat(msg: ChatMessage):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")

    client = get_client(GEMINI_API_KEY)
    system_instruction = get_system_instruction()

    # Build conversation history
    history = chat_histories.get(msg.session_id, [])

    # Inject card + wealth context into the first message of a session
    user_card_context = ""
    if not history:
        held_cards = [CARD_DATABASE[cid]["name"] for cid in msg.user_cards if cid in CARD_DATABASE]
        if held_cards:
            user_card_context += f"[User's current cards: {', '.join(held_cards)}]\n"
        if msg.wealth_context:
            user_card_context += f"[User's financial profile: {msg.wealth_context}]\n"
        if user_card_context:
            user_card_context += "\n"

    full_message = user_card_context + msg.message

    # Append user turn to history
    history.append(types.Content(role="user", parts=[types.Part(text=full_message)]))

    async def generate():
        full_response = ""
        try:
            response = client.models.generate_content_stream(
                model="gemini-2.5-flash",
                contents=history,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.7,
                    max_output_tokens=1024,
                ),
            )
            for chunk in response:
                if chunk.text:
                    full_response += chunk.text
                    yield chunk.text
        except Exception as e:
            yield f"\n\n[Error: {e}]"
            return

        # Save assistant response to history
        history.append(types.Content(role="model", parts=[types.Part(text=full_response)]))
        chat_histories[msg.session_id] = history

    return StreamingResponse(generate(), media_type="text/plain")


# ─── Media Analysis (Vision + Video) ─────────────────────────────────────────

ANALYSIS_PROMPT_TEMPLATE = """Analyze this receipt/purchase media and extract:
1. Merchant name
2. Total amount
3. Spending category (one of: dining, groceries, travel, gas, entertainment, shopping, other)

The user holds these cards: {card_names}

Using ONLY this verified card data:
{card_context}

Recommend which card they should have used and why. Be concise and specific.

Respond in JSON only (no markdown):
{{
  "merchant": "...",
  "amount": 0.00,
  "category": "...",
  "best_card_name": "...",
  "earning_rate": 0,
  "explanation": "...",
  "tip": "..."
}}"""


def _parse_ai_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        parts = text.split("```")
        text = parts[1] if len(parts) > 1 else text
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())


@app.post("/analyze-media")
async def analyze_media(file: UploadFile = File(...), user_cards: str = "[]"):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")

    client = get_client(GEMINI_API_KEY)
    file_bytes = await file.read()
    mime_type = file.content_type or "image/jpeg"

    card_ids = json.loads(user_cards)
    card_context = get_cards_context_for_ai()
    held_card_names = [CARD_DATABASE[c]["name"] for c in card_ids if c in CARD_DATABASE]
    prompt = ANALYSIS_PROMPT_TEMPLATE.format(
        card_names=held_card_names or "no cards selected",
        card_context=card_context,
    )

    try:
        if mime_type.startswith("video/"):
            # Upload via Files API for video (handles large files & processing)
            import tempfile, time
            suffix = ".mp4" if "mp4" in mime_type else ".mov"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(file_bytes)
                tmp_path = tmp.name

            uploaded = client.files.upload(
                file=tmp_path,
                config={"mime_type": mime_type, "display_name": file.filename or "receipt_video"},
            )

            # Poll until Gemini finishes processing the video
            max_wait = 60
            waited = 0
            while getattr(uploaded, "state", None) and str(uploaded.state) in ("FileState.PROCESSING", "PROCESSING"):
                if waited >= max_wait:
                    break
                time.sleep(2)
                waited += 2
                uploaded = client.files.get(name=uploaded.name)

            os.unlink(tmp_path)

            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[uploaded, types.Part(text=prompt)],
            )

            try:
                client.files.delete(name=uploaded.name)
            except Exception:
                pass
        else:
            # Image: inline bytes (faster, no upload needed)
            image = Image.open(io.BytesIO(file_bytes))
            img_buf = io.BytesIO()
            image.save(img_buf, format="JPEG")

            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[
                    types.Part(inline_data=types.Blob(mime_type="image/jpeg", data=img_buf.getvalue())),
                    types.Part(text=prompt),
                ],
            )

        result = _parse_ai_json(response.text)
    except json.JSONDecodeError:
        result = {"raw": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return result


# Keep old endpoint as alias
@app.post("/analyze-receipt")
async def analyze_receipt(file: UploadFile = File(...), user_cards: str = "[]"):
    return await analyze_media(file, user_cards)


# ─── Gemini Live API — Bidirectional Voice + Vision WebSocket ─────────────────

LIVE_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025"


@app.websocket("/live")
async def live_session(websocket: WebSocket):
    await websocket.accept()

    if not GEMINI_API_KEY:
        await websocket.send_json({"type": "error", "message": "GEMINI_API_KEY not configured"})
        await websocket.close()
        return

    client = get_client(GEMINI_API_KEY)
    system_instruction = get_system_instruction()

    live_config = types.LiveConnectConfig(
        response_modalities=["AUDIO"],
        system_instruction=system_instruction,
        output_audio_transcription=types.AudioTranscriptionConfig(),
        # Disable auto-VAD so we control turn boundaries explicitly —
        # required for reliable multi-turn in both voice and text modes.
        realtime_input_config=types.RealtimeInputConfig(
            automatic_activity_detection=types.AutomaticActivityDetection(disabled=True)
        ),
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Aoede")
            )
        ),
    )

    try:
        async with client.aio.live.connect(model=LIVE_MODEL, config=live_config) as session:
            await websocket.send_json({"type": "ready"})

            async def gemini_to_browser():
                """Stream Gemini responses (audio + transcript) to the browser.

                session.receive() yields messages for ONE turn then stops at
                turn_complete.  Loop so we keep receiving across all turns.
                """
                while True:
                    try:
                        async for msg in session.receive():
                            if msg.data:  # PCM16 audio at 24 kHz
                                await websocket.send_json({
                                    "type": "audio",
                                    "data": base64.b64encode(msg.data).decode(),
                                })
                            if msg.text:
                                await websocket.send_json({"type": "text", "text": msg.text})
                            sc = getattr(msg, "server_content", None)
                            if sc:
                                # Output transcription (text alongside audio)
                                tr = getattr(sc, "output_transcription", None)
                                if tr and getattr(tr, "text", None):
                                    await websocket.send_json({"type": "transcript", "text": tr.text})
                                if getattr(sc, "turn_complete", False):
                                    await websocket.send_json({"type": "turn_complete"})
                    except asyncio.CancelledError:
                        raise  # propagate cancellation — task is being shut down
                    except Exception:
                        break  # session or WebSocket error; exit loop

            async def browser_to_gemini():
                """Forward browser audio/image/text to Gemini Live.

                IMPORTANT: Only use send_realtime_input throughout — mixing
                send_client_content with send_realtime_input breaks multi-turn.

                Audio turn protocol:
                  client sends {"type":"voice_start"} → we send activity_start ONCE
                  client sends raw PCM bytes         → we forward audio (no activity_start)
                  client sends {"type":"audio_end"}  → we send activity_end
                """
                audio_active = False  # True between voice_start and audio_end

                while True:
                    try:
                        msg = await websocket.receive()
                    except WebSocketDisconnect:
                        break

                    if "bytes" in msg:
                        # Raw PCM16 audio — only forward if an activity is open
                        if audio_active:
                            await session.send_realtime_input(
                                audio=types.Blob(data=msg["bytes"], mime_type="audio/pcm;rate=16000")
                            )
                    elif "text" in msg:
                        data = json.loads(msg["text"])
                        kind = data.get("type")
                        if kind == "voice_start":
                            # Client signals start of a voice turn — open activity ONCE
                            if not audio_active:
                                await session.send_realtime_input(activity_start=types.ActivityStart())
                                audio_active = True
                        elif kind == "audio_end":
                            # Client signals end of voice turn — close activity
                            if audio_active:
                                await session.send_realtime_input(activity_end=types.ActivityEnd())
                                audio_active = False
                        elif kind == "text":
                            await session.send_realtime_input(activity_start=types.ActivityStart())
                            await session.send_realtime_input(text=data["text"])
                            await session.send_realtime_input(activity_end=types.ActivityEnd())
                        elif kind == "image":
                            img_bytes = base64.b64decode(data["data"])
                            await session.send_realtime_input(activity_start=types.ActivityStart())
                            await session.send_realtime_input(
                                media=types.Blob(data=img_bytes, mime_type="image/jpeg")
                            )
                            await session.send_realtime_input(
                                text="Analyze this image. What merchant is this, how much is it, and which of my cards should I use?"
                            )
                            await session.send_realtime_input(activity_end=types.ActivityEnd())
                        elif kind == "cards":
                            held = [CARD_DATABASE[c]["name"] for c in data.get("ids", []) if c in CARD_DATABASE]
                            if held:
                                await session.send_realtime_input(
                                    text=f"[Context: The user currently holds these cards: {', '.join(held)}. Always factor this in when giving card recommendations.]"
                                )
                        elif kind == "wealth":
                            summary = data.get("summary", "")
                            if summary:
                                await session.send_realtime_input(
                                    text=f"[Context: User's financial profile — {summary}. Use this when answering any affordability questions.]"
                                )
                        elif kind == "context":
                            text = data.get("text", "")
                            if text:
                                await session.send_realtime_input(text=text)

            # Run both halves concurrently; cancel the other when one exits
            g2b = asyncio.ensure_future(gemini_to_browser())
            b2g = asyncio.ensure_future(browser_to_gemini())
            done, pending = await asyncio.wait(
                [g2b, b2g], return_when=asyncio.FIRST_COMPLETED
            )
            for t in pending:
                t.cancel()
                try:
                    await t
                except (asyncio.CancelledError, Exception):
                    pass

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        try:
            await websocket.send_json({"type": "error", "message": str(exc)})
        except Exception:
            pass


# ─── Health Check ─────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "gemini_configured": bool(GEMINI_API_KEY)}


@app.get("/test-key")
async def test_key():
    """Verify the API key actually works by making a minimal Gemini call."""
    if not GEMINI_API_KEY:
        return {"ok": False, "error": "GEMINI_API_KEY not set"}
    try:
        client = get_client(GEMINI_API_KEY)
        resp = client.models.generate_content(
            model="gemini-2.5-flash",
            contents="Say OK",
            config=types.GenerateContentConfig(max_output_tokens=5),
        )
        return {"ok": True, "response": resp.text}
    except Exception as e:
        return {"ok": False, "error": str(e)}
