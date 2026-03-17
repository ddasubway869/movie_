import express from "express";
import cookieParser from "cookie-parser";
import { Readable } from "node:stream";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import bcrypt from "bcryptjs";

import { randomBytes } from "node:crypto";
import getDb from "./src/db.js";
import { sendVerificationEmail } from "./src/email.js";
import {
  signSession,
  verifySession,
  getSession,
  sessionCookieOptions,
  COOKIE_NAME,
  COOKIE_MAX_AGE,
} from "./src/session.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cookieParser());
app.use(express.json());

// Auth middleware — attaches req.user or returns 401
async function requireAuth(req, res, next) {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Not authenticated" });
  req.user = session;
  next();
}

// ─── Auth routes ──────────────────────────────────────────────────────────────
app.post("/api/auth/register", async (req, res) => {
  const { username, email, password } = req.body || {};
  if (!username || !email || !password)
    return res.status(400).json({ error: "username, email, and password are required" });

  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE username = ? OR email = ?").get(username, email);
  if (existing) return res.status(409).json({ error: "Username or email already exists" });

  const hash = await bcrypt.hash(password, 12);
  const verifyToken = randomBytes(32).toString("hex");
  const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const result = db.prepare(
    "INSERT INTO users (username, email, password_hash, email_verified, verify_token, verify_expires) VALUES (?, ?, ?, 0, ?, ?)"
  ).run(username, email, hash, verifyToken, verifyExpires);

  // Send verification email (non-blocking — don't fail signup if email fails)
  sendVerificationEmail(email, username, verifyToken).catch(err =>
    console.error("Failed to send verification email:", err)
  );

  res.json({ userId: result.lastInsertRowid, username, email, needsVerification: true });
});

app.get("/api/auth/verify", (req, res) => {
  const { token } = req.query;
  if (!token) return res.redirect("/register.html?error=invalid-token");

  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE verify_token = ?").get(token);

  if (!user) return res.redirect("/register.html?error=invalid-token");
  if (new Date(user.verify_expires) < new Date())
    return res.redirect("/register.html?error=token-expired");

  db.prepare(
    "UPDATE users SET email_verified = 1, verify_token = NULL, verify_expires = NULL WHERE id = ?"
  ).run(user.id);

  // Sign session and redirect to browse
  signSession({ userId: user.id, username: user.username, email: user.email }).then(sessionToken => {
    res.cookie(COOKIE_NAME, sessionToken, sessionCookieOptions());
    res.redirect("/browse.html");
  });
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password)
    return res.status(400).json({ error: "username and password are required" });

  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user) return res.status(401).json({ error: "Invalid username or password" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid username or password" });

  if (!user.email_verified)
    return res.status(403).json({ error: "Please verify your email before logging in. Check your inbox." });

  const token = await signSession({ userId: user.id, username: user.username, email: user.email });
  res.cookie(COOKIE_NAME, token, sessionCookieOptions());
  res.json({
    userId: user.id,
    username: user.username,
    email: user.email,
    hasApiKey: !!user.torbox_api_key,
  });
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.json({ ok: true });
});

app.get("/api/auth/me", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Not authenticated" });
  const db = getDb();
  const user = db.prepare("SELECT id, torbox_api_key FROM users WHERE id = ?").get(session.userId);
  // Ghost session: valid JWT but user was deleted or DB was wiped — force re-login
  if (!user) {
    res.clearCookie(COOKIE_NAME, { path: "/" });
    return res.status(401).json({ error: "Session expired. Please sign in again." });
  }
  res.json({
    userId: session.userId,
    username: session.username,
    email: session.email,
    hasApiKey: !!(user.torbox_api_key),
  });
});

// ─── Settings ─────────────────────────────────────────────────────────────────
app.get("/api/user/settings", requireAuth, (req, res) => {
  const db = getDb();
  const user = db.prepare("SELECT torbox_api_key, real_debrid_api_key FROM users WHERE id = ?").get(req.user.userId);
  res.json({
    hasApiKey: !!(user?.torbox_api_key),
    maskedKey: user?.torbox_api_key ? "••••••••" + user.torbox_api_key.slice(-4) : null,
    hasRDKey: !!(user?.real_debrid_api_key),
    rdMaskedKey: user?.real_debrid_api_key ? "••••••••" + user.real_debrid_api_key.slice(-4) : null,
  });
});

