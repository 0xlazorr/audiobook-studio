/**
 * Audiobook Studio - Production Read-Along & Playback Controller
 * Streamlined editorial UI with TOC drawer, unified playback, and instant chapter navigation.
 */

document.addEventListener("DOMContentLoaded", () => {
  // Tone Presets Configuration
  const TONE_PRESETS = {
    natural: { rate: "+0%", pitch: "+0Hz", label: "Natural Cadence (1.0x)" },
    storyteller: { rate: "-5%", pitch: "+0Hz", label: "Storyteller Pace (0.95x)" },
    calm: { rate: "-12%", pitch: "-2Hz", label: "Calm & Soothing (0.88x)" },
    brisk: { rate: "+15%", pitch: "+0Hz", label: "Brisk & Efficient (1.15x)" },
    dramatic: { rate: "-8%", pitch: "-5Hz", label: "Dramatic & Deep (0.92x)" },
    documentary: { rate: "+0%", pitch: "-2Hz", label: "Documentary (1.0x)" }
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

  // DOM Elements - Navigation & Header
  const btnToggleTheme = document.getElementById("btnToggleTheme");
  const btnUploadNew = document.getElementById("btnUploadNew");
  const uploadSection = document.getElementById("uploadSection");
  const readerSection = document.getElementById("readerSection");
  const fileInput = document.getElementById("fileInput");
  const dropzonePrompt = document.getElementById("dropzonePrompt");
  const uploadSpinner = document.getElementById("uploadSpinner");

  const headerBookContainer = document.getElementById("headerBookContainer");
  const headerBookTitle = document.getElementById("headerBookTitle");
  const headerBookAuthor = document.getElementById("headerBookAuthor");
  const headerBookActions = document.getElementById("headerBookActions");
  const btnOpenTOC = document.getElementById("btnOpenTOC");
  const btnOpenTOCText = document.getElementById("btnOpenTOCText");
  const btnOpenNarratorModal = document.getElementById("btnOpenNarratorModal");
  const btnHeaderNarratorText = document.getElementById("btnHeaderNarratorText");
  const btnOpenExportModal = document.getElementById("btnOpenExportModal");

  // Subheader & Canvas
  const barChapterName = document.getElementById("barChapterName");
  const barNarratorName = document.getElementById("barNarratorName");
  const btnBarTOC = document.getElementById("btnBarTOC");
  const btnBarNarrator = document.getElementById("btnBarNarrator");
  const btnBarExport = document.getElementById("btnBarExport");
  const btnInlinePlay = document.getElementById("btnInlinePlay");
  const inlinePlayIcon = document.getElementById("inlinePlayIcon");
  const inlinePlayText = document.getElementById("inlinePlayText");
  const btnFontSmaller = document.getElementById("btnFontSmaller");
  const btnFontLarger = document.getElementById("btnFontLarger");

  const chapterNumberBadge = document.getElementById("chapterNumberBadge");
  const chapterTitleHeading = document.getElementById("chapterTitleHeading");
  const chapterStatsText = document.getElementById("chapterStatsText");
  const bookProseContainer = document.getElementById("bookProseContainer");

  const btnPrevChapter = document.getElementById("btnPrevChapter");
  const btnNextChapter = document.getElementById("btnNextChapter");
  const chapterFooterCounter = document.getElementById("chapterFooterCounter");

  // Table of Contents Drawer
  const drawerTOC = document.getElementById("drawerTOC");
  const backdropTOC = document.getElementById("backdropTOC");
  const btnCloseTOC = document.getElementById("btnCloseTOC");
  const drawerTOCList = document.getElementById("drawerTOCList");
  const tocSearchInput = document.getElementById("tocSearchInput");
  const tocBookStats = document.getElementById("tocBookStats");
  const btnTOCExportAudiobook = document.getElementById("btnTOCExportAudiobook");

  // Narrator & Tone Modal
  const modalNarrator = document.getElementById("modalNarrator");
  const btnCloseNarratorModal = document.getElementById("btnCloseNarratorModal");
  const modalVoiceSelect = document.getElementById("modalVoiceSelect");
  const modalPacingSelect = document.getElementById("modalPacingSelect");
  const btnAuditionVoice = document.getElementById("btnAuditionVoice");
  const btnSaveNarrator = document.getElementById("btnSaveNarrator");

  // Bottom Audio Player Bar Elements
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
  const btnPlayerExport = document.getElementById("btnPlayerExport");

  // Full Audiobook Conversion & Export Modal
  const modalExportAudiobook = document.getElementById("modalExportAudiobook");
  const btnCloseExportModal = document.getElementById("btnCloseExportModal");
  const btnCancelExportModal = document.getElementById("btnCancelExportModal");
  const btnConfirmGenerateAudiobook = document.getElementById("btnConfirmGenerateAudiobook");
  const btnReopenExportModal = document.getElementById("btnReopenExportModal");
  const exportCustomChapterList = document.getElementById("exportCustomChapterList");
  const exportChapterCountSummary = document.getElementById("exportChapterCountSummary");

  const fullAudiobookProgressCard = document.getElementById("fullAudiobookProgressCard");
  const fullConversionStatusText = document.getElementById("fullConversionStatusText");
  const fullConversionPercentText = document.getElementById("fullConversionPercentText");
  const fullConversionProgressBar = document.getElementById("fullConversionProgressBar");
  const fullAudiobookDownloadCard = document.getElementById("fullAudiobookDownloadCard");
  const btnDownloadMasterMp3 = document.getElementById("btnDownloadMasterMp3");
  const btnDownloadZipFile = document.getElementById("btnDownloadZipFile");
  const downloadCardFormatNotice = document.getElementById("downloadCardFormatNotice");
  const individualChaptersContainer = document.getElementById("individualChaptersContainer");
  const individualChaptersCount = document.getElementById("individualChaptersCount");
  const individualChaptersList = document.getElementById("individualChaptersList");

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
  // 1. Initialize Voices & Narrator Settings
  // -------------------------------------------------------------
  async function init() {
    initTheme();
    try {
      const res = await fetch("/api/voices");
      const data = await res.json();
      state.curatedVoices = data.curated || [];
      populateVoiceDropdowns();
    } catch (e) {
      console.error("Initialization error:", e);
    }
  }

  function populateVoiceDropdowns() {
    modalVoiceSelect.innerHTML = "";
    state.curatedVoices.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v.id;
      const tagPrefix = v.tag === "High Emotion" ? "⭐ " : "";
      opt.textContent = `${tagPrefix}${v.flag} ${v.name} (${v.accent}) — ${v.style}`;
      if (v.id === state.selectedVoice) {
        opt.selected = true;
      }
      modalVoiceSelect.appendChild(opt);
    });

    updateNarratorLabels();
  }

  function updateNarratorLabels() {
    const v = state.curatedVoices.find((x) => x.id === state.selectedVoice) || state.curatedVoices[0];
    const toneInfo = TONE_PRESETS[state.selectedTone]?.label.split(" ")[0] || "Natural";
    if (v) {
      const shortName = `⭐ ${v.name.split(" ")[0]} (${v.accent.split(" ")[0]})`;
      if (btnHeaderNarratorText) btnHeaderNarratorText.textContent = `${shortName} · ${toneInfo}`;
      if (barNarratorName) barNarratorName.textContent = `${shortName} · ${toneInfo}`;
      if (playerNarratorInfo) playerNarratorInfo.textContent = `Narrated by ${v.name} (${v.accent}) • ${toneInfo}`;
    }
  }

  // Narrator Modal Events
  function openNarratorModal() {
    modalVoiceSelect.value = state.selectedVoice;
    modalPacingSelect.value = state.selectedTone;
    modalNarrator.classList.remove("hidden");
    refreshLucide();
  }

  function closeNarratorModal() {
    modalNarrator.classList.add("hidden");
  }

  if (btnOpenNarratorModal) btnOpenNarratorModal.addEventListener("click", openNarratorModal);
  if (btnBarNarrator) btnBarNarrator.addEventListener("click", openNarratorModal);
  if (btnCloseNarratorModal) btnCloseNarratorModal.addEventListener("click", closeNarratorModal);

  if (btnSaveNarrator) {
    btnSaveNarrator.addEventListener("click", () => {
      state.selectedVoice = modalVoiceSelect.value;
      state.selectedTone = modalPacingSelect.value;
      const preset = TONE_PRESETS[state.selectedTone] || TONE_PRESETS.natural;
      state.rate = preset.rate;
      state.pitch = preset.pitch;
      state.activeAudioUrl = null;
      updateNarratorLabels();
      closeNarratorModal();
    });
  }

  // Audition Voice Sample
  if (btnAuditionVoice) {
    btnAuditionVoice.addEventListener("click", async () => {
      const voiceId = modalVoiceSelect.value;
      const v = state.curatedVoices.find((x) => x.id === voiceId);
      const sampleText = v ? v.sample : "Welcome to Audiobook Studio. Listen to your books with natural human expression.";

      btnAuditionVoice.disabled = true;
      try {
        const res = await fetch("/api/preview-voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ voice: voiceId, sample_text: sampleText })
        });
        if (!res.ok) throw new Error("Audition failed");
        const d = await res.json();
        audioPlayer.src = d.audio_url;
        audioPlayer.play();
        setPlaybackState(true);
      } catch (err) {
        alert("Audition error: " + err.message);
      } finally {
        btnAuditionVoice.disabled = false;
      }
    });
  }

  // -------------------------------------------------------------
  // 2. Render Uploaded Book & Setup Navigation
  // -------------------------------------------------------------
  function renderBook(book) {
    state.bookData = book;
    state.selectedChapterIndex = book.chapters[0]?.index || 1;
    state.activeAudioUrl = null;
    state.sentences = [];

    // Switch view to reader
    uploadSection.classList.add("hidden");
    readerSection.classList.remove("hidden");

    // Header Book Info
    headerBookContainer.classList.remove("hidden");
    headerBookContainer.classList.add("flex");
    headerBookActions.classList.remove("hidden");
    headerBookActions.classList.add("flex");

    headerBookTitle.textContent = book.title;
    headerBookAuthor.textContent = book.author ? `• by ${book.author}` : "";

    // TOC buttons
    btnOpenTOCText.textContent = `Chapters (${book.chapters.length})`;

    // Load first chapter
    renderCurrentChapter();
    updateNarratorLabels();
    refreshLucide();
  }

  function switchChapter(newIndex) {
    if (!state.bookData) return;
    const targetChapter = state.bookData.chapters.find((ch) => ch.index === newIndex);
    if (!targetChapter) return;

    // Pause current audio
    if (state.isPlaying) {
      audioPlayer.pause();
      setPlaybackState(false);
    }

    state.selectedChapterIndex = newIndex;
    state.activeAudioUrl = null;
    state.sentences = [];
    state.currentSentenceIndex = -1;

    renderCurrentChapter();

    // Scroll smoothly to top of book canvas
    readerSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderCurrentChapter() {
    if (!state.bookData) return;
    const chapter = state.bookData.chapters.find((ch) => ch.index === state.selectedChapterIndex) || state.bookData.chapters[0];
    if (!chapter) return;

    const totalChapters = state.bookData.chapters.length;

    // Subheader & Badges
    barChapterName.textContent = chapter.title;
    chapterNumberBadge.textContent = `CHAPTER ${chapter.index}`;
    chapterTitleHeading.textContent = chapter.title;
    chapterStatsText.textContent = `${chapter.word_count.toLocaleString()} words • ~${chapter.duration_min} min listen`;

    // Footer Nav
    chapterFooterCounter.textContent = `Chapter ${chapter.index} of ${totalChapters}`;
    btnPrevChapter.disabled = chapter.index <= 1;
    btnNextChapter.disabled = chapter.index >= totalChapters;

    // Reset Play Button
    setPlaybackState(false);
    inlinePlayText.textContent = `Listen to Chapter ${chapter.index}`;
    playerChapterTitle.textContent = `${chapter.title} (Chapter ${chapter.index})`;

    // Render Prose
    renderProseText(chapter.content);
    refreshLucide();
  }

  function renderProseText(content) {
    bookProseContainer.innerHTML = "";
    if (!content) {
      bookProseContainer.innerHTML = "<p class='italic text-stone-400'>No text found in this chapter.</p>";
      return;
    }

    const paragraphs = content.split("\n\n");
    let globalSentenceIndex = 0;

    paragraphs.forEach((paraText) => {
      const trimmed = paraText.trim();
      if (!trimmed) return;

      const pElem = document.createElement("p");
      const sentenceRegex = /[^.!?]+[.!?]+["']?|[^.!?]+$/g;
      const matches = trimmed.match(sentenceRegex) || [trimmed];

      matches.forEach((sentenceText) => {
        const span = document.createElement("span");
        span.className = "reader-sentence";
        span.id = `sentence-${globalSentenceIndex}`;
        span.setAttribute("data-index", globalSentenceIndex);
        span.textContent = sentenceText + " ";

        const curIdx = globalSentenceIndex;
        span.addEventListener("click", () => {
          onSentenceClicked(curIdx);
        });

        pElem.appendChild(span);
        globalSentenceIndex++;
      });

      bookProseContainer.appendChild(pElem);
    });
  }

  // -------------------------------------------------------------
  // Font Size Typography Controls
  // -------------------------------------------------------------
  let currentFontSize = parseFloat(localStorage.getItem("audiobook_fontSize")) || 1.18;
  function applyFontSize(size) {
    currentFontSize = Math.max(0.9, Math.min(1.65, size));
    localStorage.setItem("audiobook_fontSize", currentFontSize);
    if (bookProseContainer) {
      bookProseContainer.style.fontSize = `${currentFontSize}rem`;
    }
  }
  applyFontSize(currentFontSize);

  if (btnFontSmaller) {
    btnFontSmaller.addEventListener("click", () => applyFontSize(currentFontSize - 0.08));
  }
  if (btnFontLarger) {
    btnFontLarger.addEventListener("click", () => applyFontSize(currentFontSize + 0.08));
  }

  // -------------------------------------------------------------
  // 3. Table of Contents (TOC Drawer)
  // -------------------------------------------------------------
  function openTOC() {
    if (!state.bookData) return;
    if (tocSearchInput) tocSearchInput.value = "";
    renderTOCDrawerList("");
    drawerTOC.classList.remove("hidden");
    refreshLucide();
    if (tocSearchInput) {
      setTimeout(() => tocSearchInput.focus(), 120);
    }
  }

  function closeTOC() {
    drawerTOC.classList.add("hidden");
  }

  function renderTOCDrawerList(filter = "") {
    drawerTOCList.innerHTML = "";
    if (!state.bookData) return;

    tocBookStats.textContent = `${state.bookData.chapters.length} Chapters • ~${state.bookData.total_duration_min} min total`;

    const q = (filter || "").trim().toLowerCase();
    const matching = state.bookData.chapters.filter((ch) => {
      if (!q) return true;
      return (
        ch.title.toLowerCase().includes(q) ||
        String(ch.index) === q ||
        `chapter ${ch.index}`.includes(q)
      );
    });

    if (matching.length === 0) {
      drawerTOCList.innerHTML = `<div class="p-6 text-center text-xs text-stone-400">No chapters match "${filter}"</div>`;
      return;
    }

    matching.forEach((ch) => {
      const card = document.createElement("div");
      const isActive = ch.index === state.selectedChapterIndex;
      card.className = `toc-chapter-item p-3 rounded-xl border border-stone-200 dark:border-stone-800 cursor-pointer flex items-center justify-between gap-3 ${
        isActive ? "is-active" : "bg-white dark:bg-[#201e1a]"
      }`;
      card.innerHTML = `
        <div class="flex items-center space-x-3 truncate">
          <span class="w-6 h-6 rounded-md font-mono text-[11px] font-bold flex items-center justify-center flex-shrink-0 ${
            isActive ? "bg-amber-600 text-white" : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300"
          }">${ch.index}</span>
          <div class="truncate">
            <div class="font-medium text-stone-900 dark:text-stone-100 truncate">${ch.title}</div>
            <div class="text-[10px] text-stone-400 font-sans">${ch.word_count.toLocaleString()} words · ~${ch.duration_min} min</div>
          </div>
        </div>
        ${isActive ? '<span class="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full flex-shrink-0">Reading</span>' : ''}
      `;

      card.addEventListener("click", () => {
        closeTOC();
        switchChapter(ch.index);
      });

      drawerTOCList.appendChild(card);
    });
  }

  if (tocSearchInput) {
    tocSearchInput.addEventListener("input", (e) => {
      renderTOCDrawerList(e.target.value);
    });
  }

  if (btnOpenTOC) btnOpenTOC.addEventListener("click", openTOC);
  if (btnBarTOC) btnBarTOC.addEventListener("click", openTOC);
  if (btnCloseTOC) btnCloseTOC.addEventListener("click", closeTOC);
  if (backdropTOC) backdropTOC.addEventListener("click", closeTOC);

  if (btnTOCExportAudiobook) {
    btnTOCExportAudiobook.addEventListener("click", () => {
      closeTOC();
      openExportModal();
    });
  }

  // Chapter Footer Navigation
  if (btnNextChapter) {
    btnNextChapter.addEventListener("click", () => {
      if (state.bookData && state.selectedChapterIndex < state.bookData.chapters.length) {
        switchChapter(state.selectedChapterIndex + 1);
      }
    });
  }

  if (btnPrevChapter) {
    btnPrevChapter.addEventListener("click", () => {
      if (state.bookData && state.selectedChapterIndex > 1) {
        switchChapter(state.selectedChapterIndex - 1);
      }
    });
  }

  // -------------------------------------------------------------
  // 4. Audio Playback, Sync & Read-Along
  // -------------------------------------------------------------
  function setPlaybackState(playing) {
    state.isPlaying = playing;

    // Update Inline Play Button
    if (inlinePlayIcon) {
      inlinePlayIcon.setAttribute("data-lucide", playing ? "pause" : "play");
    }
    if (inlinePlayText) {
      inlinePlayText.textContent = playing ? "Pause Chapter" : `Listen to Chapter ${state.selectedChapterIndex}`;
    }

    // Update Bottom Player Play Button
    if (playerPlayPauseIcon) {
      playerPlayPauseIcon.setAttribute("data-lucide", playing ? "pause" : "play");
    }

    refreshLucide();
  }

  async function togglePlayChapter() {
    if (state.isPlaying) {
      audioPlayer.pause();
      setPlaybackState(false);
      return;
    }

    // If audio is already loaded, resume
    if (state.activeAudioUrl && audioPlayer.src.includes(state.activeAudioUrl)) {
      audioPlayer.play();
      setPlaybackState(true);
      return;
    }

    // Otherwise, generate audio for current chapter
    inlinePlayText.textContent = "Synthesizing Audio...";
    btnInlinePlay.disabled = true;

    try {
      const res = await fetch("/api/preview-chapter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          book_id: state.bookData.book_id,
          chapter_index: state.selectedChapterIndex,
          voice: state.selectedVoice,
          rate: state.rate,
          pitch: state.pitch
        })
      });

      if (!res.ok) throw new Error("Audio generation failed");
      const data = await res.json();

      state.activeAudioUrl = data.audio_url;
      state.sentences = data.sentences || [];
      state.currentSentenceIndex = -1;

      audioPlayer.src = data.audio_url;
      playerChapterTitle.textContent = `${data.chapter_title} (Chapter ${state.selectedChapterIndex})`;
      audioPlayer.play();
      setPlaybackState(true);

    } catch (e) {
      alert("Error: " + e.message);
      setPlaybackState(false);
    } finally {
      btnInlinePlay.disabled = false;
    }
  }

  if (btnInlinePlay) btnInlinePlay.addEventListener("click", togglePlayChapter);
  if (btnPlayerPlayPause) btnPlayerPlayPause.addEventListener("click", togglePlayChapter);

  function onSentenceClicked(sentenceIndex) {
    // If audio exists and sentence timings exist, jump to it
    if (state.sentences && state.sentences[sentenceIndex]) {
      audioPlayer.currentTime = state.sentences[sentenceIndex].start;
      if (!state.isPlaying) {
        audioPlayer.play();
        setPlaybackState(true);
      }
    } else {
      // Start chapter playback
      togglePlayChapter();
    }
  }

  // Audio Player Event Listeners
  audioPlayer.addEventListener("timeupdate", () => {
    const cur = audioPlayer.currentTime;
    playerCurrentTime.textContent = formatTime(cur);

    if (audioPlayer.duration) {
      playerScrubber.value = (cur / audioPlayer.duration) * 100;
    }

    if (!state.sentences || state.sentences.length === 0) return;

    // Find current sentence by time range
    const idx = state.sentences.findIndex((s) => cur >= s.start && cur <= s.end);

    if (idx !== -1 && idx !== state.currentSentenceIndex) {
      // Deactivate previous sentence
      if (state.currentSentenceIndex !== -1) {
        const prevEl = document.getElementById(`sentence-${state.currentSentenceIndex}`);
        if (prevEl) prevEl.classList.remove("is-active");
      }

      state.currentSentenceIndex = idx;
      const curEl = document.getElementById(`sentence-${idx}`);
      if (curEl) {
        curEl.classList.add("is-active");
        // Smooth auto-scroll to keep active sentence centered in view
        curEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  });

  audioPlayer.addEventListener("loadedmetadata", () => {
    playerDuration.textContent = formatTime(audioPlayer.duration);
  });

  audioPlayer.addEventListener("ended", () => {
    setPlaybackState(false);
    // Deactivate sentence highlight
    if (state.currentSentenceIndex !== -1) {
      const prevEl = document.getElementById(`sentence-${state.currentSentenceIndex}`);
      if (prevEl) prevEl.classList.remove("is-active");
      state.currentSentenceIndex = -1;
    }

    // Auto-advance to next chapter if available
    if (state.bookData && state.selectedChapterIndex < state.bookData.chapters.length) {
      const nextIdx = state.selectedChapterIndex + 1;
      switchChapter(nextIdx);
      setTimeout(() => {
        togglePlayChapter();
      }, 600);
    }
  });

  // Scrubber seeking
  playerScrubber.addEventListener("input", (e) => {
    if (audioPlayer.duration) {
      audioPlayer.currentTime = (e.target.value / 100) * audioPlayer.duration;
    }
  });

  // Rewind / Fast-Forward 10s
  btnPlayerRewind.addEventListener("click", () => {
    audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime - 10);
  });

  btnPlayerForward.addEventListener("click", () => {
    audioPlayer.currentTime = Math.min(audioPlayer.duration || 0, audioPlayer.currentTime + 10);
  });

  // Speed selection
  playerSpeedSelect.addEventListener("change", (e) => {
    audioPlayer.playbackRate = parseFloat(e.target.value);
  });

  // Global Keyboard Shortcuts
  window.addEventListener("keydown", (e) => {
    if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
      if (e.key === "Escape") {
        document.activeElement.blur();
        closeTOC();
        closeNarratorModal();
        closeExportModal();
      }
      return;
    }

    if (e.key === "Escape") {
      closeTOC();
      closeNarratorModal();
      closeExportModal();
    } else if (e.code === "Space") {
      e.preventDefault();
      togglePlayChapter();
    } else if (e.key === "ArrowLeft") {
      if (e.shiftKey) {
        if (state.bookData && state.selectedChapterIndex > 1) {
          switchChapter(state.selectedChapterIndex - 1);
        }
      } else {
        audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime - 10);
      }
    } else if (e.key === "ArrowRight") {
      if (e.shiftKey) {
        if (state.bookData && state.selectedChapterIndex < state.bookData.chapters.length) {
          switchChapter(state.selectedChapterIndex + 1);
        }
      } else {
        audioPlayer.currentTime = Math.min(audioPlayer.duration || 0, audioPlayer.currentTime + 10);
      }
    }
  });

  function formatTime(s) {
    if (isNaN(s) || s < 0) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  }

  // -------------------------------------------------------------
  // 5. Full Audiobook Generation & Preferences Modal
  // -------------------------------------------------------------
  function openExportModal() {
    if (!state.bookData) return;

    // Populate custom chapter checklist
    if (exportCustomChapterList) {
      exportCustomChapterList.innerHTML = "";
      state.bookData.chapters.forEach((ch) => {
        const item = document.createElement("label");
        item.className = "flex items-center space-x-2.5 p-1.5 rounded hover:bg-stone-200/50 dark:hover:bg-stone-700/50 cursor-pointer";
        item.innerHTML = `
          <input type="checkbox" class="export-ch-check text-stone-900 rounded focus:ring-stone-800" value="${ch.index}" checked>
          <span class="text-stone-800 dark:text-stone-200 truncate flex-1 font-medium">${ch.title}</span>
          <span class="text-stone-400 text-[10px] flex-shrink-0">${ch.word_count.toLocaleString()} words &middot; ~${ch.duration_min} min</span>
        `;
        exportCustomChapterList.appendChild(item);
      });
    }

    if (exportChapterCountSummary) {
      exportChapterCountSummary.textContent = `${state.bookData.chapters.length} Chapters (~${state.bookData.total_duration_min} min)`;
    }

    modalExportAudiobook.classList.remove("hidden");
    refreshLucide();
  }

  function closeExportModal() {
    modalExportAudiobook.classList.add("hidden");
  }

  if (btnOpenExportModal) btnOpenExportModal.addEventListener("click", openExportModal);
  if (btnBarExport) btnBarExport.addEventListener("click", openExportModal);
  if (btnPlayerExport) btnPlayerExport.addEventListener("click", openExportModal);
  if (btnReopenExportModal) btnReopenExportModal.addEventListener("click", openExportModal);
  if (btnCloseExportModal) btnCloseExportModal.addEventListener("click", closeExportModal);
  if (btnCancelExportModal) btnCancelExportModal.addEventListener("click", closeExportModal);

  // Handle Chapter Scope Radios
  document.querySelectorAll('input[name="chapterScope"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
      if (exportCustomChapterList) {
        if (e.target.value === "custom") {
          exportCustomChapterList.classList.remove("hidden");
        } else {
          exportCustomChapterList.classList.add("hidden");
        }
      }
    });
  });

  // Handle Format Preference Radios visual styling
  document.querySelectorAll('input[name="formatPref"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      document.querySelectorAll(".format-pref-label").forEach((lbl) => {
        const input = lbl.querySelector("input");
        if (input && input.checked) {
          lbl.classList.add("border-stone-900", "dark:border-stone-100", "bg-amber-50/50", "dark:bg-stone-800/60");
          lbl.classList.remove("border-stone-200", "dark:border-stone-700", "bg-[#fbf9f5]", "dark:bg-[#272521]");
        } else {
          lbl.classList.remove("border-stone-900", "dark:border-stone-100", "bg-amber-50/50", "dark:bg-stone-800/60");
          lbl.classList.add("border-stone-200", "dark:border-stone-700", "bg-[#fbf9f5]", "dark:bg-[#272521]");
        }
      });
    });
  });

  // Confirm and start audiobook synthesis
  if (btnConfirmGenerateAudiobook) {
    btnConfirmGenerateAudiobook.addEventListener("click", async () => {
      if (!state.bookData) return;

      const selectedFormatRadio = document.querySelector('input[name="formatPref"]:checked');
      const formatPreference = selectedFormatRadio ? selectedFormatRadio.value : "both";

      const scopeRadio = document.querySelector('input[name="chapterScope"]:checked');
      let selectedChapters = null;
      if (scopeRadio && scopeRadio.value === "custom") {
        const checkedBoxes = document.querySelectorAll(".export-ch-check:checked");
        selectedChapters = Array.from(checkedBoxes).map((cb) => parseInt(cb.value, 10));
        if (selectedChapters.length === 0) {
          alert("Please select at least one chapter to synthesize.");
          return;
        }
      }

      closeExportModal();

      fullAudiobookProgressCard.classList.remove("hidden");
      fullAudiobookDownloadCard.classList.add("hidden");
      fullConversionProgressBar.style.width = "0%";
      fullConversionPercentText.textContent = "0%";
      fullConversionStatusText.textContent = "Synthesizing audiobook according to preferences...";
      fullAudiobookProgressCard.scrollIntoView({ behavior: "smooth" });

      if (btnOpenExportModal) btnOpenExportModal.disabled = true;

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
            author: state.bookData.author,
            selected_chapters: selectedChapters,
            format_preference: formatPreference
          })
        });

        if (!res.ok) throw new Error("Conversion failed to start");
        const data = await res.json();
        pollStatus(data.job_id);

      } catch (e) {
        alert("Error: " + e.message);
        fullAudiobookProgressCard.classList.add("hidden");
        if (btnOpenExportModal) btnOpenExportModal.disabled = false;
      }
    });
  }

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

          if (msg.master_mp3_url) {
            btnDownloadMasterMp3.href = msg.master_mp3_url;
            btnDownloadMasterMp3.classList.remove("hidden");
          } else {
            btnDownloadMasterMp3.classList.add("hidden");
          }

          if (msg.zip_url) {
            btnDownloadZipFile.href = msg.zip_url;
            btnDownloadZipFile.classList.remove("hidden");
          } else {
            btnDownloadZipFile.classList.add("hidden");
          }

          if (downloadCardFormatNotice) {
            if (msg.format_preference === "single") {
              downloadCardFormatNotice.textContent = "Generated as a Single Continuous Master MP3 file.";
            } else if (msg.format_preference === "playlist") {
              downloadCardFormatNotice.textContent = "Generated as a Chapter Playlist Bundle with M3U/M3U8 playlists.";
            } else {
              downloadCardFormatNotice.textContent = "Generated Complete Edition: Single Master MP3 + Chapter Playlist Bundle.";
            }
          }

          // Populate individual chapter tracks
          if (individualChaptersList && msg.chapters && msg.chapters.length > 0) {
            individualChaptersCount.textContent = msg.chapters.length;
            individualChaptersList.innerHTML = "";
            msg.chapters.forEach((ch) => {
              const row = document.createElement("div");
              row.className = "flex items-center justify-between py-2 text-stone-800 dark:text-stone-200 gap-2 border-b border-stone-100 dark:border-stone-800/40 last:border-none";
              row.innerHTML = `
                <div class="flex items-center space-x-2.5 truncate">
                  <span class="w-5 font-mono text-[11px] text-stone-400 font-bold">${ch.index}.</span>
                  <span class="truncate font-medium">${ch.title}</span>
                </div>
                <div class="flex items-center space-x-2 flex-shrink-0">
                  <button class="btn-play-ch-track p-1.5 rounded hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300" title="Play Chapter Track" data-url="${ch.url}" data-title="${ch.title}">
                    <i data-lucide="play" class="w-3.5 h-3.5 fill-current"></i>
                  </button>
                  <a href="${ch.url}" download class="p-1.5 rounded hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300" title="Download MP3">
                    <i data-lucide="download" class="w-3.5 h-3.5"></i>
                  </a>
                </div>
              `;
              individualChaptersList.appendChild(row);
            });

            individualChaptersList.querySelectorAll(".btn-play-ch-track").forEach((btn) => {
              btn.addEventListener("click", () => {
                const url = btn.getAttribute("data-url");
                const title = btn.getAttribute("data-title");
                audioPlayer.src = url;
                playerChapterTitle.textContent = title;
                audioPlayer.play();
                setPlaybackState(true);
              });
            });
          }

          if (btnOpenExportModal) btnOpenExportModal.disabled = false;
          fullAudiobookDownloadCard.scrollIntoView({ behavior: "smooth" });

          // Load audio into bottom player
          if (msg.master_mp3_url) {
            audioPlayer.src = msg.master_mp3_url;
            playerChapterTitle.textContent = `${msg.book_title} (Full Master Audiobook)`;
          } else if (msg.chapters && msg.chapters.length > 0) {
            audioPlayer.src = msg.chapters[0].url;
            playerChapterTitle.textContent = `${msg.chapters[0].title} (Chapter 1)`;
          }

          refreshLucide();

        } else if (msg.status === "error") {
          clearInterval(timer);
          alert("Conversion error: " + (msg.message || "Unknown error"));
          fullAudiobookProgressCard.classList.add("hidden");
          if (btnOpenExportModal) btnOpenExportModal.disabled = false;
        }
      } catch (err) {
        console.error("Poll error:", err);
      }
    }, 1500);
  }

  // -------------------------------------------------------------
  // 6. Uploading Files
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
