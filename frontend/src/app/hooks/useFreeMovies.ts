// frontend/hooks/useFreeMovies.ts
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { ApiResponse } from '../types/movie';
import {
  FreeCatalogFilters,
  FreeCatalogPage,
  FreeMovie,
  FreeMovieDetails,
  FreeSourceStatus,
} from '../types/freeMovie';

// The backend caches every source for hours; this only avoids refetching while browsing
const STALE_TIME = 30 * 60 * 1000;

const toParams = (filters: FreeCatalogFilters, limit: number, page = 1) => ({
  q: filters.query?.trim() || undefined,
  sources: filters.source,
  genre: filters.genre,
  yearFrom: filters.yearFrom,
  yearTo: filters.yearTo,
  contentType: filters.contentType,
  free: filters.freeOnly === false ? 'all' : undefined,
  limit,
  page: page > 1 ? page : undefined,
});

const fetchCatalog = async (filters: FreeCatalogFilters, limit: number, page = 1): Promise<FreeCatalogPage> => {
  const { data } = await api.get<ApiResponse<FreeMovie[]> & { unavailableSources?: FreeCatalogPage['unavailableSources'] }>(
    '/free-movies',
    { params: toParams(filters, limit, page) },
  );
  return { movies: data.data, unavailableSources: data.unavailableSources ?? [] };
};

const catalogKey = (filters: FreeCatalogFilters, limit: number) => [
  'free-movies',
  { ...filters, query: filters.query?.trim().toLowerCase() || undefined },
  limit,
];

// One page of the catalog with filters
export const useFreeCatalog = (filters: FreeCatalogFilters = {}, limit = 20) =>
  useQuery({
    queryKey: catalogKey(filters, limit),
    queryFn: () => fetchCatalog(filters, limit),
    staleTime: STALE_TIME,
  });

// Search results with "Load more"
export const useFreeCatalogPages = (filters: FreeCatalogFilters, limit = 40) =>
  useInfiniteQuery({
    queryKey: [...catalogKey(filters, limit), 'pages'],
    queryFn: ({ pageParam }) => fetchCatalog(filters, limit, pageParam),
    initialPageParam: 1,
    // A short page means the sources have nothing more
    getNextPageParam: (lastPage, pages) =>
      lastPage.movies.length >= limit / 2 && pages.length < 10 ? pages.length + 1 : undefined,
    staleTime: STALE_TIME,
  });

// Kept for the home page row and other existing callers
export const useFreeMovies = (query = '', limit = 20) => {
  const result = useFreeCatalog({ query }, limit);
  return { ...result, data: result.data?.movies };
};

export const useFreeSources = () =>
  useQuery({
    queryKey: ['free-movies', 'sources'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<{ sources: FreeSourceStatus[]; genres: string[] }>>(
        '/free-movies/sources',
      );
      return data.data;
    },
    staleTime: STALE_TIME,
  });

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
    staleTime: STALE_TIME,
    // 403 (license) and 404 (no video) will not change on a retry
    retry: false,
  });
};
