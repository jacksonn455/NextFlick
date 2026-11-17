import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { of, throwError } from 'rxjs';
import freeSourcesConfig from '../../../../../src/config/free-sources/free-sources.config';
import { YoutubeProvider } from '../../../../../src/modules/streaming/providers/youtube.provider';
import {
  InvalidMovieIdentifierException,
  LicenseNotAllowedException,
  ProviderUnavailableException,
  VideoUnavailableException,
} from '../../../../../src/modules/streaming/exceptions/streaming.exceptions';

const video = (id: string, overrides: Record<string, any> = {}) => ({
  id,
  snippet: {
    title: 'Night of the Living Dead (1968)',
    description: 'A classic horror film.',
    channelTitle: 'Free Classics',
    publishedAt: '2019-05-01T10:00:00Z',
    liveBroadcastContent: 'none',
    tags: ['horror'],
    thumbnails: { high: { url: `https://i.ytimg.com/vi/${id}/hq.jpg` } },
    ...overrides.snippet,
  },
  contentDetails: { duration: 'PT1H36M', ...overrides.contentDetails },
  status: {
    uploadStatus: 'processed',
    privacyStatus: 'public',
    license: 'creativeCommon',
    embeddable: true,
    ...overrides.status,
  },
});

const config = (apiKey: string | null, dailySearchBudget = 80) => ({
  youtube: {
    apiKey,
    baseUrl: 'https://yt.test',
    timeout: 1000,
    dailySearchBudget,
  },
  peertube: { instances: [], timeout: 1000 },
  loc: { baseUrl: '', collection: '', timeout: 1000 },
});

