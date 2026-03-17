import { TorboxAPIResponse, TorboxTorrent, TorboxCreateResponse, TorboxSearchResult } from "@/types/torbox";
import { pickVideoFile, isBrowserPlayable } from "./utils";

async function torboxFetch<T>(path: string, options?: RequestInit): Promise<TorboxAPIResponse<T>> {
  const res = await fetch(`/api/torbox/${path}`, options);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.detail || "TorBox request failed");
  }
  return data;
}

export async function createTorrent(magnet: string): Promise<TorboxCreateResponse> {
  const form = new FormData();
  form.append("magnet", magnet);
  const res = await torboxFetch<TorboxCreateResponse>("torrents/createtorrent", {
    method: "POST",
    body: form,
  });
  return res.data;
}

export async function listTorrents(id?: number): Promise<TorboxTorrent[]> {
  const path = id ? `torrents/mylist?id=${id}` : "torrents/mylist";
  const res = await torboxFetch<TorboxTorrent | TorboxTorrent[]>(path);
  if (!res.data) return [];
  return Array.isArray(res.data) ? res.data : [res.data];
}

export async function requestDownload(torrentId: number, fileId?: number): Promise<string> {
  // "token" param is replaced server-side with the real API key from the DB
  const params = new URLSearchParams({
    token: "session",
    torrent_id: String(torrentId),
  });
  if (fileId !== undefined) params.set("file_id", String(fileId));
  const res = await torboxFetch<string>(`torrents/requestdl?${params}`);
  return res.data;
}

interface TorboxStreamData {
  hls_url: string;
  domain: string;
  presigned_token: string;
  [key: string]: unknown;
}

export async function createStream(torrentId: number, fileId?: number): Promise<string> {
  const params = new URLSearchParams({
    id: String(torrentId),
    type: "torrent",
  });
  if (fileId !== undefined) params.set("file_id", String(fileId));
  const res = await torboxFetch<TorboxStreamData>(`stream/createstream?${params}`);
  return res.data.hls_url;
}

export async function searchTorrents(
  tmdbId: number,
  mediaType: "movie" | "tv",
  season?: number,
  episode?: number
): Promise<TorboxSearchResult[]> {
  const params = new URLSearchParams({
    id: `tmdb:${tmdbId}`,
    type: mediaType,
  });
  if (season !== undefined) params.set("season", String(season));
  if (episode !== undefined) params.set("episode", String(episode));
  const res = await fetch(`/api/search?${params}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Search failed");
  return data.data?.torrents || data.data || [];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForReady(
  torrentId: number,
  onProgress?: (progress: number, speed: number) => void,
  maxWaitMs = 120000
): Promise<TorboxTorrent> {
  const start = Date.now();
  let lastProgress = -1;
  let stuckCount = 0;

  while (Date.now() - start < maxWaitMs) {
    const torrents = await listTorrents(torrentId);
    const torrent = torrents[0];
    if (!torrent) throw new Error("Torrent not found");

    const state = torrent.download_state?.toLowerCase();

    if (
      state === "completed" ||
      state === "cached" ||
      state === "seeding" ||
      state === "uploading" ||
      state === "finished" ||
      state === "ready" ||
      (state === "downloading" && torrent.progress >= 1)
    ) {
      return torrent;
    }

    if (torrent.progress === lastProgress && torrent.progress === 0) {
      stuckCount++;
      if (stuckCount >= 10) {
        throw new Error("Torrent is not downloading. Try a different source with more seeders.");
      }
    } else {
      stuckCount = 0;
    }
    lastProgress = torrent.progress;

    onProgress?.(torrent.progress, torrent.download_speed);
    await sleep(2000);
  }
  throw new Error("Timed out waiting for torrent");
}

export async function startStreaming(
  magnet: string,
  onProgress?: (progress: number, speed: number) => void
): Promise<{ url: string; filename: string }> {
  const torrent = await createTorrent(magnet);
  const torrentId = torrent.torrent_id;

  const readyTorrent = await waitForReady(torrentId, onProgress);
  const file = pickVideoFile(readyTorrent.files || []);
  if (!file) throw new Error("No video file found");

  let url: string;
  if (isBrowserPlayable(file.name)) {
    url = await requestDownload(torrentId, file.id);
  } else {
    const hlsUrl = await createStream(torrentId, file.id);
    url = `/api/hls?url=${encodeURIComponent(hlsUrl)}`;
  }

  return { url, filename: file.name };
}
