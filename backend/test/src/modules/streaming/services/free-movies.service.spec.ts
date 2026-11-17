import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { getModelToken } from '@nestjs/mongoose';
import { of, throwError } from 'rxjs';
import archiveConfig from '../../../../../src/config/archive/archive.config';
import { FreeMoviesService } from '../../../../../src/modules/streaming/services/free-movies.service';
import { ArchiveMovie } from '../../../../../src/modules/streaming/entities/archive-movie.entity';
import {
  ArchiveUnavailableException,
  FreeMovieNotFoundException,
  InvalidArchiveIdentifierException,
  LicenseNotAllowedException,
  VideoUnavailableException,
} from '../../../../../src/modules/streaming/exceptions/streaming.exceptions';

const BASE_URL = 'https://archive.test';
const PUBLIC_DOMAIN = 'http://creativecommons.org/licenses/publicdomain/';

const metadataResponse = (overrides: Record<string, unknown> = {}) => ({
  metadata: {
    identifier: 'night_of_the_living_dead',
    title: 'Night of the Living Dead',
    year: '1968',
    description: '<p>Zombies <b>attack</b>.</p>',
    creator: ['George A. Romero'],
    licenseurl: PUBLIC_DOMAIN,
    ...overrides,
  },
  files: [
    { name: 'notld.ogv', format: 'Ogg Video' },
    { name: 'notld.mp4', format: 'h.264', length: '5752.3' },
  ],
});

