import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import getDb from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const db = getDb();
  const user = db.prepare(
    "SELECT (torbox_api_key IS NOT NULL) as has_api_key FROM users WHERE id = ?"
  ).get(session.userId) as { has_api_key: number } | undefined;

  return NextResponse.json({ hasApiKey: Boolean(user?.has_api_key) });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { torboxApiKey } = await req.json();
  if (!torboxApiKey || typeof torboxApiKey !== "string") {
    return NextResponse.json({ error: "torboxApiKey required" }, { status: 400 });
  }

  const db = getDb();
  db.prepare("UPDATE users SET torbox_api_key = ? WHERE id = ?").run(torboxApiKey.trim(), session.userId);
  return NextResponse.json({ ok: true });
}
