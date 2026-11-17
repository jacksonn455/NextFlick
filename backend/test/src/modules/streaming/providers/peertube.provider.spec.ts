import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { of, throwError } from 'rxjs';
import freeSourcesConfig from '../../../../../src/config/free-sources/free-sources.config';
import { PeerTubeProvider } from '../../../../../src/modules/streaming/providers/peertube.provider';
import {
  FreeMovieNotFoundException,
  InvalidMovieIdentifierException,
  ProviderUnavailableException,
  VideoUnavailableException,
} from '../../../../../src/modules/streaming/exceptions/streaming.exceptions';

const UUID = 'd2881c03-bd33-4b42-9476-3f2a5e346eb1';
const UUID_2 = 'a1111111-bd33-4b42-9476-3f2a5e346eb1';

const video = (overrides: Record<string, unknown> = {}) => ({
  uuid: UUID,
  name: 'Metropolis (1927)',
  description: 'Silent science fiction film.',
  duration: 8271,
  publishedAt: '2021-09-17T10:52:58.568Z',
  originallyPublishedAt: null,
  category: { id: 2, label: 'Films' },
  licence: { id: 7, label: 'Public Domain Dedication' },
  privacy: { id: 1 },
  state: { id: 1 },
  nsfw: false,
  isLive: false,
  tags: ['silent film'],
  thumbnails: [
    {
      width: 280,
      aspectRatio: '16:9',
      fileUrl: 'https://tube.example.org/small.jpg',
    },
    {
      width: 1280,
      aspectRatio: '16:9',
      fileUrl: 'https://tube.example.org/large.jpg',
    },
  ],
  embedPath: `/videos/embed/${UUID}`,
  url: `https://tube.example.org/videos/watch/${UUID}`,
  channel: { displayName: 'Classic Films', host: 'tube.example.org' },
  ...overrides,
});

