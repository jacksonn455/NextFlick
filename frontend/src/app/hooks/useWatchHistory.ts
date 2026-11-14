// frontend/hooks/useWatchHistory.ts
import { useCallback } from 'react';
import axios from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { userHeaders } from '../lib/user';
import { useUsers } from './useUsers';
import { ApiResponse } from '../types/movie';
import { WatchHistoryEntry } from '../types/freeMovie';

export const WATCH_HISTORY_KEY = 'watch-history';

// Started, unfinished films of the current user, most recent first
export const useContinueWatching = () => {
  const { currentUser } = useUsers();
  const userId = currentUser?._id;

  return useQuery({
    queryKey: [WATCH_HISTORY_KEY, userId, 'in-progress'],
    queryFn: async (): Promise<WatchHistoryEntry[]> => {
      const { data } = await api.get<ApiResponse<WatchHistoryEntry[]>>('/watch-history', {
        params: { inProgress: true },
        headers: userHeaders(userId!),
      });
      return data.data;
    },
    enabled: !!userId,
  });
};

// Saved progress of one film; null when the user never watched it
export const useWatchEntry = (identifier: string | undefined) => {
  const { currentUser } = useUsers();
  const userId = currentUser?._id;

  return useQuery({
    queryKey: [WATCH_HISTORY_KEY, userId, identifier],
    queryFn: async (): Promise<WatchHistoryEntry | null> => {
      try {
        const { data } = await api.get<ApiResponse<WatchHistoryEntry>>(
          `/watch-history/${encodeURIComponent(identifier!)}`,
          { headers: userHeaders(userId!) },
        );
        return data.data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) return null;
        throw error;
      }
    },
    enabled: !!userId && !!identifier,
    retry: false,
  });
};

// Saves the playback position; failures are silent so they never interrupt the film
export const useSaveProgress = (identifier: string) => {
  const queryClient = useQueryClient();
  const { currentUser } = useUsers();
  const userId = currentUser?._id;

  const { mutate } = useMutation({
    mutationFn: async (progress: { position: number; duration: number }) => {
      const { data } = await api.put<ApiResponse<WatchHistoryEntry>>(
        `/watch-history/${encodeURIComponent(identifier)}`,
        progress,
        { headers: userHeaders(userId!) },
      );
      return data.data;
    },
    onSuccess: (entry) => {
      queryClient.setQueryData([WATCH_HISTORY_KEY, userId, identifier], entry);
      queryClient.invalidateQueries({ queryKey: [WATCH_HISTORY_KEY, userId, 'in-progress'] });
    },
    onError: (error) => console.warn('Could not save watch progress', error),
  });

  return useCallback(
    (position: number, duration: number) => {
      if (!userId || !Number.isFinite(position) || position <= 0) return;
      mutate({
        position: Math.round(position * 10) / 10,
        duration: Number.isFinite(duration) ? Math.round(duration * 10) / 10 : 0,
      });
    },
    [mutate, userId],
  );
};
