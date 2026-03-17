"use client";

import { useEffect, useState, useCallback } from "react";
import AuthGuard from "@/components/AuthGuard";
import Header from "@/components/Header";
import SidePanel from "@/components/SidePanel";
import Image from "next/image";
import { posterURL } from "@/lib/tmdb";

interface WatchlistItem {
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  poster_path: string | null;
  added_at: string;
}

type Tab = "movie" | "tv";

function WatchlistContent() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("movie");
  const [selected, setSelected] = useState<{ id: number; type: "movie" | "tv" } | null>(null);

  useEffect(() => {
    fetch("/api/watchlist")
      .then((r) => r.json())
      .then((data) => setItems(data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter((i) => i.media_type === tab);

  async function handleRemove(item: WatchlistItem) {
    setItems((prev) => prev.filter((i) => !(i.tmdb_id === item.tmdb_id && i.media_type === item.media_type)));
    await fetch(`/api/watchlist/${item.tmdb_id}?type=${item.media_type}`, { method: "DELETE" });
  }

  const handleSelect = useCallback((id: number, type: "movie" | "tv") => {
    setSelected({ id, type });
  }, []);

  const handleClose = useCallback(() => {
    setSelected(null);
  }, []);

  const tabStyle = (t: Tab) => ({
    fontSize: 14,
    fontWeight: 500,
    padding: "6px 16px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    background: tab === t ? "var(--btn-primary-bg)" : "transparent",
    color: tab === t ? "var(--btn-primary-fg)" : "var(--text-secondary)",
    transition: "background 0.15s",
  });

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Watchlist</h1>
          <div className="flex gap-2">
            <button style={tabStyle("movie")} onClick={() => setTab("movie")}>Movies</button>
            <button style={tabStyle("tv")} onClick={() => setTab("tv")}>TV Shows</button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {[...Array(12)].map((_, i) => (
              <div key={i}>
                <div className="aspect-[2/3] animate-pulse rounded-lg" style={{ background: "var(--skeleton)" }} />
                <div className="mt-2 h-4 w-3/4 animate-pulse rounded" style={{ background: "var(--skeleton)" }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              No {tab === "movie" ? "movies" : "TV shows"} in your watchlist yet.
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--text-hint)" }}>
              Open any title and click &ldquo;Add to Watchlist&rdquo;.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filtered.map((item) => {
              const poster = item.poster_path ? posterURL(item.poster_path, "w300") : null;
              return (
                <div key={`${item.media_type}-${item.tmdb_id}`} className="group relative">
                  {/* Remove button */}
                  <button
                    className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                    style={{ background: "rgba(0,0,0,0.7)" }}
                    onClick={() => handleRemove(item)}
                    title="Remove from Watchlist"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>

                  <button
                    className="block w-full text-left"
                    onClick={() => handleSelect(item.tmdb_id, item.media_type)}
                  >
                    <div className="relative aspect-[2/3] overflow-hidden rounded-lg" style={{ background: "var(--skeleton)" }}>
                      {poster ? (
                        <Image
                          src={poster}
                          alt={item.title}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                          className="object-cover transition-all duration-300 grayscale group-hover:grayscale-0 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm" style={{ color: "var(--text-hint)" }}>
                          No Poster
                        </div>
                      )}
                    </div>
                    <div className="mt-2">
                      <p className="truncate text-sm font-medium" style={{ color: "var(--fg)", opacity: 0.9 }}>
                        {item.title}
                      </p>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {selected && (
        <SidePanel id={selected.id} type={selected.type} onClose={handleClose} />
      )}
    </>
  );
}

export default function WatchlistPage() {
  return (
    <AuthGuard>
      <Header />
      <WatchlistContent />
    </AuthGuard>
  );
}
