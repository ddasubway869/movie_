import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import getDb from "@/lib/db";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ tmdbId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { tmdbId } = await params;
  const type = req.nextUrl.searchParams.get("type");
  if (!type) return NextResponse.json({ error: "type required" }, { status: 400 });

  const db = getDb();
  db.prepare(
    "DELETE FROM watch_history WHERE user_id = ? AND tmdb_id = ? AND media_type = ?"
  ).run(session.userId, Number(tmdbId), type);

  return NextResponse.json({ ok: true });
}
