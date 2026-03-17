import { TMDBMovie, TMDBTVShow, TMDBSeason, TMDBSearchResults, MediaItem } from "@/types/tmdb";

async function tmdbFetch<T>(path: string): Promise<T> {
  const res = await fetch(`/api/tmdb?path=${encodeURIComponent(path)}`);
  if (!res.ok) throw new Error("TMDB request failed");
  return res.json();
}

export async function searchMulti(query: string): Promise<MediaItem[]> {
  const data = await tmdbFetch<TMDBSearchResults<MediaItem>>(
    `/3/search/multi?query=${encodeURIComponent(query)}&include_adult=false`
  );
  return data.results.filter(
    (r) => r.media_type === "movie" || r.media_type === "tv"
  );
}

export async function getTrending(type: "movie" | "tv"): Promise<(TMDBMovie | TMDBTVShow)[]> {
  const data = await tmdbFetch<TMDBSearchResults<TMDBMovie | TMDBTVShow>>(
    `/3/trending/${type}/week`
  );
  return data.results;
}

export async function getMovieDetails(id: number): Promise<TMDBMovie> {
  return tmdbFetch<TMDBMovie>(`/3/movie/${id}`);
}

export async function getTVDetails(id: number): Promise<TMDBTVShow> {
  return tmdbFetch<TMDBTVShow>(`/3/tv/${id}`);
}

export async function getSeasonDetails(tvId: number, seasonNumber: number): Promise<TMDBSeason> {
  return tmdbFetch<TMDBSeason>(`/3/tv/${tvId}/season/${seasonNumber}`);
}

export function posterURL(path: string | null, size: "w200" | "w300" | "w500" | "original" = "w300"): string {
  if (!path) return "";
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export function backdropURL(path: string | null, size: "w780" | "w1280" | "original" = "w1280"): string {
  if (!path) return "";
  return `https://image.tmdb.org/t/p/${size}${path}`;
}
