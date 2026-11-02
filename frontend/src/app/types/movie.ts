// frontend/app/types/movie.ts

export interface Movie {
  imdbID: string;
  Title: string;
  Year: string;
  Type?: string;
  Poster: string;
}

export interface SearchResponse {
  Search: Movie[];
  totalResults: string;
  Response: string;
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