describe('PeerTubeProvider', () => {
  let httpService: { get: jest.Mock };
  let cache: { get: jest.Mock; set: jest.Mock };

  const create = async (
    instances = ['https://search.test', 'https://other.test'],
  ) => {
    const module = await Test.createTestingModule({
      providers: [
        PeerTubeProvider,
        { provide: HttpService, useValue: httpService },
        { provide: CACHE_MANAGER, useValue: cache },
        {
          provide: freeSourcesConfig.KEY,
          useValue: {
            youtube: {
              apiKey: null,
              baseUrl: '',
              timeout: 1000,
              dailySearchBudget: 1,
            },
            peertube: { instances, timeout: 1000 },
            loc: { baseUrl: '', collection: '', timeout: 1000 },
          },
        },
      ],
    }).compile();
    return module.get(PeerTubeProvider);
  };

  beforeEach(() => {
    httpService = { get: jest.fn() };
    cache = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
    };
  });

  it('is disabled without instances', async () => {
    const provider = await create([]);
    expect(provider.isEnabled()).toBe(false);
    await expect(provider.search()).resolves.toEqual([]);
  });

  describe('search', () => {
    it('searches the Films category with open licences on every instance', async () => {
      httpService.get.mockReturnValue(of({ data: { data: [] } }));
      const provider = await create();

      await provider.search({ query: 'metropolis' });

      expect(httpService.get).toHaveBeenCalledTimes(2);
      const [url, { params }] = httpService.get.mock.calls[0];
      expect(url).toBe('https://search.test/api/v1/search/videos');
      expect(params.get('search')).toBe('metropolis');
      expect(params.get('categoryOneOf')).toBe('2');
      expect(params.getAll('licenceOneOf')).toEqual([
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
      ]);
      expect(params.get('nsfw')).toBe('false');
    });

    it('normalizes videos and merges duplicates across instances', async () => {
      httpService.get.mockReturnValue(of({ data: { data: [video()] } }));
      const provider = await create();

      const movies = await provider.search();

      expect(movies).toHaveLength(1);
      expect(movies[0]).toEqual(
        expect.objectContaining({
          identifier: `peertube:tube.example.org:${UUID}`,
          externalId: `tube.example.org:${UUID}`,
          source: 'peertube',
          year: '1927',
          creator: 'Classic Films',
          thumbnail: 'https://tube.example.org/large.jpg',
          durationSeconds: 8271,
          contentType: 'feature',
          genres: ['Silent'],
          license: expect.objectContaining({ type: 'cc0', allowed: true }),
          licenseVerified: true,
          freeToWatch: true,
        }),
      );
      expect(movies[0]).not.toHaveProperty('embedUrl');
      // The host may now be used for detail requests
      expect(cache.set).toHaveBeenCalledWith(
        'peertube:host:tube.example.org',
        true,
        expect.any(Number),
      );
    });

    it('keeps working when one instance is down', async () => {
      httpService.get
        .mockReturnValueOnce(throwError(() => new Error('ECONNREFUSED')))
        .mockReturnValueOnce(of({ data: { data: [video()] } }));
      const provider = await create();

      await expect(provider.search()).resolves.toHaveLength(1);
    });

    it('fails when every instance is down', async () => {
      httpService.get.mockReturnValue(throwError(() => new Error('timeout')));
      const provider = await create();

      await expect(provider.search()).rejects.toThrow(
        ProviderUnavailableException,
      );
    });

    it('drops music, short, NSFW, live and trailer uploads and unsafe hosts', async () => {
      httpService.get.mockReturnValue(
        of({
          data: {
            data: [
              video({ uuid: UUID_2, category: { id: 1 } }),
              video({ uuid: UUID_2, duration: 120 }),
              video({ uuid: UUID_2, nsfw: true }),
              video({ uuid: UUID_2, isLive: true }),
              video({ uuid: UUID_2, name: 'Metropolis trailer' }),
              video({
                uuid: UUID_2,
                channel: { host: '127.0.0.1' },
                url: undefined,
              }),
            ],
          },
        }),
      );
      const provider = await create(['https://search.test']);

      await expect(provider.search()).resolves.toEqual([]);
    });

    it('marks unlicensed videos as publicly accessible only (free=all)', async () => {
      httpService.get.mockReturnValue(
        of({ data: { data: [video({ licence: null })] } }),
      );
      const provider = await create(['https://search.test']);

      const [movie] = await provider.search({ freeOnly: false });

      expect(
        httpService.get.mock.calls[0][1].params.getAll('licenceOneOf'),
      ).toEqual([]);
      expect(movie.freeToWatch).toBe(false);
      expect(movie.licenseVerified).toBe(false);
      expect(movie.license.allowed).toBe(false);
    });

    it('does not mark NonCommercial licences as open for reuse', async () => {
      httpService.get.mockReturnValue(
        of({ data: { data: [video({ licence: { id: 4 } })] } }),
      );
      const provider = await create(['https://search.test']);

      const [movie] = await provider.search();

      expect(movie.freeToWatch).toBe(true);
      expect(movie.license).toEqual(
        expect.objectContaining({ type: 'cc-by-nc', allowed: false }),
      );
    });
  });

  describe('getMovie', () => {
    it('rejects malformed ids and IP hosts', async () => {
      const provider = await create();

      await expect(provider.getMovie('no-separator')).rejects.toThrow(
        InvalidMovieIdentifierException,
      );
      await expect(
        provider.getMovie(`169.254.169.254:${UUID}`),
      ).rejects.toThrow(InvalidMovieIdentifierException);
      expect(httpService.get).not.toHaveBeenCalled();
    });

    it('never requests hosts that were not seen in search results', async () => {
      const provider = await create();

      await expect(
        provider.getMovie(`evil.example.com:${UUID}`),
      ).rejects.toThrow(FreeMovieNotFoundException);
      expect(httpService.get).not.toHaveBeenCalled();
    });

    it('returns the official embed player of the hosting instance', async () => {
      cache.get.mockImplementation(async (key: string) =>
        key === 'peertube:host:tube.example.org' ? true : undefined,
      );
      httpService.get.mockReturnValue(of({ data: video() }));
      const provider = await create();

      const movie = await provider.getMovie(`tube.example.org:${UUID}`);

      expect(httpService.get.mock.calls[0][0]).toBe(
        `https://tube.example.org/api/v1/videos/${UUID}`,
      );
      expect(movie.embedUrl).toBe(
        `https://tube.example.org/videos/embed/${UUID}?warningTitle=0&p2p=0`,
      );
      expect(movie.attribution).toContain('as declared by the uploader');
    });

    it('reports private or unpublished videos as unavailable', async () => {
      cache.get.mockImplementation(async (key: string) =>
        key.startsWith('peertube:host:') ? true : undefined,
      );
      httpService.get.mockReturnValue(
        of({ data: video({ privacy: { id: 2 } }) }),
      );
      const provider = await create();

      await expect(
        provider.getMovie(`tube.example.org:${UUID}`),
      ).rejects.toThrow(VideoUnavailableException);
    });

    it('reports deleted videos as not found', async () => {
      cache.get.mockImplementation(async (key: string) =>
        key.startsWith('peertube:host:') ? true : undefined,
      );
      httpService.get.mockReturnValue(
        throwError(() => ({ message: 'Not Found', response: { status: 404 } })),
      );
      const provider = await create();

      await expect(
        provider.getMovie(`tube.example.org:${UUID}`),
      ).rejects.toThrow(FreeMovieNotFoundException);
    });
  });
});
