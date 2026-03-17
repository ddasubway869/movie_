export interface WatchEntry {
  id: number;
  type: "movie" | "tv";
  title: string;
  posterPath: string | null;
  watchedAt: number;
  progress?: number;
}

export async function getWatchHistory(): Promise<WatchEntry[]> {
  try {
    const res = await fetch("/api/history");
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map((item: {
      tmdb_id: number;
      media_type: "movie" | "tv";
      title: string;
      poster_path: string | null;
      watched_at: string;
      progress: number;
    }) => ({
      id: item.tmdb_id,
      type: item.media_type,
      title: item.title,
      posterPath: item.poster_path,
      watchedAt: new Date(item.watched_at).getTime(),
      progress: item.progress,
    }));
  } catch {
    return [];
  }
}

export async function addToWatchHistory(entry: {
  id: number;
  type: "movie" | "tv";
  title: string;
  posterPath: string | null;
  progress?: number;
}) {
  try {
    await fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tmdbId: entry.id,
        mediaType: entry.type,
        title: entry.title,
        posterPath: entry.posterPath,
        progress: entry.progress ?? 0,
      }),
    });
  } catch {}
}

export async function removeFromWatchHistory(id: number, type: "movie" | "tv") {
  try {
    await fetch(`/api/history/${id}?type=${type}`, { method: "DELETE" });
  } catch {}
}

export async function updateWatchProgress(id: number, type: "movie" | "tv", progress: number) {
  try {
    await fetch(`/api/history/${id}/progress`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progress, mediaType: type }),
    });
  } catch {}
}
