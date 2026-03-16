// ─── Auth ──────────────────────────────────────────────────────────────────

export async function getMe() {
  const res = await fetch("/api/auth/me");
  if (!res.ok) return null;
  return res.json();
}

export async function login(username, password) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Login failed");
  return data;
}

export async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
}

export async function register(username, email, password) {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Registration failed");
  return data;
}

// ─── Auth guard helper ─────────────────────────────────────────────────────
// Call at top of every protected page. Redirects to / if not logged in.
export async function requireLogin() {
  const user = await getMe();
  if (!user) { window.location.href = "/"; throw new Error("not logged in"); }
  return user;
}

// ─── TMDB ──────────────────────────────────────────────────────────────────

async function tmdbFetch(path) {
  const res = await fetch(`/api/tmdb?path=${encodeURIComponent(path)}`);
  if (!res.ok) throw new Error("TMDB request failed");
  return res.json();
}

export async function getTrending(type) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const pages = await Promise.all([1, 2, 3].map(p => tmdbFetch(`/3/trending/${type}/week?page=${p}`)));
  const seen = new Set();
  return pages
    .flatMap(d => d.results || [])
    .filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      const releaseDate = item.release_date || item.first_air_date;
      if (!releaseDate) return true;
      return new Date(releaseDate) <= cutoff;
    })
    .slice(0, 50);
}

export async function searchMulti(query) {
  const data = await tmdbFetch(`/3/search/multi?query=${encodeURIComponent(query)}&include_adult=false`);
  return (data.results || []).filter((r) => r.media_type === "movie" || r.media_type === "tv");
}

export async function getMovieDetails(id) {
  return tmdbFetch(`/3/movie/${id}`);
}

export async function getTVDetails(id) {
  return tmdbFetch(`/3/tv/${id}`);
}

export async function getSeasonDetails(tvId, season) {
  return tmdbFetch(`/3/tv/${tvId}/season/${season}`);
}

// ─── TorBox ────────────────────────────────────────────────────────────────

export async function searchTorrents(tmdbId, mediaType, season, episode) {
  const params = new URLSearchParams({ id: `tmdb:${tmdbId}`, type: mediaType });
  if (season !== undefined && season !== null) params.set("season", season);
  if (episode !== undefined && episode !== null) params.set("episode", episode);
  const res = await fetch(`/api/search?${params}`);
  const data = await res.json();
  if (res.status === 401) {
    const err = new Error(data.detail || "No TorBox API key configured");
    err.code = "NO_API_KEY";
    throw err;
  }
  if (!res.ok) throw new Error(data.detail || "Search failed");
  return { data: data.data?.torrents || data.data || [] };
}

export async function createTorrent(magnet) {
  const form = new FormData();
  form.append("magnet", magnet);
  const res = await fetch("/api/torbox/torrents/createtorrent", { method: "POST", body: form });
  return res.json();
}

export async function listTorrents() {
  const res = await fetch("/api/torbox/torrents/mylist?bypass_cache=true");
  return res.json();
}

export async function requestDownload(torrentId, fileId) {
  const res = await fetch(`/api/torbox/torrents/requestdl?token=session&torrent_id=${torrentId}&file_id=${fileId}&zip_link=false`);
  return res.json();
}

export async function createStream(torrentId, fileId) {
  // Use stream/createstream (proper HLS — TorBox transcodes audio to AAC so Chrome can decode it)
  // requestdl?type=stream returns a raw MKV/MP4 CDN URL which often has AC3/Dolby audio Chrome can't play
  const params = new URLSearchParams({ token: 'session', id: torrentId, type: 'torrent' });
  if (fileId != null) params.set('file_id', fileId);
  const res = await fetch(`/api/torbox/stream/createstream?${params}`);
  const data = await res.json();
  console.log('[SLATE] createstream response:', JSON.stringify(data?.data));
  if (!data.success || !data.data?.hls_url) {
    return { success: false, detail: data.detail || 'Failed to get HLS stream URL' };
  }
  return { success: true, data: data.data.hls_url };
}

// Poll until torrent is ready (downloaded/cached). Calls onProgress(pct, status).
export async function waitForReady(torrentId, onProgress) {
  const maxAttempts = 120;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const data = await listTorrents();
    const torrent = (data.data || []).find((t) => t.id === torrentId);
    if (!torrent) continue;
    if (torrent.download_state === "cached" || torrent.download_state === "completed") {
      onProgress(100, "Ready");
      return torrent;
    }
    const pct = Math.round((torrent.progress || 0) * 100);
    const speed = torrent.download_speed > 0
      ? ` · ${Math.round(torrent.download_speed / 1024 / 1024 * 10) / 10} MB/s`
      : "";
    onProgress(pct, `${torrent.download_state}${speed}`);
  }
  throw new Error("Timed out waiting for torrent");
}

