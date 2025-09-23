// IndexedDB Setup
let db;
const request = indexedDB.open("MusicPlayerDB", 1);

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

// DOM Elements
const audio = document.getElementById("audio");
audio.setAttribute("preload", "auto");
audio.controls = false;
audio.style.display = "none";

const progress = document.getElementById("progress");
const volume = document.getElementById("volume");
const playBtn = document.getElementById("play");
const loopBtn = document.getElementById("loop");
const uploadBtn = document.getElementById("upload");
const fileInput = document.getElementById("fileInput");
const songTitle = document.getElementById("song-title");
const albumArt = document.getElementById("album-art");
const themeToggle = document.getElementById("themeToggle");
const forwardBtn = document.getElementById("forward");
const backwardBtn = document.getElementById("backward");

// Loop & Theme State
let isLooping = JSON.parse(localStorage.getItem("loopEnabled")) || false;
let theme = localStorage.getItem("theme") || "dark";

audio.loop = isLooping;
loopBtn.style.color = isLooping ? "cyan" : "white";
themeToggle.checked = theme === "light";
document.body.style.background = theme === "light" ? "#f0f0f0" : "linear-gradient(135deg, #0f0c29, #302b63, #24243e)";
document.body.style.color = theme === "light" ? "#222" : "white";

// Upload & Save to IndexedDB
uploadBtn.onclick = () => fileInput.click();

fileInput.onchange = () => {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const result = e.target.result;
    saveSongToDB(file.name, result);
    playSong(result, file.name);
  };
  reader.readAsArrayBuffer(file);
};

function saveSongToDB(name, buffer) {
  const transaction = db.transaction(["songs"], "readwrite");
  const store = transaction.objectStore("songs");
  store.put({ name, data: buffer });
  localStorage.setItem("lastSong", name);
}

function loadLastSong() {
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

function playSong(arrayBuffer, name) {
  const blob = new Blob([arrayBuffer], { type: "audio/mp3" });
  const url = URL.createObjectURL(blob);
  audio.src = url;
  audio.loop = isLooping; // ✅ Fix: Apply loop on new song
  audio.play().then(() => {
    playBtn.textContent = "⏸️";
  });
  songTitle.textContent = name;
  albumArt.src = "album.jpg";
}

// Core Player Controls
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
  localStorage.setItem("loopEnabled", isLooping);
};

themeToggle.onchange = () => {
  theme = themeToggle.checked ? "light" : "dark";
  localStorage.setItem("theme", theme);
  document.body.style.background = theme === "light" ? "#f0f0f0" : "linear-gradient(135deg, #0f0c29, #302b63, #24243e)";
  document.body.style.color = theme === "light" ? "#222" : "white";
};

// Progress Bar
audio.ontimeupdate = () => {
  if (audio.duration) {
    progress.value = (audio.currentTime / audio.duration) * 100;
  }
};

progress.oninput = () => {
  audio.currentTime = (progress.value / 100) * audio.duration;
};

// Volume
volume.oninput = () => {
  audio.volume = parseFloat(volume.value);
};

volume.value = 0.8;
audio.volume = 0.8;

// Forward / Backward
forwardBtn.onclick = () => {
  audio.currentTime = Math.min(audio.currentTime + 10, audio.duration);
};

backwardBtn.onclick = () => {
  audio.currentTime = Math.max(audio.currentTime - 10, 0);
};
