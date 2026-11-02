// frontend/hooks/useFavorites.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { Favorite, Movie, ApiResponse } from '../types/movie';

const FAVORITES_KEY = ['favorites'];

type MutationContext = { previous?: Favorite[] };

export const useFavorites = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: favorites, isLoading, error, refetch } = useQuery({
    queryKey: FAVORITES_KEY,
    queryFn: async (): Promise<Favorite[]> => {
      const { data } = await api.get<ApiResponse<Favorite[]>>('/favorites');
      return data.data;
    },
  });

  // Snapshot the list and apply the change right away, so the UI reacts instantly
  const applyOptimistic = async (update: (current: Favorite[]) => Favorite[]): Promise<MutationContext> => {
    await queryClient.cancelQueries({ queryKey: FAVORITES_KEY });
    const previous = queryClient.getQueryData<Favorite[]>(FAVORITES_KEY);
    queryClient.setQueryData<Favorite[]>(FAVORITES_KEY, (current = []) => update(current));
    return { previous };
  };

  const rollback = (context: MutationContext | undefined) => {
    queryClient.setQueryData(FAVORITES_KEY, context?.previous);
  };

  const addFavorite = useMutation<Favorite, Error, Movie, MutationContext>({
    mutationFn: async (movie) => {
      const { data } = await api.post<ApiResponse<Favorite>>('/favorites', {
        imdbID: movie.imdbID,
        title: movie.Title,
        year: movie.Year,
        poster: movie.Poster || undefined,
      });
      return data.data;
    },
    onMutate: (movie) =>
      applyOptimistic((current) => [
        {
          _id: `optimistic-${movie.imdbID}`,
          imdbID: movie.imdbID,
          title: movie.Title,
          year: movie.Year,
          poster: movie.Poster || undefined,
        },
        ...current,
      ]),
    onError: (error, movie, context) => {
      rollback(context);
      showToast(`Couldn't add "${movie.Title}". ${getErrorMessage(error)}`, 'error');
    },
    onSuccess: (_, movie) => showToast(`"${movie.Title}" added to My List`),
    onSettled: () => queryClient.invalidateQueries({ queryKey: FAVORITES_KEY }),
  });

  const removeFavorite = useMutation<void, Error, Movie, MutationContext>({
    mutationFn: async (movie) => {
      await api.delete(`/favorites/${movie.imdbID}`);
    },
    onMutate: (movie) =>
      applyOptimistic((current) => current.filter((fav) => fav.imdbID !== movie.imdbID)),
    onError: (error, movie, context) => {
      rollback(context);
      showToast(`Couldn't remove "${movie.Title}". ${getErrorMessage(error)}`, 'error');
    },
    onSuccess: (_, movie) => showToast(`"${movie.Title}" removed from My List`),
    onSettled: () => queryClient.invalidateQueries({ queryKey: FAVORITES_KEY }),
  });

  const checkIsFavorite = (imdbID: string): boolean => {
    return favorites?.some(fav => fav.imdbID === imdbID) || false;
  };

  const toggleFavorite = (movie: Movie) => {
    if (checkIsFavorite(movie.imdbID)) {
      removeFavorite.mutate(movie);
    } else {
      addFavorite.mutate(movie);
    }
  };

  return {
    favorites,
    isLoading,
    error,
    refetch,
    checkIsFavorite,
    toggleFavorite,
    isPending: addFavorite.isPending || removeFavorite.isPending,
  };
};
