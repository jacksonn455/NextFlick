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
  LicenseType,
  ProviderSearchOptions,
} from '../interfaces/free-movie.interface';
import {
  PeerTubeSearchResponse,
  PeerTubeVideo,
} from '../interfaces/peertube.interface';
import {
  classifyContentType,
  extractYear,
  looksLikeNonFilm,
  mapGenres,
} from '../utils/catalog.utils';
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
  FreeMovieNotFoundException,
  InvalidMovieIdentifierException,
  ProviderUnavailableException,
  VideoUnavailableException,
} from '../exceptions/streaming.exceptions';

const SEARCH_CACHE_TTL = 6 * 60 * 60 * 1000;
const MOVIE_CACHE_TTL = 12 * 60 * 60 * 1000;
const HOST_TTL = 30 * 24 * 60 * 60 * 1000;
const MAX_RESULTS = 50;

// PeerTube category ids: 2 is "Films" (1 is "Music")
const FILMS_CATEGORY = 2;
// Shorter uploads are rarely films
const MIN_DURATION_SECONDS = 10 * 60;
const PUBLIC_PRIVACY = 1;
const PUBLISHED_STATE = 1;

// PeerTube licence ids. Every Creative Commons licence lets anyone watch the film
// as published (freeToWatch); only BY, BY-SA and CC0 allow reuse (allowed).
const LICENCES: Record<
  number,
  Omit<LicenseInfo, 'url'> & { type: LicenseType; path: string }
> = {
  1: { type: 'cc-by', label: 'CC BY', allowed: true, path: 'licenses/by/4.0/' },
  2: {
    type: 'cc-by-sa',
    label: 'CC BY-SA',
    allowed: true,
    path: 'licenses/by-sa/4.0/',
  },
  3: {
    type: 'cc-by-nd',
    label: 'CC BY-ND',
    allowed: false,
    path: 'licenses/by-nd/4.0/',
  },
  4: {
    type: 'cc-by-nc',
    label: 'CC BY-NC',
    allowed: false,
    path: 'licenses/by-nc/4.0/',
  },
  5: {
    type: 'cc-by-nc-sa',
    label: 'CC BY-NC-SA',
    allowed: false,
    path: 'licenses/by-nc-sa/4.0/',
  },
  6: {
    type: 'cc-by-nc-nd',
    label: 'CC BY-NC-ND',
    allowed: false,
    path: 'licenses/by-nc-nd/4.0/',
  },
  7: {
    type: 'cc0',
    label: 'CC0 1.0 (Public Domain Dedication)',
    allowed: true,
    path: 'publicdomain/zero/1.0/',
  },
};
const LICENCE_IDS = Object.keys(LICENCES);

// Public DNS names only: no IP literals, no "localhost" (detail requests go to the
// video's own instance, so the host must never point inside our network)
const HOSTNAME =
  /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const VIDEO_ID =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[A-Za-z0-9]{10,30})$/i;

const NO_LICENSE: LicenseInfo = {
  type: null,
  label: 'No license declared',
  url: null,
  allowed: false,
};

// Independent films from the PeerTube federation. Searches every configured
// instance (or search index such as SepiaSearch) in parallel; one failing instance
// does not hide the others.
@Injectable()
export class PeerTubeProvider implements FreeMovieProvider {
  readonly source = 'peertube' as const;
  private readonly logger = new Logger(PeerTubeProvider.name);

