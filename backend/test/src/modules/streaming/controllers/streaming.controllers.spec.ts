import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { FreeMoviesController } from '../../../../../src/modules/streaming/controllers/free-movies.controller';
import { WatchHistoryController } from '../../../../../src/modules/streaming/controllers/watch-history.controller';
import { FreeCatalogService } from '../../../../../src/modules/streaming/services/free-catalog.service';
import { WatchHistoryService } from '../../../../../src/modules/streaming/services/watch-history.service';
import {
  ArchiveUnavailableException,
  LicenseNotAllowedException,
  VideoUnavailableException,
} from '../../../../../src/modules/streaming/exceptions/streaming.exceptions';

const userId = '64f1a2b3c5d6e7f8a9b0c1aa';

// HTTP layer of the streaming module, with the services mocked
describe('Streaming controllers (integration)', () => {
  let app: INestApplication;
  let freeMovies: {
    search: jest.Mock;
    getMovie: jest.Mock;
    getSources: jest.Mock;
    getGenres: jest.Mock;
  };
  let history: {
    getHistory: jest.Mock;
    getEntry: jest.Mock;
    saveProgress: jest.Mock;
    removeEntry: jest.Mock;
  };

  beforeAll(async () => {
    freeMovies = {
      search: jest.fn(),
      getMovie: jest.fn(),
      getSources: jest.fn(),
      getGenres: jest.fn(),
    };
    history = {
      getHistory: jest.fn(),
      getEntry: jest.fn(),
      saveProgress: jest.fn(),
      removeEntry: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [FreeMoviesController, WatchHistoryController],
      providers: [
        { provide: FreeCatalogService, useValue: freeMovies },
        { provide: WatchHistoryService, useValue: history },
      ],
    }).compile();

    app = module.createNestApplication({ logger: false });
    // Same pipe as main.ts
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(() => app.close());

  beforeEach(() => jest.resetAllMocks());

  describe('GET /free-movies', () => {
    it('lists free movies with the query and limit', async () => {
      freeMovies.search.mockResolvedValue({
        movies: [{ identifier: 'nosferatu' }],
        unavailableSources: ['youtube'],
      });

      const res = await request(app.getHttpServer())
        .get('/free-movies?q=nosferatu&limit=5')
        .expect(200);

      expect(res.body).toEqual({
        success: true,
        data: [{ identifier: 'nosferatu' }],
        count: 1,
        unavailableSources: ['youtube'],
      });
      expect(freeMovies.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'nosferatu',
          limit: 5,
          freeOnly: true,
          sources: undefined,
        }),
      );
    });

    it('passes the filters to the catalog', async () => {
      freeMovies.search.mockResolvedValue({
        movies: [],
        unavailableSources: [],
      });

      await request(app.getHttpServer())
        .get(
          '/free-movies?sources=youtube,peertube,bogus&genre=Western&yearFrom=1920&yearTo=1959&contentType=feature&free=all&page=2',
        )
        .expect(200);

      expect(freeMovies.search).toHaveBeenCalledWith({
        query: undefined,
        limit: undefined,
        page: 2,
        sources: ['youtube', 'peertube'],
        genre: 'Western',
        yearFrom: 1920,
        yearTo: 1959,
        contentType: 'feature',
        freeOnly: false,
      });
    });

    it('ignores an unknown content type', async () => {
      freeMovies.search.mockResolvedValue({
        movies: [],
        unavailableSources: [],
      });

      await request(app.getHttpServer())
        .get('/free-movies?contentType=nonsense')
        .expect(200);

      expect(freeMovies.search.mock.calls[0][0].contentType).toBeUndefined();
    });

    it('rejects a non-numeric limit', async () => {
      await request(app.getHttpServer())
        .get('/free-movies?limit=abc')
        .expect(400);
      expect(freeMovies.search).not.toHaveBeenCalled();
    });

    it('answers 503 when the Internet Archive is down', async () => {
      freeMovies.search.mockRejectedValue(new ArchiveUnavailableException());

      const res = await request(app.getHttpServer())
        .get('/free-movies')
        .expect(503);

      expect(res.body.code).toBe('ARCHIVE_UNAVAILABLE');
    });
  });

  describe('GET /free-movies/sources', () => {
    it('lists the sources and genres (not read as a film id)', async () => {
      freeMovies.getSources.mockReturnValue([
        {
          source: 'youtube',
          label: 'YouTube',
          enabled: false,
          available: false,
        },
      ]);
      freeMovies.getGenres.mockReturnValue(['Western']);

      const res = await request(app.getHttpServer())
        .get('/free-movies/sources')
        .expect(200);

      expect(res.body.data.genres).toEqual(['Western']);
      expect(res.body.data.sources[0].source).toBe('youtube');
      expect(freeMovies.getMovie).not.toHaveBeenCalled();
    });
  });

  describe('GET /free-movies/:identifier', () => {
    it('returns the movie', async () => {
      freeMovies.getMovie.mockResolvedValue({ identifier: 'nosferatu' });

      await request(app.getHttpServer())
        .get('/free-movies/nosferatu')
        .expect(200, { success: true, data: { identifier: 'nosferatu' } });
    });

    it('accepts prefixed ids of the other sources', async () => {
      freeMovies.getMovie.mockResolvedValue({
        identifier: 'youtube:abcdefghijk',
      });

      await request(app.getHttpServer())
        .get('/free-movies/youtube%3Aabcdefghijk')
        .expect(200);

      expect(freeMovies.getMovie).toHaveBeenCalledWith('youtube:abcdefghijk');
    });

    it('answers 403 for films that may not be streamed', async () => {
      freeMovies.getMovie.mockRejectedValue(new LicenseNotAllowedException());

      const res = await request(app.getHttpServer())
        .get('/free-movies/restricted')
        .expect(403);

      expect(res.body.code).toBe('LICENSE_NOT_ALLOWED');
    });

    it('answers 404 when there is no playable video', async () => {
      freeMovies.getMovie.mockRejectedValue(new VideoUnavailableException());

      const res = await request(app.getHttpServer())
        .get('/free-movies/no_video')
        .expect(404);

      expect(res.body.code).toBe('VIDEO_UNAVAILABLE');
    });
  });

  describe('/watch-history', () => {
    it('requires the x-user-id header', async () => {
      await request(app.getHttpServer()).get('/watch-history').expect(400);
      expect(history.getHistory).not.toHaveBeenCalled();
    });

    it('returns the Continue Watching list', async () => {
      history.getHistory.mockResolvedValue([{ identifier: 'nosferatu' }]);

      const res = await request(app.getHttpServer())
        .get('/watch-history?inProgress=true')
        .set('x-user-id', userId)
        .expect(200);

      expect(res.body.count).toBe(1);
      expect(history.getHistory).toHaveBeenCalledWith(userId, {
        inProgress: true,
      });
    });

    it('saves valid progress', async () => {
      history.saveProgress.mockResolvedValue({ position: 12.5 });

      await request(app.getHttpServer())
        .put('/watch-history/nosferatu')
        .set('x-user-id', userId)
        .send({ position: 12.5, duration: 3600 })
        .expect(200, { success: true, data: { position: 12.5 } });

      expect(history.saveProgress).toHaveBeenCalledWith(userId, 'nosferatu', {
        position: 12.5,
        duration: 3600,
      });
    });

    it.each([
      [{ position: -1, duration: 10 }],
      [{ position: 'abc', duration: 10 }],
      [{ duration: 10 }],
      [{ position: 1, duration: 999999 }],
    ])('rejects invalid progress %j', async (body) => {
      await request(app.getHttpServer())
        .put('/watch-history/nosferatu')
        .set('x-user-id', userId)
        .send(body)
        .expect(400);

      expect(history.saveProgress).not.toHaveBeenCalled();
    });

    it('removes an entry', async () => {
      history.removeEntry.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete('/watch-history/nosferatu')
        .set('x-user-id', userId)
        .expect(200);

      expect(history.removeEntry).toHaveBeenCalledWith(userId, 'nosferatu');
    });
  });
});
