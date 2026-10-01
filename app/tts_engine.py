"""
TTS Engine using Edge-TTS with natural human cadence, sentence timestamp synchronization,
and lossless audio chapter assembly.
"""

import os
import re
import json
import hashlib
import asyncio
import subprocess
from typing import List, Optional, Callable, Dict, Any, Tuple
import edge_tts


def prepare_natural_text(text: str, title: Optional[str] = None) -> str:
    """
    Cleans and formats text so Microsoft Edge Neural TTS reads with natural
    sentence-level cadence, breathing pauses, and proper intonation.
    """
    if not text:
        return ""

    # Clean multiple spaces and irregular whitespace
    text = re.sub(r"[ \t]+", " ", text)
    
    # Normalize dashes and quotes for natural speech
    text = text.replace("—", " — ").replace("–", " — ")
    text = text.replace('"', '"').replace('"', '"')
    text = text.replace("'", "'").replace("'", "'")

    # Clean up weird non-printable control characters
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]", "", text)

    # Clean paragraphs
    paragraphs = [p.strip() for p in text.split("\n") if p.strip()]
    cleaned_body = "\n\n".join(paragraphs)

    return cleaned_body


class TTSEngine:
    def __init__(self, cache_dir: str):
        self.cache_dir = cache_dir
        os.makedirs(cache_dir, exist_ok=True)

    @staticmethod
    def split_into_chunks(text: str, max_words_per_chunk: int = 400) -> List[str]:
        """
        Splits text into cohesive chunks around sentence/paragraph boundaries.
        """
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        chunks = []
        current_chunk = []
        current_words = 0

        for para in paragraphs:
            words = len(para.split())

            if words > max_words_per_chunk:
                sentences = re.split(r"(?<=[.!?])\s+", para)
                for sentence in sentences:
                    s_words = len(sentence.split())
                    if current_words + s_words > max_words_per_chunk and current_chunk:
                        chunks.append("\n\n".join(current_chunk))
                        current_chunk = [sentence]
                        current_words = s_words
                    else:
                        current_chunk.append(sentence)
                        current_words += s_words
            else:
                if current_words + words > max_words_per_chunk and current_chunk:
                    chunks.append("\n\n".join(current_chunk))
                    current_chunk = [para]
                    current_words = words
                else:
                    current_chunk.append(para)
                    current_words += words

        if current_chunk:
            chunks.append("\n\n".join(current_chunk))

        return chunks if chunks else [text]

    async def generate_preview(
        self,
        text: str,
        voice: str = "en-US-GuyNeural",
        rate: str = "+0%",
        pitch: str = "+0Hz",
        title: Optional[str] = None
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Generates an audio preview snippet (first ~120 words)
        and captures sentence boundary timestamps for real-time read-along highlighting.
        """
        words = text.split()
        if len(words) > 130:
            preview_text = " ".join(words[:130]) + "..."
        else:
            preview_text = text

        cache_key = hashlib.md5(f"preview:sync:v2:{voice}:{rate}:{pitch}:{preview_text}".encode("utf-8")).hexdigest()
        output_file = os.path.join(self.cache_dir, f"preview_{cache_key}.mp3")
        meta_file = os.path.join(self.cache_dir, f"preview_{cache_key}.json")

        if os.path.exists(output_file) and os.path.getsize(output_file) > 1000 and os.path.exists(meta_file):
            try:
                with open(meta_file, "r", encoding="utf-8") as f:
                    sentences = json.load(f)
                return output_file, sentences
            except Exception:
                pass

        natural_speech = prepare_natural_text(preview_text, title=title)
        communicate = edge_tts.Communicate(
            natural_speech,
            voice=voice,
            rate=rate,
            pitch=pitch
        )

        sentences = []
        with open(output_file, "wb") as f:
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    f.write(chunk["data"])
                elif chunk["type"] == "SentenceBoundary":
                    start_sec = round(chunk["offset"] / 10_000_000, 2)
                    end_sec = round((chunk["offset"] + chunk["duration"]) / 10_000_000, 2)
                    sentences.append({
                        "start": start_sec,
                        "end": end_sec,
                        "text": chunk["text"]
                    })

        # Save sentence timings to JSON cache
        with open(meta_file, "w", encoding="utf-8") as f:
            json.dump(sentences, f)

        return output_file, sentences

    async def synthesize_chapter(
        self,
        chapter_index: int,
        title: str,
        text: str,
        voice: str = "en-US-GuyNeural",
        rate: str = "+0%",
        pitch: str = "+0Hz",
        output_file: Optional[str] = None,
        progress_callback: Optional[Callable[[float, str], None]] = None
    ) -> str:
        """
        Synthesizes a full chapter by chunking text, synthesizing each chunk,
        and concatenating with ffmpeg for natural, lossless audio.
        """
        if not output_file:
            safe_title = re.sub(r"[^\w\-_]", "_", title)[:40]
            output_file = os.path.join(self.cache_dir, f"ch_{chapter_index:03d}_{safe_title}.mp3")

        chunks = self.split_into_chunks(text, max_words_per_chunk=400)
        total_chunks = len(chunks)

        if total_chunks == 1:
            if progress_callback:
                progress_callback(0.2, f"Synthesizing '{title}'...")

            natural_content = prepare_natural_text(chunks[0], title=title)
            communicate = edge_tts.Communicate(
                natural_content,
                voice=voice,
                rate=rate,
                pitch=pitch
            )
            await communicate.save(output_file)

            if progress_callback:
                progress_callback(1.0, f"Completed '{title}'")
            return output_file

        # Multi-chunk synthesis
        chunk_files = []
        temp_dir = os.path.join(self.cache_dir, f"tmp_ch_{chapter_index}_{os.getpid()}")
        os.makedirs(temp_dir, exist_ok=True)

        try:
            for idx, chunk in enumerate(chunks):
                if progress_callback:
                    pct = round(idx / total_chunks, 2)
                    progress_callback(pct, f"Chapter {chapter_index}: Part {idx + 1} of {total_chunks}")

                chunk_title = title if idx == 0 else None
                chunk_text = prepare_natural_text(chunk, title=chunk_title)
                chunk_path = os.path.join(temp_dir, f"chunk_{idx:04d}.mp3")

                communicate = edge_tts.Communicate(
                    chunk_text,
                    voice=voice,
                    rate=rate,
                    pitch=pitch
                )
                await communicate.save(chunk_path)
                chunk_files.append(chunk_path)

            if progress_callback:
                progress_callback(0.95, f"Merging audio segments for '{title}'...")

            concat_list_file = os.path.join(temp_dir, "concat_list.txt")
            with open(concat_list_file, "w", encoding="utf-8") as f:
                for cp in chunk_files:
                    f.write(f"file '{cp}'\n")

            cmd = [
                "ffmpeg", "-y", "-f", "concat", "-safe", "0",
                "-i", concat_list_file, "-c", "copy", output_file
            ]
            res = subprocess.run(cmd, capture_output=True, text=True)
            if res.returncode != 0:
                raise RuntimeError(f"FFmpeg concat failed: {res.stderr}")

            if progress_callback:
                progress_callback(1.0, f"Completed '{title}'")

            return output_file
        finally:
            for cf in chunk_files:
                try:
                    if os.path.exists(cf):
                        os.remove(cf)
                except Exception:
                    pass
            try:
                concat_txt = os.path.join(temp_dir, "concat_list.txt")
                if os.path.exists(concat_txt):
                    os.remove(concat_txt)
                if os.path.exists(temp_dir):
                    os.rmdir(temp_dir)
            except Exception:
                pass
