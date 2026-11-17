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
  YoutubeSearchResponse,
  YoutubeVideo,
  YoutubeVideosResponse,
} from '../interfaces/youtube.interface';
import {
  classifyContentType,
  extractYear,
  FEATURE_MIN_SECONDS,
  looksLikeNonFilm,
  mapGenres,
  parseIsoDuration,
} from '../utils/catalog.utils';
import { buildMovieId } from '../utils/movie-id';
import { toPlainText } from '../utils/archive.parser';
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
  LicenseNotAllowedException,
  ProviderUnavailableException,
  VideoUnavailableException,
} from '../exceptions/streaming.exceptions';

const SEARCH_CACHE_TTL = 12 * 60 * 60 * 1000;
const MOVIE_CACHE_TTL = 24 * 60 * 60 * 1000;
// search.list costs the same for 1 or 50 results; 25 leaves room for filtering
const SEARCH_RESULTS = 25;
const MIN_QUERY_LENGTH = 3;
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

// YouTube's "Creative Commons" option is the CC BY 3.0 license
const YOUTUBE_CC_LICENSE: LicenseInfo = {
  type: 'cc-by',
  label: 'CC BY 3.0',
  url: 'https://creativecommons.org/licenses/by/3.0/',
  allowed: true,
};

// Excludes trailers and clips at the query level; results are filtered again
const DEFAULT_QUERY = '"full movie"|"full film" -trailer -review -reaction';

const msUntilUtcMidnight = () => {
  const now = new Date();
  return (
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1) -
    now.getTime()
  );
};

// Full-length films on YouTube, limited to videos the uploader published under
// YouTube's Creative Commons license (verified through the Data API). Played only
// through the official embedded player.
@Injectable()
export class YoutubeProvider implements FreeMovieProvider {
  readonly source = 'youtube' as const;
  private readonly logger = new Logger(YoutubeProvider.name);
  private searchBudget = { day: '', used: 0 };

