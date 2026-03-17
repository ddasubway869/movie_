"use client";

import { useEffect, useState, useCallback } from "react";
import AuthGuard from "@/components/AuthGuard";
import Header from "@/components/Header";
import MediaMarquee from "@/components/MediaMarquee";
import ContinueWatching from "@/components/ContinueWatching";
import SidePanel from "@/components/SidePanel";
import { getTrending } from "@/lib/tmdb";
import { getWatchHistory } from "@/lib/watchHistory";
import { TMDBMovie, TMDBTVShow } from "@/types/tmdb";

export default function BrowsePage() {
  const [movies, setMovies] = useState<TMDBMovie[]>([]);
  const [shows, setShows] = useState<TMDBTVShow[]>([]);
  const [watchedIds, setWatchedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<{ id: number; type: "movie" | "tv" } | null>(null);

  useEffect(() => {
    Promise.all([
      getTrending("movie"),
      getTrending("tv"),
      getWatchHistory(),
    ])
      .then(([m, t, history]) => {
        setMovies(m as TMDBMovie[]);
        setShows(t as TMDBTVShow[]);
        setWatchedIds(new Set(history.map((h) => h.id)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = useCallback((id: number, type: "movie" | "tv") => {
    setSelected({ id, type });
  }, []);

  const handleClose = useCallback(() => {
    setSelected(null);
  }, []);

  return (
    <AuthGuard>
      <Header onSelect={handleSelect} />
      <main className="mx-auto max-w-7xl space-y-10 px-4 py-8">
        {loading ? (
          <div className="space-y-10">
            {[0, 1].map((s) => (
              <section key={s}>
                <div className="mb-4 h-6 w-48 animate-pulse rounded" style={{ background: "var(--skeleton-strong)" }} />
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {[...Array(12)].map((_, i) => (
                    <div key={i}>
                      <div className="aspect-[2/3] animate-pulse rounded-lg" style={{ background: "var(--skeleton)" }} />
                      <div className="mt-2 h-4 w-3/4 animate-pulse rounded" style={{ background: "var(--skeleton)" }} />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <>
            <ContinueWatching onSelect={handleSelect} />
            <MediaMarquee title="Trending Movies" items={movies} type="movie" onSelect={handleSelect} watchedIds={watchedIds} />
            <MediaMarquee title="Trending TV Shows" items={shows} type="tv" onSelect={handleSelect} watchedIds={watchedIds} />
          </>
        )}
      </main>

      {selected && (
        <SidePanel id={selected.id} type={selected.type} onClose={handleClose} />
      )}
    </AuthGuard>
  );
}
