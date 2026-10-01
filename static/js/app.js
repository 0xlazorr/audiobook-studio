/**
 * Audiobook Studio - Production Read-Along Controller
 * Clean, sample-free, multi-format document reader with tone presets.
 */

document.addEventListener("DOMContentLoaded", () => {
  // Tone Presets Configuration
  const TONE_PRESETS = {
    natural: { rate: "+0%", pitch: "+0Hz", label: "Natural Cadence" },
    storyteller: { rate: "-5%", pitch: "+0Hz", label: "Storyteller Pace" },
    calm: { rate: "-12%", pitch: "-2Hz", label: "Calm & Soothing" },
    brisk: { rate: "+15%", pitch: "+0Hz", label: "Brisk & Efficient" },
    dramatic: { rate: "-8%", pitch: "-5Hz", label: "Dramatic & Deep" },
    documentary: { rate: "+0%", pitch: "-2Hz", label: "Authoritative Documentary" }
  };

  // Application State
  const state = {
    bookData: null,
    selectedChapterIndex: 1,
    selectedVoice: "en-US-AndrewMultilingualNeural",
    selectedTone: "natural",
    rate: "+0%",
    pitch: "+0Hz",
    curatedVoices: [],
    sentences: [],
    currentSentenceIndex: -1,
    activeAudioUrl: null,
    isPlaying: false
  };

  // DOM Elements
  const btnToggleTheme = document.getElementById("btnToggleTheme");
  const btnUploadNew = document.getElementById("btnUploadNew");
  const uploadSection = document.getElementById("uploadSection");
  const readerSection = document.getElementById("readerSection");
  const fileInput = document.getElementById("fileInput");
  const dropzonePrompt = document.getElementById("dropzonePrompt");
  const uploadSpinner = document.getElementById("uploadSpinner");

  const bookTitleDisplay = document.getElementById("bookTitleDisplay");
  const bookAuthorDisplay = document.getElementById("bookAuthorDisplay");
  const bookStatsDisplay = document.getElementById("bookStatsDisplay");
  const voiceSelect = document.getElementById("voiceSelect");
  const btnTestVoice = document.getElementById("btnTestVoice");
  const chapterSelect = document.getElementById("chapterSelect");
  const pacingSelect = document.getElementById("pacingSelect");

  const btnPlayPreview = document.getElementById("btnPlayPreview");
  const btnPreviewIcon = document.getElementById("btnPreviewIcon");
  const btnPreviewText = document.getElementById("btnPreviewText");

  const chapterTitleHeading = document.getElementById("chapterTitleHeading");
  const bookProseContainer = document.getElementById("bookProseContainer");

  // Audio Player Bar Elements
  const audioPlayer = document.getElementById("audioPlayer");
  const playerChapterTitle = document.getElementById("playerChapterTitle");
  const playerNarratorInfo = document.getElementById("playerNarratorInfo");
  const btnPlayerPlayPause = document.getElementById("btnPlayerPlayPause");
  const playerPlayPauseIcon = document.getElementById("playerPlayPauseIcon");
  const btnPlayerRewind = document.getElementById("btnPlayerRewind");
  const btnPlayerForward = document.getElementById("btnPlayerForward");
  const playerCurrentTime = document.getElementById("playerCurrentTime");
  const playerScrubber = document.getElementById("playerScrubber");
  const playerDuration = document.getElementById("playerDuration");
  const playerSpeedSelect = document.getElementById("playerSpeedSelect");
  const btnPlayerDownloadMp3 = document.getElementById("btnPlayerDownloadMp3");

  // Full Audiobook Conversion
  const btnFullAudiobook = document.getElementById("btnFullAudiobook");
  const fullAudiobookProgressCard = document.getElementById("fullAudiobookProgressCard");
  const fullConversionStatusText = document.getElementById("fullConversionStatusText");
  const fullConversionPercentText = document.getElementById("fullConversionPercentText");
  const fullConversionProgressBar = document.getElementById("fullConversionProgressBar");
  const fullAudiobookDownloadCard = document.getElementById("fullAudiobookDownloadCard");
  const btnDownloadMasterMp3 = document.getElementById("btnDownloadMasterMp3");
  const btnDownloadZipFile = document.getElementById("btnDownloadZipFile");

  function refreshLucide() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // -------------------------------------------------------------
  // Theme Management (Light / Kindle Dark Mode)
  // -------------------------------------------------------------
  function initTheme() {
    const saved = localStorage.getItem("audiobook_theme");
    if (saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    refreshLucide();
  }

  if (btnToggleTheme) {
    btnToggleTheme.addEventListener("click", () => {
      document.documentElement.classList.toggle("dark");
      const isDark = document.documentElement.classList.contains("dark");
      localStorage.setItem("audiobook_theme", isDark ? "dark" : "light");
      refreshLucide();
    });
  }

  // -------------------------------------------------------------
  // 1. Load Voices & Setup Controls
  // -------------------------------------------------------------
  async function init() {
    initTheme();
    try {
      const res = await fetch("/api/voices");
      const data = await res.json();
      state.curatedVoices = data.curated || [];
      populateVoiceDropdown();
    } catch (e) {
      console.error("Initialization error:", e);
    }
  }

  function populateVoiceDropdown() {
    voiceSelect.innerHTML = "";
    state.curatedVoices.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v.id;
      const tagPrefix = v.tag === "High Emotion" ? "⭐ " : "";
      opt.textContent = `${tagPrefix}${v.flag} ${v.name} (${v.accent}) — ${v.style}`;
      if (v.id === state.selectedVoice) {
        opt.selected = true;
      }
      voiceSelect.appendChild(opt);
    });

    voiceSelect.addEventListener("change", (e) => {
      state.selectedVoice = e.target.value;
      updateNarratorInfo();
      state.activeAudioUrl = null;
    });

    pacingSelect.addEventListener("change", (e) => {
      state.selectedTone = e.target.value;
      const preset = TONE_PRESETS[e.target.value] || TONE_PRESETS.natural;
      state.rate = preset.rate;
      state.pitch = preset.pitch;
      updateNarratorInfo();
      state.activeAudioUrl = null;
    });
  }

  function updateNarratorInfo() {
    const v = state.curatedVoices.find((x) => x.id === state.selectedVoice) || state.curatedVoices[0];
    const toneInfo = TONE_PRESETS[state.selectedTone]?.label || "Natural";
    if (v) {
      playerNarratorInfo.textContent = `Narrated by ${v.name} (${v.accent}) &bull; ${toneInfo}`;
    }
  }

  // -------------------------------------------------------------
  // 2. Render Uploaded Book & Chapters
  // -------------------------------------------------------------
  function renderBook(book) {
    state.bookData = book;
    state.selectedChapterIndex = book.chapters[0]?.index || 1;
    state.activeAudioUrl = null;
    state.sentences = [];

    // Switch view from upload to reader
    uploadSection.classList.add("hidden");
    readerSection.classList.remove("hidden");

    bookTitleDisplay.textContent = book.title;
    bookAuthorDisplay.innerHTML = `By ${book.author || "Unknown"} &bull; <span id="bookStatsDisplay">${book.chapters.length} Chapters &bull; ${Number(book.total_words).toLocaleString()} Words</span>`;

    // Populate Chapter dropdown
    chapterSelect.innerHTML = "";
    book.chapters.forEach((ch) => {
      const opt = document.createElement("option");
      opt.value = ch.index;
      opt.textContent = `${ch.title} (${ch.word_count} words)`;
      if (ch.index === state.selectedChapterIndex) {
        opt.selected = true;
      }
      chapterSelect.appendChild(opt);
    });

    chapterSelect.onchange = (e) => {
      state.selectedChapterIndex = parseInt(e.target.value, 10);
      state.activeAudioUrl = null;
      renderCurrentChapterText();
    };

    renderCurrentChapterText();
    updateNarratorInfo();
    refreshLucide();
  }

  // -------------------------------------------------------------
  // 3. Render Readable Text Page with Clickable Sentences
  // -------------------------------------------------------------
  function renderCurrentChapterText() {
    if (!state.bookData) return;
    const ch = state.bookData.chapters.find((c) => c.index === state.selectedChapterIndex) || state.bookData.chapters[0];
    if (!ch) return;

    chapterTitleHeading.textContent = ch.title;
    playerChapterTitle.textContent = ch.title;

    state.sentences = [];
    state.currentSentenceIndex = -1;

    const rawParagraphs = ch.content.split("\n\n").filter(Boolean);
    bookProseContainer.innerHTML = "";

    rawParagraphs.forEach((paraText, pIdx) => {
      const p = document.createElement("p");
      p.className = "mb-6 leading-relaxed";

      const sentences = paraText.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g) || [paraText];

      sentences.forEach((sText, sIdx) => {
        const span = document.createElement("span");
        span.className = "reader-sentence";
        span.textContent = sText;
        span.id = `sent_${pIdx}_${sIdx}`;
        span.title = "Click to jump playback here";

        span.addEventListener("click", () => {
          seekToSentenceSpan(span);
        });

        p.appendChild(span);
      });

      bookProseContainer.appendChild(p);
    });
  }

  // -------------------------------------------------------------
  // 4. Generate & Play Audio Preview with Sentence Synchronization
  // -------------------------------------------------------------
  btnPlayPreview.addEventListener("click", async () => {
    if (!state.bookData) return;

    if (state.activeAudioUrl && audioPlayer.src.includes(state.activeAudioUrl)) {
      if (audioPlayer.paused) {
        audioPlayer.play();
        setPlaybackState(true);
      } else {
        audioPlayer.pause();
        setPlaybackState(false);
      }
      return;
    }

    btnPlayPreview.disabled = true;
    btnPreviewIcon.setAttribute("data-lucide", "loader-2");
    btnPreviewIcon.classList.add("animate-spin");
    btnPreviewText.textContent = "Synthesizing Preview...";
    refreshLucide();

    try {
      const ch = state.bookData.chapters.find((c) => c.index === state.selectedChapterIndex) || state.bookData.chapters[0];
      const res = await fetch("/api/preview-chapter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          book_id: state.bookData.book_id,
          chapter_index: ch.index,
          voice: state.selectedVoice,
          rate: state.rate,
          pitch: state.pitch
        })
      });

      if (!res.ok) throw new Error("Preview generation failed");
      const data = await res.json();

      state.activeAudioUrl = data.audio_url;
      state.sentences = data.sentences || [];

      btnPlayerDownloadMp3.href = data.audio_url;
      audioPlayer.src = data.audio_url;
      audioPlayer.play().then(() => {
        setPlaybackState(true);
      }).catch((err) => {
        console.warn("Autoplay notice:", err);
      });

      mapTimestampsToSpans();

    } catch (e) {
      alert("Error generating preview: " + e.message);
    } finally {
      btnPlayPreview.disabled = false;
      btnPreviewIcon.classList.remove("animate-spin");
      refreshLucide();
    }
  });

  function mapTimestampsToSpans() {
    if (!state.sentences || state.sentences.length === 0) return;

    bookProseContainer.innerHTML = "";

    let currentP = document.createElement("p");
    currentP.className = "mb-6 leading-relaxed";

    const firstCue = state.sentences[0];
    const startIndex = (firstCue && firstCue.text.toLowerCase().includes("chapter")) ? 1 : 0;

    for (let i = startIndex; i < state.sentences.length; i++) {
      const cue = state.sentences[i];
      const span = document.createElement("span");
      span.className = "reader-sentence";
      span.textContent = cue.text + " ";
      span.dataset.start = cue.start;
      span.dataset.end = cue.end;
      span.id = `cue_${i}`;
      span.title = `Click to play from ${formatTime(cue.start)}`;

      span.addEventListener("click", () => {
        seekToSentenceSpan(span);
      });

      currentP.appendChild(span);

      if ((i > startIndex && (i - startIndex) % 3 === 0) && i < state.sentences.length - 1) {
        bookProseContainer.appendChild(currentP);
        currentP = document.createElement("p");
        currentP.className = "mb-6 leading-relaxed";
      }
    }

    if (currentP.childNodes.length > 0) {
      bookProseContainer.appendChild(currentP);
    }
  }

  function seekToSentenceSpan(span) {
    const start = parseFloat(span.dataset.start);
    if (!isNaN(start) && audioPlayer.duration) {
      audioPlayer.currentTime = start;
      if (audioPlayer.paused) {
        audioPlayer.play();
        setPlaybackState(true);
      }
    }
  }

  // -------------------------------------------------------------
  // 5. Audio Player Event Listeners & Highlighter
  // -------------------------------------------------------------
  audioPlayer.addEventListener("timeupdate", () => {
    if (!audioPlayer.duration) return;

    const current = audioPlayer.currentTime;
    playerScrubber.value = (current / audioPlayer.duration) * 100;
    playerCurrentTime.textContent = formatTime(current);

    updateSentenceHighlight(current);
  });

  function updateSentenceHighlight(currentTime) {
    const spans = bookProseContainer.querySelectorAll(".reader-sentence[data-start]");
    let activeFound = false;

    spans.forEach((span) => {
      const start = parseFloat(span.dataset.start);
      const end = parseFloat(span.dataset.end);

      if (!activeFound && currentTime >= start && currentTime <= end) {
        if (!span.classList.contains("is-active")) {
          bookProseContainer.querySelectorAll(".reader-sentence.is-active").forEach((s) => s.classList.remove("is-active"));
          span.classList.add("is-active");
          span.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        activeFound = true;
      }
    });
  }

  audioPlayer.addEventListener("loadedmetadata", () => {
    playerDuration.textContent = formatTime(audioPlayer.duration);
    playerScrubber.value = 0;
  });

  audioPlayer.addEventListener("ended", () => {
    setPlaybackState(false);
    playerScrubber.value = 0;
    bookProseContainer.querySelectorAll(".reader-sentence.is-active").forEach((s) => s.classList.remove("is-active"));
  });

  function setPlaybackState(isPlaying) {
    state.isPlaying = isPlaying;
    if (isPlaying) {
      playerPlayPauseIcon.setAttribute("data-lucide", "pause");
      btnPreviewIcon.setAttribute("data-lucide", "pause");
      btnPreviewText.textContent = "Pause Preview";
    } else {
      playerPlayPauseIcon.setAttribute("data-lucide", "play");
      btnPreviewIcon.setAttribute("data-lucide", "play");
      btnPreviewText.textContent = "Listen to Chapter Preview";
    }
    refreshLucide();
  }

  btnPlayerPlayPause.addEventListener("click", () => {
    if (!audioPlayer.src) {
      btnPlayPreview.click();
      return;
    }
    if (audioPlayer.paused) {
      audioPlayer.play();
      setPlaybackState(true);
    } else {
      audioPlayer.pause();
      setPlaybackState(false);
    }
  });

  playerScrubber.addEventListener("input", (e) => {
    if (!audioPlayer.duration) return;
    audioPlayer.currentTime = (e.target.value / 100) * audioPlayer.duration;
  });

  btnPlayerRewind.addEventListener("click", () => {
    audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime - 10);
  });

  btnPlayerForward.addEventListener("click", () => {
    audioPlayer.currentTime = Math.min(audioPlayer.duration || 0, audioPlayer.currentTime + 10);
  });

  playerSpeedSelect.addEventListener("change", (e) => {
    audioPlayer.playbackRate = parseFloat(e.target.value);
  });

  btnTestVoice.addEventListener("click", async () => {
    try {
      btnTestVoice.disabled = true;
      const res = await fetch("/api/preview-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice: state.selectedVoice, rate: state.rate, pitch: state.pitch })
      });
      if (!res.ok) throw new Error("Sample failed");
      const d = await res.json();
      audioPlayer.src = d.audio_url;
      audioPlayer.play();
      setPlaybackState(true);
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      btnTestVoice.disabled = false;
    }
  });

  function formatTime(s) {
    if (isNaN(s) || s < 0) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  }

  // -------------------------------------------------------------
  // 6. Full Audiobook Generation & Downloads
  // -------------------------------------------------------------
  btnFullAudiobook.addEventListener("click", async () => {
    if (!state.bookData) return;

    fullAudiobookProgressCard.classList.remove("hidden");
    fullAudiobookDownloadCard.classList.add("hidden");
    fullConversionProgressBar.style.width = "0%";
    fullConversionPercentText.textContent = "0%";
    fullConversionStatusText.textContent = "Initializing audiobook synthesis...";
    fullAudiobookProgressCard.scrollIntoView({ behavior: "smooth" });

    btnFullAudiobook.disabled = true;

    try {
      const res = await fetch("/api/generate-audiobook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          book_id: state.bookData.book_id,
          voice: state.selectedVoice,
          rate: state.rate,
          pitch: state.pitch,
          title: state.bookData.title,
          author: state.bookData.author
        })
      });

      if (!res.ok) throw new Error("Conversion failed to start");
      const data = await res.json();

      pollStatus(data.job_id);

    } catch (e) {
      alert("Error: " + e.message);
      fullAudiobookProgressCard.classList.add("hidden");
      btnFullAudiobook.disabled = false;
    }
  });

  function pollStatus(jobId) {
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/audiobook-status/${jobId}`);
        if (!res.ok) return;
        const msg = await res.json();

        if (msg.percent !== undefined) {
          fullConversionProgressBar.style.width = `${msg.percent}%`;
          fullConversionPercentText.textContent = `${Math.round(msg.percent)}%`;
        }

        if (msg.message) {
          fullConversionStatusText.textContent = msg.message;
        }

        if (msg.status === "completed") {
          clearInterval(timer);
          fullAudiobookProgressCard.classList.add("hidden");
          fullAudiobookDownloadCard.classList.remove("hidden");

          btnDownloadMasterMp3.href = msg.master_mp3_url;
          btnDownloadZipFile.href = msg.zip_url;
          btnFullAudiobook.disabled = false;

          fullAudiobookDownloadCard.scrollIntoView({ behavior: "smooth" });

          audioPlayer.src = msg.master_mp3_url;
          btnPlayerDownloadMp3.href = msg.master_mp3_url;
        } else if (msg.status === "error") {
          clearInterval(timer);
          alert("Conversion error: " + (msg.message || "Unknown error"));
          fullAudiobookProgressCard.classList.add("hidden");
          btnFullAudiobook.disabled = false;
        }
      } catch (err) {
        console.error("Poll error:", err);
      }
    }, 1500);
  }

  // -------------------------------------------------------------
  // 7. Uploading Files
  // -------------------------------------------------------------
  btnUploadNew.addEventListener("click", () => {
    uploadSection.classList.remove("hidden");
    uploadSection.scrollIntoView({ behavior: "smooth" });
  });

  fileInput.addEventListener("change", async (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const fd = new FormData();
    fd.append("file", file);

    dropzonePrompt.classList.add("hidden");
    uploadSpinner.classList.remove("hidden");

    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Upload failed");
      }
      const book = await res.json();
      uploadSection.classList.add("hidden");
      renderBook(book);
    } catch (err) {
      alert("Error uploading book: " + err.message);
    } finally {
      uploadSpinner.classList.add("hidden");
      dropzonePrompt.classList.remove("hidden");
      fileInput.value = "";
    }
  });

  // Start initialization
  init();
});
