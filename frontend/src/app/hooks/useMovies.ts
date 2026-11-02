// frontend/hooks/useMovies.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Movie, MovieDetails, ApiResponse } from '../types/movie';

// The backend rejects queries shorter than this
export const MIN_QUERY_LENGTH = 2;

export const useMovies = (query: string) => {
  const trimmed = query.trim();

  return useQuery({
    queryKey: ['movies', trimmed.toLowerCase()],
    queryFn: async (): Promise<Movie[]> => {
      const { data } = await api.get<ApiResponse<Movie[]>>('/movies/search', {
        params: { q: trimmed },
      });
      return data.data;
    },
    enabled: trimmed.length >= MIN_QUERY_LENGTH,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useMovieDetails = (imdbID: string | null) => {
  return useQuery({
    queryKey: ['movie', imdbID],
    queryFn: async (): Promise<MovieDetails> => {
      const { data } = await api.get<ApiResponse<MovieDetails>>(`/movies/${imdbID}`);
      return data.data;
    },
    enabled: !!imdbID,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};