describe('FreeMoviesService', () => {
  let service: FreeMoviesService;
  let httpService: { get: jest.Mock };
  let cache: { get: jest.Mock; set: jest.Mock };
  let archiveMovieModel: { updateOne: jest.Mock; findOne: jest.Mock };
  let storedRecord: jest.Mock;

  beforeEach(async () => {
    httpService = { get: jest.fn() };
    cache = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
    };
    storedRecord = jest.fn().mockResolvedValue(null);
    archiveMovieModel = {
      updateOne: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
      findOne: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({ exec: storedRecord }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FreeMoviesService,
        { provide: HttpService, useValue: httpService },
        { provide: CACHE_MANAGER, useValue: cache },
        {
          provide: archiveConfig.KEY,
          useValue: {
            baseUrl: BASE_URL,
            collection: 'feature_films',
            timeout: 1000,
          },
        },
        {
          provide: getModelToken(ArchiveMovie.name),
          useValue: archiveMovieModel,
        },
      ],
    }).compile();

    service = module.get(FreeMoviesService);
  });

  describe('search', () => {
    const searchResponse = {
      response: {
        numFound: 3,
        docs: [
          {
            identifier: 'nosferatu',
            title: 'Nosferatu',
            year: 1922,
            creator: 'F. W. Murnau',
            licenseurl: PUBLIC_DOMAIN,
          },
          {
            identifier: 'restricted_film',
            title: 'Restricted',
            licenseurl: 'https://creativecommons.org/licenses/by-nc/4.0/',
          },
          { identifier: 'no_license', title: 'No License' },
        ],
      },
    };

    it('returns only films whose license allows streaming', async () => {
      httpService.get.mockReturnValue(of({ data: searchResponse }));

      const movies = await service.search();

      expect(movies).toEqual([
        {
          identifier: 'nosferatu',
          title: 'Nosferatu',
          year: '1922',
          description: null,
          creator: 'F. W. Murnau',
          thumbnail: `${BASE_URL}/services/img/nosferatu`,
          source: 'archive',
          externalId: 'nosferatu',
          durationSeconds: null,
          publishedAt: null,
          genres: [],
          contentType: 'feature',
          license: {
            type: 'public-domain',
            label: 'Public Domain',
            url: PUBLIC_DOMAIN,
            allowed: true,
          },
          licenseVerified: true,
          freeToWatch: true,
        },
      ]);
    });

    it('asks the Advanced Search API for public domain MP4 films', async () => {
      httpService.get.mockReturnValue(of({ data: searchResponse }));

      await service.search({ query: 'nosferatu "1922"', limit: 5 });

      const [url, { params }] = httpService.get.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/advancedsearch.php`);
      const q = params.get('q');
      expect(q).toContain('collection:(feature_films)');
      expect(q).toContain('mediatype:(movies)');
      expect(q).toContain('licenseurl:(*publicdomain*)');
      expect(q).toContain('format:(');
      expect(q).toContain('title:(nosferatu 1922)');
      expect(params.get('rows')).toBe('5');
      expect(params.getAll('fl[]')).toContain('licenseurl');
    });

    it('clamps the limit between 1 and 50', async () => {
      httpService.get.mockReturnValue(of({ data: searchResponse }));

      await service.search({ limit: 500 });
      await service.search({ limit: 0 });

      expect(httpService.get.mock.calls[0][1].params.get('rows')).toBe('50');
      expect(httpService.get.mock.calls[1][1].params.get('rows')).toBe('1');
    });

    it('caches results and serves them from the cache', async () => {
      httpService.get.mockReturnValue(of({ data: searchResponse }));

      const movies = await service.search({ query: 'Nosferatu' });
      expect(cache.set).toHaveBeenCalledWith(
        'archive:search:nosferatu:20',
        movies,
        expect.any(Number),
      );

      cache.get.mockResolvedValueOnce(movies);
      await expect(service.search({ query: 'Nosferatu' })).resolves.toBe(
        movies,
      );
      expect(httpService.get).toHaveBeenCalledTimes(1);
    });

    it('throws ArchiveUnavailableException when archive.org fails', async () => {
      httpService.get.mockReturnValue(
        throwError(() => ({ message: 'timeout', response: { status: 503 } })),
      );

      await expect(service.search()).rejects.toThrow(
        ArchiveUnavailableException,
      );
      expect(cache.set).not.toHaveBeenCalled();
    });

    it('throws ArchiveUnavailableException on an unexpected payload', async () => {
      httpService.get.mockReturnValue(of({ data: { error: 'bad query' } }));

      await expect(service.search()).rejects.toThrow(
        ArchiveUnavailableException,
      );
    });
  });

  describe('getMovie', () => {
    it('rejects malformed identifiers without calling archive.org', async () => {
      await expect(service.getMovie('../secret')).rejects.toThrow(
        InvalidArchiveIdentifierException,
      );
      expect(httpService.get).not.toHaveBeenCalled();
    });

    it('returns details with the MP4 URL, license and attribution', async () => {
      httpService.get.mockReturnValue(of({ data: metadataResponse() }));

      const movie = await service.getMovie('night_of_the_living_dead');

      expect(httpService.get).toHaveBeenCalledWith(
        `${BASE_URL}/metadata/night_of_the_living_dead`,
        expect.any(Object),
      );
      expect(movie).toMatchObject({
        identifier: 'night_of_the_living_dead',
        title: 'Night of the Living Dead',
        year: '1968',
        description: 'Zombies attack.',
        creator: 'George A. Romero',
        videoUrl: `${BASE_URL}/download/night_of_the_living_dead/notld.mp4`,
        videoFormat: 'h.264',
        durationSeconds: 5752,
        sourceUrl: `${BASE_URL}/details/night_of_the_living_dead`,
        license: { type: 'public-domain', allowed: true },
      });
      expect(movie.attribution).toContain('George A. Romero');
      expect(cache.set).toHaveBeenCalledWith(
        'archive:movie:night_of_the_living_dead',
        movie,
        expect.any(Number),
      );
    });

    it('stores a verified rights record', async () => {
      httpService.get.mockReturnValue(of({ data: metadataResponse() }));

      await service.getMovie('night_of_the_living_dead');

      expect(archiveMovieModel.updateOne).toHaveBeenCalledWith(
        { identifier: 'night_of_the_living_dead' },
        {
          $set: expect.objectContaining({
            licenseUrl: PUBLIC_DOMAIN,
            licenseType: 'public-domain',
            rightsVerified: true,
            rightsCheckedAt: expect.any(Date),
          }),
        },
        { upsert: true },
      );
    });

    it('returns the cached details without calling archive.org', async () => {
      const cached = { identifier: 'night_of_the_living_dead' };
      cache.get.mockResolvedValueOnce(cached);

      await expect(service.getMovie('night_of_the_living_dead')).resolves.toBe(
        cached,
      );
      expect(httpService.get).not.toHaveBeenCalled();
    });

    it('refuses films whose license does not allow streaming, but records them', async () => {
      httpService.get.mockReturnValue(
        of({
          data: metadataResponse({
            licenseurl: 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
          }),
        }),
      );

      await expect(
        service.getMovie('night_of_the_living_dead'),
      ).rejects.toThrow(LicenseNotAllowedException);
      expect(archiveMovieModel.updateOne).toHaveBeenCalledWith(
        expect.anything(),
        { $set: expect.objectContaining({ rightsVerified: false }) },
        expect.anything(),
      );
      expect(cache.set).not.toHaveBeenCalled();
    });

    it('throws FreeMovieNotFoundException for unknown items', async () => {
      httpService.get.mockReturnValue(of({ data: {} }));

      await expect(service.getMovie('does_not_exist')).rejects.toThrow(
        FreeMovieNotFoundException,
      );
    });

    it('throws FreeMovieNotFoundException for withdrawn ("dark") items', async () => {
      httpService.get.mockReturnValue(
        of({ data: { ...metadataResponse(), is_dark: true } }),
      );

      await expect(service.getMovie('dark_item')).rejects.toThrow(
        FreeMovieNotFoundException,
      );
    });

    it('throws VideoUnavailableException without a playable MP4', async () => {
      httpService.get.mockReturnValue(
        of({
          data: {
            ...metadataResponse(),
            files: [{ name: 'notld.ogv', format: 'Ogg Video' }],
          },
        }),
      );

      await expect(
        service.getMovie('night_of_the_living_dead'),
      ).rejects.toThrow(VideoUnavailableException);
      expect(archiveMovieModel.updateOne).not.toHaveBeenCalled();
    });

    it('still returns the movie when the rights record cannot be saved', async () => {
      httpService.get.mockReturnValue(of({ data: metadataResponse() }));
      archiveMovieModel.updateOne.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('mongo down')),
      });

      await expect(
        service.getMovie('night_of_the_living_dead'),
      ).resolves.toMatchObject({ identifier: 'night_of_the_living_dead' });
    });

    describe('when archive.org is down', () => {
      beforeEach(() => {
        httpService.get.mockReturnValue(
          throwError(() => ({ message: 'ECONNRESET' })),
        );
      });

      it('serves the last verified record from MongoDB', async () => {
        storedRecord.mockResolvedValue({
          identifier: 'night_of_the_living_dead',
          title: 'Night of the Living Dead',
          year: '1968',
          description: null,
          creator: null,
          thumbnail: 'thumb',
          videoUrl: 'video.mp4',
          videoFormat: 'h.264',
          durationSeconds: 100,
          sourceUrl: 'source',
          licenseUrl: PUBLIC_DOMAIN,
          attribution: 'attribution',
          rights: null,
        });

        const movie = await service.getMovie('night_of_the_living_dead');

        expect(archiveMovieModel.findOne).toHaveBeenCalledWith({
          identifier: 'night_of_the_living_dead',
          rightsVerified: true,
        });
        expect(movie).toMatchObject({
          videoUrl: 'video.mp4',
          license: { type: 'public-domain', allowed: true },
        });
      });

      it('throws ArchiveUnavailableException without a stored record', async () => {
        await expect(
          service.getMovie('night_of_the_living_dead'),
        ).rejects.toThrow(ArchiveUnavailableException);
      });
    });
  });
});
