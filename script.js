// 🎵 Music Player Script (Browser Safe) 🎵
if (typeof window !== "undefined") {

  // IndexedDB Setup
  var db = null;
  if ("indexedDB" in window) {
    var request = indexedDB.open("MusicPlayerDB", 1);
    request.onupgradeneeded = function (event) {
      db = event.target.result;
      db.createObjectStore("songs", { keyPath: "name" });
    };
    request.onsuccess = function (event) {
      db = event.target.result;
      loadLastSong();
    };
    request.onerror = function () {
      console.error("IndexedDB failed to open");
    };
  } else {
    console.warn("IndexedDB not supported in this environment.");
  }

  // DOM Elements
  var audio = document.getElementById("audio");
  var progress = document.getElementById("progress");
  var volume = document.getElementById("volume");
  var playBtn = document.getElementById("play");
  var loopBtn = document.getElementById("loop");
  var uploadBtn = document.getElementById("upload");
  var fileInput = document.getElementById("fileInput");
  var songTitle = document.getElementById("song-title");
  var albumArt = document.getElementById("album-art");
  var themeToggle = document.getElementById("themeToggle");
  var forwardBtn = document.getElementById("forward");
  var backwardBtn = document.getElementById("backward");
  var youtubeInput = document.getElementById("youtube-link");
  var youtubeBtn = document.getElementById("play-youtube");

  audio.setAttribute("preload", "auto");
  audio.controls = false;
  audio.style.display = "none";

  // Loop & Theme State
  var isLooping = JSON.parse(localStorage.getItem("loopEnabled") || "false");
  var theme = localStorage.getItem("theme") || "dark";
  audio.loop = isLooping;
  loopBtn.style.color = isLooping ? "cyan" : "white";
  themeToggle.checked = theme === "light";
  document.body.style.background = theme === "light" ? "#f0f0f0" : "linear-gradient(135deg,#0f0c29,#000,#0f0f13)";
  document.body.style.color = theme === "light" ? "#222" : "white";

  // Upload & Save
  uploadBtn.onclick = function () { fileInput.click(); };
  fileInput.onchange = function () {
    var file = fileInput.files && fileInput.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      var result = e.target && e.target.result;
      if (!result) return;
      if (db) saveSongToDB(file.name, result);
      playSong(result, file.name);
    };
    reader.readAsArrayBuffer(file);
  };

  function saveSongToDB(name, buffer) {
    if (!db) return;
    var tx = db.transaction(["songs"], "readwrite");
    var store = tx.objectStore("songs");
    store.put({ name: name, data: buffer });
    localStorage.setItem("lastSong", name);
  }

  function loadLastSong() {
    if (!db) return;
    var lastSong = localStorage.getItem("lastSong");
    if (!lastSong) return;
    var tx = db.transaction(["songs"], "readonly");
    var store = tx.objectStore("songs");
    var req = store.get(lastSong);
    req.onsuccess = function () {
      if (req.result) playSong(req.result.data, req.result.name);
    };
  }

  function playSong(arrayBuffer, name) {
    audio.src = URL.createObjectURL(new Blob([arrayBuffer], { type: "audio/mp3" }));
    audio.loop = isLooping;
    audio.play().then(function () { playBtn.textContent = "⏸️"; });
    songTitle.textContent = name;
    // Inline placeholder instead of album.jpg
    albumArt.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNjY2MiIC8+PHRleHQgeD0iNTAiIHk9IjUwIiBmb250LXNpemU9IjE2IiBmb250LXdlaWdodD0iYm9sZCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzAwMCI+QWxidW0gPC90ZXh0Pjwvc3ZnPg==";
  }

  // Core Controls
  playBtn.onclick = function () {
    if (audio.paused) { audio.play(); playBtn.textContent = "⏸️"; }
    else { audio.pause(); playBtn.textContent = "▶️"; }
  };
  loopBtn.onclick = function () {
    isLooping = !isLooping;
    audio.loop = isLooping;
    loopBtn.style.color = isLooping ? "cyan" : "white";
    localStorage.setItem("loopEnabled", JSON.stringify(isLooping));
  };
  themeToggle.onchange = function () {
    theme = themeToggle.checked ? "light" : "dark";
    localStorage.setItem("theme", theme);
    document.body.style.background = theme === "light" ? "#f0f0f0" : "linear-gradient(135deg,#0e0e14,#000,#0f0f13)";
    document.body.style.color = theme === "light" ? "#222" : "white";
  };

  // Progress
  audio.ontimeupdate = function () { if (audio.duration) progress.value = ((audio.currentTime / audio.duration) * 100); };
  progress.oninput = function () { audio.currentTime = (parseFloat(progress.value) / 100) * audio.duration; };

  // Volume
  volume.oninput = function () { audio.volume = parseFloat(volume.value); };
  volume.value = "0.8";
  audio.volume = 0.8;

  // Forward / Backward
  forwardBtn.onclick = function () { audio.currentTime = Math.min(audio.currentTime + 10, audio.duration); };
  backwardBtn.onclick = function () { audio.currentTime = Math.max(audio.currentTime - 10, 0); };

  // YouTube Playback
  youtubeBtn.onclick = async function () {
    var url = youtubeInput.value.trim();
    if (!url) return alert("Please paste a YouTube link.");
    var match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (!match) return alert("Invalid YouTube link!");
    var videoId = match[1];
    var mirrors = [
      "https://pipedapi.in.projectsegfau.lt",
      "https://pipedapi.kavin.rocks",
      "https://pipedapi.moomoo.me",
      "https://pipedapi.palveluntarjoaja.eu"
    ];
    var data;
    for (var i = 0; i < mirrors.length; i++) {
      var base = mirrors[i];
      try {
        var res = await fetch(base + "/streams/" + videoId);
        if (!res.ok) continue;
        data = await res.json();
        if (data && data.audioStreams) break;
      } catch (e) {}
    }
    if (!data || !data.audioStreams) return alert("Failed to load YouTube audio.");
    var audioStream = data.audioStreams.find(function (s) { return s.audioOnly && s.mimeType.includes("audio/mp4"); });
    if (!audioStream) return alert("No playable audio found.");
    audio.src = audioStream.url;
    audio.loop = isLooping;
    await audio.play();
    playBtn.textContent = "⏸️";
    songTitle.textContent = data.title || "YouTube Audio";
    albumArt.src = data.thumbnailUrl || albumArt.src;
  };
}
