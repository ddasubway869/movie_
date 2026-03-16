export function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function extractHashFromMagnet(magnet) {
  const match = magnet.match(/btih:([a-fA-F0-9]{40})/i)
    || magnet.match(/btih:([a-zA-Z2-7]{32})/i);
  return match ? match[1].toLowerCase() : "";
}

const VIDEO_EXTENSIONS = [".mp4", ".mkv", ".avi", ".webm", ".mov", ".m4v", ".wmv"];

export function pickVideoFile(files) {
  const videoFiles = files.filter((f) =>
    VIDEO_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext))
  );
  if (videoFiles.length === 0)
    return files.length > 0 ? files.reduce((a, b) => (a.size > b.size ? a : b)) : null;
  return videoFiles.reduce((a, b) => (a.size > b.size ? a : b));
}

export function isBrowserPlayable(filename) {
  const name = filename.toLowerCase();
  return name.endsWith(".mp4") || name.endsWith(".webm") || name.endsWith(".m4v");
}

export function getYear(dateStr) {
  if (!dateStr) return "";
  return dateStr.split("-")[0] || "";
}

export function ratingToPercent(rating) {
  return Math.round(rating * 10) + "%";
}

export function posterURL(path, size = "w300") {
  if (!path) return "";
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

// Debounce helper
export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// Apply saved theme on load
export function initTheme() {
  const saved = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
  return saved;
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
  return next;
}
