import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import getDb from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ tmdbId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { tmdbId } = await params;
  const { progress, mediaType } = await req.json();

  if (typeof progress !== "number" || !mediaType) {
    return NextResponse.json({ error: "progress and mediaType required" }, { status: 400 });
  }

  const db = getDb();
  db.prepare(
    "UPDATE watch_history SET progress = ? WHERE user_id = ? AND tmdb_id = ? AND media_type = ?"
  ).run(progress, session.userId, Number(tmdbId), mediaType);

  return NextResponse.json({ ok: true });
}
