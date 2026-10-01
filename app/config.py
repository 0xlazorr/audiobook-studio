"""
Configuration settings for Audiobook Studio.
Includes storage paths, limits, and automated disk cleanup settings.
"""

import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
UPLOADS_DIR = os.path.join(DATA_DIR, "uploads")
OUTPUTS_DIR = os.path.join(DATA_DIR, "outputs")
CACHE_DIR = os.path.join(DATA_DIR, "cache")

# Ensure required directories exist
for path in [DATA_DIR, UPLOADS_DIR, OUTPUTS_DIR, CACHE_DIR]:
    os.makedirs(path, exist_ok=True)

# File & Server limits
MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "50"))
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))

# Automatically delete uploaded files, preview snippets, and audiobooks older than X hours
# Prevents disk clogging on your production server
FILE_RETENTION_HOURS = int(os.getenv("FILE_RETENTION_HOURS", "2"))
CLEANUP_INTERVAL_MINUTES = int(os.getenv("CLEANUP_INTERVAL_MINUTES", "30"))
