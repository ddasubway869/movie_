"use client";

import MediaCard from "./MediaCard";

interface MediaGridProps {
  title: string;
  items: {
    id: number;
    title?: string;
    name?: string;
    poster_path: string | null;
    release_date?: string;
    first_air_date?: string;
    vote_average: number;
  }[];
  type: "movie" | "tv";
}

export default function MediaGrid({ title, items, type }: MediaGridProps) {
  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold tracking-tight">{title}</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {items.map((item) => (
          <MediaCard
            key={item.id}
            id={item.id}
            title={item.title || item.name || ""}
            posterPath={item.poster_path}
            date={item.release_date || item.first_air_date || ""}
            rating={item.vote_average}
            type={type}
          />
        ))}
      </div>
    </section>
  );
}
