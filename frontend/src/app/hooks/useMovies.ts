// frontend/hooks/useMovies.ts
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Movie, ApiResponse } from '../types/movie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const useMovies = (query: string) => {
  return useQuery({
    queryKey: ['movies', query],
    queryFn: async (): Promise<Movie[]> => {
      if (!query.trim()) return [];
      
      const { data } = await axios.get<ApiResponse<Movie[]>>(
        `${API_BASE_URL}/movies/search?q=${encodeURIComponent(query)}`
      );
      return data.data;
    },
    enabled: !!query.trim(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};