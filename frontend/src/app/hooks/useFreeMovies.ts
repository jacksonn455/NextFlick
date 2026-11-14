// frontend/hooks/useFreeMovies.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { ApiResponse } from '../types/movie';
import { FreeMovie, FreeMovieDetails } from '../types/freeMovie';

export const useFreeMovies = (query = '', limit = 20) => {
  const trimmed = query.trim();

  return useQuery({
    queryKey: ['free-movies', trimmed.toLowerCase(), limit],
    queryFn: async (): Promise<FreeMovie[]> => {
      const { data } = await api.get<ApiResponse<FreeMovie[]>>('/free-movies', {
        params: { q: trimmed || undefined, limit },
      });
      return data.data;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes (the backend caches for 6 hours)
  });
};

export const useFreeMovie = (identifier: string | undefined) => {
  return useQuery({
    queryKey: ['free-movie', identifier],
    queryFn: async (): Promise<FreeMovieDetails> => {
      const { data } = await api.get<ApiResponse<FreeMovieDetails>>(
        `/free-movies/${encodeURIComponent(identifier!)}`,
      );
      return data.data;
    },
    enabled: !!identifier,
    staleTime: 30 * 60 * 1000,
    // 403 (license) and 404 (no video) will not change on a retry
    retry: false,
  });
};
