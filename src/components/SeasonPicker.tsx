"use client";

import { useState, useEffect } from "react";
import { TMDBSeason, TMDBEpisode } from "@/types/tmdb";
import { getSeasonDetails } from "@/lib/tmdb";
import TorrentSources from "./TorrentSources";

interface SeasonPickerProps {
  tvId: number;
  tvName: string;
  seasons: TMDBSeason[];
}

export default function SeasonPicker({ tvId, tvName, seasons }: SeasonPickerProps) {
  const validSeasons = seasons.filter((s) => s.season_number > 0);
  const [selectedSeason, setSelectedSeason] = useState(validSeasons[0]?.season_number || 1);
  const [episodes, setEpisodes] = useState<TMDBEpisode[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<number | null>(null);
  const [loadingEps, setLoadingEps] = useState(false);

  useEffect(() => {
    setLoadingEps(true);
    setSelectedEpisode(null);
    getSeasonDetails(tvId, selectedSeason)
      .then((season) => setEpisodes(season.episodes || []))
      .catch(() => setEpisodes([]))
      .finally(() => setLoadingEps(false));
  }, [tvId, selectedSeason]);

  return (
    <div className="space-y-4">
      {/* Season tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {validSeasons.map((s) => (
          <button
            key={s.season_number}
            onClick={() => setSelectedSeason(s.season_number)}
            className="shrink-0 rounded-lg px-4 py-2 text-sm transition-colors"
            style={
              selectedSeason === s.season_number
                ? { background: "var(--btn-primary-bg)", color: "var(--btn-primary-fg)", fontWeight: 500 }
                : { background: "var(--hover-bg-subtle)", color: "var(--text-secondary)" }
            }
          >
            Season {s.season_number}
          </button>
        ))}
      </div>

      {/* Episodes */}
      {loadingEps ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg" style={{ background: "var(--skeleton)" }} />
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {episodes.map((ep) => (
            <button
              key={ep.episode_number}
              onClick={() =>
                setSelectedEpisode(
                  selectedEpisode === ep.episode_number ? null : ep.episode_number
                )
              }
              className="w-full rounded-lg border px-4 py-3 text-left transition-colors"
              style={{
                borderColor: selectedEpisode === ep.episode_number ? "var(--input-border-focus)" : "var(--hover-bg-subtle)",
                background: selectedEpisode === ep.episode_number ? "var(--hover-bg)" : "transparent",
              }}
            >
              <div className="flex items-baseline gap-3">
                <span className="shrink-0 text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>
                  E{String(ep.episode_number).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{ep.name}</p>
                  {ep.overview && (
                    <p className="mt-1 text-xs line-clamp-2" style={{ color: "var(--text-tertiary)" }}>{ep.overview}</p>
                  )}
                </div>
                {ep.runtime && (
                  <span className="ml-auto shrink-0 text-xs" style={{ color: "var(--text-hint)" }}>{ep.runtime}m</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Sources for selected episode */}
      {selectedEpisode !== null && (
        <div className="mt-4 rounded-lg border p-4" style={{ borderColor: "var(--border-c)" }}>
          <h3 className="mb-3 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            Sources for S{String(selectedSeason).padStart(2, "0")}E{String(selectedEpisode).padStart(2, "0")}
          </h3>
          <TorrentSources
            tmdbId={tvId}
            mediaType="tv"
            season={selectedSeason}
            episode={selectedEpisode}
            title={`${tvName} S${String(selectedSeason).padStart(2, "0")}E${String(selectedEpisode).padStart(2, "0")}`}
          />
        </div>
      )}
    </div>
  );
}