app.put("/api/user/settings", requireAuth, (req, res) => {
  const { torboxApiKey, realDebridApiKey } = req.body || {};
  const db = getDb();
  if (torboxApiKey !== undefined)
    db.prepare("UPDATE users SET torbox_api_key = ? WHERE id = ?").run(torboxApiKey || null, req.user.userId);
  if (realDebridApiKey !== undefined)
    db.prepare("UPDATE users SET real_debrid_api_key = ? WHERE id = ?").run(realDebridApiKey || null, req.user.userId);
  res.json({ ok: true });
});

// ─── Real-Debrid Proxy ────────────────────────────────────────────────────────
app.all("/api/rd/*", requireAuth, async (req, res) => {
  const db = getDb();
  const user = db.prepare("SELECT real_debrid_api_key FROM users WHERE id = ?").get(req.user.userId);
  const rdKey = user?.real_debrid_api_key;
  if (!rdKey) return res.status(401).json({ error: "No Real-Debrid API key configured" });

  const rdPath = req.path.replace("/api/rd", "");
  const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  const rdUrl = `https://api.real-debrid.com/rest/1.0${rdPath}${qs}`;

  const fetchOptions = { method: req.method, headers: { Authorization: `Bearer ${rdKey}` } };
  if (req.method === "POST" || req.method === "PUT") {
    const body = new URLSearchParams(req.body || {}).toString();
    if (body) {
      fetchOptions.headers["Content-Type"] = "application/x-www-form-urlencoded";
      fetchOptions.body = body;
    }
  }

  try {
    const upstream = await fetch(rdUrl, fetchOptions);
    if (upstream.status === 204) return res.status(204).end();
    const text = await upstream.text();
    try { res.status(upstream.status).json(JSON.parse(text)); }
    catch { res.status(upstream.status).send(text); }
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// ─── Watchlist ────────────────────────────────────────────────────────────────
app.get("/api/watchlist", requireAuth, (req, res) => {
  const db = getDb();
  const items = db.prepare(
    "SELECT tmdb_id, media_type, title, poster_path, added_at FROM watchlist WHERE user_id = ? ORDER BY added_at DESC"
  ).all(req.user.userId);
  res.json({ items });
});

app.post("/api/watchlist", requireAuth, (req, res) => {
  const { tmdbId, mediaType, title, posterPath } = req.body || {};
  if (!tmdbId || !mediaType || !title)
    return res.status(400).json({ error: "tmdbId, mediaType, and title are required" });

  const db = getDb();
  db.prepare(
    "INSERT OR IGNORE INTO watchlist (user_id, tmdb_id, media_type, title, poster_path) VALUES (?, ?, ?, ?, ?)"
  ).run(req.user.userId, tmdbId, mediaType, title, posterPath || null);
  res.json({ ok: true });
});

app.delete("/api/watchlist/:tmdbId", requireAuth, (req, res) => {
  const type = req.query.type;
  if (!type) return res.status(400).json({ error: "type required" });
  const db = getDb();
  db.prepare("DELETE FROM watchlist WHERE user_id = ? AND tmdb_id = ? AND media_type = ?")
    .run(req.user.userId, Number(req.params.tmdbId), type);
  res.json({ ok: true });
});

// ─── Watch History ────────────────────────────────────────────────────────────
app.get("/api/history", requireAuth, (req, res) => {
  const db = getDb();
  const items = db.prepare(
    "SELECT tmdb_id, media_type, title, poster_path, watched_at, progress, season, episode, episode_name, watch_count FROM watch_history WHERE user_id = ? ORDER BY watched_at DESC"
  ).all(req.user.userId);
  res.json({ items });
});

app.post("/api/history", requireAuth, (req, res) => {
  const { tmdbId, mediaType, title, posterPath, progress, season, episode, episodeName, watchedAt } = req.body || {};
  if (!tmdbId || !mediaType || !title)
    return res.status(400).json({ error: "tmdbId, mediaType, and title are required" });

  const db = getDb();
  const isComplete = (progress ?? 0) >= 0.9;
  // Use provided date or fall back to now; sanitise to prevent injection
  const dateExpr = watchedAt ? `'${watchedAt.replace(/'/g, '')}'` : `datetime('now')`;

  db.prepare(`
    INSERT INTO watch_history (user_id, tmdb_id, media_type, title, poster_path, progress, season, episode, episode_name, watch_count, watched_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ${dateExpr})
    ON CONFLICT(user_id, tmdb_id, media_type) DO UPDATE SET
      title = excluded.title,
      poster_path = excluded.poster_path,
      progress = excluded.progress,
      season = excluded.season,
      episode = excluded.episode,
      episode_name = excluded.episode_name,
      watch_count = CASE WHEN excluded.progress >= 0.9 THEN watch_history.watch_count + 1 ELSE watch_history.watch_count END,
      watched_at = ${dateExpr}
  `).run(req.user.userId, tmdbId, mediaType, title, posterPath || null, progress ?? 0, season ?? null, episode ?? null, episodeName || null);

  // Log each completed watch separately so we can show full watch history
  if (isComplete) {
    db.prepare(`INSERT INTO watch_log (user_id, tmdb_id, media_type, watched_at) VALUES (?, ?, ?, ${dateExpr})`)
      .run(req.user.userId, tmdbId, mediaType);
  }

  res.json({ ok: true });
});

app.get("/api/history/:tmdbId/log", requireAuth, (req, res) => {
  const type = req.query.type;
  if (!type) return res.status(400).json({ error: "type required" });
  const db = getDb();
  const logs = db.prepare(
    "SELECT watched_at FROM watch_log WHERE user_id = ? AND tmdb_id = ? AND media_type = ? ORDER BY watched_at DESC"
  ).all(req.user.userId, Number(req.params.tmdbId), type);
  res.json({ logs });
});

app.delete("/api/history/:tmdbId/log", requireAuth, (req, res) => {
  const type = req.query.type;
  if (!type) return res.status(400).json({ error: "type required" });
  const db = getDb();
  db.prepare("DELETE FROM watch_log WHERE user_id = ? AND tmdb_id = ? AND media_type = ?")
    .run(req.user.userId, Number(req.params.tmdbId), type);
  db.prepare("UPDATE watch_history SET watch_count = 1 WHERE user_id = ? AND tmdb_id = ? AND media_type = ?")
    .run(req.user.userId, Number(req.params.tmdbId), type);
  res.json({ ok: true });
});

app.delete("/api/history/:tmdbId", requireAuth, (req, res) => {
  const type = req.query.type;
  if (!type) return res.status(400).json({ error: "type required" });
  const db = getDb();
  db.prepare("DELETE FROM watch_history WHERE user_id = ? AND tmdb_id = ? AND media_type = ?")
    .run(req.user.userId, Number(req.params.tmdbId), type);
  db.prepare("DELETE FROM watch_log WHERE user_id = ? AND tmdb_id = ? AND media_type = ?")
    .run(req.user.userId, Number(req.params.tmdbId), type);
  res.json({ ok: true });
});

app.put("/api/history/:tmdbId/progress", requireAuth, (req, res) => {
  const type = req.query.type;
  const { progress } = req.body || {};
  if (!type) return res.status(400).json({ error: "type required" });
  if (progress === undefined) return res.status(400).json({ error: "progress required" });

  const db = getDb();
  db.prepare("UPDATE watch_history SET progress = ?, watched_at = datetime('now') WHERE user_id = ? AND tmdb_id = ? AND media_type = ?")
    .run(progress, req.user.userId, Number(req.params.tmdbId), type);
  res.json({ ok: true });
});

// ─── TMDB Proxy ───────────────────────────────────────────────────────────────
app.get("/api/tmdb", async (req, res) => {
  const path = req.query.path;
  if (!path) return res.status(400).json({ error: "path required" });

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "TMDB_API_KEY not configured" });

  try {
    const separator = path.includes("?") ? "&" : "?";
    const url = `https://api.themoviedb.org${path}${separator}api_key=${apiKey}`;
    const upstream = await fetch(url);
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (e) {
    res.status(502).json({ error: "TMDB request failed" });
  }
});

// ─── TorBox Search Proxy ──────────────────────────────────────────────────────
app.get("/api/search", requireAuth, async (req, res) => {
  const db = getDb();
  const user = db.prepare("SELECT torbox_api_key FROM users WHERE id = ?").get(req.user.userId);
  const apiKey = user?.torbox_api_key;
  if (!apiKey)
    return res.status(401).json({ success: false, detail: "No TorBox API key configured" });

  const id = req.query.id;
  if (!id) return res.status(400).json({ success: false, detail: "Missing id parameter" });

  const params = new URLSearchParams();
  if (req.query.type) params.set("type", req.query.type);
  if (req.query.season) params.set("season", req.query.season);
  if (req.query.episode) params.set("episode", req.query.episode);
  const qs = params.toString();
  const url = `https://search-api.torbox.app/torrents/${encodeURIComponent(id)}${qs ? `?${qs}` : ""}`;

  try {
    const upstream = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch {
    res.status(502).json({ success: false, detail: "Search service unavailable" });
  }
});

// ─── TorBox API Proxy ─────────────────────────────────────────────────────────
app.use("/api/torbox", requireAuth, async (req, res) => {
  const db = getDb();
  const user = db.prepare("SELECT torbox_api_key FROM users WHERE id = ?").get(req.user.userId);
  const apiKey = user?.torbox_api_key;
  if (!apiKey)
    return res.status(401).json({ success: false, detail: "No TorBox API key configured. Please set it in Settings." });

  const torboxPath = req.path.replace(/^\//, "");
  const url = new URL(`https://api.torbox.app/v1/api/${torboxPath}`);

  // Forward all query params, replacing token=session with real key
  for (const [key, value] of Object.entries(req.query)) {
    url.searchParams.set(key, key === "token" ? apiKey : value);
  }

  const headers = { Authorization: `Bearer ${apiKey}` };

  let body;
  if (req.method === "POST") {
    const contentType = req.headers["content-type"] || "";
    if (contentType.includes("multipart/form-data")) {
      // Stream raw multipart body
      body = await new Promise((resolve, reject) => {
        const chunks = [];
        req.on("data", (c) => chunks.push(c));
        req.on("end", () => resolve(Buffer.concat(chunks)));
        req.on("error", reject);
      });
      headers["Content-Type"] = contentType;
    } else {
      body = JSON.stringify(req.body);
      if (body && body !== "{}") headers["Content-Type"] = "application/json";
    }
  }

  try {
    const upstream = await fetch(url.toString(), { method: req.method, headers, body });
    const data = await upstream.json();
    if (!upstream.ok || (data && !data.success)) {
      console.log(`[TorBox] ${req.method} ${torboxPath} → ${upstream.status}`, JSON.stringify(data).slice(0, 300));
    }
    res.status(upstream.status).json(data);
  } catch (e) {
    res.status(502).json({ success: false, detail: "TorBox request failed" });
  }
});

// ─── Stream Track Discovery ───────────────────────────────────────────────────
app.get("/api/stream-tracks", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.json({ tracks: [], type: null });

  try {
    const upstream = await fetch(url);
    if (!upstream.ok) return res.json({ tracks: [], type: null });
    const text = await upstream.text();

    // Parse HLS EXT-X-MEDIA:TYPE=AUDIO tags
    const hlsTracks = [];
    const audioRegex = /#EXT-X-MEDIA:TYPE=AUDIO[^\n]*/g;
    let match;
    while ((match = audioRegex.exec(text)) !== null) {
      const line = match[0];
      hlsTracks.push({
        name: line.match(/NAME="([^"]*)"/)?.[1] || 'Unknown',
        lang: line.match(/LANGUAGE="([^"]*)"/)?.[1] || '',
        isDefault: /DEFAULT=YES/i.test(line),
        type: 'hls',
      });
    }
    if (hlsTracks.length > 0) return res.json({ tracks: hlsTracks, type: 'hls' });

    // No HLS audio tracks — try TorBox muxed track probing
    // URL pattern: /stream/{uuid}/{audio}/{subtitle}/{quality}/playlist.m3u8?...
    const tbMatch = url.match(/(.*\/stream\/[^/]+\/)([^/]+)(\/[^/]+\/[^/]+\/playlist\.m3u8.*)/);
    if (!tbMatch) return res.json({ tracks: [], type: null });

    const [, prefix, currentAudio, suffix] = tbMatch;
    const probes = await Promise.allSettled(
      [0, 1, 2, 3, 4, 5].map(async (i) => {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);
        try {
          const r = await fetch(`${prefix}${i}${suffix}`, { signal: ctrl.signal });
          clearTimeout(timer);
          if (!r.ok) return null;
          const body = await r.text();
          if (!body.trimStart().startsWith('#EXTM3U')) return null;
          // Try to extract language name from this playlist's EXT-X-MEDIA tags
          const nameMatch = body.match(/NAME="([^"]*)"/);
          const langMatch = body.match(/LANGUAGE="([^"]*)"/);
          return {
            index: i,
            name: nameMatch?.[1] || null,
            lang: langMatch?.[1] || '',
          };
        } catch { clearTimeout(timer); return null; }
      })
    );

    const validProbes = probes
      .filter(r => r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value);

    // Deduplicate — if all playlists return same NAME, TorBox is echoing back a single-track file
    const uniqueNames = new Set(validProbes.map(p => p.name));
    const hasRealLabels = uniqueNames.size > 1 || (validProbes.length > 0 && validProbes[0].name);
    const activeIdx = parseInt(currentAudio) || 0;

    const tracks = validProbes.map((p, i) => ({
      index: p.index,
      name: hasRealLabels && p.name ? p.name : `Track ${i + 1}`,
      lang: p.lang,
      isDefault: p.index === activeIdx,
      type: 'torbox',
    }));

    // If all names are identical (single-track file), only return 1 track — no picker needed
    const finalTracks = uniqueNames.size === 1 && validProbes.length > 1 ? [tracks[0]] : tracks;

    res.json({ tracks: finalTracks, type: finalTracks.length ? 'torbox' : null });
  } catch {
    res.json({ tracks: [], type: null });
  }
});

