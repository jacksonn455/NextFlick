import { CatalogMovie } from '../../movies/entities/catalog-movie.entity';

export interface FavoritesByUser {
  [userId: string]: CatalogMovie[];
}

export interface EncodingContext {
  minRating: number;
  maxRating: number;
  minRuntime: number;
  maxRuntime: number;
  minYear: number;
  maxYear: number;
  genresIndex: Record<string, number>;
  typesIndex: Record<string, number>;
  ratedIndex: Record<string, number>;
  numGenres: number;
  numTypes: number;
  numRated: number;
  popularity: Record<string, number>;
  dimension: number;
}
