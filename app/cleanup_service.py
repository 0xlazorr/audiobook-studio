"""
Automated Disk Cleaner Service:
Periodically purges temporary uploads, audio previews, and generated audiobooks
to ensure server storage never gets clogged.
"""

import os
import time
import shutil
import asyncio
from typing import Dict, Any, Tuple
from app.config import (
    UPLOADS_DIR, OUTPUTS_DIR, CACHE_DIR,
    FILE_RETENTION_HOURS, CLEANUP_INTERVAL_MINUTES
)


def purge_old_files(max_age_hours: int = FILE_RETENTION_HOURS) -> Tuple[int, float]:
    """
    Deletes files older than max_age_hours from temporary directories.
    Returns (number of files deleted, megabytes freed).
    """
    max_age_seconds = max_age_hours * 3600
    now = time.time()
    deleted_files = 0
    bytes_freed = 0

    target_dirs = [UPLOADS_DIR, OUTPUTS_DIR, CACHE_DIR]

    for base_dir in target_dirs:
        if not os.path.exists(base_dir):
            continue

        for root, dirs, files in os.walk(base_dir, topdown=False):
            for file_name in files:
                file_path = os.path.join(root, file_name)
                try:
                    mtime = os.path.getmtime(file_path)
                    if now - mtime > max_age_seconds:
                        size = os.path.getsize(file_path)
                        os.remove(file_path)
                        deleted_files += 1
                        bytes_freed += size
                except Exception as e:
                    pass

            # Remove empty subdirectories (e.g. inside outputs/<job_id>)
            for dir_name in dirs:
                dir_path = os.path.join(root, dir_name)
                try:
                    if not os.listdir(dir_path):
                        os.rmdir(dir_path)
                except Exception:
                    pass

    mb_freed = round(bytes_freed / (1024 * 1024), 2)
    if deleted_files > 0:
        print(f"[Storage Cleanup] Purged {deleted_files} old file(s), freed {mb_freed} MB.")

    return deleted_files, mb_freed


async def periodic_cleanup_loop():
    """Background task that runs the cleanup check at regular intervals."""
    while True:
        try:
            purge_old_files(FILE_RETENTION_HOURS)
        except Exception as e:
            print(f"[Storage Cleanup] Error during routine cleanup: {e}")
        
        # Sleep for the configured interval
        await asyncio.sleep(CLEANUP_INTERVAL_MINUTES * 60)
