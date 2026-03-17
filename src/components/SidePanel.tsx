"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getMovieDetails, getTVDetails, posterURL } from "@/lib/tmdb";
import { TMDBMovie, TMDBTVShow } from "@/types/tmdb";
import { getYear, ratingToPercent } from "@/lib/utils";
import TorrentSources from "./TorrentSources";
import SeasonPicker from "./SeasonPicker";

interface SidePanelProps {
  id: number;
  type: "movie" | "tv";
  onClose: () => void;
}

export default function SidePanel({ id, type, onClose }: SidePanelProps) {
  const [movie, setMovie] = useState<TMDBMovie | null>(null);
  const [show, setShow] = useState<TMDBTVShow | null>(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  // Trigger slide-in after mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    setLoading(true);
    setMovie(null);
    setShow(null);
    if (type === "movie") {
      getMovieDetails(id)
        .then(setMovie)
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      getTVDetails(id)
        .then(setShow)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [id, type]);

  // Check watchlist status
  useEffect(() => {
    fetch(`/api/watchlist`)
      .then((r) => r.json())
      .then((data) => {
        const items = data.items || [];
        setInWatchlist(items.some((i: { tmdb_id: number; media_type: string }) => i.tmdb_id === id && i.media_type === type));
      })
      .catch(() => {});
  }, [id, type]);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 350);
  }

  async function toggleWatchlist() {
    const data = movie || show;
    if (!data) return;
    setWatchlistLoading(true);
    try {
      if (inWatchlist) {
        await fetch(`/api/watchlist/${id}?type=${type}`, { method: "DELETE" });
        setInWatchlist(false);
      } else {
        const title = movie?.title || show?.name || "";
        await fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tmdbId: id, mediaType: type, title, posterPath: data.poster_path }),
        });
        setInWatchlist(true);
      }
    } catch {}
    setWatchlistLoading(false);
  }

  const data = movie || show;
  const title = movie?.title || show?.name || "";
  const date = movie?.release_date || show?.first_air_date || "";
  const genres = movie?.genres || show?.genres || [];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          zIndex: 40,
          opacity: visible ? 1 : 0,
          transition: "opacity 0.35s ease",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(480px, 100vw)",
          background: "var(--bg)",
          borderLeft: "1px solid var(--border-c)",
          zIndex: 50,
          overflowY: "auto",
          transform: visible ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          style={{
            position: "sticky",
            top: 0,
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            width: "100%",
            padding: "12px 16px",
            background: "var(--bg)",
            borderBottom: "1px solid var(--border-c)",
          }}
        >
          <span style={{ fontSize: 20, lineHeight: 1, color: "var(--text-secondary)" }}>✕</span>
        </button>

        <div style={{ padding: "20px 20px 40px" }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ height: 28, width: "60%", borderRadius: 6, background: "var(--skeleton-strong)", animation: "pulse 1.5s infinite" }} />
              <div style={{ height: 300, borderRadius: 10, background: "var(--skeleton)", animation: "pulse 1.5s infinite" }} />
            </div>
          ) : !data ? (
            <p style={{ color: "var(--text-secondary)" }}>Not found</p>
          ) : (
            <>
              {/* Header */}
              <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
                {data.poster_path && (
                  <div style={{ flexShrink: 0 }}>
                    <Image
                      src={posterURL(data.poster_path, "w300")}
                      alt={title}
                      width={100}
                      height={150}
                      style={{ borderRadius: 8, display: "block" }}
                    />
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2, marginBottom: 6 }}>{title}</h2>
                  <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 8 }}>
                    {getYear(date)}
                    {movie?.runtime ? ` · ${movie.runtime} min` : ""}
                    {show?.number_of_seasons ? ` · ${show.number_of_seasons} season${show.number_of_seasons > 1 ? "s" : ""}` : ""}
                    {data.vote_average > 0 ? ` · ${ratingToPercent(data.vote_average)}` : ""}
                  </p>
                  {genres.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {genres.slice(0, 3).map((g) => (
                        <span
                          key={g.id}
                          style={{
                            fontSize: 11,
                            padding: "2px 8px",
                            borderRadius: 99,
                            border: "1px solid var(--badge-border)",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {g.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Watchlist button */}
              <button
                onClick={toggleWatchlist}
                disabled={watchlistLoading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 500,
                  padding: "7px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--border-c)",
                  background: inWatchlist ? "var(--btn-primary-bg)" : "transparent",
                  color: inWatchlist ? "var(--btn-primary-fg)" : "var(--text-secondary)",
                  cursor: watchlistLoading ? "default" : "pointer",
                  opacity: watchlistLoading ? 0.6 : 1,
                  marginBottom: 20,
                }}
              >
                {inWatchlist ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    In Watchlist
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Add to Watchlist
                  </>
                )}
              </button>

              {data.overview && (
                <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-secondary)", marginBottom: 24 }}>
                  {data.overview}
                </p>
              )}

              {/* Sources / Season Picker */}
              {type === "movie" && movie && (
                <>
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Sources
                  </h3>
                  <TorrentSources tmdbId={id} mediaType="movie" title={title} posterPath={data.poster_path} />
                </>
              )}
              {type === "tv" && show?.seasons && (
                <>
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Episodes
                  </h3>
                  <SeasonPicker tvId={id} tvName={title} seasons={show.seasons} />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
