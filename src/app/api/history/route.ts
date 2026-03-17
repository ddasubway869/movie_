import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import getDb from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const db = getDb();
  const items = db.prepare(
    "SELECT tmdb_id, media_type, title, poster_path, watched_at, progress FROM watch_history WHERE user_id = ? ORDER BY watched_at DESC LIMIT 20"
  ).all(session.userId);

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { tmdbId, mediaType, title, posterPath, progress } = await req.json();
  if (!tmdbId || !mediaType || !title) {
    return NextResponse.json({ error: "tmdbId, mediaType, title required" }, { status: 400 });
  }

  const db = getDb();
  db.prepare(`
    INSERT INTO watch_history (user_id, tmdb_id, media_type, title, poster_path, progress, watched_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, tmdb_id, media_type) DO UPDATE SET
      title = excluded.title,
      poster_path = excluded.poster_path,
      watched_at = datetime('now'),
      progress = COALESCE(excluded.progress, progress)
  `).run(session.userId, tmdbId, mediaType, title, posterPath ?? null, progress ?? 0);

  return NextResponse.json({ ok: true });
}
