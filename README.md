# Audiobook Studio 🎧📖

A literary, distraction-free web application that turns any **PDF, EPUB, Word (DOCX), Markdown, HTML, or Text** file into a human-sounding audiobook.

Featuring Microsoft Edge's latest high-emotion multilingual neural narrators, real-time read-along sentence highlighting (like Audible / Kindle Immersion Reading), reading tone presets, Kindle-style dark mode, and an automated background disk cleaner to prevent server storage clogging.

---

## ✨ Features

- **📄 Universal Document Ingestion**:
  - Supports **PDF**, **EPUB eBooks**, **Word (.docx)**, **Markdown (.md)**, **HTML**, **Plain Text (.txt)**, and **Rich Text (.rtf)**.
  - Automatically cleans headers, footers, orphan page numbers, and hyphenated word breaks (`infor-\nmation` &rarr; `information`).
  - Automatically segments chapters via eBook structure, PDF bookmarks, Word heading styles, or Markdown `# Heading` tags.

- **🎙️ High-Emotion Neural Narrators**:
  - Includes modern neural voices trained for authentic human conversational warmth and emotional range:
    - ⭐ **Andrew** (*US English — Emotional Storyteller & Conversational*)
    - ⭐ **Ava** (*US English — Expressive & Empathetic*)
    - ⭐ **Brian** (*US English — Deep Emotional Baritone*)
    - ⭐ **Emma** (*US English — Dynamic Narrative*)
    - ⭐ **Neerja** (*Indian English — Expressive Storyteller*)
    - **Guy** (*US English — Warm & Conversational*)
    - **Christopher** (*US English — Classic Dramatic Narrator*)
    - **Ryan** (*British English — Theatrical RP*)
    - **Sonia** (*British English — Refined & Gentle*)
    - **William** (*Australian English — Charismatic Storyteller*)
    - **Emily** (*Irish English — Melodic Lilt*)
    - **Liam** (*Canadian English — Smooth Delivery*)
    - **Luke** (*South African English — Resonant*)
    - **Abeo** (*Nigerian English — Warm & Rich*)

- **🎭 Multiple Reading Tones & Pacing**:
  - **Natural Cadence (1.0x)**: Everyday speaking speed with uncompressed human pauses.
  - **Storyteller (0.95x)**: Slightly deliberate pace with scene pauses for fiction.
  - **Calm & Soothing (0.88x)**: Gentle, relaxing tempo for bedtime listening.
  - **Brisk & Efficient (1.15x)**: Rapid listening for educational or business books.
  - **Dramatic & Deep (0.92x, -5Hz)**: Resonant lower register for suspense and mystery.
  - **Authoritative Documentary (1.0x, -2Hz)**: Polished, intellectual delivery.

- **📖 Read-Along Immersion Mode**:
  - Text is formatted like a printed book with [Newsreader](https://fonts.google.com/specimen/Newsreader) serif typography.
  - In audio preview mode, the speech engine streams sentence boundaries so the **exact sentence being read highlights in warm yellow in real time**.
  - Clicking any sentence jumps audio playback directly to that spot.

- **🌙 Kindle-Style Dark Mode**:
  - 1-click toggle between warm paper daylight mode and warm charcoal night mode (`#141311`).
  - No harsh neon or artificial gradients.

- **📦 Audiobook Downloads & Compact File Sizes**:
  - Speech-optimized 24kHz mono MP3 at 48 kbps (~21 MB per hour of audio).
  - **Master Audiobook (.MP3)**: Losslessly concatenated single audio file with embedded ID3 metadata tags (Title, Author, Album, Genre).
  - **Chapters Bundle (.ZIP)**: Individual chapter MP3s organized with an `.m3u` playlist for phone players.

- **🧹 Automated Disk Storage Cleaner**:
  - Automatic background garbage collector purges temporary uploads, preview snippets, and converted audiobooks older than 2 hours.
  - Your server disk space never gets clogged.

---

## 🚀 Quick Start

### 1. Run the Web Server

```bash
cd audiobook-studio
./run.sh
```

Or directly using Uvicorn:

```bash
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Open in Browser

Navigate to:
```
http://localhost:8000
```

Upload your book (`.pdf`, `.epub`, `.docx`, etc.), select your narrator, and click **"Listen to Chapter Preview"** or **"Download Full Audiobook"**.

---

## 🛠️ Configuration & Hosting

Environment variables in [`app/config.py`](file:///home/lazorr/audiobook-studio/app/config.py):

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `8000` | Port to run web server on |
| `MAX_UPLOAD_SIZE_MB` | `50` | Maximum file upload size in MB |
| `FILE_RETENTION_HOURS` | `2` | Auto-deletes temp audio and uploads older than X hours |
| `CLEANUP_INTERVAL_MINUTES` | `30` | How often the background disk sweeper runs |

---

## 📦 Project Structure

```
audiobook-studio/
├── app/
│   ├── main.py              # FastAPI endpoints, WebSockets, background tasks
│   ├── config.py            # Paths, size limits, and storage cleanup settings
│   ├── cleanup_service.py   # Automated background garbage collector (auto-purge)
│   ├── pdf_processor.py     # Universal document extractor (PDF, EPUB, DOCX, etc.)
│   ├── tts_engine.py        # Edge-TTS engine with sentence-level timestamp streaming
│   ├── audiobook_builder.py # ID3 tagger and FFmpeg lossless chapter merger
│   └── voices_data.py       # High-emotion voice profiles and tone presets
├── static/
│   ├── css/style.css        # Editorial literary theme, dark mode, sentence highlighter
│   └── js/app.js            # Sentence-synchronized audio player & upload controller
├── templates/
│   └── index.html           # Editorial book reader interface
├── run.sh                   # App startup launcher
├── requirements.txt         # Dependencies
└── .gitignore               # Ignores temp caches, uploads, and outputs
```
