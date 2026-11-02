// frontend/app/types/movie.ts

export interface Movie {
  imdbID: string;
  Title: string;
  Year: string;
  Type?: string;
  Poster: string | null;
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
}

export interface Favorite {
  _id: string;
  imdbID: string;
  title: string;
  year: string;
  poster?: string;
  createdAt?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const favoriteToMovie = (favorite: Favorite): Movie => ({
  imdbID: favorite.imdbID,
  Title: favorite.title,
  Year: favorite.year,
  Poster: favorite.poster || null,
});
