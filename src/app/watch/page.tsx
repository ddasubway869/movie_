"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import VideoPlayer from "@/components/VideoPlayer";
import { addToWatchHistory, updateWatchProgress } from "@/lib/watchHistory";

function WatchContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url");
  const title = searchParams.get("title") || "Untitled";
  const filename = searchParams.get("filename") || "";
  const tmdbId = Number(searchParams.get("tmdbId"));
  const mediaType = searchParams.get("mediaType") as "movie" | "tv" | null;
  const posterPath = searchParams.get("posterPath");
  const autoFullscreen = searchParams.get("fullscreen") === "1";
  const startProgress = Number(searchParams.get("startProgress") || 0);

  useEffect(() => {
    if (url && tmdbId && mediaType) {
      addToWatchHistory({ id: tmdbId, type: mediaType, title, posterPath: posterPath || null });
    }
  }, [url, tmdbId, mediaType, title, posterPath]);

  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latestProgress = useRef<number>(0);

  const handleProgress = useCallback((progress: number) => {
    if (!tmdbId || !mediaType) return;
    latestProgress.current = progress;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateWatchProgress(tmdbId, mediaType, progress);
    }, 5000);
  }, [tmdbId, mediaType]);

  // Save progress immediately on unmount so navigating away doesn't lose it
  useEffect(() => {
    return () => {
      clearTimeout(saveTimer.current);
      if (tmdbId && mediaType && latestProgress.current > 0) {
        updateWatchProgress(tmdbId, mediaType, latestProgress.current);
      }
    };
  }, [tmdbId, mediaType]);

  if (!url) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p style={{ color: "var(--text-secondary)" }}>No video URL provided</p>
          <Link href="/browse" className="mt-4 inline-block text-sm" style={{ color: "var(--text-tertiary)" }}>
            &larr; Back to browse
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-4 border-b px-4 py-3" style={{ borderColor: "var(--hover-bg-subtle)" }}>
        <Link href="/browse" className="text-sm transition-colors" style={{ color: "var(--text-tertiary)" }}>
          &larr; Back
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-medium">{title}</h1>
          {filename && <p className="truncate text-xs" style={{ color: "var(--text-hint)" }}>{filename}</p>}
        </div>
      </div>

      {/* Player */}
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-6xl">
          <VideoPlayer src={url} title={title} onProgress={handleProgress} autoFullscreen={autoFullscreen} startProgress={startProgress} />
        </div>
      </div>
    </div>
  );
}

export default function WatchPage() {
  return (
    <AuthGuard>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2" style={{ borderColor: "var(--input-border)", borderTopColor: "var(--fg)" }} />
          </div>
        }
      >
        <WatchContent />
      </Suspense>
    </AuthGuard>
  );
}
