import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import getDb from "@/lib/db";

const SEARCH_API = "https://search-api.torbox.app";

async function getApiKey(req: NextRequest): Promise<string | null> {
  const session = await getSessionFromRequest(req);
  if (!session) return null;
  const db = getDb();
  const user = db.prepare("SELECT torbox_api_key FROM users WHERE id = ?").get(session.userId) as
    | { torbox_api_key: string | null }
    | undefined;
  return user?.torbox_api_key ?? null;
}

export async function GET(req: NextRequest) {
  const apiKey = await getApiKey(req);
  if (!apiKey) {
    return NextResponse.json({ success: false, detail: "No TorBox API key configured" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  const type = req.nextUrl.searchParams.get("type") || "movie";

  if (!id) {
    return NextResponse.json({ success: false, detail: "Missing id parameter" }, { status: 400 });
  }

  const params = new URLSearchParams();
  const season = req.nextUrl.searchParams.get("season");
  const episode = req.nextUrl.searchParams.get("episode");
  if (season) params.set("season", season);
  if (episode) params.set("episode", episode);

  const queryString = params.toString();
  const url = `${SEARCH_API}/torrents/${encodeURIComponent(id)}${queryString ? `?${queryString}` : ""}`;

  void type;

  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, detail: "Search service unavailable" }, { status: 502 });
  }
}
