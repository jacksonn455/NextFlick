import {
  createTrainingData,
  NEGATIVES_PER_POSITIVE,
} from '../../../../../src/modules/recommendations/ml/training-data';
import {
  encodeMovie,
  encodeUser,
  makeContext,
} from '../../../../../src/modules/recommendations/ml/feature-encoder';
import { CatalogMovie } from '../../../../../src/modules/movies/entities/catalog-movie.entity';

const movie = (imdbID: string, genre: string): CatalogMovie => ({
  imdbID,
  title: imdbID,
  year: 2000,
  type: 'movie',
  poster: null,
  genres: [genre],
  rating: 7,
  runtime: 100,
  rated: 'PG-13',
  director: null,
  languages: [],
  countries: [],
  source: 'seed',
});

// 2 horror movies and 10 comedies
const horror = [movie('h1', 'Horror'), movie('h2', 'Horror')];
const comedies = Array.from({ length: 10 }, (_, i) => movie(`c${i}`, 'Comedy'));
const movies = [...horror, ...comedies];

// Deterministic "random" so the sampled negatives are the same every run
const seededRandom = () => {
  let seed = 42;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
};

describe('createTrainingData', () => {
  const favoritesByUser = { ana: horror, bruno: [comedies[0]] };
  const ctx = makeContext(movies, favoritesByUser);
  const data = createTrainingData(movies, favoritesByUser, ctx, seededRandom());

  it('should create one positive pair per favorite', () => {
    expect(data.positives).toBe(3);
    expect(data.labels.filter((label) => label === 1)).toHaveLength(3);
  });

  it(`should sample ${NEGATIVES_PER_POSITIVE} non-favorites per favorite`, () => {
    expect(data.negatives).toBe(3 * NEGATIVES_PER_POSITIVE);
    expect(data.labels.filter((label) => label === 0)).toHaveLength(
      3 * NEGATIVES_PER_POSITIVE,
    );
  });

  it('should concatenate the user and movie vectors in each row', () => {
    expect(data.inputDimension).toBe(ctx.dimension * 2);
    data.inputs.forEach((row) => expect(row).toHaveLength(data.inputDimension));

    expect(data.inputs[0]).toEqual([
      ...encodeUser(horror, ctx),
      ...encodeMovie(horror[0], ctx),
    ]);
  });

  it('should never use a favorite as a negative example', () => {
    const anaVector = encodeUser(horror, ctx);
    const horrorVectors = horror.map((m) => encodeMovie(m, ctx));
    const anaNegatives = data.inputs.filter(
      (row, i) =>
        data.labels[i] === 0 &&
        row.slice(0, ctx.dimension).every((v, j) => v === anaVector[j]),
    );

    expect(anaNegatives).toHaveLength(horror.length * NEGATIVES_PER_POSITIVE);
    anaNegatives.forEach((row) => {
      const movieVector = row.slice(ctx.dimension);
      horrorVectors.forEach((favorite) =>
        expect(movieVector).not.toEqual(favorite),
      );
    });
  });

  it('should cap negatives at the movies the user has not favorited', () => {
    const fewMovies = [horror[0], comedies[0]];
    const few = { ana: [horror[0]] };
    const result = createTrainingData(
      fewMovies,
      few,
      makeContext(fewMovies, few),
      seededRandom(),
    );

    expect(result.negatives).toBe(1);
  });

  it('should skip users without favorites', () => {
    const result = createTrainingData(
      movies,
      { ana: horror, empty: [] },
      ctx,
      seededRandom(),
    );

    expect(result.users).toBe(1);
  });

  it('should return no rows when nobody has favorites', () => {
    const result = createTrainingData(movies, {}, ctx);

    expect(result).toMatchObject({ inputs: [], labels: [], positives: 0 });
  });
});
