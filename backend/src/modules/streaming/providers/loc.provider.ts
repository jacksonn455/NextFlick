import { Inject, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import type { ConfigType } from '@nestjs/config';
import freeSourcesConfig from '../../../config/free-sources/free-sources.config';
import {
  FreeMovie,
  FreeMovieDetails,
  FreeMovieProvider,
  LicenseInfo,
  ProviderSearchOptions,
} from '../interfaces/free-movie.interface';
import {
  LocItemResponse,
  LocResource,
  LocSearchResponse,
} from '../interfaces/loc.interface';
import { classifyContentType, mapGenres } from '../utils/catalog.utils';
import { buildMovieId } from '../utils/movie-id';
import { parseYear, toPlainText } from '../utils/archive.parser';
import {
  cached,
  cacheTerm,
  clampLimit,
  clampPage,
  fetchJson,
  toListItem,
} from './provider.utils';
import {
  InvalidMovieIdentifierException,
  LicenseNotAllowedException,
  VideoUnavailableException,
} from '../exceptions/streaming.exceptions';

const SEARCH_CACHE_TTL = 24 * 60 * 60 * 1000;
const MOVIE_CACHE_TTL = 24 * 60 * 60 * 1000;
const MAX_RESULTS = 50;
const ITEM_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
// Viewing copies are served from the Library's own media server
const VIDEO_URL = /^https:\/\/tile\.loc\.gov\/[^\s]+\.mp4$/i;

const LOC_LICENSE: LicenseInfo = {
  type: 'no-known-restrictions',
  label: 'No known restrictions',
  url: 'https://www.loc.gov/collections/national-screening-room/about-this-collection/rights-and-access/',
  allowed: true,
};

const LOC_RIGHTS =
  'The Library of Congress is not aware of any U.S. copyright or other restrictions for the vast majority of motion pictures in this collection. Rights assessment is your responsibility.';

interface LocRecord {
  id: string;
  url?: string;
  title?: string;
  date?: string;
  description?: string[];
  creator?: string;
  subjects: string[];
  accessRestricted?: boolean;
  resource?: LocResource;
}

const titleCase = (value: string) =>
  value.replace(
    /\b([a-z])([a-z]*)/g,
    (_, first: string, rest: string) => first.toUpperCase() + rest,
  );

const itemIdOf = (url: string | undefined) =>
  url?.match(/\/item\/([^/?#]+)\/?/)?.[1] ?? null;

// Films from the Library of Congress National Screening Room. Only items the
// Library streams publicly, with no access or download restriction and an MP4
// viewing copy, are listed.
@Injectable()
export class LocProvider implements FreeMovieProvider {
  readonly source = 'loc' as const;
  private readonly logger = new Logger(LocProvider.name);

  constructor(
    private readonly httpService: HttpService,
    @Inject(freeSourcesConfig.KEY)
    private readonly config: ConfigType<typeof freeSourcesConfig>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  isEnabled(): boolean {
    return true;
  }

  async search(options: ProviderSearchOptions = {}): Promise<FreeMovie[]> {
    const term = cacheTerm(options.query) || cacheTerm(options.genre);
    const limit = clampLimit(options.limit, 20, MAX_RESULTS);
    const page = clampPage(options.page);

    return cached(
      this.cacheManager,
      `loc:search:${term}:${limit}:${page}`,
      SEARCH_CACHE_TTL,
      () => this.fetchSearch(term, limit, page),
    );
  }

  async getMovie(itemId: string): Promise<FreeMovieDetails> {
    if (!ITEM_ID.test(itemId)) {
      throw new InvalidMovieIdentifierException(
        'Invalid Library of Congress id',
      );
    }

    return cached(
      this.cacheManager,
      `loc:movie:${itemId}`,
      MOVIE_CACHE_TTL,
      async () => {
        const data = await this.request<LocItemResponse>(
          `${this.config.loc.baseUrl}/item/${encodeURIComponent(itemId)}/`,
          { fo: 'json', at: 'item,resources' },
        );
        const item = data.item ?? {};
        const record: LocRecord = {
          id: itemId,
          url: item.url,
          title: item.title,
          date: item.date,
          description: item.summary?.length ? item.summary : item.description,
          creator: item.contributor_names?.[0],
          subjects: [...(item.subject_headings ?? []), ...(item.genre ?? [])],
          accessRestricted: item.access_restricted,
          resource: data.resources?.find((resource) => resource.video),
        };

        if (record.accessRestricted || record.resource?.download_restricted) {
          throw new LicenseNotAllowedException(
            'The Library of Congress restricts access to this film',
          );
        }
        const details = this.toDetails(record);
        if (!details) {
          throw new VideoUnavailableException(
            'No playable video file for this Library of Congress film',
          );
        }
        return details;
      },
    );
  }

  private async fetchSearch(
    term: string,
    limit: number,
    page: number,
  ): Promise<FreeMovie[]> {
    const params: Record<string, unknown> = {
      fo: 'json',
      c: limit,
      sp: page,
      at: 'results',
    };
    if (term) params.q = term;

    const data = await this.request<LocSearchResponse>(
      `${this.config.loc.baseUrl}/collections/${this.config.loc.collection}/`,
      params,
    );

    const films = (data.results ?? [])
      .map((result) => {
        const id = itemIdOf(result.url ?? result.id);
        if (!id || !ITEM_ID.test(id)) return null;
        return this.toDetails({
          id,
          url: result.url,
          title: result.title,
          date: result.date,
          description: result.description,
          creator: result.contributor?.[0]
            ? titleCase(result.contributor[0])
            : undefined,
          subjects: result.subject ?? [],
          accessRestricted: result.access_restricted,
          resource: result.resources?.find((resource) => resource.video),
        });
      })
      .filter((film): film is FreeMovieDetails => film !== null);

    // Search results already hold everything the watch page needs, so opening a
    // film does not wait for another (slow) loc.gov request
    await Promise.all(
      films.map((film) =>
        this.cacheManager.set(
          `loc:movie:${film.externalId}`,
          film,
          MOVIE_CACHE_TTL,
        ),
      ),
    );
    return films.map(toListItem);
  }

  // Null when the item cannot be streamed freely
  private toDetails(record: LocRecord): FreeMovieDetails | null {
    const { resource } = record;
    const videoUrl = resource?.video?.trim();
    if (
      record.accessRestricted !== false ||
      resource?.download_restricted ||
      !videoUrl ||
      !VIDEO_URL.test(videoUrl) ||
      !record.title
    ) {
      return null;
    }

    const title = record.title.trim();
    const creator = record.creator?.trim() || null;
    const sourceUrl = `https://www.loc.gov/item/${record.id}/`;
    const durationSeconds = resource?.duration
      ? Math.round(resource.duration)
      : null;
    const poster = resource?.poster?.trim();

    return {
      identifier: buildMovieId(this.source, record.id),
      source: this.source,
      externalId: record.id,
      title,
      year: parseYear(undefined, record.date),
      description: toPlainText(record.description),
      creator,
      thumbnail: poster
        ? poster.startsWith('//')
          ? `https:${poster}`
          : poster
        : '',
      durationSeconds,
      publishedAt: null,
      genres: mapGenres(record.subjects),
      contentType: classifyContentType(durationSeconds),
      license: LOC_LICENSE,
      // Collection-level statement, not a per-film license
      licenseVerified: false,
      freeToWatch: true,
      videoUrl,
      videoFormat: 'MP4',
      embedUrl: null,
      sourceUrl,
      attribution: `"${title}"${creator ? ` by ${creator}` : ''}, from the Library of Congress National Screening Room (${sourceUrl}).`,
      rights: LOC_RIGHTS,
    };
  }

  private request<T>(url: string, params: Record<string, unknown>) {
    return fetchJson<T>(this.httpService, this.logger, this.source, url, {
      params,
      timeout: this.config.loc.timeout,
    });
  }
}
