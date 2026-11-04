// frontend/hooks/useFavorites.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { userHeaders } from '../lib/user';
import { useUsers } from './useUsers';
import { Favorite, Movie, ApiResponse } from '../types/movie';

type MutationContext = { previous?: Favorite[] };

export const useFavorites = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { currentUser, isLoading: isLoadingUsers, error: usersError } = useUsers();
  const userId = currentUser?._id;
  // Each user has its own cached list, so switching users never shows someone else's favorites
  const favoritesKey = ['favorites', userId];

  const { data: favorites, isLoading: isLoadingFavorites, error: favoritesError, refetch } = useQuery({
    queryKey: favoritesKey,
    queryFn: async (): Promise<Favorite[]> => {
      const { data } = await api.get<ApiResponse<Favorite[]>>('/favorites', {
        headers: userHeaders(userId!),
      });
      return data.data;
    },
    // Waits for the users list, which tells whose favorites to load
    enabled: !!userId,
  });

  // Snapshot the list and apply the change right away, so the UI reacts instantly
  const applyOptimistic = async (update: (current: Favorite[]) => Favorite[]): Promise<MutationContext> => {
    await queryClient.cancelQueries({ queryKey: favoritesKey });
    const previous = queryClient.getQueryData<Favorite[]>(favoritesKey);
    queryClient.setQueryData<Favorite[]>(favoritesKey, (current = []) => update(current));
    return { previous };
  };

  const rollback = (context: MutationContext | undefined) => {
    queryClient.setQueryData(favoritesKey, context?.previous);
  };

  const addFavorite = useMutation<Favorite, Error, Movie, MutationContext>({
    mutationFn: async (movie) => {
      const { data } = await api.post<ApiResponse<Favorite>>('/favorites', {
        imdbID: movie.imdbID,
        title: movie.Title,
        year: movie.Year,
        poster: movie.Poster || undefined,
      }, { headers: userHeaders(userId!) });
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
    onSettled: () => queryClient.invalidateQueries({ queryKey: favoritesKey }),
  });

  const removeFavorite = useMutation<void, Error, Movie, MutationContext>({
    mutationFn: async (movie) => {
      await api.delete(`/favorites/${movie.imdbID}`, { headers: userHeaders(userId!) });
    },
    onMutate: (movie) =>
      applyOptimistic((current) => current.filter((fav) => fav.imdbID !== movie.imdbID)),
    onError: (error, movie, context) => {
      rollback(context);
      showToast(`Couldn't remove "${movie.Title}". ${getErrorMessage(error)}`, 'error');
    },
    onSuccess: (_, movie) => showToast(`"${movie.Title}" removed from My List`),
    onSettled: () => queryClient.invalidateQueries({ queryKey: favoritesKey }),
  });

  const checkIsFavorite = (imdbID: string): boolean => {
    return favorites?.some(fav => fav.imdbID === imdbID) || false;
  };

  const toggleFavorite = (movie: Movie) => {
    if (!userId) return;
    if (checkIsFavorite(movie.imdbID)) {
      removeFavorite.mutate(movie);
    } else {
      addFavorite.mutate(movie);
    }
  };

  return {
    favorites,
    isLoading: isLoadingUsers || isLoadingFavorites,
    error: usersError ?? favoritesError,
    refetch,
    checkIsFavorite,
    toggleFavorite,
    isPending: addFavorite.isPending || removeFavorite.isPending,
  };
};