// localStorage cache helpers — store torrent+file info so repeat plays skip API calls
function getStreamCache(hash) {
  try { return JSON.parse(localStorage.getItem('slate_stream_' + hash)); } catch { return null; }
}
function setStreamCache(hash, info) {
  try { localStorage.setItem('slate_stream_' + hash, JSON.stringify(info)); } catch {}
}

// Full flow: add magnet → wait → get stream URL
export async function startStreaming(magnet, onProgress) {
  const hash = extractHashFromMagnet(magnet);
  const { pickVideoFile } = await import("/js/utils.js");

  // Fast path: if we've played this before, skip createTorrent + listTorrents entirely
  const cached = getStreamCache(hash);
  if (cached) {
    onProgress(90, "Getting stream URL…");
    const streamRes = await createStream(cached.torrentId, cached.fileId);
    if (streamRes.success && streamRes.data) {
      return { url: streamRes.data, filename: cached.filename };
    }
    // Cache miss (torrent removed etc.) — fall through to full flow
  }

  // Full flow for first-time plays
  onProgress(0, "Adding torrent…");
  const createRes = await createTorrent(magnet);
  if (!createRes.success && !createRes.detail?.includes("already")) {
    throw new Error(createRes.detail || "Failed to create torrent");
  }

  let torrentId = createRes.data?.torrent_id;

  onProgress(10, "Checking cache…");
  const list = await listTorrents();
  let torrent = (list.data || []).find((t) =>
    torrentId ? t.id === torrentId : t.hash?.toLowerCase() === hash
  );
  if (!torrent) throw new Error("Torrent not found after adding");
  torrentId = torrent.id;

  const isReady = torrent.download_state === "cached" || torrent.download_state === "completed";
  if (isReady) {
    onProgress(100, "Ready");
  } else {
    await waitForReady(torrentId, onProgress);
    const updated = await listTorrents();
    torrent = (updated.data || []).find((t) => t.id === torrentId) || torrent;
  }

  onProgress(100, "Getting stream URL…");
  const file = pickVideoFile(torrent.files);
  if (!file) throw new Error("No video file found");

  const streamRes = await createStream(torrentId, file.id);
  if (!streamRes.success || !streamRes.data) throw new Error(streamRes.detail || "Failed to get stream URL");

  // Cache for next time so we can skip straight to createStream
  setStreamCache(hash, { torrentId, fileId: file.id, filename: file.name });

  return { url: streamRes.data, filename: file.name };
}

function extractHashFromMagnet(magnet) {
  const match = magnet.match(/btih:([a-fA-F0-9]{40})/i)
    || magnet.match(/btih:([a-zA-Z2-7]{32})/i);
  return match ? match[1].toLowerCase() : "";
}

// ─── History ───────────────────────────────────────────────────────────────

export async function getHistory() {
  const res = await fetch("/api/history");
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items || []).map((item) => ({
    id: item.tmdb_id,
    type: item.media_type,
    title: item.title,
    posterPath: item.poster_path,
    watchedAt: item.watched_at,
    progress: item.progress,
    season: item.season ?? null,
    episode: item.episode ?? null,
    episodeName: item.episode_name ?? null,
    watchCount: item.watch_count ?? 1,
  }));
}

export async function addToHistory(entry) {
  await fetch("/api/history", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tmdbId: entry.id,
      mediaType: entry.type,
      title: entry.title,
      posterPath: entry.posterPath || null,
      progress: entry.progress ?? 0,
      season: entry.season ?? null,
      episode: entry.episode ?? null,
      episodeName: entry.episodeName ?? null,
      watchedAt: entry.watchedAt ?? null,
    }),
  });
}

export async function removeFromHistory(id, type) {
  await fetch(`/api/history/${id}?type=${type}`, { method: "DELETE" });
}

export async function updateProgress(id, type, progress) {
  await fetch(`/api/history/${id}/progress?type=${type}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ progress }),
  });
}

// ─── Watchlist ─────────────────────────────────────────────────────────────

export async function getWatchlist() {
  const res = await fetch("/api/watchlist");
  if (!res.ok) return [];
  const data = await res.json();
  return data.items || [];
}

export async function addToWatchlist(item) {
  await fetch("/api/watchlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tmdbId: item.tmdbId,
      mediaType: item.mediaType,
      title: item.title,
      posterPath: item.posterPath || null,
    }),
  });
}

export async function removeFromWatchlist(id, type) {
  await fetch(`/api/watchlist/${id}?type=${type}`, { method: "DELETE" });
}

// ─── Settings ──────────────────────────────────────────────────────────────

export async function saveApiKey(key) {
  const res = await fetch("/api/user/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ torboxApiKey: key }),
  });
  if (!res.ok) throw new Error("Failed to save API key");
  return res.json();
}

export async function getSettings() {
  const res = await fetch("/api/user/settings");
  if (!res.ok) return {};
  return res.json();
}
