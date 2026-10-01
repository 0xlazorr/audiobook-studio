# Audiobook Studio 🎧📖

A literary, distraction-free web application that turns any **PDF, EPUB, Word (DOCX), Markdown, HTML, or Text** file into a human-sounding audiobook.

Featuring Microsoft Edge's latest high-emotion multilingual neural narrators, real-time read-along sentence highlighting (like Audible / Kindle Immersion Reading), reading tone presets, Kindle-style dark mode, and an automated background disk cleaner to prevent server storage clogging.

---

## ✨ Features

- **📄 Universal Document Ingestion & Zero-Artifact Engine**:
  - Supports **PDF**, **EPUB eBooks**, **Word (.docx)**, **Markdown (.md)**, **HTML**, **Plain Text (.txt)**, and **Rich Text (.rtf)**.
  - **Zero Page-Number & Running Header Artifacts**:
    - **Cross-page recurring header/footer detector**: Detects and purges running book titles, chapter headers, and author names printed at the top/bottom of consecutive pages.
    - **Isolated page numbers**: Automatically strips numbers like `12`, `- 12 -`, `[ 12 ]`, `— 12 —`, `Page 12 of 345`, `p. 12`, `pp. 12-14`.
    - **Roman numerals**: Detects and removes standalone Roman numeral page markers (`iv`, `xii`, `— iv —`, `[xiv]`) while preserving chapter titles (`Chapter IV`).
    - **Citations & Footnotes**: Automatically strips bracket citations (`[1]`, `[2, 3]`) so speech sounds completely natural.
    - **Hyphenation & Dividers**: Heals hyphenated line breaks (`infor-\nmation` &rarr; `information`) and converts decorative dividers (`* * *`, `---`) into natural pauses.
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

- **🎧 Flexible Audiobook Output Formats (Single File vs. Playlist)**:
  - **Single Continuous Audiobook (.MP3)**: All chapters losslessly joined into one master file with embedded ID3 metadata tags (Title, Artist, Album, Track). Ideal for uninterrupted Audible-style listening.
  - **Chapter Playlist Bundle (.ZIP)**: Separate chapter MP3 files packaged with both standard **`.m3u`** and modern UTF-8 **`.m3u8`** playlist files, plus a playback guide. Ideal for VLC, iTunes, car audio, and mobile podcast players.
  - **Complete Edition (Both)**: Generates both the single master file and the chapter playlist bundle.
  - **Custom Chapter Scope**: Generate the full book or select specific chapters to convert.
  - **Direct Chapter Downloads**: Download or play individual chapter tracks directly from the web interface without unzipping.
  - Speech-optimized 24kHz mono MP3 at 48 kbps (~21 MB per hour of audio).

- **📖 Read-Along Immersion Mode**:
  - Text is formatted like a printed book with [Newsreader](https://fonts.google.com/specimen/Newsreader) serif typography.
  - In audio preview mode, the speech engine streams sentence boundaries so the **exact sentence being read highlights in warm yellow in real time**.
  - Clicking any sentence jumps audio playback directly to that spot.

- **🌙 Kindle-Style Dark Mode**:
  - 1-click toggle between warm paper daylight mode and warm charcoal night mode (`#141311`).
  - No harsh neon or artificial gradients.

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

## 🌐 Deployment Options

### Option A: Render (Recommended — 1-Click Free Hosting)
Render supports long-running Python services, WebSockets, background tasks, and has no 10-second timeout.
1. Fork or push this repository to your GitHub.
2. Go to [Render.com](https://render.com) &rarr; **New Web Service**.
3. Select your repository (`audiobook-studio`).
4. Set:
   - **Environment**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python3 -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Click **Deploy**.

---

### Option B: Railway / Fly.io / Docker
A `Dockerfile` is provided for containerized deployment:
```bash
docker build -t audiobook-studio .
docker run -p 8000:8000 audiobook-studio
```
On [Railway.app](https://railway.app), simply connect this repository and it will automatically deploy using the provided `Dockerfile`.

---

### Option C: Vercel (Serverless)
This repository includes [`vercel.json`](file:///home/lazorr/audiobook-studio/vercel.json) and [`api/index.py`](file:///home/lazorr/audiobook-studio/api/index.py) configured for Vercel.
> [!NOTE]
> **Vercel Serverless Limits**: Vercel free tier imposes a strict **10–15 second timeout** on serverless functions and an ephemeral `/tmp` filesystem. While previews and quick conversions work, generating long books (>10 seconds) on Vercel may exceed Vercel's execution limits. For long audiobooks, **Render** or **Railway** is recommended.

To deploy on Vercel:
1. Push this repository to GitHub.
2. Import the project into your Vercel dashboard.
3. Vercel will automatically detect `api/index.py` and deploy the application.

---

## 🛠️ Configuration & Hosting

Environment variables in [`app/config.py`](file:///home/lazorr/audiobook-studio/app/config.py):

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `8000` | Port to run web server on |
| `MAX_UPLOAD_SIZE_MB` | `50` | Maximum file upload size in MB |
| `FILE_RETENTION_HOURS` | `2` | Auto-deletes temp audio and uploads older than X hours |
| `CLEANUP_INTERVAL_MINUTES` | `30` | How often the background disk sweeper runs |
| `VERCEL` | `None` | Automatically set by Vercel to route data to `/tmp` |

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
