"use client";

import Link from "next/link";
import Image from "next/image";
import { posterURL } from "@/lib/tmdb";
import { getYear, ratingToPercent } from "@/lib/utils";

interface MediaCardProps {
  id: number;
  title: string;
  posterPath: string | null;
  date: string;
  rating: number;
  type: "movie" | "tv";
  watched?: boolean;
}

export default function MediaCard({ id, title, posterPath, date, rating, type, watched }: MediaCardProps) {
  const poster = posterURL(posterPath, "w300");
  const href = type === "movie" ? `/movie/${id}` : `/tv/${id}`;

  return (
    <Link href={href} className="group block">
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg" style={{ background: "var(--skeleton)" }}>
        {poster ? (
          <Image
            src={poster}
            alt={title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
            className="object-cover transition-all duration-300 grayscale group-hover:grayscale-0 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm" style={{ color: "var(--text-hint)" }}>
            No Poster
          </div>
        )}
        {watched && (
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
          {title}
        </p>
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          {getYear(date)}
          {rating > 0 && <> &middot; {ratingToPercent(rating)}</>}
        </p>
      </div>
    </Link>
  );
}
