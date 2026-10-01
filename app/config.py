"""
Configuration settings for Audiobook Studio.
Includes storage paths, limits, and automated disk cleanup settings.
Compatible with standard servers, Docker, and serverless environments (Vercel).
"""

import os
import tempfile

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Detect if running in a serverless environment (Vercel, AWS Lambda) or read-only container
IS_VERCEL = bool(os.getenv("VERCEL"))


def resolve_data_dir() -> str:
    """Returns a writable directory, falling back to /tmp on serverless environments."""
    if IS_VERCEL:
        target = os.path.join(tempfile.gettempdir(), "audiobook_data")
        os.makedirs(target, exist_ok=True)
        return target

    local_data = os.path.join(BASE_DIR, "data")
    try:
        os.makedirs(local_data, exist_ok=True)
        test_file = os.path.join(local_data, ".perm_test")
        with open(test_file, "w") as f:
            f.write("1")
        os.remove(test_file)
        return local_data
    except (OSError, PermissionError):
        # Fallback to system temp directory if local directory is read-only
        fallback = os.path.join(tempfile.gettempdir(), "audiobook_data")
        os.makedirs(fallback, exist_ok=True)
        return fallback


DATA_DIR = resolve_data_dir()
UPLOADS_DIR = os.path.join(DATA_DIR, "uploads")
OUTPUTS_DIR = os.path.join(DATA_DIR, "outputs")
CACHE_DIR = os.path.join(DATA_DIR, "cache")

# Ensure required directories exist
for path in [DATA_DIR, UPLOADS_DIR, OUTPUTS_DIR, CACHE_DIR]:
    try:
        os.makedirs(path, exist_ok=True)
    except Exception:
        pass

# File & Server limits
MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "50"))
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))

# Automatically delete uploaded files, preview snippets, and audiobooks older than X hours
# Prevents disk clogging on your production server
FILE_RETENTION_HOURS = int(os.getenv("FILE_RETENTION_HOURS", "2"))
CLEANUP_INTERVAL_MINUTES = int(os.getenv("CLEANUP_INTERVAL_MINUTES", "30"))