describe('YoutubeProvider', () => {
  let httpService: { get: jest.Mock };
  let cache: { get: jest.Mock; set: jest.Mock };

  const create = async (apiKey: string | null = 'key', budget = 80) => {
    const module = await Test.createTestingModule({
      providers: [
        YoutubeProvider,
        { provide: HttpService, useValue: httpService },
        { provide: CACHE_MANAGER, useValue: cache },
        { provide: freeSourcesConfig.KEY, useValue: config(apiKey, budget) },
      ],
    }).compile();
    return module.get(YoutubeProvider);
  };

  // search.list then videos.list
  const mockSearch = (videos: unknown[]) =>
    httpService.get.mockImplementation((url: string) =>
      of({
        data: url.endsWith('/search')
          ? { items: videos.map((v: any) => ({ id: { videoId: v.id } })) }
          : { items: videos },
      }),
    );

  beforeEach(() => {
    httpService = { get: jest.fn() };
    cache = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
    };
  });

  describe('without an API key', () => {
    it('is disabled and never calls the API', async () => {
      const provider = await create(null);

      expect(provider.isEnabled()).toBe(false);
      await expect(provider.search()).resolves.toEqual([]);
      await expect(provider.getMovie('abcdefghijk')).rejects.toThrow(
        ProviderUnavailableException,
      );
      expect(httpService.get).not.toHaveBeenCalled();
    });
  });

  describe('search', () => {
    it('searches only Creative Commons, long, embeddable videos', async () => {
      mockSearch([video('aaaaaaaaaaa')]);
      const provider = await create();

      await provider.search({ query: 'living dead' });

      const [url, { params }] = httpService.get.mock.calls[0];
      expect(url).toBe('https://yt.test/search');
      expect(params).toMatchObject({
        type: 'video',
        videoLicense: 'creativeCommon',
        videoDuration: 'long',
        videoEmbeddable: 'true',
        key: 'key',
      });
      expect(params.q).toContain('living dead');
      expect(httpService.get.mock.calls[1][1].params.id).toBe('aaaaaaaaaaa');
    });

    it('normalizes videos into the movie model', async () => {
      mockSearch([video('aaaaaaaaaaa')]);
      const provider = await create();

      const [movie] = await provider.search();

      expect(movie).toEqual({
        identifier: 'youtube:aaaaaaaaaaa',
        source: 'youtube',
        externalId: 'aaaaaaaaaaa',
        title: 'Night of the Living Dead (1968)',
        year: '1968',
        description: 'A classic horror film.',
        creator: 'Free Classics',
        thumbnail: 'https://i.ytimg.com/vi/aaaaaaaaaaa/hq.jpg',
        durationSeconds: 5760,
        publishedAt: '2019-05-01T10:00:00Z',
        genres: ['Horror'],
        contentType: 'feature',
        license: expect.objectContaining({ type: 'cc-by', allowed: true }),
        licenseVerified: true,
        freeToWatch: true,
      });
      // Details are cached so opening the film costs no request
      expect(cache.set).toHaveBeenCalledWith(
        'youtube:movie:aaaaaaaaaaa',
        expect.objectContaining({
          embedUrl: 'https://www.youtube-nocookie.com/embed/aaaaaaaaaaa?rel=0',
          videoUrl: null,
        }),
        expect.any(Number),
      );
    });

    it('filters out trailers, short, restricted and non-CC videos', async () => {
      mockSearch([
        video('aaaaaaaaaaa'),
        video('bbbbbbbbbbb', { snippet: { title: 'Official Trailer' } }),
        video('ccccccccccc', { contentDetails: { duration: 'PT12M' } }),
        video('ddddddddddd', { status: { embeddable: false } }),
        video('eeeeeeeeeee', { status: { license: 'youtube' } }),
        video('fffffffffff', {
          contentDetails: {
            duration: 'PT1H40M',
            contentRating: { ytRating: 'ytAgeRestricted' },
          },
        }),
        video('ggggggggggg', {
          contentDetails: {
            duration: 'PT1H40M',
            regionRestriction: { allowed: ['US'] },
          },
        }),
      ]);
      const provider = await create();

      const movies = await provider.search();

      expect(movies.map((m) => m.externalId)).toEqual(['aaaaaaaaaaa']);
    });

    it('serves cached searches without spending quota', async () => {
      cache.get.mockResolvedValue([{ identifier: 'youtube:cached' }]);
      const provider = await create();

      await expect(provider.search({ query: 'nosferatu' })).resolves.toEqual([
        { identifier: 'youtube:cached' },
      ]);
      expect(httpService.get).not.toHaveBeenCalled();
    });

    it('skips very short queries and extra pages', async () => {
      const provider = await create();

      await expect(provider.search({ query: 'no' })).resolves.toEqual([]);
      await expect(provider.search({ page: 2 })).resolves.toEqual([]);
      expect(httpService.get).not.toHaveBeenCalled();
    });

    it('stops searching when the daily budget is spent', async () => {
      mockSearch([]);
      const provider = await create('key', 1);

      await provider.search({ query: 'first' });
      await expect(provider.search({ query: 'second' })).rejects.toThrow(
        ProviderUnavailableException,
      );
      expect(httpService.get).toHaveBeenCalledTimes(1);
    });

    it('asks the catalog to back off until the reset when the quota is exceeded', async () => {
      httpService.get.mockReturnValue(
        throwError(() => ({
          message: 'Forbidden',
          response: {
            status: 403,
            data: { error: { errors: [{ reason: 'quotaExceeded' }] } },
          },
        })),
      );
      const provider = await create();

      const error = await provider.search().catch((e) => e);

      expect(error).toBeInstanceOf(ProviderUnavailableException);
      expect(error.retryAfterMs).toBeGreaterThan(0);
    });
  });

  describe('getMovie', () => {
    it('rejects malformed video ids', async () => {
      const provider = await create();
      await expect(provider.getMovie('../etc')).rejects.toThrow(
        InvalidMovieIdentifierException,
      );
    });

    it('returns the embeddable details', async () => {
      httpService.get.mockReturnValue(
        of({ data: { items: [video('aaaaaaaaaaa')] } }),
      );
      const provider = await create();

      const movie = await provider.getMovie('aaaaaaaaaaa');

      expect(movie.embedUrl).toContain(
        'youtube-nocookie.com/embed/aaaaaaaaaaa',
      );
      expect(movie.sourceUrl).toBe(
        'https://www.youtube.com/watch?v=aaaaaaaaaaa',
      );
    });

    it('refuses videos without a Creative Commons license', async () => {
      httpService.get.mockReturnValue(
        of({
          data: {
            items: [video('aaaaaaaaaaa', { status: { license: 'youtube' } })],
          },
        }),
      );
      const provider = await create();

      await expect(provider.getMovie('aaaaaaaaaaa')).rejects.toThrow(
        LicenseNotAllowedException,
      );
    });

    it('reports deleted or private videos as unavailable', async () => {
      httpService.get.mockReturnValue(
        of({
          data: {
            items: [
              video('aaaaaaaaaaa', { status: { privacyStatus: 'private' } }),
            ],
          },
        }),
      );
      const provider = await create();

      await expect(provider.getMovie('aaaaaaaaaaa')).rejects.toThrow(
        VideoUnavailableException,
      );
    });
  });
});
