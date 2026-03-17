"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { searchMulti, posterURL } from "@/lib/tmdb";
import { MediaItem } from "@/types/tmdb";
import { getYear } from "@/lib/utils";
import Image from "next/image";

interface SearchBarProps {
  onSelect?: (id: number, type: "movie" | "tv") => void;
}

export default function SearchBar({ onSelect }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MediaItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const items = await searchMulti(query);
        setResults(items.slice(0, 8));
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timerRef.current);
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function navigate(item: MediaItem) {
    setOpen(false);
    setQuery("");
    if (onSelect) {
      onSelect(item.id, item.media_type as "movie" | "tv");
    } else {
      const path = item.media_type === "movie" ? `/movie/${item.id}` : `/tv/${item.id}`;
      router.push(path);
    }
  }

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search movies & TV shows..."
        className="w-full rounded-lg border px-4 py-2 text-sm outline-none transition-colors"
        style={{
          background: "var(--input-bg)",
          borderColor: "var(--input-border)",
          color: "var(--fg)",
        }}
        onFocus={(e) => {
          e.target.style.background = "var(--input-bg-focus)";
          e.target.style.borderColor = "var(--input-border-focus)";
        }}
        onBlur={(e) => {
          e.target.style.background = "var(--input-bg)";
          e.target.style.borderColor = "var(--input-border)";
        }}
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2" style={{ borderColor: "var(--input-border)", borderTopColor: "var(--fg)" }} />
        </div>
      )}

      {open && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full overflow-hidden rounded-lg border shadow-2xl" style={{ borderColor: "var(--border-c)", background: "var(--card)" }}>
          {results.map((item) => {
            const title = item.media_type === "movie" ? (item as { title: string }).title : (item as { name: string }).name;
            const date = item.media_type === "movie" ? (item as { release_date: string }).release_date : (item as { first_air_date: string }).first_air_date;
            const poster = posterURL(item.poster_path, "w200");

            return (
              <button
                key={`${item.media_type}-${item.id}`}
                onClick={() => navigate(item)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors"
                style={{ color: "var(--fg)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {poster ? (
                  <Image
                    src={poster}
                    alt={title}
                    width={32}
                    height={48}
                    className="h-12 w-8 rounded object-cover"
                  />
                ) : (
                  <div className="h-12 w-8 rounded" style={{ background: "var(--skeleton-strong)" }} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{title}</p>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {getYear(date)} &middot; {item.media_type === "movie" ? "Movie" : "TV"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
