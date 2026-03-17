import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import getDb from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const db = getDb();
  const user = db.prepare(
    "SELECT id, username, email, (torbox_api_key IS NOT NULL) as has_api_key FROM users WHERE id = ?"
  ).get(session.userId) as { id: number; username: string; email: string; has_api_key: number } | undefined;

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    userId: user.id,
    username: user.username,
    email: user.email,
    hasApiKey: Boolean(user.has_api_key),
  });
}
