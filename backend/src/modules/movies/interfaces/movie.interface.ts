export interface Movie {
  imdbID: string;
  Title: string;
  Year: string;
  Type?: string;
  Poster: string;
}

export interface MovieDetails extends Movie {
  Rated: string | null;
  Released: string | null;
  Runtime: string | null;
  Genre: string | null;
  Director: string | null;
  Actors: string | null;
  Plot: string | null;
  Language: string | null;
  Country: string | null;
  imdbRating: string | null;
  Type: string;
}

export interface OmdbApiResponse {
  Search?: Movie[];
  Error?: string;
  Response: string;
}

export interface OmdbDetailsApiResponse extends Record<string, string | undefined> {
  Error?: string;
  Response: string;
}

export interface HttpError {
  status: number;
  message: string;
  code?: string;
}