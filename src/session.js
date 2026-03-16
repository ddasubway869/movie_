import { SignJWT, jwtVerify } from "jose";

export const COOKIE_NAME = "slate_session";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function getSecret() {
  const secret = process.env.SESSION_SECRET || "slate-dev-secret-change-in-production-please";
  return new TextEncoder().encode(secret);
}

export async function signSession(payload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
}

export async function verifySession(token) {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      userId: payload.userId,
      username: payload.username,
      email: payload.email,
    };
  } catch {
    return null;
  }
}

// Read session from Express request (requires cookie-parser middleware)
export async function getSession(req) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;
  return verifySession(token);
}

export function sessionCookieOptions(maxAge = COOKIE_MAX_AGE) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge,
    path: "/",
  };
}
