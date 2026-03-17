import { NextRequest, NextResponse } from "next/server";

// Proxy HLS requests to avoid CORS/ORB blocking.
// The browser can't fetch .m3u8 playlists or .ts segments cross-origin,
// so we proxy them through our own server.
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return new NextResponse(`Upstream error: ${res.status}`, { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "application/octet-stream";

    // If this is an HLS playlist, buffer and rewrite segment URLs to go through our proxy
    if (contentType.includes("mpegurl") || url.includes(".m3u8") || url.includes("/hls")) {
      const text = await res.text();
      const baseUrl = url.substring(0, url.lastIndexOf("/") + 1);
      const origin = new URL(url).origin;
      // Rewrite ALL non-comment, non-empty lines (they are URIs in HLS format)
      const rewritten = text.replace(/^(?!#)(?!\s*$)(.+)$/gm, (line) => {
        const trimmed = line.trim();
        let absoluteUrl: string;
        if (trimmed.startsWith("http")) {
          absoluteUrl = trimmed;
        } else if (trimmed.startsWith("/")) {
          absoluteUrl = origin + trimmed;
        } else {
          absoluteUrl = baseUrl + trimmed;
        }
        return `/api/hls?url=${encodeURIComponent(absoluteUrl)}`;
      });

      return new NextResponse(rewritten, {
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache",
        },
      });
    }

    // For .ts segments, stream the body directly without buffering
    return new NextResponse(res.body, {
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Proxy fetch failed" },
      { status: 502 }
    );
  }
}
