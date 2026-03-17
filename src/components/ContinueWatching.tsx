"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { posterURL } from "@/lib/tmdb";
import { getWatchHistory, removeFromWatchHistory, WatchEntry } from "@/lib/watchHistory";
import { searchTorrents, startStreaming } from "@/lib/torbox";

interface ContinueWatchingProps {
  onSelect: (id: number, type: "movie" | "tv") => void;
}

export default function ContinueWatching({ onSelect }: ContinueWatchingProps) {
  const [history, setHistory] = useState<WatchEntry[]>([]);
  const [fetched, setFetched] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    getWatchHistory().then((items) => {
      setHistory(items);
      setFetched(true);
    });
  }, []);

  if (!fetched || history.length === 0) return null;

  async function handleClick(entry: WatchEntry) {
    const key = `${entry.type}-${entry.id}`;
    setLoading(key);
    try {
      const results = await searchTorrents(entry.id, entry.type);
      const cached = results.find((r) => r.cached && (r.magnet || r.hash));
      if (!cached) {
        onSelect(entry.id, entry.type);
        return;
      }
      const magnet = cached.magnet || `magnet:?xt=urn:btih:${cached.hash}`;
      const { url, filename } = await startStreaming(magnet);
      const params = new URLSearchParams({ url, title: entry.title, filename });
      params.set("tmdbId", String(entry.id));
      params.set("mediaType", entry.type);
      params.set("fullscreen", "1");
      if (entry.progress) params.set("startProgress", String(entry.progress));
      if (entry.posterPath) params.set("posterPath", entry.posterPath);
      router.push(`/watch?${params}`);
    } catch {
      onSelect(entry.id, entry.type);
    } finally {
      setLoading(null);
    }
  }

  async function handleRemove(e: React.MouseEvent, entry: WatchEntry) {
    e.stopPropagation();
    setHistory((prev) => prev.filter((h) => !(h.id === entry.id && h.type === entry.type)));
    await removeFromWatchHistory(entry.id, entry.type);
  }

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold tracking-tight">Continue Watching</h2>
      <div className="overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        <div className="flex gap-4">
          {history.map((entry) => {
            const key = `${entry.type}-${entry.id}`;
            const poster = entry.posterPath ? posterURL(entry.posterPath, "w300") : null;
            const isLoading = loading === key;
            return (
              <div key={key} className="group relative w-[150px] shrink-0 sm:w-[180px]">
                {/* Remove button */}
                <button
                  className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                  style={{ background: "rgba(0,0,0,0.7)" }}
                  onClick={(e) => handleRemove(e, entry)}
                  title="Remove from Continue Watching"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>

                {/* Play button */}
                <button
                  className="w-full text-left"
                  onClick={() => handleClick(entry)}
                  disabled={loading !== null}
                >
                  <div
                    className="relative aspect-[2/3] overflow-hidden rounded-lg"
                    style={{ background: "var(--skeleton)" }}
                  >
                    {poster ? (
                      <Image
                        src={poster}
                        alt={entry.title}
                        fill
                        sizes="180px"
                        className="object-cover transition-all duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div
                        className="flex h-full items-center justify-center text-sm"
                        style={{ color: "var(--text-hint)" }}
                      >
                        No Poster
                      </div>
                    )}

                    {/* Loading overlay */}
                    {isLoading && (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ background: "rgba(0,0,0,0.5)" }}
                      >
                        <div
                          className="h-8 w-8 animate-spin rounded-full border-2"
                          style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff" }}
                        />
                      </div>
                    )}

                    {/* Hover play overlay */}
                    {!isLoading && (
                      <div
                        className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                        style={{ background: "rgba(0,0,0,0.35)" }}
                      >
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-full"
                          style={{ background: "rgba(255,255,255,0.9)" }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="#000">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    )}

                    {/* Progress bar */}
                    {entry.progress != null && entry.progress > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: "rgba(255,255,255,0.2)" }}>
                        <div
                          className="h-full"
                          style={{ width: `${Math.min(entry.progress * 100, 100)}%`, background: "rgba(255,255,255,0.85)" }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="mt-2">
                    <p className="truncate text-sm font-medium" style={{ color: "var(--fg)", opacity: 0.9 }}>
                      {entry.title}
                    </p>
                    <p className="text-xs capitalize" style={{ color: "var(--text-tertiary)" }}>
                      {entry.type}
                    </p>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
