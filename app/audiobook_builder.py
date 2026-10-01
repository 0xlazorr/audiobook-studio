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
    def merge_chapters(
        chapter_files: List[str],
        output_file: str,
        title: str,
        author: str
    ) -> str:
        """
        Concatenates all chapter files into a single master MP3 audiobook
        and applies metadata tags.
        """
        if not chapter_files:
            raise ValueError("No chapter files provided for merging.")

        if len(chapter_files) == 1:
            # Just copy or reuse
            cmd = ["cp", chapter_files[0], output_file]
            subprocess.run(cmd, check=True)
        else:
            list_txt_path = output_file + ".list.txt"
            with open(list_txt_path, "w", encoding="utf-8") as f:
                for cf in chapter_files:
                    f.write(f"file '{cf}'\n")

            cmd = [
                "ffmpeg", "-y", "-f", "concat", "-safe", "0",
                "-i", list_txt_path, "-c", "copy", output_file
            ]
            res = subprocess.run(cmd, capture_output=True, text=True)
            if os.path.exists(list_txt_path):
                os.remove(list_txt_path)

            if res.returncode != 0:
                raise RuntimeError(f"Failed to merge audiobook files: {res.stderr}")

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
        Creates a ZIP archive containing all tagged chapters plus an M3U playlist file.
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
                m3u_lines.append(f"#EXTINF:-1,{book_title} - Chapter {index}: {title}\n{arcname}\n")

            # Write playlist
            zip_f.writestr(f"{book_title}.m3u", "".join(m3u_lines))

        return output_zip
