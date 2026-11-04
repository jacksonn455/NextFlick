import { CatalogMovie } from '../entities/catalog-movie.entity';
import {
  CatalogSource,
  SeedMovieDetails,
} from '../interfaces/catalog-movie.interface';

// "2008" -> 2008, "2008–2013" (series) -> 2008
const parseYear = (value: string | null): number | null => {
  const match = value?.match(/\d{4}/);
  return match ? Number(match[0]) : null;
};

// "152 min" -> 152
const parseRuntime = (value: string | null): number | null => {
  const match = value?.match(/\d+/);
  return match ? Number(match[0]) : null;
};

// "9.1" -> 9.1
const parseRating = (value: string | null): number | null => {
  const rating = Number.parseFloat(value ?? '');
  return Number.isFinite(rating) ? rating : null;
};

// "Crime, Drama" -> ["Crime", "Drama"]
const parseList = (value: string | null): string[] =>
  value
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

export function toCatalogMovie(
  details: SeedMovieDetails,
  source: CatalogSource,
): CatalogMovie {
  return {
    imdbID: details.imdbID,
    title: details.Title,
    year: parseYear(details.Year),
    type: details.Type ?? null,
    poster: details.Poster ?? null,
    genres: parseList(details.Genre),
    rating: parseRating(details.imdbRating),
    runtime: parseRuntime(details.Runtime),
    rated: details.Rated ?? null,
    director: details.Director ?? null,
    languages: parseList(details.Language),
    countries: parseList(details.Country),
    source,
  };
}
