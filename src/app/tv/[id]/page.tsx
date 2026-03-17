"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import Header from "@/components/Header";
import SeasonPicker from "@/components/SeasonPicker";
import { getTVDetails, posterURL } from "@/lib/tmdb";
import { TMDBTVShow } from "@/types/tmdb";
import { getYear, ratingToPercent } from "@/lib/utils";

export default function TVPage() {
  const params = useParams();
  const id = Number(params.id);
  const [show, setShow] = useState<TMDBTVShow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getTVDetails(id)
      .then(setShow)
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
      ) : !show ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <p style={{ color: "var(--text-secondary)" }}>Show not found</p>
        </div>
      ) : (
        <>
          {/* Hero */}
          <div className="mx-auto max-w-7xl px-4 pt-8">
            <div className="flex gap-6">
              {show.poster_path && (
                <div className="hidden shrink-0 sm:block">
                  <Image
                    src={posterURL(show.poster_path, "w300")}
                    alt={show.name}
                    width={160}
                    height={240}
                    className="rounded-lg shadow-xl"
                  />
                </div>
              )}
              <div className="flex flex-col justify-center">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{show.name}</h1>
                <div className="mt-2 flex flex-wrap gap-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                  {getYear(show.first_air_date) && <span>{getYear(show.first_air_date)}</span>}
                  {show.number_of_seasons && (
                    <span>{show.number_of_seasons} season{show.number_of_seasons > 1 ? "s" : ""}</span>
                  )}
                  {show.vote_average > 0 && <span>{ratingToPercent(show.vote_average)}</span>}
                  {show.genres?.map((g) => (
                    <span key={g.id} className="rounded-full border px-2 py-0.5 text-xs" style={{ borderColor: "var(--badge-border)" }}>
                      {g.name}
                    </span>
                  ))}
                </div>
                {show.overview && (
                  <p className="mt-4 max-w-2xl text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {show.overview}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Season Picker */}
          <div className="mx-auto max-w-7xl px-4 py-8">
            <div className="flex items-center gap-3 mb-4">
              <Link href="/browse" className="text-sm transition-colors" style={{ color: "var(--text-tertiary)" }}>
                &larr; Back
              </Link>
              <h2 className="text-lg font-semibold">Episodes</h2>
            </div>
            {show.seasons && (
              <SeasonPicker tvId={id} tvName={show.name} seasons={show.seasons} />
            )}
          </div>
        </>
      )}
    </AuthGuard>
  );
}