// ─── HLS Proxy ────────────────────────────────────────────────────────────────
app.get("/api/hls", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "Missing url param" });

  try {
    // Forward Range header so seeking works correctly
    const fetchHeaders = {};
    if (req.headers.range) fetchHeaders["Range"] = req.headers.range;

    const upstream = await fetch(url, { headers: fetchHeaders });
    if (!upstream.ok && upstream.status !== 206) {
      return res.status(upstream.status).send(`Upstream error: ${upstream.status}`);
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";

    if (contentType.includes("mpegurl") || url.includes(".m3u8") || url.includes("/hls")) {
      const text = await upstream.text();
      const baseUrl = url.substring(0, url.lastIndexOf("/") + 1);
      const origin = new URL(url).origin;
      function absoluteUrl(raw) {
        const trimmed = raw.trim();
        if (trimmed.startsWith("http")) return trimmed;
        if (trimmed.startsWith("/")) return origin + trimmed;
        return baseUrl + trimmed;
      }
      function proxyUrl(raw) {
        return `/api/hls?url=${encodeURIComponent(absoluteUrl(raw))}`;
      }

      // Rewrite bare URL lines (segments / sub-playlists)
      let rewritten = text.replace(/^(?!#)(?!\s*$)(.+)$/gm, (line) => proxyUrl(line));
      // Also rewrite URI="..." attributes inside #EXT-X-* tags (audio/subtitle tracks)
      rewritten = rewritten.replace(/URI="([^"]+)"/g, (_, uri) => `URI="${proxyUrl(uri)}"`);
      res.set({
        "Content-Type": "application/vnd.apple.mpegurl",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache",
      });
      return res.send(rewritten);
    }

    // Binary segment — stream directly, forwarding size + range headers so
    // HLS.js knows how much data to expect and seeking works properly
    const resHeaders = {
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    };
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) resHeaders["Content-Length"] = contentLength;
    const contentRange = upstream.headers.get("content-range");
    if (contentRange) resHeaders["Content-Range"] = contentRange;
    const acceptRanges = upstream.headers.get("accept-ranges");
    if (acceptRanges) resHeaders["Accept-Ranges"] = acceptRanges;

    // Disable socket timeout — segments can be large and must not be cut off mid-stream
    if (req.socket) req.socket.setTimeout(0);

    res.status(upstream.status).set(resHeaders);
    Readable.fromWeb(upstream.body).pipe(res);
  } catch (e) {
    if (e.name === "AbortError") {
      return res.status(504).json({ error: "Upstream timeout — TorBox CDN did not respond in time" });
    }
    res.status(502).json({ error: e.message || "Proxy fetch failed" });
  }
});

// ─── Static files ─────────────────────────────────────────────────────────────
app.use(express.static(join(__dirname, "public")));

// Fallback: send index.html for unknown routes (SPA fallback not needed since multi-page)
app.get("*", (req, res) => {
  res.sendFile(join(__dirname, "public", "index.html"));
});

// ─── Global error handler ─────────────────────────────────────────────────────
// Catches any unhandled throw from route handlers (e.g. DB errors) so the app
// logs the real message and returns a clean JSON 500 instead of hanging.
app.use((err, req, res, next) => {
  console.error(`[SLATE ERROR] ${req.method} ${req.path} →`, err.message, err.stack);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: "Internal server error", detail: err.message });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SLATE running at http://localhost:${PORT}`);
});
