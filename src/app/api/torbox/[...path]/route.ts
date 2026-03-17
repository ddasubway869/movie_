import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import getDb from "@/lib/db";

const TORBOX_API = "https://api.torbox.app/v1/api";

async function getApiKey(req: NextRequest): Promise<string | null> {
  const session = await getSessionFromRequest(req);
  if (!session) return null;
  const db = getDb();
  const user = db.prepare("SELECT torbox_api_key FROM users WHERE id = ?").get(session.userId) as
    | { torbox_api_key: string | null }
    | undefined;
  return user?.torbox_api_key ?? null;
}

async function proxyToTorbox(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const apiKey = await getApiKey(req);
  if (!apiKey) {
    return NextResponse.json({ success: false, detail: "No TorBox API key configured. Please set it in Settings." }, { status: 401 });
  }

  const { path } = await params;
  const torboxPath = path.join("/");

  const url = new URL(`${TORBOX_API}/${torboxPath}`);
  req.nextUrl.searchParams.forEach((value, key) => {
    // Inject the real API key for token= param (used by requestDownload)
    if (key === "token") {
      url.searchParams.set(key, apiKey);
    } else {
      url.searchParams.set(key, value);
    }
  });

  const headers: HeadersInit = { Authorization: `Bearer ${apiKey}` };

  let body: BodyInit | undefined;
  if (req.method === "POST") {
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      body = await req.arrayBuffer();
      headers["Content-Type"] = contentType;
    } else {
      body = await req.text();
      if (body) headers["Content-Type"] = "application/json";
    }
  }

  const res = await fetch(url.toString(), { method: req.method, headers, body });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyToTorbox(req, ctx);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyToTorbox(req, ctx);
}
