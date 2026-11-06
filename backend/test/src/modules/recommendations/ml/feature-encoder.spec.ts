import {
  encodeMovie,
  encodeUser,
  makeContext,
  WEIGHTS,
} from '../../../../../src/modules/recommendations/ml/feature-encoder';
import { CatalogMovie } from '../../../../../src/modules/movies/entities/catalog-movie.entity';

const movie = (overrides: Partial<CatalogMovie>): CatalogMovie => ({
  imdbID: 'tt0000000',
  title: 'Movie',
  year: 2000,
  type: 'movie',
  poster: null,
  genres: [],
  rating: 7,
  runtime: 100,
  rated: null,
  director: null,
  languages: [],
  countries: [],
  source: 'seed',
  ...overrides,
});

// Same movies as the step-by-step guide, so the expected vectors can be checked by hand
const A = movie({
  imdbID: 'ttA',
  rating: 9,
  runtime: 150,
  year: 2008,
  genres: ['Action', 'Drama'],
  type: 'movie',
  rated: 'PG-13',
});
const B = movie({
  imdbID: 'ttB',
  rating: 7,
  runtime: 90,
  year: 1980,
  genres: ['Comedy'],
  type: 'series',
  rated: null,
});

describe('feature-encoder', () => {
  describe('makeContext', () => {
    it('should take the min and max of the numeric features', () => {
      const ctx = makeContext([A, B], {});

      expect(ctx).toMatchObject({
        minRating: 7,
        maxRating: 9,
        minRuntime: 90,
        maxRuntime: 150,
        minYear: 1980,
        maxYear: 2008,
      });
    });

    it('should ignore null values in the min and max', () => {
      const unrated = movie({
        imdbID: 'ttC',
        rating: null,
        runtime: null,
        year: null,
      });

      const ctx = makeContext([A, B, unrated], {});

      expect(ctx.minRating).toBe(7);
      expect(ctx.minRuntime).toBe(90);
      expect(ctx.minYear).toBe(1980);
    });

    it('should index genres, types and ratings in alphabetical order', () => {
      const ctx = makeContext([A, B], {});

      expect(ctx.genresIndex).toEqual({ Action: 0, Comedy: 1, Drama: 2 });
      expect(ctx.typesIndex).toEqual({ movie: 0, series: 1 });
      expect(ctx.ratedIndex).toEqual({ 'PG-13': 0 });
      expect(ctx).toMatchObject({ numGenres: 3, numTypes: 2, numRated: 1 });
    });

    it('should build the same indices whatever the order of the movies', () => {
      expect(makeContext([B, A], {}).genresIndex).toEqual(
        makeContext([A, B], {}).genresIndex,
      );
    });

    it('should count 4 numbers plus one position per genre, type and rating', () => {
      // rating + runtime + year + popularity + 3 genres + 2 types + 1 rated
      expect(makeContext([A, B], {}).dimension).toBe(10);
    });

    describe('popularity', () => {
      const C = movie({ imdbID: 'ttC' });

      it('should go from 1 (most favorited) to 0 (nobody)', () => {
        const ctx = makeContext([A, B, C], {
          user1: [A, B],
          user2: [A],
          user3: [A],
        });

        expect(ctx.popularity.ttA).toBe(1);
        expect(ctx.popularity.ttB).toBeCloseTo(1 / 3);
        expect(ctx.popularity.ttC).toBe(0);
      });

      it('should count a movie once per user', () => {
        const ctx = makeContext([A, B], {
          user1: [A, A, A],
          user2: [B],
        });

        expect(ctx.popularity.ttA).toBe(1);
        expect(ctx.popularity.ttB).toBe(1);
      });

      it('should be 0 for every movie when there are no favorites', () => {
        const ctx = makeContext([A, B], {});

        expect(ctx.popularity).toEqual({ ttA: 0, ttB: 0 });
      });

      it('should have a value for every catalog movie', () => {
        const ctx = makeContext([A, B, C], { user1: [A] });

        expect(Object.keys(ctx.popularity).sort()).toEqual([
          'ttA',
          'ttB',
          'ttC',
        ]);
      });
    });

    it('should not fail for an empty catalog', () => {
      const ctx = makeContext([], {});

      expect(ctx.dimension).toBe(4);
      expect(ctx.popularity).toEqual({});
    });
  });

  // Expected vectors worked out by hand with A and B above, favorites
  // { user1: [A] } and the WEIGHTS (genre 0.4, rating 0.15, year 0.1,
  // rated 0.1, type 0.1, popularity 0, runtime 0.05). Popularity is 0 on
  // purpose (see WEIGHTS), so its position is always 0.
  // Order: rating, runtime, year, popularity | Action, Comedy, Drama | movie, series | PG-13
  const expectVector = (actual: number[], expected: number[]) => {
    expect(actual).toHaveLength(expected.length);
    expected.forEach((value, i) => expect(actual[i]).toBeCloseTo(value));
  };

  describe('encodeMovie', () => {
    const ctx = makeContext([A, B], { user1: [A] });

    it('should return a vector of ctx.dimension numbers', () => {
      expect(encodeMovie(A, ctx)).toHaveLength(ctx.dimension);
      expect(encodeMovie(B, ctx)).toHaveLength(ctx.dimension);
    });

    it('should encode movie A: highest values, two genres, a movie rated PG-13', () => {
      expectVector(
        encodeMovie(A, ctx),
        [0.15, 0.05, 0.1, 0, 0.2, 0, 0.2, 0.1, 0, 0.1],
      );
    });

    it('should encode movie B: lowest values, one genre, a series without rating', () => {
      expectVector(encodeMovie(B, ctx), [0, 0, 0, 0, 0, 0.4, 0, 0, 0.1, 0]);
    });

    it('should use 0.5 for a null rating, runtime or year', () => {
      const unknown = movie({
        imdbID: 'ttA',
        rating: null,
        runtime: null,
        year: null,
      });

      const [rating, runtime, year] = encodeMovie(unknown, ctx);

      expect(rating).toBeCloseTo(0.5 * WEIGHTS.rating);
      expect(runtime).toBeCloseTo(0.5 * WEIGHTS.runtime);
      expect(year).toBeCloseTo(0.5 * WEIGHTS.year);
    });

    it('should put popularity x its weight in position 3', () => {
      expect(encodeMovie(A, ctx)[3]).toBeCloseTo(
        ctx.popularity.ttA * WEIGHTS.popularity,
      );
    });

    it('should use 0 popularity for a movie outside the context', () => {
      const newMovie = movie({ imdbID: 'ttNew' });

      expect(encodeMovie(newMovie, ctx)[3]).toBe(0);
    });

    it('should give zeros for an unknown genre, type or rating', () => {
      const unknown = movie({
        imdbID: 'ttNew',
        genres: ['Western'],
        type: 'episode',
        rated: 'NC-17',
      });

      // everything after the 4 numbers: genres, types and ratings blocks
      expect(encodeMovie(unknown, ctx).slice(4)).toEqual(
        new Array(ctx.dimension - 4).fill(0),
      );
    });

    it('should keep the known genres when the movie also has an unknown one', () => {
      const mixed = movie({ imdbID: 'ttNew', genres: ['Comedy', 'Western'] });

      // Comedy gets the whole genre weight; Western is ignored
      expectVector(encodeMovie(mixed, ctx).slice(4, 7), [0, 0.4, 0]);
    });
  });

  describe('encodeUser', () => {
    const ctx = makeContext([A, B], { user1: [A] });

    it('should average the vectors of the favorite movies', () => {
      expectVector(
        encodeUser([A, B], ctx),
        [0.075, 0.025, 0.05, 0, 0.1, 0.2, 0.1, 0.05, 0.05, 0.05],
      );
    });

    it('should equal the movie vector for a single favorite', () => {
      expectVector(encodeUser([A], ctx), encodeMovie(A, ctx));
    });

    it('should return zeros for a user without favorites', () => {
      expect(encodeUser([], ctx)).toEqual(new Array(ctx.dimension).fill(0));
    });
  });
});
