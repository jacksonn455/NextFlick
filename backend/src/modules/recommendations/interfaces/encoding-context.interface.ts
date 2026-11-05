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
  dimension: number;
}
