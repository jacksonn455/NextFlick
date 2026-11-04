import { MovieDetails } from './movie.interface';

// OMDb fields the catalog keeps, as raw strings (what the seed file stores).
// Poster is null when OMDb has none.
export type SeedMovieDetails = Pick<
  MovieDetails,
  | 'imdbID'
  | 'Title'
  | 'Year'
  | 'Type'
  | 'Rated'
  | 'Runtime'
  | 'Genre'
  | 'Director'
  | 'Language'
  | 'Country'
  | 'imdbRating'
> & { Poster: string | null };

export type CatalogSource = 'seed' | 'favorite';
