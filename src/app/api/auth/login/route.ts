import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import getDb from "@/lib/db";
import { signSession, COOKIE_NAME, sessionCookieOptions } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username?.trim() || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }

  const db = getDb();
  const user = db.prepare(
    "SELECT id, username, email, password_hash FROM users WHERE username = ?"
  ).get(username.trim()) as { id: number; username: string; email: string; password_hash: string } | undefined;

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  const token = await signSession({ userId: user.id, username: user.username, email: user.email });

  const res = NextResponse.json({ userId: user.id, username: user.username, email: user.email });
  res.cookies.set(COOKIE_NAME, token, sessionCookieOptions());
  return res;
}
