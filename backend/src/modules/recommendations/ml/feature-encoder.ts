import { CatalogMovie } from '../../movies/entities/catalog-movie.entity';
import {
  EncodingContext,
  FavoritesByUser,
} from '../interfaces/encoding-context.interface';
import {
  validateNumbers,
  getBounds,
  validateStrings,
  normalize,
  oneHot,
  multiHot,
  meanVector,
} from '../utils/encoding.utils';

export const WEIGHTS = {
  genre: 0.4,
  rating: 0.15,
  year: 0.1,
  rated: 0.1,
  type: 0.1,
  // 0 on purpose (label leakage): popularity comes from the same favorites
  // the model learns from, so every positive example has popularity > 0 and
  // almost every negative has 0. With 0.1 the model learned "popular =>
  // favorite" and a hidden favorite came back in the top 10 for 2 of 16 demo
  // users; with 0 it comes back for 10 of 16. Popularity still ranks the
  // popular fallback (see RecommendationsService).
  popularity: 0,
  runtime: 0.05,
};

export function makeContext(
  movies: CatalogMovie[],
  favoritesByUser: FavoritesByUser,
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

  // rating + runtime + year + popularity + genres + types + rated
  const dimension = numGenres + numTypes + numRated + 4;

  // How many users favorited each movie (one vote per user, even if the
  // same movie shows up twice in a user's list)
  const favoriteCounts: Record<string, number> = {};
  Object.values(favoritesByUser).forEach((favorites) => {
    new Set(favorites.map((m) => m.imdbID)).forEach((imdbID) => {
      favoriteCounts[imdbID] = (favoriteCounts[imdbID] || 0) + 1;
    });
  });

  // getBounds returns 0 for no favorites, so normalize never sees -Infinity
  const { max: maxFavoriteCount } = getBounds(Object.values(favoriteCounts));

  // Built from the catalog (not from favoriteCounts) so every movie has a value:
  // 0 when nobody favorited it, 1 for the most favorited one
  const popularity = Object.fromEntries(
    movies.map((m) => [
      m.imdbID,
      normalize(favoriteCounts[m.imdbID] || 0, 0, maxFavoriteCount),
    ]),
  );

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
    popularity,
    dimension,
  };
}

// Same order as the dimension in makeContext:
// rating + runtime + year + popularity + genres + types + rated
export function encodeMovie(
  movie: CatalogMovie,
  ctx: EncodingContext,
): number[] {
  // A missing value sits in the middle of the range (0.5), like the
  // exemplo-01 does for products nobody bought
  const rating =
    (movie.rating == null
      ? 0.5
      : normalize(movie.rating, ctx.minRating, ctx.maxRating)) * WEIGHTS.rating;
  const runtime =
    (movie.runtime == null
      ? 0.5
      : normalize(movie.runtime, ctx.minRuntime, ctx.maxRuntime)) *
    WEIGHTS.runtime;
  const year =
    (movie.year == null
      ? 0.5
      : normalize(movie.year, ctx.minYear, ctx.maxYear)) * WEIGHTS.year;
  // Not in the context (e.g. favorited after it was built) means nobody else liked it
  const popularity = (ctx.popularity[movie.imdbID] ?? 0) * WEIGHTS.popularity;

  // Unknown genres, types and ratings get an undefined index -> zeros
  const genres = multiHot(
    movie.genres.map((genre) => ctx.genresIndex[genre]),
    ctx.numGenres,
    WEIGHTS.genre,
  );
  const type = oneHot(
    movie.type == null ? undefined : ctx.typesIndex[movie.type],
    ctx.numTypes,
    WEIGHTS.type,
  );
  const rated = oneHot(
    movie.rated == null ? undefined : ctx.ratedIndex[movie.rated],
    ctx.numRated,
    WEIGHTS.rated,
  );

  return [rating, runtime, year, popularity, ...genres, ...type, ...rated];
}

// The user is the average of the movies they favorited (tf.stack().mean(0) in
// the exemplo-01). No favorites -> zeros (cold start); the service falls back
// to popular movies in that case.
export function encodeUser(
  favoriteMovies: CatalogMovie[],
  ctx: EncodingContext,
): number[] {
  if (!favoriteMovies.length) {
    return new Array<number>(ctx.dimension).fill(0);
  }

  return meanVector(favoriteMovies.map((movie) => encodeMovie(movie, ctx)));
}
