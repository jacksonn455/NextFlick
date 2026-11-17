import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ContentType,
  FreeMovie,
  FreeMovieDetails,
  FreeMovieProvider,
  MOVIE_SOURCES,
  MovieSource,
  SOURCE_LABELS,
} from '../interfaces/free-movie.interface';
import {
  deduplicate,
  GENRE_NAMES,
  interleaveBySource,
} from '../utils/catalog.utils';
import { parseMovieId } from '../utils/movie-id';
import {
  CatalogUnavailableException,
  InvalidMovieIdentifierException,
  ProviderUnavailableException,
} from '../exceptions/streaming.exceptions';

export const FREE_MOVIE_PROVIDERS = Symbol('FREE_MOVIE_PROVIDERS');

export const DEFAULT_CATALOG_LIMIT = 20;
export const MAX_CATALOG_LIMIT = 100;
// Archive allows 50 rows, YouTube 25, the others 50
const MAX_PER_PROVIDER = 50;

// A slow source never holds the whole list back. Its request keeps running and
// fills the cache, so the next visit gets its films.
export const PROVIDER_DEADLINE_MS = 9000;
// After repeated failures a source is skipped for a while (doubles up to 16 min)
const FAILURES_BEFORE_SKIP = 2;
const BASE_SKIP_MS = 60_000;
const MAX_SKIP_MS = 16 * 60_000;

export interface CatalogSearchOptions {
  query?: string;
  limit?: number;
  page?: number;
  sources?: MovieSource[];
  genre?: string;
  yearFrom?: number;
  yearTo?: number;
  contentType?: ContentType;
  // Default true: only films the source explicitly offers for free viewing
  freeOnly?: boolean;
}

export interface CatalogSearchResult {
  movies: FreeMovie[];
  // Sources that failed, timed out or are temporarily skipped
  unavailableSources: MovieSource[];
}

export interface SourceStatus {
  source: MovieSource;
  label: string;
  enabled: boolean;
  available: boolean;
}

interface Health {
  failures: number;
  skipUntil: number;
}

const TIMED_OUT = Symbol('timed-out');

// Single entry point of the free catalog: fans searches out to every enabled
// source in parallel, merges duplicates and applies the filters
@Injectable()
export class FreeCatalogService {
  private readonly logger = new Logger(FreeCatalogService.name);
  private readonly providers: Map<MovieSource, FreeMovieProvider>;
  private readonly health = new Map<MovieSource, Health>();

  constructor(@Inject(FREE_MOVIE_PROVIDERS) providers: FreeMovieProvider[]) {
    this.providers = new Map(providers.map((p) => [p.source, p]));
  }

  getSources(): SourceStatus[] {
    return MOVIE_SOURCES.filter((source) => this.providers.has(source)).map(
      (source) => {
        const enabled = this.providers.get(source)!.isEnabled();
        return {
          source,
          label: SOURCE_LABELS[source],
          enabled,
          available: enabled && !this.isSkipped(source),
        };
      },
    );
  }

  getGenres(): string[] {
    return GENRE_NAMES;
  }

  async search(
    options: CatalogSearchOptions = {},
  ): Promise<CatalogSearchResult> {
    const limit = Math.min(
      Math.max(Math.floor(options.limit ?? DEFAULT_CATALOG_LIMIT), 1),
      MAX_CATALOG_LIMIT,
    );
    const freeOnly = options.freeOnly !== false;
    const requested = MOVIE_SOURCES.filter(
      (source) => !options.sources?.length || options.sources.includes(source),
    );
    const active = requested
      .map((source) => this.providers.get(source))
      .filter((p): p is FreeMovieProvider => !!p && p.isEnabled());

    const unavailableSources: MovieSource[] = [];
    const lists = await Promise.all(
      active.map(async (provider) => {
        if (this.isSkipped(provider.source)) {
          unavailableSources.push(provider.source);
          return null;
        }
        const movies = await this.searchProvider(provider, {
          query: options.query,
          genre: options.genre,
          page: options.page,
          limit: Math.min(limit, MAX_PER_PROVIDER),
          freeOnly,
        });
        if (!movies) unavailableSources.push(provider.source);
        return movies;
      }),
    );

    // Every source failed: report an outage instead of an empty catalog
    if (active.length > 0 && lists.every((list) => list === null)) {
      throw new CatalogUnavailableException();
    }

    const movies = interleaveBySource(
      deduplicate(lists.flatMap((list) => list ?? [])).filter((movie) =>
        this.matches(movie, options, freeOnly),
      ),
    ).slice(0, limit);

    return { movies, unavailableSources };
  }

  async getMovie(identifier: string): Promise<FreeMovieDetails> {
    const parsed = parseMovieId(identifier);
    if (!parsed) throw new InvalidMovieIdentifierException();

    const provider = this.providers.get(parsed.source);
    if (!provider) throw new InvalidMovieIdentifierException();
    return provider.getMovie(parsed.externalId);
  }

  private matches(
    movie: FreeMovie,
    options: CatalogSearchOptions,
    freeOnly: boolean,
  ): boolean {
    if (freeOnly && !movie.freeToWatch) return false;
    if (options.contentType && movie.contentType !== options.contentType) {
      return false;
    }
    if (options.yearFrom || options.yearTo) {
      const year = Number(movie.year);
      if (!year) return false;
      if (options.yearFrom && year < options.yearFrom) return false;
      if (options.yearTo && year > options.yearTo) return false;
    }
    return true;
  }

  // Null when the source failed or missed the deadline
  private async searchProvider(
    provider: FreeMovieProvider,
    options: Parameters<FreeMovieProvider['search']>[0],
  ): Promise<FreeMovie[] | null> {
    const request = provider.search(options).then(
      (movies) => {
        this.recordSuccess(provider.source);
        return movies;
      },
      (error) => {
        this.recordFailure(provider.source, error);
        return null;
      },
    );

    let timer: NodeJS.Timeout | undefined;
    const deadline = new Promise<typeof TIMED_OUT>((resolve) => {
      timer = setTimeout(() => resolve(TIMED_OUT), PROVIDER_DEADLINE_MS);
    });

    const result = await Promise.race([request, deadline]);
    clearTimeout(timer);
    if (result === TIMED_OUT) {
      this.logger.warn(
        `${provider.source} is slow; serving the other sources meanwhile`,
      );
      return null;
    }
    return result;
  }

  private isSkipped(source: MovieSource): boolean {
    return (this.health.get(source)?.skipUntil ?? 0) > Date.now();
  }

  private recordSuccess(source: MovieSource) {
    this.health.delete(source);
  }

  private recordFailure(source: MovieSource, error: Error) {
    const health = this.health.get(source) ?? { failures: 0, skipUntil: 0 };
    health.failures++;

    const retryAfter =
      error instanceof ProviderUnavailableException
        ? error.retryAfterMs
        : undefined;
    if (retryAfter) {
      health.skipUntil = Date.now() + retryAfter;
    } else if (health.failures >= FAILURES_BEFORE_SKIP) {
      const backoff = Math.min(
        BASE_SKIP_MS * 2 ** (health.failures - FAILURES_BEFORE_SKIP),
        MAX_SKIP_MS,
      );
      health.skipUntil = Date.now() + backoff;
    }

    this.health.set(source, health);
    this.logger.warn(
      `${source} search failed (${health.failures} in a row): ${error.message}`,
    );
  }
}