  constructor(
    private readonly httpService: HttpService,
    @Inject(freeSourcesConfig.KEY)
    private readonly config: ConfigType<typeof freeSourcesConfig>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  isEnabled(): boolean {
    return this.config.peertube.instances.length > 0;
  }

  async search(options: ProviderSearchOptions = {}): Promise<FreeMovie[]> {
    if (!this.isEnabled()) return [];

    const term = cacheTerm(options.query) || cacheTerm(options.genre);
    const limit = clampLimit(options.limit, 20, MAX_RESULTS);
    const page = clampPage(options.page);
    const freeOnly = options.freeOnly !== false;

    return cached(
      this.cacheManager,
      `peertube:search:${term}:${limit}:${page}:${freeOnly ? 'free' : 'all'}`,
      SEARCH_CACHE_TTL,
      () => this.fetchSearch(term, limit, page, freeOnly),
    );
  }

  // externalId is "<host>:<uuid>"
  async getMovie(externalId: string): Promise<FreeMovieDetails> {
    const separator = externalId.indexOf(':');
    const host = externalId.slice(0, separator).toLowerCase();
    const videoId = externalId.slice(separator + 1);
    if (separator < 1 || !HOSTNAME.test(host) || !VIDEO_ID.test(videoId)) {
      throw new InvalidMovieIdentifierException('Invalid PeerTube video id');
    }
    if (!(await this.isKnownHost(host))) {
      throw new FreeMovieNotFoundException(
        `PeerTube video ${videoId} not found`,
      );
    }

    return cached(
      this.cacheManager,
      `peertube:movie:${host}:${videoId}`,
      MOVIE_CACHE_TTL,
      async () => {
        const video = await fetchJson<PeerTubeVideo>(
          this.httpService,
          this.logger,
          this.source,
          `https://${host}/api/v1/videos/${encodeURIComponent(videoId)}`,
          { timeout: this.config.peertube.timeout },
        );

        if (
          video.privacy?.id !== PUBLIC_PRIVACY ||
          (video.state && video.state.id !== PUBLISHED_STATE) ||
          video.isLive ||
          video.nsfw ||
          !video.duration
        ) {
          throw new VideoUnavailableException(
            'This PeerTube video is not publicly available',
          );
        }
        return this.toDetails(video, host);
      },
    );
  }

  private async fetchSearch(
    term: string,
    limit: number,
    page: number,
    freeOnly: boolean,
  ): Promise<FreeMovie[]> {
    const params = new URLSearchParams({
      search: term || 'film',
      categoryOneOf: String(FILMS_CATEGORY),
      durationMin: String(MIN_DURATION_SECONDS),
      nsfw: 'false',
      isLive: 'false',
      sort: '-match',
      count: String(limit),
      start: String((page - 1) * limit),
    });
    if (freeOnly)
      LICENCE_IDS.forEach((id) => params.append('licenceOneOf', id));

    const results = await Promise.allSettled(
      this.config.peertube.instances.map((instance) =>
        fetchJson<PeerTubeSearchResponse>(
          this.httpService,
          this.logger,
          this.source,
          `${instance}/api/v1/search/videos`,
          { params, timeout: this.config.peertube.timeout },
        ),
      ),
    );
    if (results.every((result) => result.status === 'rejected')) {
      throw new ProviderUnavailableException(this.source);
    }

    const seen = new Set<string>();
    const films: FreeMovieDetails[] = [];
    for (const result of results) {
      if (result.status !== 'fulfilled') continue;
      for (const video of result.value.data ?? []) {
        const host = this.hostOf(video);
        if (!host || seen.has(video.uuid) || !this.isFilm(video)) continue;
        if (freeOnly && !LICENCES[video.licence?.id ?? 0]) continue;
        seen.add(video.uuid);
        films.push(this.toDetails(video, host));
      }
    }

    await this.rememberHosts(
      films.map((film) => film.externalId.split(':')[0]),
    );

    // Openly licensed films first
    return films
      .sort((a, b) => Number(b.license.allowed) - Number(a.license.allowed))
      .map(toListItem);
  }

  private isFilm(video: PeerTubeVideo): boolean {
    return (
      VIDEO_ID.test(video.uuid ?? '') &&
      (video.category?.id ?? FILMS_CATEGORY) === FILMS_CATEGORY &&
      (video.privacy?.id ?? PUBLIC_PRIVACY) === PUBLIC_PRIVACY &&
      !video.nsfw &&
      !video.isLive &&
      (video.duration ?? 0) >= MIN_DURATION_SECONDS &&
      !looksLikeNonFilm(video.name ?? '')
    );
  }

  private toDetails(video: PeerTubeVideo, host: string): FreeMovieDetails {
    const licence = LICENCES[video.licence?.id ?? 0];
    const license: LicenseInfo = licence
      ? {
          type: licence.type,
          label: licence.label,
          url: `https://creativecommons.org/${licence.path}`,
          allowed: licence.allowed,
        }
      : NO_LICENSE;
    const creator =
      video.channel?.displayName?.trim() ||
      video.account?.displayName?.trim() ||
      null;
    const sourceUrl = video.url?.startsWith('https://')
      ? video.url
      : `https://${host}/w/${video.uuid}`;
    const embedPath = video.embedPath ?? `/videos/embed/${video.uuid}`;
    const durationSeconds = video.duration ? Math.round(video.duration) : null;

    return {
      identifier: buildMovieId(this.source, `${host}:${video.uuid}`),
      source: this.source,
      externalId: `${host}:${video.uuid}`,
      title: video.name,
      year:
        parseYear(undefined, video.originallyPublishedAt ?? undefined) ??
        extractYear(video.name, true),
      description: toPlainText(video.description ?? undefined),
      creator,
      thumbnail: this.pickThumbnail(video, host),
      durationSeconds,
      publishedAt: video.publishedAt ?? null,
      genres: mapGenres([video.name, ...(video.tags ?? [])]),
      contentType: classifyContentType(durationSeconds),
      license,
      // The licence is a structured field, but it is declared by the uploader
      licenseVerified: !!licence,
      freeToWatch: !!licence,
      videoUrl: null,
      videoFormat: null,
      // Official PeerTube player of the instance hosting the video
      embedUrl: `https://${host}${embedPath}?warningTitle=0&p2p=0`,
      sourceUrl,
      attribution: `"${video.name}"${creator ? ` by ${creator}` : ''}, on PeerTube (${sourceUrl}), ${license.label}${licence ? ' as declared by the uploader' : ''}.`,
      rights: null,
    };
  }

  // Largest 16:9 thumbnail; falls back to the preview image
  private pickThumbnail(video: PeerTubeVideo, host: string): string {
    const best = (video.thumbnails ?? [])
      .filter((thumb) => thumb.aspectRatio === '16:9' && thumb.fileUrl)
      .sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.fileUrl;
    const absolute = (path?: string) =>
      path ? `https://${host}${path}` : undefined;

    return (
      best ??
      video.previewUrl ??
      absolute(video.previewPath) ??
      video.thumbnailUrl ??
      absolute(video.thumbnailPath) ??
      ''
    );
  }

  private hostOf(video: PeerTubeVideo): string | null {
    let host = video.channel?.host ?? video.account?.host;
    if (!host && video.url) {
      try {
        host = new URL(video.url).hostname;
      } catch {
        host = undefined;
      }
    }
    host = host?.toLowerCase();
    return host && HOSTNAME.test(host) ? host : null;
  }

  // Detail requests only go to configured instances or hosts seen in search results
  private async isKnownHost(host: string): Promise<boolean> {
    const configured = this.config.peertube.instances.some(
      (instance) => new URL(instance).hostname === host,
    );
    return (
      configured || !!(await this.cacheManager.get(`peertube:host:${host}`))
    );
  }

  private async rememberHosts(hosts: string[]) {
    await Promise.all(
      [...new Set(hosts)].map((host) =>
        this.cacheManager.set(`peertube:host:${host}`, true, HOST_TTL),
      ),
    );
  }
}
