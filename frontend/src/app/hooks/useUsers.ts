// frontend/hooks/useUsers.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { setStoredUserId, useStoredUserId } from '../lib/user';
import { ApiResponse } from '../types/movie';
import { User } from '../types/user';

const USERS_KEY = ['users'];

export const useUsers = () => {
  const storedUserId = useStoredUserId();

  const { data: users, isLoading, error } = useQuery({
    queryKey: USERS_KEY,
    queryFn: async (): Promise<User[]> => {
      const { data } = await api.get<ApiResponse<User[]>>('/users');
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Falls back to the first user when nothing was picked yet, or the stored id
  // no longer exists (e.g. an id from before the users collection)
  const currentUser = users?.find((user) => user._id === storedUserId) ?? users?.[0] ?? null;

  return {
    users,
    currentUser,
    isLoading,
    error,
    selectUser: setStoredUserId,
  };
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (user: Pick<User, 'username' | 'name'>): Promise<User> => {
      const { data } = await api.post<ApiResponse<User>>('/users', user);
      return data.data;
    },
    onSuccess: (user) => {
      // Shows the new user in the switcher right away, then refreshes from the API
      queryClient.setQueryData<User[]>(USERS_KEY, (current = []) => [...current, user]);
      queryClient.invalidateQueries({ queryKey: USERS_KEY });
      setStoredUserId(user._id);
    },
  });
};
