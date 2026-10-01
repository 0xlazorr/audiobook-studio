"""
FastAPI application for Audiobook Studio.
Provides web UI, PDF parsing, voice & tone configuration,
real-time audio previews, and full audiobook generation & downloads.
"""

import os
import uuid
import asyncio
import shutil
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.config import (
    BASE_DIR, UPLOADS_DIR, OUTPUTS_DIR, CACHE_DIR,
    MAX_UPLOAD_SIZE_MB, FILE_RETENTION_HOURS
)
from app.voices_data import CURATED_VOICES, TONE_PRESETS
from app.pdf_processor import PDFProcessor
from app.tts_engine import TTSEngine
from app.audiobook_builder import AudiobookBuilder
from app.cleanup_service import purge_old_files, periodic_cleanup_loop
import edge_tts

app = FastAPI(title="Audiobook Studio", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")
app.mount("/outputs", StaticFiles(directory=OUTPUTS_DIR), name="outputs")
app.mount("/cache", StaticFiles(directory=CACHE_DIR), name="cache")

tts_engine = TTSEngine(cache_dir=CACHE_DIR)

# In-memory storage for active jobs and parsed books
JOBS: Dict[str, Dict[str, Any]] = {}
BOOKS: Dict[str, Dict[str, Any]] = {}
ACTIVE_WEBSOCKETS: Dict[str, List[WebSocket]] = {}

# Full voice list cache
ALL_VOICES_CACHE: List[Dict[str, Any]] = []


async def _load_voice_catalog():
    global ALL_VOICES_CACHE
    try:
        raw_voices = await edge_tts.list_voices()
        ALL_VOICES_CACHE = [
            {
                "id": v["ShortName"],
                "name": v["FriendlyName"].split("-")[-1].strip() if "-" in v["FriendlyName"] else v["ShortName"],
                "gender": v["Gender"],
                "locale": v["Locale"],
                "suggested_codec": v.get("SuggestedCodec", "audio-24khz-48kbitrate-mono-mp3")
            }
            for v in raw_voices
        ]
    except Exception as e:
        print(f"Warning: Failed to fetch online voice catalog: {e}")


@app.on_event("startup")
async def startup_event():
    # Non-blocking voice catalog background fetch
    asyncio.create_task(_load_voice_catalog())

    # Only run background disk cleanup loops if not in a serverless environment
    if not os.getenv("VERCEL"):
        asyncio.create_task(periodic_cleanup_loop())
        try:
            purge_old_files(FILE_RETENTION_HOURS)
        except Exception:
            pass


@app.get("/api/config")
async def get_app_config():
    """Returns application settings including retention limits."""
    return {
        "retention_hours": FILE_RETENTION_HOURS
    }


@app.post("/api/cleanup")
async def trigger_cleanup():
    """Manually triggers purging of temporary files older than retention limit."""
    deleted, freed_mb = purge_old_files(FILE_RETENTION_HOURS)
    return {"deleted_files": deleted, "freed_mb": freed_mb}


async def broadcast_progress(job_id: str, data: Dict[str, Any]):
    """Sends real-time progress update to connected WebSockets."""
    if job_id in JOBS:
        JOBS[job_id].update(data)
    if job_id in ACTIVE_WEBSOCKETS:
        for ws in list(ACTIVE_WEBSOCKETS[job_id]):
            try:
                await ws.send_json(data)
            except Exception:
                try:
                    ACTIVE_WEBSOCKETS[job_id].remove(ws)
                except ValueError:
                    pass


@app.get("/", response_class=HTMLResponse)
async def index():
    template_path = os.path.join(BASE_DIR, "templates", "index.html")
    with open(template_path, "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())


@app.get("/api/voices")
async def get_voices():
    """Returns curated voice narrators, tone presets, and complete voice library."""
    return {
        "curated": CURATED_VOICES,
        "presets": TONE_PRESETS,
        "all_count": len(ALL_VOICES_CACHE),
        "all_voices": ALL_VOICES_CACHE
    }


@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected.")

    ext = os.path.splitext(file.filename)[1].lower()
    allowed_exts = [".pdf", ".epub", ".docx", ".txt", ".md", ".markdown", ".html", ".htm", ".rtf"]
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Supported formats: PDF, EPUB, DOCX, TXT, Markdown, HTML, RTF."
        )

    book_id = str(uuid.uuid4())
    upload_path = os.path.join(UPLOADS_DIR, f"{book_id}{ext}")

    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File exceeds maximum size of {MAX_UPLOAD_SIZE_MB}MB.")

    with open(upload_path, "wb") as f:
        f.write(content)

    try:
        book_data = PDFProcessor.extract_document(upload_path, original_filename=file.filename)
        book_data["book_id"] = book_id
        book_data["original_filename"] = file.filename
        book_data["file_path"] = upload_path
        BOOKS[book_id] = book_data

        return book_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")





class PreviewVoiceRequest(BaseModel):
    voice: str
    rate: str = "+0%"
    pitch: str = "+0Hz"
    sample_text: Optional[str] = None


@app.post("/api/preview-voice")
async def preview_voice(req: PreviewVoiceRequest):
    """Generates a brief instant preview for a selected voice and tone."""
    text = req.sample_text
    if not text:
        # Find sample text from curated list
        for v in CURATED_VOICES:
            if v["id"] == req.voice:
                text = v["sample"]
                break
        if not text:
            text = "Welcome to Audiobook Studio. Listen to your favorite books with natural inflection and pacing."

    try:
        mp3_path, _ = await tts_engine.generate_preview(
            text=text,
            voice=req.voice,
            rate=req.rate,
            pitch=req.pitch
        )
        filename = os.path.basename(mp3_path)
        return {"audio_url": f"/cache/{filename}", "text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audio preview generation failed: {str(e)}")


class PreviewChapterRequest(BaseModel):
    book_id: str
    chapter_index: int
    voice: str
    rate: str = "+0%"
    pitch: str = "+0Hz"
    custom_text: Optional[str] = None


@app.post("/api/preview-chapter")
async def preview_chapter(req: PreviewChapterRequest):
    """Generates an instant 30-second preview of the selected chapter with synchronized sentence timings."""
    if req.book_id not in BOOKS:
        raise HTTPException(status_code=404, detail="Book not found.")

    book = BOOKS[req.book_id]
    chapter = next((ch for ch in book["chapters"] if ch["index"] == req.chapter_index), None)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found.")

    text_to_preview = req.custom_text if req.custom_text else chapter["content"]
    title_to_preview = chapter["title"]

    try:
        mp3_path, sentences = await tts_engine.generate_preview(
            text=text_to_preview,
            voice=req.voice,
            rate=req.rate,
            pitch=req.pitch,
            title=title_to_preview
        )
        filename = os.path.basename(mp3_path)
        return {
            "audio_url": f"/cache/{filename}",
            "chapter_title": title_to_preview,
            "voice": req.voice,
            "sentences": sentences
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chapter preview failed: {str(e)}")


class GenerateAudiobookRequest(BaseModel):
    book_id: str
    voice: str
    rate: str = "+0%"
    pitch: str = "+0Hz"
    title: Optional[str] = None
    author: Optional[str] = None
    selected_chapters: Optional[List[int]] = None
    format_preference: Optional[str] = "both"  # "single", "playlist", or "both"


async def run_audiobook_synthesis(job_id: str, req: GenerateAudiobookRequest):
    """Background task to synthesize requested chapters and generate single MP3, playlist ZIP, or both."""
    book = BOOKS[req.book_id]
    book_title = req.title or book.get("title", "Audiobook")
    author = req.author or book.get("author", "Unknown Author")
    format_pref = req.format_preference or "both"
    
    # Filter chapters
    all_chapters = book["chapters"]
    if req.selected_chapters:
        target_chapters = [ch for ch in all_chapters if ch["index"] in req.selected_chapters]
    else:
        target_chapters = all_chapters

    total_chapters = len(target_chapters)
    if total_chapters == 0:
        await broadcast_progress(job_id, {"status": "error", "message": "No chapters selected."})
        return

    job_output_dir = os.path.join(OUTPUTS_DIR, job_id)
    os.makedirs(job_output_dir, exist_ok=True)

    synthesized_chapters = []

    for i, ch in enumerate(target_chapters):
        ch_idx = ch["index"]
        ch_title = ch["title"]
        await broadcast_progress(job_id, {
            "status": "processing",
            "current_chapter": i + 1,
            "total_chapters": total_chapters,
            "chapter_title": ch_title,
            "percent": round((i / total_chapters) * 90, 1),
            "message": f"Synthesizing Chapter {i + 1} of {total_chapters}: {ch_title}"
        })

        safe_ch_title = "".join(c for c in ch_title if c.isalnum() or c in (" ", "-", "_"))[:30].strip()
        ch_output_file = os.path.join(job_output_dir, f"chapter_{ch_idx:02d}_{safe_ch_title}.mp3")

        def progress_cb(pct, msg):
            asyncio.create_task(broadcast_progress(job_id, {
                "chapter_progress": pct,
                "message": msg
            }))

        try:
            await tts_engine.synthesize_chapter(
                chapter_index=ch_idx,
                title=ch_title,
                text=ch["content"],
                voice=req.voice,
                rate=req.rate,
                pitch=req.pitch,
                output_file=ch_output_file,
                progress_callback=progress_cb
            )
            synthesized_chapters.append({
                "path": ch_output_file,
                "title": ch_title,
                "index": ch_idx,
                "url": f"/outputs/{job_id}/{os.path.basename(ch_output_file)}"
            })
        except Exception as e:
            print(f"Error synthesizing chapter {ch_idx}: {e}")
            await broadcast_progress(job_id, {
                "status": "error",
                "message": f"Error synthesizing {ch_title}: {str(e)}"
            })
            return

    # Master Audiobook / Playlist packaging
    await broadcast_progress(job_id, {
        "status": "finalizing",
        "percent": 95,
        "message": "Packaging audiobook files according to your preference..."
    })

    safe_book_title = "".join(c for c in book_title if c.isalnum() or c in (" ", "-", "_")).strip()
    master_mp3_path = os.path.join(job_output_dir, f"{safe_book_title}_Full_Audiobook.mp3")
    zip_path = os.path.join(job_output_dir, f"{safe_book_title}_Chapters_Bundle.zip")

    try:
        master_mp3_url = None
        zip_url = None

        # 1. Merge into single master MP3 if requested
        if format_pref in ("single", "both"):
            chapter_paths = [ch["path"] for ch in synthesized_chapters]
            AudiobookBuilder.merge_chapters(chapter_paths, master_mp3_path, title=book_title, author=author)
            master_mp3_url = f"/outputs/{job_id}/{os.path.basename(master_mp3_path)}"

        # 2. Package into chapter playlist ZIP (M3U + M3U8) if requested
        if format_pref in ("playlist", "both"):
            AudiobookBuilder.create_zip_package(synthesized_chapters, zip_path, book_title=book_title, author=author)
            zip_url = f"/outputs/{job_id}/{os.path.basename(zip_path)}"

        result_data = {
            "status": "completed",
            "percent": 100,
            "message": "Audiobook generated successfully!",
            "format_preference": format_pref,
            "master_mp3_url": master_mp3_url,
            "zip_url": zip_url,
            "chapters": synthesized_chapters,
            "book_title": book_title,
            "author": author
        }
        await broadcast_progress(job_id, result_data)

    except Exception as e:
        await broadcast_progress(job_id, {
            "status": "error",
            "message": f"Failed to assemble final audiobook: {str(e)}"
        })


@app.post("/api/generate-audiobook")
async def generate_audiobook(req: GenerateAudiobookRequest, background_tasks: BackgroundTasks):
    """Starts full audiobook conversion in the background."""
    if req.book_id not in BOOKS:
        raise HTTPException(status_code=404, detail="Book not found.")

    job_id = str(uuid.uuid4())
    JOBS[job_id] = {
        "job_id": job_id,
        "book_id": req.book_id,
        "status": "queued",
        "percent": 0,
        "message": "Starting conversion...",
        "created_at": str(asyncio.get_event_loop().time())
    }

    background_tasks.add_task(run_audiobook_synthesis, job_id, req)
    return {"job_id": job_id, "status": "queued"}


@app.get("/api/audiobook-status/{job_id}")
async def get_audiobook_status(job_id: str):
    """Polls status for a generation job."""
    if job_id not in JOBS:
        raise HTTPException(status_code=404, detail="Job not found.")
    return JOBS[job_id]


@app.websocket("/ws/progress/{job_id}")
async def websocket_endpoint(websocket: WebSocket, job_id: str):
    """Real-time progress reporting via WebSocket."""
    await websocket.accept()
    if job_id not in ACTIVE_WEBSOCKETS:
        ACTIVE_WEBSOCKETS[job_id] = []
    ACTIVE_WEBSOCKETS[job_id].append(websocket)

    # Send current state if available
    if job_id in JOBS:
        await websocket.send_json(JOBS[job_id])

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        if job_id in ACTIVE_WEBSOCKETS and websocket in ACTIVE_WEBSOCKETS[job_id]:
            ACTIVE_WEBSOCKETS[job_id].remove(websocket)
