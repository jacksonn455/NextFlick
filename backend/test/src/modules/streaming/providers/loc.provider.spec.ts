import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { of, throwError } from 'rxjs';
import freeSourcesConfig from '../../../../../src/config/free-sources/free-sources.config';
import { LocProvider } from '../../../../../src/modules/streaming/providers/loc.provider';
import {
  InvalidMovieIdentifierException,
  LicenseNotAllowedException,
  ProviderUnavailableException,
  VideoUnavailableException,
} from '../../../../../src/modules/streaming/exceptions/streaming.exceptions';

const MP4 =
  'https://tile.loc.gov/storage-services/service/mbrs/ntscrm/00046290/00046290.mp4';

const result = (overrides: Record<string, unknown> = {}) => ({
  id: 'http://www.loc.gov/item/96520379/',
  url: 'https://www.loc.gov/item/96520379/',
  title: 'Comedy cake walk',
  date: '1903',
  description: ['<p>Five dancers perform a cakewalk.</p>'],
  subject: ['comedy films', 'silent films', 'short films'],
  contributor: ['american mutoscope and biograph company'],
  access_restricted: false,
  resources: [
    {
      duration: 41,
      download_restricted: false,
      poster:
        '//tile.loc.gov/storage-services/service/mbrs/ntscrm/00046290/00046290.jpg',
      video: MP4,
    },
  ],
  ...overrides,
});

describe('LocProvider', () => {
  let provider: LocProvider;
  let httpService: { get: jest.Mock };
  let cache: { get: jest.Mock; set: jest.Mock };

  beforeEach(async () => {
    httpService = { get: jest.fn() };
    cache = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
    };
    const module = await Test.createTestingModule({
      providers: [
        LocProvider,
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
            peertube: { instances: [], timeout: 1000 },
            loc: {
              baseUrl: 'https://loc.test',
              collection: 'national-screening-room',
              timeout: 1000,
            },
          },
        },
      ],
    }).compile();
    provider = module.get(LocProvider);
  });

  describe('search', () => {
    it('searches the National Screening Room collection', async () => {
      httpService.get.mockReturnValue(of({ data: { results: [] } }));

      await provider.search({ query: 'comedy', limit: 10, page: 2 });

      const [url, { params }] = httpService.get.mock.calls[0];
      expect(url).toBe('https://loc.test/collections/national-screening-room/');
      expect(params).toMatchObject({ fo: 'json', q: 'comedy', c: 10, sp: 2 });
    });

    it('normalizes playable films and caches their details', async () => {
      httpService.get.mockReturnValue(of({ data: { results: [result()] } }));

      const [movie] = await provider.search();

      expect(movie).toEqual({
        identifier: 'loc:96520379',
        source: 'loc',
        externalId: '96520379',
        title: 'Comedy cake walk',
        year: '1903',
        description: 'Five dancers perform a cakewalk.',
        creator: 'American Mutoscope And Biograph Company',
        thumbnail:
          'https://tile.loc.gov/storage-services/service/mbrs/ntscrm/00046290/00046290.jpg',
        durationSeconds: 41,
        publishedAt: null,
        genres: ['Comedy', 'Silent'],
        contentType: 'short',
        license: expect.objectContaining({ type: 'no-known-restrictions' }),
        licenseVerified: false,
        freeToWatch: true,
      });
      expect(cache.set).toHaveBeenCalledWith(
        'loc:movie:96520379',
        expect.objectContaining({ videoUrl: MP4, embedUrl: null }),
        expect.any(Number),
      );
    });

    it('skips restricted items and items without a valid MP4', async () => {
      httpService.get.mockReturnValue(
        of({
          data: {
            results: [
              result({ access_restricted: true }),
              result({
                resources: [{ video: MP4, download_restricted: true }],
              }),
              result({ resources: [{ poster: '//x.jpg' }] }),
              result({
                resources: [{ video: 'https://evil.example.com/x.mp4' }],
              }),
            ],
          },
        }),
      );

      await expect(provider.search()).resolves.toEqual([]);
    });

    it('wraps failures', async () => {
      httpService.get.mockReturnValue(throwError(() => new Error('timeout')));
      await expect(provider.search()).rejects.toThrow(
        ProviderUnavailableException,
      );
    });
  });

  describe('getMovie', () => {
    const itemResponse = (overrides: Record<string, unknown> = {}) => ({
      item: {
        title: 'Comedy cake walk',
        date: '1903',
        summary: ['A cakewalk.'],
        contributor_names: ['American Mutoscope and Biograph Company'],
        subject_headings: ['Comedy films'],
        access_restricted: false,
        ...overrides,
      },
      resources: [{ duration: 41, video: MP4, poster: '//tile.loc.gov/p.jpg' }],
    });

    it('rejects malformed ids', async () => {
      await expect(provider.getMovie('../x')).rejects.toThrow(
        InvalidMovieIdentifierException,
      );
    });

    it('returns the MP4 viewing copy', async () => {
      httpService.get.mockReturnValue(of({ data: itemResponse() }));

      const movie = await provider.getMovie('96520379');

      expect(httpService.get.mock.calls[0][0]).toBe(
        'https://loc.test/item/96520379/',
      );
      expect(movie.videoUrl).toBe(MP4);
      expect(movie.creator).toBe('American Mutoscope and Biograph Company');
      expect(movie.sourceUrl).toBe('https://www.loc.gov/item/96520379/');
    });

    it('refuses restricted items', async () => {
      httpService.get.mockReturnValue(
        of({ data: itemResponse({ access_restricted: true }) }),
      );
      await expect(provider.getMovie('96520379')).rejects.toThrow(
        LicenseNotAllowedException,
      );
    });

    it('reports items without a video as unavailable', async () => {
      httpService.get.mockReturnValue(
        of({ data: { item: itemResponse().item, resources: [] } }),
      );
      await expect(provider.getMovie('96520379')).rejects.toThrow(
        VideoUnavailableException,
      );
    });
  });
});
