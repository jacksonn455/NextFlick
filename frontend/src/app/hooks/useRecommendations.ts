// frontend/hooks/useRecommendations.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { userHeaders } from '../lib/user';
import { RecommendationsResponse } from '../types/recommendation';

export const RECOMMENDATIONS_KEY = 'recommendations';
const LIMIT = 20;

export const useRecommendations = (userId: string | undefined, enabled: boolean) => {
  const query = useQuery({
    queryKey: [RECOMMENDATIONS_KEY, userId],
    queryFn: async (): Promise<RecommendationsResponse> => {
      const { data } = await api.get<RecommendationsResponse>('/recommendations', {
        headers: userHeaders(userId!),
        params: { limit: LIMIT },
      });
      return data;
    },
    enabled: enabled && !!userId,
    // While the model trains, the API answers with popular titles: check again
    // until the personalized ones are ready
    refetchInterval: (q) => (q.state.data?.model === 'training' ? 10_000 : false),
  });

  return query;
};
