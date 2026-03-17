"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import Header from "@/components/Header";
import TorrentSources from "@/components/TorrentSources";
import { getMovieDetails, posterURL } from "@/lib/tmdb";
import { TMDBMovie } from "@/types/tmdb";
import { getYear, ratingToPercent } from "@/lib/utils";

export default function MoviePage() {
  const params = useParams();
  const id = Number(params.id);
  const [movie, setMovie] = useState<TMDBMovie | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getMovieDetails(id)
      .then(setMovie)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <AuthGuard>
      <Header />

      {loading ? (
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="h-[400px] animate-pulse rounded-xl" style={{ background: "var(--skeleton)" }} />
        </div>
      ) : !movie ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <p style={{ color: "var(--text-secondary)" }}>Movie not found</p>
        </div>
      ) : (
        <>
          {/* Hero */}
          <div className="mx-auto max-w-7xl px-4 pt-8">
            <div className="flex gap-6">
              {movie.poster_path && (
                <div className="hidden shrink-0 sm:block">
                  <Image
                    src={posterURL(movie.poster_path, "w300")}
                    alt={movie.title}
                    width={160}
                    height={240}
                    className="rounded-lg shadow-xl"
                  />
                </div>
              )}
              <div className="flex flex-col justify-center">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{movie.title}</h1>
                <div className="mt-2 flex flex-wrap gap-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                  {getYear(movie.release_date) && <span>{getYear(movie.release_date)}</span>}
                  {movie.runtime && <span>{movie.runtime} min</span>}
                  {movie.vote_average > 0 && <span>{ratingToPercent(movie.vote_average)}</span>}
                  {movie.genres?.map((g) => (
                    <span key={g.id} className="rounded-full border px-2 py-0.5 text-xs" style={{ borderColor: "var(--badge-border)" }}>
                      {g.name}
                    </span>
                  ))}
                </div>
                {movie.overview && (
                  <p className="mt-4 max-w-2xl text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {movie.overview}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Sources */}
          <div className="mx-auto max-w-7xl px-4 py-8">
            <div className="flex items-center gap-3 mb-4">
              <Link href="/browse" className="text-sm transition-colors" style={{ color: "var(--text-tertiary)" }}>
                &larr; Back
              </Link>
              <h2 className="text-lg font-semibold">Available Sources</h2>
            </div>
            <TorrentSources tmdbId={id} mediaType="movie" title={movie.title} />
          </div>
        </>
      )}
    </AuthGuard>
  );
}
