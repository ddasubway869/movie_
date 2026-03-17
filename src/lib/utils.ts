export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function extractHashFromMagnet(magnet: string): string {
  const match = magnet.match(/btih:([a-fA-F0-9]{40})/i)
    || magnet.match(/btih:([a-zA-Z2-7]{32})/i);
  return match ? match[1].toLowerCase() : "";
}

const VIDEO_EXTENSIONS = [".mp4", ".mkv", ".avi", ".webm", ".mov", ".m4v", ".wmv"];

export function pickVideoFile(files: { id: number; name: string; size: number }[]): { id: number; name: string; size: number } | null {
  const videoFiles = files.filter((f) =>
    VIDEO_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext))
  );
  if (videoFiles.length === 0) return files.length > 0 ? files.reduce((a, b) => (a.size > b.size ? a : b)) : null;
  return videoFiles.reduce((a, b) => (a.size > b.size ? a : b));
}

export function isBrowserPlayable(filename: string): boolean {
  const name = filename.toLowerCase();
  return name.endsWith(".mp4") || name.endsWith(".webm") || name.endsWith(".m4v");
}

export function getYear(dateStr: string | undefined | null): string {
  if (!dateStr) return "";
  return dateStr.split("-")[0] || "";
}

export function ratingToPercent(rating: number): string {
  return Math.round(rating * 10) + "%";
}
