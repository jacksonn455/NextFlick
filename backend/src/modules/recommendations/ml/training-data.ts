import { CatalogMovie } from '../../movies/entities/catalog-movie.entity';
import {
  EncodingContext,
  FavoritesByUser,
} from '../interfaces/encoding-context.interface';
import { encodeMovie, encodeUser } from './feature-encoder';

export interface TrainingData {
  // Each row is [...userVector, ...movieVector]
  inputs: number[][];
  // 1 when the user favorited the movie, 0 otherwise
  labels: number[];
  inputDimension: number;
  positives: number;
  negatives: number;
  users: number;
}

// The exemplo-01 pairs every user with every product. Here a user favorites
// ~12 of 235 movies, so ~95% of the labels would be 0 and a model answering
// "0" for everything would already score 95% accuracy. Negative sampling keeps
// a few non-favorites per favorite instead.
export const NEGATIVES_PER_POSITIVE = 3;

// Fisher-Yates; `random` is injectable so tests are deterministic
function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createTrainingData(
  movies: CatalogMovie[],
  favoritesByUser: FavoritesByUser,
  ctx: EncodingContext,
  random: () => number = Math.random,
): TrainingData {
  // Encoded once and reused for every user, like productVectors in the exemplo-01
  const movieVectors = new Map(
    movies.map((movie) => [movie.imdbID, encodeMovie(movie, ctx)]),
  );

  const inputs: number[][] = [];
  const labels: number[] = [];
  let positives = 0;
  let negatives = 0;
  let users = 0;

  Object.values(favoritesByUser).forEach((favorites) => {
    // Users without favorites have nothing to teach
    if (!favorites.length) return;
    users++;

    const userVector = encodeUser(favorites, ctx);
    const favoriteIds = new Set(favorites.map((movie) => movie.imdbID));

    favorites.forEach((movie) => {
      inputs.push([...userVector, ...encodeMovie(movie, ctx)]);
      labels.push(1);
      positives++;
    });

    const candidates = movies.filter((movie) => !favoriteIds.has(movie.imdbID));
    shuffle(candidates, random)
      .slice(0, favoriteIds.size * NEGATIVES_PER_POSITIVE)
      .forEach((movie) => {
        inputs.push([...userVector, ...movieVectors.get(movie.imdbID)!]);
        labels.push(0);
        negatives++;
      });
  });

  return {
    inputs,
    labels,
    inputDimension: ctx.dimension * 2,
    positives,
    negatives,
    users,
  };
}
