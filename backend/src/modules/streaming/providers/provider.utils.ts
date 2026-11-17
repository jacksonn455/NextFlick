import { Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import type { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';
import {
  FreeMovie,
  FreeMovieDetails,
} from '../interfaces/free-movie.interface';
import {
  FreeMovieNotFoundException,
  ProviderUnavailableException,
} from '../exceptions/streaming.exceptions';

export const PROVIDER_USER_AGENT =
  'NextFlick/1.0 (free movie catalog; +https://nextflick-three.vercel.app)';

// GET a JSON document; 404 becomes FreeMovieNotFound, any other failure ProviderUnavailable
export async function fetchJson<T>(
  http: HttpService,
  logger: Logger,
  source: string,
  url: string,
  options: {
    params?: URLSearchParams | Record<string, unknown>;
    timeout: number;
    // How long the catalog should skip the source after this error (e.g. quota exhausted)
    retryAfterMs?: (
      status: number | undefined,
      body: unknown,
    ) => number | undefined;
  },
): Promise<T> {
  try {
    const response = await firstValueFrom(
      http.get<T>(url, {
        params: options.params,
        timeout: options.timeout,
        headers: {
          'User-Agent': PROVIDER_USER_AGENT,
          Accept: 'application/json',
        },
      }),
    );
    return response.data;
  } catch (error) {
    const status = error.response?.status;
    // The item was deleted or never existed: not an outage
    if (status === 404) throw new FreeMovieNotFoundException();
    logger.warn(
      `${source} request failed (${status ?? 'no response'}): ${error.message}`,
    );
    throw new ProviderUnavailableException(
      source,
      `${source} is unavailable`,
      options.retryAfterMs?.(status, error.response?.data),
    );
  }
}

// Cache-aside: returns the cached value or loads and caches it
export async function cached<T>(
  cache: Cache,
  key: string,
  ttl: number,
  load: () => Promise<T>,
): Promise<T> {
  const hit = await cache.get<T>(key);
  if (hit !== undefined && hit !== null) return hit;

  const value = await load();
  await cache.set(key, value, ttl);
  return value;
}

// Details-only fields are not sent in lists
const DETAIL_FIELDS = [
  'videoUrl',
  'videoFormat',
  'embedUrl',
  'sourceUrl',
  'attribution',
  'rights',
] as const;

export function toListItem(details: FreeMovieDetails): FreeMovie {
  const movie: Partial<FreeMovieDetails> = { ...details };
  DETAIL_FIELDS.forEach((field) => delete movie[field]);
  return movie as FreeMovie;
}

export const clampLimit = (
  limit: number | undefined,
  fallback: number,
  max: number,
) => Math.min(Math.max(Math.floor(limit ?? fallback), 1), max);

export const clampPage = (page: number | undefined) =>
  Math.max(Math.floor(page ?? 1), 1);

// Same key for "Nosferatu " and "nosferatu"
export const cacheTerm = (value: string | undefined) =>
  (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
