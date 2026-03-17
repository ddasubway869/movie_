import { NextRequest, NextResponse } from "next/server";

const TMDB_API = "https://api.themoviedb.org";

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey || apiKey === "your_tmdb_api_key_here") {
    return NextResponse.json({ error: "TMDB API key not configured" }, { status: 500 });
  }

  const separator = path.includes("?") ? "&" : "?";
  const url = `${TMDB_API}${path}${separator}api_key=${apiKey}`;

  const res = await fetch(url);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
