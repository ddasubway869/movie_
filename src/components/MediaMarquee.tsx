"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { posterURL } from "@/lib/tmdb";
import { getYear, ratingToPercent } from "@/lib/utils";

const GENRE_MAP: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance",
  878: "Sci-Fi", 10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
  10759: "Action & Adventure", 10762: "Kids", 10763: "News", 10764: "Reality",
  10765: "Sci-Fi & Fantasy", 10766: "Soap", 10767: "Talk", 10768: "War & Politics",
};

interface MarqueeItem {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  genre_ids?: number[];
}

interface MediaMarqueeProps {
  title: string;
  items: MarqueeItem[];
  type: "movie" | "tv";
  onSelect: (id: number, type: "movie" | "tv") => void;
  watchedIds?: Set<number>;
}

export default function MediaMarquee({ title, items, type, onSelect, watchedIds }: MediaMarqueeProps) {
  // panelOpen drives the box open/close (only when entering/leaving the whole row)
  const [panelOpen, setPanelOpen] = useState(false);
  // displayed is the current item shown in the box
  const [displayed, setDisplayed] = useState<MarqueeItem | null>(null);
  // contentVisible drives the content fade inside the box
  const [contentVisible, setContentVisible] = useState(false);

  const leaveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const contentTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hoveredRef = useRef<MarqueeItem | null>(null);

  const handleEnter = useCallback((item: MarqueeItem) => {
    clearTimeout(leaveTimer.current);
    clearTimeout(contentTimer.current);

    if (!hoveredRef.current) {
      // First hover — open box and fade content in
      hoveredRef.current = item;
      setDisplayed(item);
      setPanelOpen(true);
      // Slight delay so the box starts opening before content appears
      contentTimer.current = setTimeout(() => setContentVisible(true), 80);
    } else if (hoveredRef.current.id !== item.id) {
      // Switching cards — keep box open, fade content out then swap and fade in
      hoveredRef.current = item;
      setContentVisible(false);
      contentTimer.current = setTimeout(() => {
        setDisplayed(item);
        setContentVisible(true);
      }, 200);
    }
  }, []);

  const handleLeave = useCallback(() => {
    clearTimeout(contentTimer.current);
    leaveTimer.current = setTimeout(() => {
      hoveredRef.current = null;
      setContentVisible(false);
      setPanelOpen(false);
      // Clear displayed after fade completes
      contentTimer.current = setTimeout(() => setDisplayed(null), 800);
    }, 200);
  }, []);

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold tracking-tight">{title}</h2>
      <div className="overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        <div className="flex gap-4">
          {items.map((item) => {
            const itemTitle = item.title || item.name || "";
            const poster = posterURL(item.poster_path, "w300");

            return (
              <div
                key={item.id}
                className="w-[150px] shrink-0 sm:w-[180px]"
                onMouseEnter={() => handleEnter(item)}
                onMouseLeave={handleLeave}
              >
                <button
                  className="group block w-full text-left"
                  onClick={() => onSelect(item.id, type)}
                >
                  <div
                    className="relative aspect-[2/3] overflow-hidden rounded-lg"
                    style={{ background: "var(--skeleton)" }}
                  >
                    {poster ? (
                      <Image
                        src={poster}
                        alt={itemTitle}
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
                    {watchedIds?.has(item.id) && (
                      <div
                        className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full"
                        style={{ background: "rgba(0,0,0,0.75)" }}
                        title="Watched"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="mt-2">
                    <p className="truncate text-sm font-medium" style={{ color: "var(--fg)", opacity: 0.9 }}>
                      {itemTitle}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      {getYear(item.release_date || item.first_air_date || "")}
                      {item.vote_average > 0 && <> &middot; {ratingToPercent(item.vote_average)}</>}
                    </p>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail panel — box stays open while hovering any card */}
      <div
        className="overflow-hidden"
        style={{
          maxHeight: panelOpen ? "220px" : "0px",
          opacity: panelOpen ? 1 : 0,
          transition: panelOpen
            ? "max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease-in"
            : "opacity 0.4s ease-out, max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1) 0.35s",
        }}
      >
        {displayed && (
          <div className="mt-4 rounded-lg p-4" style={{ background: "var(--card)" }}>
            {/* Content fades independently — box never collapses between cards */}
            <div
              style={{
                opacity: contentVisible ? 1 : 0,
                transition: contentVisible ? "opacity 0.3s ease-in" : "opacity 0.15s ease-out",
              }}
            >
              <h3 className="text-base font-semibold">
                {displayed.title || displayed.name}
              </h3>
              <p className="mt-0.5 text-xs" style={{ color: "var(--text-tertiary)" }}>
                {getYear(displayed.release_date || displayed.first_air_date || "")}
                {displayed.vote_average > 0 && <> &middot; {ratingToPercent(displayed.vote_average)}</>}
              </p>
              {displayed.genre_ids && displayed.genre_ids.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {displayed.genre_ids.slice(0, 3).map((gid) => (
                    <span
                      key={gid}
                      className="rounded-full px-2.5 py-0.5 text-xs"
                      style={{
                        background: "var(--input-bg)",
                        color: "var(--text-secondary)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {GENRE_MAP[gid] || "Unknown"}
                    </span>
                  ))}
                </div>
              )}
              {displayed.overview && (
                <p
                  className="mt-2 line-clamp-3 text-sm leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {displayed.overview}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
