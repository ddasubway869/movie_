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

export function pickVideoFile(files, season, episode) {
  const videoFiles = files.filter((f) =>
    VIDEO_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext))
  );
  const pool = videoFiles.length > 0 ? videoFiles : files;
  if (pool.length === 0) return null;

  // If season+episode provided, try to match by filename before falling back to largest
  if (season != null && episode != null) {
    const s = String(season).padStart(2, "0");
    const e = String(episode).padStart(2, "0");
    const patterns = [
      new RegExp(`S${s}E${e}`, "i"),              // S01E01
      new RegExp(`${parseInt(season)}[xX]${e}`),  // 1x01
      new RegExp(`\\.${s}${e}\\.`),               // .0101.
    ];
    for (const pat of patterns) {
      const match = pool.find((f) => pat.test(f.name));
      if (match) return match;
    }
  }

  return pool.reduce((a, b) => (a.size > b.size ? a : b));
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
