import { Inject, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import type { ConfigType } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import archiveConfig from '../../../config/archive/archive.config';
import {
  ArchiveMetadataResponse,
  ArchiveSearchDoc,
  ArchiveSearchResponse,
} from '../interfaces/archive.interface';
import {
  FreeMovie,
  FreeMovieDetails,
  FreeMovieProvider,
  ProviderSearchOptions,
} from '../interfaces/free-movie.interface';
import { classifyContentType, mapGenres } from '../utils/catalog.utils';
import {
  ArchiveMovie,
  ArchiveMovieDocument,
} from '../entities/archive-movie.entity';
import { buildAttribution, classifyLicense } from '../utils/archive-license';
import {
  buildDetailsUrl,
  buildDownloadUrl,
  buildThumbnailUrl,
  escapeSearchTerm,
  isValidIdentifier,
  parseDuration,
  parseYear,
  pickVideoFile,
  toPlainText,
  toText,
} from '../utils/archive.parser';
import {
  ArchiveUnavailableException,
  FreeMovieNotFoundException,
  InvalidArchiveIdentifierException,
  LicenseNotAllowedException,
  VideoUnavailableException,
} from '../exceptions/streaming.exceptions';

export const DEFAULT_FREE_MOVIES_LIMIT = 20;
export const MAX_FREE_MOVIES_LIMIT = 50;

const SEARCH_CACHE_TTL = 6 * 60 * 60 * 1000;
const MOVIE_CACHE_TTL = 24 * 60 * 60 * 1000;

const SEARCH_FIELDS = [
  'identifier',
  'title',
  'year',
  'date',
  'description',
  'creator',
  'licenseurl',
  'subject',
  'runtime',
  'publicdate',
];

// archive.org "runtime" is free text: "01:23:45", "83 min", "1h 23m"
function parseRuntime(runtime: string | undefined): number | null {
  if (!runtime) return null;
  const minutes = runtime.match(/^\s*(\d+)\s*min/i);
  if (minutes) return Number(minutes[1]) * 60 || null;
  const hm = runtime.match(/^\s*(\d+)\s*h(?:ours?)?\s*(\d+)?/i);
  if (hm) return Number(hm[1]) * 3600 + Number(hm[2] ?? 0) * 60 || null;
  return parseDuration(runtime.trim());
}

// Internet Archive source of the free catalog
@Injectable()
export class FreeMoviesService implements FreeMovieProvider {
  readonly source = 'archive' as const;
  private readonly logger = new Logger(FreeMoviesService.name);

  constructor(
    private readonly httpService: HttpService,
    @Inject(archiveConfig.KEY)
    private readonly config: ConfigType<typeof archiveConfig>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @InjectModel(ArchiveMovie.name)
    private readonly archiveMovieModel: Model<ArchiveMovieDocument>,
  ) {}

  // Works without any configuration
  isEnabled(): boolean {
    return true;
  }

  // Public domain films from the curated collection that have an MP4 file
  async search(options: ProviderSearchOptions = {}): Promise<FreeMovie[]> {
    const term = escapeSearchTerm(options.query ?? '');
    const genre = escapeSearchTerm(options.genre ?? '');
    const limit = Math.min(
      Math.max(options.limit ?? DEFAULT_FREE_MOVIES_LIMIT, 1),
      MAX_FREE_MOVIES_LIMIT,
    );
    const page = Math.max(Math.floor(options.page ?? 1), 1);
    const cacheKey = `archive:search:${term.toLowerCase()}:${limit}${genre ? `:g:${genre.toLowerCase()}` : ''}${page > 1 ? `:p${page}` : ''}`;

    const cached = await this.cacheManager.get<FreeMovie[]>(cacheKey);
    if (cached) return cached;

    const params = new URLSearchParams({
      q: this.buildSearchQuery(term, genre),
      rows: String(limit),
      page: String(page),
      output: 'json',
    });
    SEARCH_FIELDS.forEach((field) => params.append('fl[]', field));
    params.append('sort[]', 'downloads desc');

    const data = await this.request<ArchiveSearchResponse>(
      `${this.config.baseUrl}/advancedsearch.php`,
      params,
    );

    if (!data.response) {
      this.logger.error(`Unexpected search response: ${data.error ?? 'empty'}`);
      throw new ArchiveUnavailableException();
    }

    const movies = data.response.docs
      .map((doc) => this.toFreeMovie(doc))
      // The query already asks for public domain; this double-checks each result
      .filter((movie) => movie.license.allowed);

    await this.cacheManager.set(cacheKey, movies, SEARCH_CACHE_TTL);
    return movies;
  }

  // Details and the playable MP4 URL; only for films whose license allows streaming
  async getMovie(identifier: string): Promise<FreeMovieDetails> {
    if (!isValidIdentifier(identifier)) {
      throw new InvalidArchiveIdentifierException();
    }

    const cacheKey = `archive:movie:${identifier}`;
    const cached = await this.cacheManager.get<FreeMovieDetails>(cacheKey);
    if (cached) return cached;

    let data: ArchiveMetadataResponse;
    try {
      data = await this.request<ArchiveMetadataResponse>(
        `${this.config.baseUrl}/metadata/${identifier}`,
      );
    } catch (error) {
      // archive.org is down: serve the last verified record, if any
      const stored = await this.findStored(identifier);
      if (stored) {
        this.logger.warn(`Serving stored record for ${identifier}`);
        return stored;
      }
      throw error;
    }

    // The Metadata API answers {} (200) for unknown or withdrawn items
    if (!data.metadata || data.is_dark) {
      throw new FreeMovieNotFoundException(
        `Free movie ${identifier} not found`,
      );
    }

    const video = pickVideoFile(data.files);
    const movie = this.toFreeMovie(
      { ...data.metadata, identifier },
      parseDuration(video?.length),
    );
    if (!video) {
      throw new VideoUnavailableException(
        `No playable video file for ${identifier}`,
      );
    }

    const sourceUrl = buildDetailsUrl(this.config.baseUrl, identifier);
    const details: FreeMovieDetails = {
      ...movie,
      videoUrl: buildDownloadUrl(this.config.baseUrl, identifier, video.name),
      videoFormat: video.format ?? 'MP4',
      embedUrl: null,
      sourceUrl,
      attribution: buildAttribution(
        movie.title,
        movie.creator,
        movie.license,
        sourceUrl,
      ),
      rights: toPlainText(data.metadata.rights),
    };

    await this.saveRecord(details);

    if (!details.license.allowed) {
      throw new LicenseNotAllowedException(
        `"${details.title}" is not public domain or openly licensed (${details.license.label})`,
      );
    }

    await this.cacheManager.set(cacheKey, details, MOVIE_CACHE_TTL);
    return details;
  }

  private buildSearchQuery(term: string, genre = ''): string {
    const parts = [
      `collection:(${this.config.collection})`,
      'mediatype:(movies)',
      'licenseurl:(*publicdomain*)',
      'format:("h.264" OR "MPEG4" OR "512Kb MPEG4")',
    ];
    if (term) parts.push(`title:(${term})`);
    if (genre) parts.push(`subject:(${genre})`);
    return parts.join(' AND ');
  }

  private toFreeMovie(
    doc: ArchiveSearchDoc,
    durationSeconds: number | null = parseRuntime(doc.runtime),
  ): FreeMovie {
    const license = classifyLicense(doc.licenseurl);
    const subjects = Array.isArray(doc.subject) ? doc.subject : [doc.subject];
    return {
      identifier: doc.identifier,
      source: this.source,
      externalId: doc.identifier,
      title: toText(doc.title) ?? doc.identifier,
      year: parseYear(doc.year, doc.date),
      description: toPlainText(doc.description),
      creator: toText(doc.creator),
      thumbnail: buildThumbnailUrl(this.config.baseUrl, doc.identifier),
      durationSeconds,
      publishedAt: doc.publicdate ?? null,
      genres: mapGenres(subjects),
      // The collection only holds full-length films
      contentType: classifyContentType(durationSeconds, 'feature'),
      license,
      licenseVerified: license.type !== null,
      freeToWatch: license.allowed,
    };
  }

  private async request<T>(url: string, params?: URLSearchParams): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<T>(url, { params, timeout: this.config.timeout }),
      );
      return response.data;
    } catch (error) {
      const status = error.response?.status;
      this.logger.error(
        `Internet Archive request failed (${status ?? 'no response'}): ${error.message}`,
      );
      throw new ArchiveUnavailableException();
    }
  }

  // Keeps the rights record up to date; a failure here must not block playback
  private async saveRecord(details: FreeMovieDetails): Promise<void> {
    try {
      await this.archiveMovieModel
        .updateOne(
          { identifier: details.identifier },
          {
            $set: {
              title: details.title,
              year: details.year,
              description: details.description,
              creator: details.creator,
              thumbnail: details.thumbnail,
              videoUrl: details.videoUrl,
              videoFormat: details.videoFormat,
              durationSeconds: details.durationSeconds,
              sourceUrl: details.sourceUrl,
              licenseUrl: details.license.url,
              licenseType: details.license.type,
              licenseLabel: details.license.label,
              rights: details.rights,
              attribution: details.attribution,
              rightsVerified: details.license.allowed,
              rightsCheckedAt: new Date(),
            },
          },
          { upsert: true },
        )
        .exec();
    } catch (error) {
      this.logger.error(
        `Could not save rights record for ${details.identifier}: ${error.message}`,
      );
    }
  }

  private async findStored(
    identifier: string,
  ): Promise<FreeMovieDetails | null> {
    try {
      const record = await this.archiveMovieModel
        .findOne({ identifier, rightsVerified: true })
        .lean<ArchiveMovie>()
        .exec();
      if (!record) return null;

      const license = classifyLicense(record.licenseUrl);
      return {
        identifier: record.identifier,
        source: this.source,
        externalId: record.identifier,
        title: record.title,
        year: record.year,
        description: record.description,
        creator: record.creator,
        thumbnail: record.thumbnail,
        durationSeconds: record.durationSeconds,
        publishedAt: null,
        genres: [],
        contentType: classifyContentType(record.durationSeconds, 'feature'),
        license,
        licenseVerified: license.type !== null,
        freeToWatch: license.allowed,
        videoUrl: record.videoUrl,
        videoFormat: record.videoFormat,
        embedUrl: null,
        sourceUrl: record.sourceUrl,
        attribution: record.attribution,
        rights: record.rights,
      };
    } catch (error) {
      this.logger.error(`Could not read stored record: ${error.message}`);
      return null;
    }
  }
}
