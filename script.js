// ===============================
// 🎵 Music Player Script (Deno & Browser Safe) 🎵
// ===============================

if (typeof window !== "undefined") {
  // ===============================
  // IndexedDB Setup
  // ===============================
  let db: IDBDatabase | null = null;

  if ("indexedDB" in window) {
    const request = indexedDB.open("MusicPlayerDB", 1);

    request.onupgradeneeded = function (event) {
      db = (event.target as IDBOpenDBRequest).result;
      db.createObjectStore("songs", { keyPath: "name" });
    };

    request.onsuccess = function (event) {
      db = (event.target as IDBOpenDBRequest).result;
      loadLastSong();
    };

    request.onerror = function () {
      console.error("IndexedDB failed to open");
    };
  } else {
    console.warn("IndexedDB not supported in this environment.");
  }

  // ===============================
  // DOM Elements
  // ===============================
  const audio = document.getElementById("audio") as HTMLAudioElement;
  audio.setAttribute("preload", "auto");
  audio.controls = false;
  audio.style.display = "none";

  const progress = document.getElementById("progress") as HTMLInputElement;
  const volume = document.getElementById("volume") as HTMLInputElement;
  const playBtn = document.getElementById("play") as HTMLButtonElement;
  const loopBtn = document.getElementById("loop") as HTMLButtonElement;
  const uploadBtn = document.getElementById("upload") as HTMLButtonElement;
  const fileInput = document.getElementById("fileInput") as HTMLInputElement;
  const songTitle = document.getElementById("song-title") as HTMLElement;
  const albumArt = document.getElementById("album-art") as HTMLImageElement;
  const themeToggle = document.getElementById("themeToggle") as HTMLInputElement;
  const forwardBtn = document.getElementById("forward") as HTMLButtonElement;
  const backwardBtn = document.getElementById("backward") as HTMLButtonElement;
  const youtubeInput = document.getElementById("youtube-link") as HTMLInputElement;
  const youtubeBtn = document.getElementById("play-youtube") as HTMLButtonElement;

  // ===============================
  // Loop & Theme State
  // ===============================
  let isLooping = JSON.parse(localStorage.getItem("loopEnabled") || "false");
  let theme = localStorage.getItem("theme") || "dark";

  audio.loop = isLooping;
  loopBtn.style.color = isLooping ? "cyan" : "white";
  themeToggle.checked = theme === "light";
  document.body.style.background =
    theme === "light"
      ? "#f0f0f0"
      : "linear-gradient(135deg, #0f0c29, #000000, #0f0f13)";
  document.body.style.color = theme === "light" ? "#222" : "white";

  // ===============================
  // Upload & Save to IndexedDB
  // ===============================
  uploadBtn.onclick = () => fileInput.click();

  fileInput.onchange = () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      const result = e.target?.result;
      if (!result) return;

      if (db) saveSongToDB(file.name, result as ArrayBuffer);
      playSong(result as ArrayBuffer, file.name);
    };
    reader.readAsArrayBuffer(file);
  };

  function saveSongToDB(name: string, buffer: ArrayBuffer) {
    if (!db) return;
    const transaction = db.transaction(["songs"], "readwrite");
    const store = transaction.objectStore("songs");
    store.put({ name, data: buffer });
    localStorage.setItem("lastSong", name);
  }

  function loadLastSong() {
    if (!db) return;
    const lastSong = localStorage.getItem("lastSong");
    if (!lastSong) return;

    const transaction = db.transaction(["songs"], "readonly");
    const store = transaction.objectStore("songs");
    const request = store.get(lastSong);

    request.onsuccess = function () {
      if (request.result) {
        playSong(request.result.data, request.result.name);
      }
    };
  }

  function playSong(arrayBuffer: ArrayBuffer, name: string) {
    audio.src = URL.createObjectURL(new Blob([arrayBuffer], { type: "audio/mp3" }));
    audio.loop = isLooping;
    audio.play().then(() => (playBtn.textContent = "⏸️"));
    songTitle.textContent = name;
    albumArt.src = "album.jpg";
  }

  // ===============================
  // Core Player Controls
  // ===============================
  playBtn.onclick = () => {
    if (audio.paused) {
      audio.play();
      playBtn.textContent = "⏸️";
    } else {
      audio.pause();
      playBtn.textContent = "▶️";
    }
  };

  loopBtn.onclick = () => {
    isLooping = !isLooping;
    audio.loop = isLooping;
    loopBtn.style.color = isLooping ? "cyan" : "white";
    localStorage.setItem("loopEnabled", JSON.stringify(isLooping));
  };

  themeToggle.onchange = () => {
    theme = themeToggle.checked ? "light" : "dark";
    localStorage.setItem("theme", theme);
    document.body.style.background =
      theme === "light"
        ? "#f0f0f0"
        : "linear-gradient(135deg, #0e0e14ff, #000000, #0f0f13)";
    document.body.style.color = theme === "light" ? "#222" : "white";
  };

  // ===============================
  // Progress Bar
  // ===============================
  audio.ontimeupdate = () => {
    if (audio.duration) progress.value = ((audio.currentTime / audio.duration) * 100).toString();
  };

  progress.oninput = () => {
    audio.currentTime = (parseFloat(progress.value) / 100) * audio.duration;
  };

  // ===============================
  // Volume
  // ===============================
  volume.oninput = () => (audio.volume = parseFloat(volume.value));
  volume.value = "0.8";
  audio.volume = 0.8;

  // ===============================
  // Forward / Backward
  // ===============================
  forwardBtn.onclick = () => (audio.currentTime = Math.min(audio.currentTime + 10, audio.duration));
  backwardBtn.onclick = () => (audio.currentTime = Math.max(audio.currentTime - 10, 0));

  // ===============================
  // 🎵 YouTube Audio Playback
  // ===============================
  youtubeBtn.onclick = async () => {
    const url = youtubeInput.value.trim();
    if (!url) return alert("Please paste a YouTube link.");

    const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (!match) return alert("Invalid YouTube link!");

    const videoId = match[1];
    const mirrors = [
      "https://pipedapi.in.projectsegfau.lt",
      "https://pipedapi.kavin.rocks",
      "https://pipedapi.moomoo.me",
      "https://pipedapi.palveluntarjoaja.eu"
    ];

    let data;
    for (const base of mirrors) {
      try {
        const res = await fetch(`${base}/streams/${videoId}`);
        if (!res.ok) continue;
        data = await res.json();
        if (data && data.audioStreams) break;
      } catch {}
    }

    if (!data || !data.audioStreams) return alert("Failed to load YouTube audio.");

    const audioStream = data.audioStreams.find(
      (s: any) => s.audioOnly && s.mimeType.includes("audio/mp4")
    );
    if (!audioStream) return alert("No playable audio found.");

    audio.src = audioStream.url;
    audio.loop = isLooping;
    await audio.play();
    playBtn.textContent = "⏸️";
    songTitle.textContent = data.title || "YouTube Audio";
    albumArt.src = data.thumbnailUrl || "yt.jpg";
  };
}