  constructor(
    private readonly httpService: HttpService,
    @Inject(freeSourcesConfig.KEY)
    private readonly config: ConfigType<typeof freeSourcesConfig>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  isEnabled(): boolean {
    return !!this.config.youtube.apiKey;
  }

  async search(options: ProviderSearchOptions = {}): Promise<FreeMovie[]> {
    // Each extra page would cost another 100 quota units: first page only
    if (!this.isEnabled() || clampPage(options.page) > 1) return [];

    const query = cacheTerm(options.query);
    const genre = cacheTerm(options.genre);
    if (query && query.length < MIN_QUERY_LENGTH) return [];

    const limit = clampLimit(options.limit, 20, SEARCH_RESULTS);
    // Always fetched with the same size so every limit shares one cached search
    const movies = await cached(
      this.cacheManager,
      `youtube:search:${query}:${genre}`,
      SEARCH_CACHE_TTL,
      () => this.fetchSearch(query, genre),
    );
    return movies.slice(0, limit);
  }

  async getMovie(videoId: string): Promise<FreeMovieDetails> {
    if (!VIDEO_ID.test(videoId)) {
      throw new InvalidMovieIdentifierException('Invalid YouTube video id');
    }
    if (!this.isEnabled()) {
      throw new ProviderUnavailableException(
        this.source,
        'YouTube is not configured',
      );
    }

    return cached(
      this.cacheManager,
      `youtube:movie:${videoId}`,
      MOVIE_CACHE_TTL,
      async () => {
        const [video] = await this.fetchVideos([videoId]);
        if (!video) {
          throw new FreeMovieNotFoundException(
            `YouTube video ${videoId} not found`,
          );
        }
        if (video.status?.license !== 'creativeCommon') {
          throw new LicenseNotAllowedException(
            'This YouTube video is not published under a Creative Commons license',
          );
        }
        if (!this.isPlayableFilm(video)) {
          throw new VideoUnavailableException(
            'This YouTube video is unavailable, restricted or cannot be embedded',
          );
        }
        return this.toDetails(video);
      },
    );
  }

  private async fetchSearch(
    query: string,
    genre: string,
  ): Promise<FreeMovie[]> {
    this.useSearchBudget();

    const q = [genre, query].filter(Boolean).join(' ');
    const search = await this.request<YoutubeSearchResponse>('search', {
      part: 'snippet',
      type: 'video',
      q: q ? `${q} full movie -trailer -review` : DEFAULT_QUERY,
      videoLicense: 'creativeCommon',
      videoDuration: 'long',
      videoEmbeddable: 'true',
      videoSyndicated: 'true',
      safeSearch: 'moderate',
      maxResults: SEARCH_RESULTS,
      fields: 'items(id(videoId))',
    });

    const ids = (search.items ?? [])
      .map((item) => item.id?.videoId)
      .filter((id): id is string => !!id && VIDEO_ID.test(id));
    if (!ids.length) return [];

    // One videos.list call (1 unit) checks duration, license and embedding for all
    const films = (await this.fetchVideos(ids))
      .filter((video) => this.isPlayableFilm(video))
      .map((video) => this.toDetails(video));

    // Opening a film right after browsing costs no extra request
    await Promise.all(
      films.map((film) =>
        this.cacheManager.set(
          `youtube:movie:${film.externalId}`,
          film,
          MOVIE_CACHE_TTL,
        ),
      ),
    );
    return films.map(toListItem);
  }

  private async fetchVideos(ids: string[]): Promise<YoutubeVideo[]> {
    const data = await this.request<YoutubeVideosResponse>('videos', {
      part: 'snippet,contentDetails,status',
      id: ids.join(','),
      maxResults: ids.length,
    });
    return data.items ?? [];
  }

  private isPlayableFilm(video: YoutubeVideo): boolean {
    const { snippet, contentDetails, status } = video;
    const duration = parseIsoDuration(contentDetails?.duration) ?? 0;

    return (
      status?.privacyStatus === 'public' &&
      status.uploadStatus === 'processed' &&
      status.embeddable === true &&
      status.license === 'creativeCommon' &&
      snippet?.liveBroadcastContent === 'none' &&
      contentDetails?.contentRating?.ytRating !== 'ytAgeRestricted' &&
      // An allow-list means the video only plays in a few countries
      !contentDetails?.regionRestriction?.allowed &&
      duration >= FEATURE_MIN_SECONDS &&
      !looksLikeNonFilm(snippet.title)
    );
  }

  private toDetails(video: YoutubeVideo): FreeMovieDetails {
    const { snippet, contentDetails } = video;
    const thumbs = snippet.thumbnails ?? {};
    const thumbnail =
      thumbs.maxres?.url ??
      thumbs.standard?.url ??
      thumbs.high?.url ??
      thumbs.medium?.url ??
      `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
    const durationSeconds = parseIsoDuration(contentDetails?.duration);
    const sourceUrl = `https://www.youtube.com/watch?v=${video.id}`;
    const creator = snippet.channelTitle?.trim() || null;

    return {
      identifier: buildMovieId(this.source, video.id),
      source: this.source,
      externalId: video.id,
      title: snippet.title,
      year: extractYear(snippet.title),
      description: toPlainText(snippet.description),
      creator,
      thumbnail,
      durationSeconds,
      publishedAt: snippet.publishedAt ?? null,
      genres: mapGenres([snippet.title, ...(snippet.tags ?? [])]),
      contentType: classifyContentType(durationSeconds),
      license: YOUTUBE_CC_LICENSE,
      licenseVerified: true,
      freeToWatch: true,
      videoUrl: null,
      videoFormat: null,
      // Privacy-enhanced mode of the official player
      embedUrl: `https://www.youtube-nocookie.com/embed/${video.id}?rel=0`,
      sourceUrl,
      attribution: `"${snippet.title}"${creator ? ` by ${creator}` : ''}, on YouTube (${sourceUrl}), ${YOUTUBE_CC_LICENSE.label}.`,
      rights: null,
    };
  }

  // Protects the daily quota (10,000 units, 100 per search) from runaway searches
  private useSearchBudget() {
    const today = new Date().toISOString().slice(0, 10);
    if (this.searchBudget.day !== today)
      this.searchBudget = { day: today, used: 0 };
    if (this.searchBudget.used >= this.config.youtube.dailySearchBudget) {
      throw new ProviderUnavailableException(
        this.source,
        'YouTube daily search budget reached',
        msUntilUtcMidnight(),
      );
    }
    this.searchBudget.used++;
  }

  private request<T>(endpoint: string, params: Record<string, unknown>) {
    return fetchJson<T>(
      this.httpService,
      this.logger,
      this.source,
      `${this.config.youtube.baseUrl}/${endpoint}`,
      {
        params: { ...params, key: this.config.youtube.apiKey },
        timeout: this.config.youtube.timeout,
        retryAfterMs: (status, body) => {
          const reason = (body as YoutubeErrorBody)?.error?.errors?.[0]?.reason;
          // Quota exhausted or invalid key: retrying before the reset is pointless
          if (status === 403 || status === 400) {
            return reason === 'quotaExceeded' || reason === 'dailyLimitExceeded'
              ? msUntilUtcMidnight()
              : 60 * 60 * 1000;
          }
          return undefined;
        },
      },
    );
  }
}

interface YoutubeErrorBody {
  error?: { errors?: { reason?: string }[] };
}
