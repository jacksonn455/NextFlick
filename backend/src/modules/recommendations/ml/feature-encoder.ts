import { CatalogMovie } from '../../movies/entities/catalog-movie.entity';
import { EncodingContext } from '../interfaces/encoding-context.interface';
import {
  validateNumbers,
  getBounds,
  validateStrings,
} from '../utils/encoding.utils';

export function makeContext(
  movies: CatalogMovie[],
  favoritesByUser,
): EncodingContext {
  const ratings = validateNumbers(movies.map((m) => m.rating));
  const runtimes = validateNumbers(movies.map((m) => m.runtime));
  const years = validateNumbers(movies.map((m) => m.year));

  const { min: minRating, max: maxRating } = getBounds(ratings);
  const { min: minRuntime, max: maxRuntime } = getBounds(runtimes);
  const { min: minYear, max: maxYear } = getBounds(years);

  const rated = [
    ...new Set(validateStrings(movies.map((m) => m.rated))),
  ].sort();

  const types = [...new Set(validateStrings(movies.map((m) => m.type)))].sort();

  const genres = [
    ...new Set(validateStrings(movies.flatMap((m) => m.genres))),
  ].sort();

  const genresIndex = Object.fromEntries(
    genres.map((genre, index) => [genre, index]),
  );

  const typesIndex = Object.fromEntries(
    types.map((type, index) => [type, index]),
  );

  const ratedIndex = Object.fromEntries(
    rated.map((value, index) => [value, index]),
  );

  const numGenres = genres.length;
  const numTypes = types.length;
  const numRated = rated.length;

  const dimension = numGenres + numTypes + numRated + 3;

  return {
    minRating,
    maxRating,
    minRuntime,
    maxRuntime,
    minYear,
    maxYear,
    genresIndex,
    typesIndex,
    ratedIndex,
    numGenres,
    numTypes,
    numRated,
    dimension,
  };
}
