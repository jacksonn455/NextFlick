import { toCatalogMovie } from '../../../../../src/modules/movies/utils/catalog-movie.parser';
import { SeedMovieDetails } from '../../../../../src/modules/movies/interfaces/catalog-movie.interface';

const details: SeedMovieDetails = {
  imdbID: 'tt0468569',
  Title: 'The Dark Knight',
  Year: '2008',
  Type: 'movie',
  Poster: 'https://example.com/poster.jpg',
  Rated: 'PG-13',
  Runtime: '152 min',
  Genre: 'Action, Crime, Drama',
  Director: 'Christopher Nolan',
  Language: 'English, Mandarin',
  Country: 'United States, United Kingdom',
  imdbRating: '9.1',
};

describe('toCatalogMovie', () => {
  it('should parse OMDb strings into numbers and lists', () => {
    expect(toCatalogMovie(details, 'seed')).toEqual({
      imdbID: 'tt0468569',
      title: 'The Dark Knight',
      year: 2008,
      type: 'movie',
      poster: 'https://example.com/poster.jpg',
      genres: ['Action', 'Crime', 'Drama'],
      rating: 9.1,
      runtime: 152,
      rated: 'PG-13',
      director: 'Christopher Nolan',
      languages: ['English', 'Mandarin'],
      countries: ['United States', 'United Kingdom'],
      source: 'seed',
    });
  });

  it('should take the first year of a series range', () => {
    expect(toCatalogMovie({ ...details, Year: '2008–2013' }, 'seed').year).toBe(
      2008,
    );
  });

  it('should keep missing values as null or empty lists', () => {
    const movie = toCatalogMovie(
      {
        ...details,
        Poster: null,
        Rated: null,
        Runtime: null,
        Genre: null,
        Director: null,
        Language: null,
        Country: null,
        imdbRating: null,
      },
      'favorite',
    );

    expect(movie).toMatchObject({
      poster: null,
      rated: null,
      runtime: null,
      rating: null,
      genres: [],
      languages: [],
      countries: [],
      source: 'favorite',
    });
  });
});
