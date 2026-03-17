import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import getDb from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const db = getDb();
  const items = db.prepare(
    "SELECT tmdb_id, media_type, title, poster_path, added_at FROM watchlist WHERE user_id = ? ORDER BY added_at DESC"
  ).all(session.userId);

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { tmdbId, mediaType, title, posterPath } = await req.json();
  if (!tmdbId || !mediaType || !title) {
    return NextResponse.json({ error: "tmdbId, mediaType, title required" }, { status: 400 });
  }

  const db = getDb();
  db.prepare(
    "INSERT OR IGNORE INTO watchlist (user_id, tmdb_id, media_type, title, poster_path) VALUES (?, ?, ?, ?, ?)"
  ).run(session.userId, tmdbId, mediaType, title, posterPath ?? null);

  return NextResponse.json({ ok: true });
}
