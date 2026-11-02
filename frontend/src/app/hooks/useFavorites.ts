// frontend/hooks/useFavorites.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Favorite, Movie, ApiResponse } from '../types/movie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const useFavorites = () => {
  const queryClient = useQueryClient();

  const { data: favorites, isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: async (): Promise<Favorite[]> => {
      const { data } = await axios.get<ApiResponse<Favorite[]>>(
        `${API_BASE_URL}/favorites`
      );
      return data.data;
    },
  });

  const addFavorite = useMutation({
    mutationFn: async (movie: Movie) => {
      const { data } = await axios.post<ApiResponse<Favorite>>(
        `${API_BASE_URL}/favorites`,
        {
          imdbID: movie.imdbID,
          title: movie.Title,
          year: movie.Year,
          poster: movie.Poster,
        }
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  const removeFavorite = useMutation({
    mutationFn: async (imdbID: string) => {
      await axios.delete(`${API_BASE_URL}/favorites/${imdbID}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  const checkIsFavorite = (imdbID: string): boolean => {
    return favorites?.some(fav => fav.imdbID === imdbID) || false;
  };

  return {
    favorites,
    isLoading,
    addFavorite,
    removeFavorite,
    checkIsFavorite,
  };
};