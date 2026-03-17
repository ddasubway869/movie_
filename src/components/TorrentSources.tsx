"use client";

import { useState, useEffect } from "react";
import { TorboxSearchResult } from "@/types/torbox";
import { searchTorrents, startStreaming } from "@/lib/torbox";
import { formatBytes } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface TorrentSourcesProps {
  tmdbId: number;
  mediaType: "movie" | "tv";
  season?: number;
  episode?: number;
  title: string;
  posterPath?: string | null;
}

export default function TorrentSources({ tmdbId, mediaType, season, episode, title, posterPath }: TorrentSourcesProps) {
  const [sources, setSources] = useState<TorboxSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [streamingIndex, setStreamingIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const router = useRouter();

  useEffect(() => {
    setLoading(true);
    setError("");
    setSources([]);
    searchTorrents(tmdbId, mediaType, season, episode)
      .then((results) => {
        const sorted = [...results].sort((a, b) => {
          if (a.cached && !b.cached) return -1;
          if (!a.cached && b.cached) return 1;
          return (b.last_known_seeders || b.seeders || 0) - (a.last_known_seeders || a.seeders || 0);
        });
        setSources(sorted);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tmdbId, mediaType, season, episode]);

  async function handleSelect(source: TorboxSearchResult, index: number) {
    if (!source.magnet && !source.hash) return;
    setStreamingIndex(index);
    setProgress(0);

    try {
      const magnet = source.magnet || `magnet:?xt=urn:btih:${source.hash}`;
      const { url, filename } = await startStreaming(magnet, (p) => {
        setProgress(Math.round(p * 100));
      });
      const params = new URLSearchParams({ url, title, filename });
      params.set("tmdbId", String(tmdbId));
      params.set("mediaType", mediaType);
      if (posterPath) params.set("posterPath", posterPath);
      router.push(`/watch?${params}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Streaming failed");
      setStreamingIndex(null);
    }
  }

  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 w-48 shrink-0 animate-pulse rounded-lg" style={{ background: "var(--skeleton)" }} />
        ))}
      </div>
    );
  }

  if (error && sources.length === 0) {
    return <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{error}</p>;
  }

  if (sources.length === 0) {
    return <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No sources found</p>;
  }

  return (
    <div className="flex gap-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
      {sources.map((source, i) => (
        <button
          key={source.hash || i}
          onClick={() => handleSelect(source, i)}
          disabled={streamingIndex !== null}
          className="relative flex w-48 shrink-0 flex-col justify-between overflow-hidden rounded-lg border p-3 text-left transition-colors disabled:opacity-50"
          style={{ borderColor: "var(--hover-bg-subtle)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg-subtle)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <div className="flex items-start gap-2">
            {source.cached && (
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-green-500" title="Cached" />
            )}
            <p className="line-clamp-2 text-xs leading-snug">{source.name}</p>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              {formatBytes(source.size)}
              {(source.last_known_seeders || source.seeders) ? ` · ${source.last_known_seeders || source.seeders}s` : ""}
            </p>
            {streamingIndex === i && (
              <div className="h-3 w-3 animate-spin rounded-full border-2" style={{ borderColor: "var(--input-border)", borderTopColor: "var(--fg)" }} />
            )}
            {source.quality && streamingIndex !== i && (
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{source.quality}</span>
            )}
          </div>
          {/* Download progress bar */}
          {streamingIndex === i && progress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "var(--hover-bg)" }}>
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${progress}%`, background: "var(--fg)" }}
              />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
