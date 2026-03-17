import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import getDb from "@/lib/db";
import { signSession, COOKIE_NAME, sessionCookieOptions } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { username, email, password } = await req.json();

  if (!username?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE username = ? OR email = ?").get(username.trim(), email.trim());
  if (existing) {
    return NextResponse.json({ error: "Username or email already taken" }, { status: 409 });
  }

  const password_hash = await bcrypt.hash(password, 12);
  const result = db.prepare(
    "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)"
  ).run(username.trim(), email.trim(), password_hash);

  const userId = result.lastInsertRowid as number;
  const token = await signSession({ userId, username: username.trim(), email: email.trim() });

  const res = NextResponse.json({ userId, username: username.trim(), email: email.trim() }, { status: 201 });
  res.cookies.set(COOKIE_NAME, token, sessionCookieOptions());
  return res;
}
