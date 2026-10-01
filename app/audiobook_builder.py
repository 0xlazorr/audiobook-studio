"""
Audiobook assembler: tags ID3 metadata, builds single-file audiobooks, and generates chapter ZIP bundles.
"""

import os
import zipfile
import subprocess
from typing import List, Dict, Any, Optional
import mutagen
from mutagen.easyid3 import EasyID3
from mutagen.mp3 import MP3


class AudiobookBuilder:
    @staticmethod
    def tag_mp3(
        file_path: str,
        title: str,
        author: str,
        album: str,
        track_num: int,
        total_tracks: int,
        genre: str = "Audiobook"
    ):
        """Adds ID3 tags to the MP3 file."""
        try:
            try:
                audio = EasyID3(file_path)
            except mutagen.id3.ID3NoHeaderError:
                audio = mutagen.File(file_path, easy=True)
                audio.add_tags()

            audio["title"] = title
            audio["artist"] = author
            audio["albumartist"] = author
            audio["album"] = album
            audio["tracknumber"] = f"{track_num}/{total_tracks}"
            audio["genre"] = genre
            audio.save()
        except Exception as e:
            print(f"Warning: Failed to tag {file_path}: {e}")

    @staticmethod
    def _strip_id3_bytes(data: bytes) -> bytes:
        """Strips ID3v2 header and ID3v1 footer to extract raw MPEG audio frames."""
        if data.startswith(b"ID3") and len(data) >= 10:
            size_bytes = data[6:10]
            tag_size = ((size_bytes[0] & 0x7F) << 21) | \
                       ((size_bytes[1] & 0x7F) << 14) | \
                       ((size_bytes[2] & 0x7F) << 7) | \
                       (size_bytes[3] & 0x7F)
            header_len = 10 + tag_size
            if data[5] & 0x10:
                header_len += 10
            data = data[header_len:]
        if data.endswith(b"TAG") or (len(data) >= 128 and data[-128:-125] == b"TAG"):
            data = data[:-128]
        return data

    @staticmethod
    def _merge_chapters_python(chapter_files: List[str], output_file: str):
        """Concatenates MP3 chapter streams in pure Python without requiring ffmpeg."""
        with open(output_file, "wb") as out_f:
            for cf in chapter_files:
                with open(cf, "rb") as in_f:
                    raw = in_f.read()
                out_f.write(AudiobookBuilder._strip_id3_bytes(raw))

    @staticmethod
    def merge_chapters(
        chapter_files: List[str],
        output_file: str,
        title: str,
        author: str
    ) -> str:
        """
        Concatenates all chapter files into a single master MP3 audiobook
        and applies metadata tags. Uses ffmpeg stream copy when available,
        falling back to lossless pure Python MPEG frame stitching.
        """
        if not chapter_files:
            raise ValueError("No chapter files provided for merging.")

        if len(chapter_files) == 1:
            shutil.copyfile(chapter_files[0], output_file)
        elif shutil.which("ffmpeg"):
            list_txt_path = output_file + ".list.txt"
            try:
                with open(list_txt_path, "w", encoding="utf-8") as f:
                    for cf in chapter_files:
                        f.write(f"file '{cf}'\n")

                cmd = [
                    "ffmpeg", "-y", "-f", "concat", "-safe", "0",
                    "-i", list_txt_path, "-c", "copy", output_file
                ]
                res = subprocess.run(cmd, capture_output=True, text=True)
                if res.returncode != 0:
                    AudiobookBuilder._merge_chapters_python(chapter_files, output_file)
            except Exception:
                AudiobookBuilder._merge_chapters_python(chapter_files, output_file)
            finally:
                if os.path.exists(list_txt_path):
                    os.remove(list_txt_path)
        else:
            AudiobookBuilder._merge_chapters_python(chapter_files, output_file)

        # Tag master file
        AudiobookBuilder.tag_mp3(
            output_file,
            title=title,
            author=author,
            album=title,
            track_num=1,
            total_tracks=1,
            genre="Audiobook"
        )

        return output_file

    @staticmethod
    def create_zip_package(
        chapter_files: List[Dict[str, Any]],
        output_zip: str,
        book_title: str,
        author: str
    ) -> str:
        """
        Creates a complete ZIP archive containing all tagged chapters,
        standard M3U and modern M3U8 playlist files, and a playback guide.
        chapter_files is a list of dicts: {'path': str, 'title': str, 'index': int}
        """
        total_chapters = len(chapter_files)
        with zipfile.ZipFile(output_zip, "w", zipfile.ZIP_DEFLATED) as zip_f:
            m3u_lines = ["#EXTM3U\n"]

            for ch in chapter_files:
                path = ch["path"]
                index = ch["index"]
                title = ch["title"]
                arcname = f"{index:02d} - {title}.mp3"
                # Sanitize filename
                arcname = "".join(c for c in arcname if c.isalnum() or c in (" ", "-", "_", ".")).strip()

                # Get audio length in seconds if possible
                duration_sec = -1
                try:
                    audio_info = MP3(path)
                    duration_sec = int(audio_info.info.length)
                except Exception:
                    pass

                # Tag individual chapter file
                AudiobookBuilder.tag_mp3(
                    path,
                    title=f"Chapter {index}: {title}",
                    author=author,
                    album=book_title,
                    track_num=index,
                    total_tracks=total_chapters
                )

                # Add file to ZIP
                zip_f.write(path, arcname=arcname)
                m3u_lines.append(f"#EXTINF:{duration_sec},{book_title} - Chapter {index}: {title}\n{arcname}\n")

            playlist_content = "".join(m3u_lines)
            safe_title = "".join(c for c in book_title if c.isalnum() or c in (" ", "-", "_")).strip()

            # Write standard M3U playlist
            zip_f.writestr(f"{safe_title}.m3u", playlist_content.encode("latin-1", errors="replace"))

            # Write modern UTF-8 M3U8 playlist
            zip_f.writestr(f"{safe_title}.m3u8", playlist_content.encode("utf-8"))

            # Write friendly Readme
            readme_text = (
                f"{book_title}\n"
                f"Author: {author}\n"
                f"Chapters: {total_chapters}\n"
                f"Generated by Audiobook Studio\n\n"
                f"HOW TO PLAY:\n"
                f"1. Music Players (VLC, Apple Books, iTunes, Foobar2000, AIMP):\n"
                f"   Open '{safe_title}.m3u8' (or '{safe_title}.m3u') to load all chapters in sequential order.\n\n"
                f"2. Mobile & Car Audio:\n"
                f"   Copy this entire folder to your phone or USB drive. All tracks are pre-numbered and tagged with title, artist, and chapter metadata.\n\n"
                f"3. Individual Chapters:\n"
                f"   Each chapter MP3 can also be played standalone in any audio application.\n"
            )
            zip_f.writestr("README.txt", readme_text)

        return output_zip
