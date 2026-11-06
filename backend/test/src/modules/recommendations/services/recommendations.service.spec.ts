import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { RecommendationsService } from '../../../../../src/modules/recommendations/services/recommendations.service';
import { Favorite } from '../../../../../src/modules/favorites/entities/favorite.entity';
import { FavoritesSeedService } from '../../../../../src/modules/favorites/services/favorites-seed.service';
import { MovieCatalogService } from '../../../../../src/modules/movies/services/movie-catalog.service';
import { UsersService } from '../../../../../src/modules/users/services/users.service';
import { CatalogMovie } from '../../../../../src/modules/movies/entities/catalog-movie.entity';
import * as model from '../../../../../src/modules/recommendations/ml/model';

// The network itself is covered by model.spec.ts: here it is replaced so the
// service logic is tested fast and with known scores
jest.mock('../../../../../src/modules/recommendations/ml/model', () => ({
  TRAINING_OPTIONS: { epochs: 2, batchSize: 32, learningRate: 0.001 },
  buildModel: jest.fn(() => ({ dispose: jest.fn() })),
  disposeModel: jest.fn(),
  trainModel: jest.fn(async (_model, _data, onEpochEnd) => {
    const logs = [
      { epoch: 1, loss: 0.7, accuracy: 0.5 },
      { epoch: 2, loss: 0.3, accuracy: 0.9 },
    ];
    logs.forEach((log) => onEpochEnd?.(log));
    return logs;
  }),
  predictScores: jest.fn(),
}));

const movie = (imdbID: string, genre: string, rating = 7): CatalogMovie => ({
  imdbID,
  title: imdbID,
  year: 2000,
  type: 'movie',
  poster: null,
  genres: [genre],
  rating,
  runtime: 100,
  rated: 'PG-13',
  director: null,
  languages: [],
  countries: [],
  source: 'seed',
});

const catalog = [
  movie('h1', 'Horror', 8),
  movie('h2', 'Horror', 7),
  movie('h3', 'Horror', 9),
  movie('c1', 'Comedy', 6),
  movie('c2', 'Comedy', 9.5),
];

const ANA = '64f1a2b3c5d6e7f8a9b0c1aa';
const BRUNO = '64f1a2b3c5d6e7f8a9b0c1bb';
const NEW_USER = '64f1a2b3c5d6e7f8a9b0c1cc';

const allFavorites = [
  { userId: ANA, imdbID: 'h1' },
  { userId: ANA, imdbID: 'h2' },
  { userId: BRUNO, imdbID: 'c1' },
  { userId: BRUNO, imdbID: 'h1' },
];

// Mimics favoriteModel.find(filter, projection).lean().exec()
const findChain = (filter: { userId?: string }) => ({
  lean: () => ({
    exec: () =>
      Promise.resolve(
        filter.userId
          ? allFavorites.filter((f) => f.userId === filter.userId)
          : allFavorites,
      ),
  }),
});

describe('RecommendationsService', () => {
  let service: RecommendationsService;
  let catalogService: { findAll: jest.Mock; findByImdbIds: jest.Mock };
  let usersService: { findById: jest.Mock };

  const trainNow = async () => {
    service.startTraining();
    // let the background training finish
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    catalogService = {
      findAll: jest.fn().mockResolvedValue(catalog),
      findByImdbIds: jest.fn().mockResolvedValue([]),
    };
    usersService = { findById: jest.fn().mockResolvedValue({ _id: ANA }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        {
          provide: getModelToken(Favorite.name),
          useValue: { find: jest.fn(findChain) },
        },
        { provide: MovieCatalogService, useValue: catalogService },
        { provide: UsersService, useValue: usersService },
        {
          provide: FavoritesSeedService,
          useValue: { whenSeeded: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get(RecommendationsService);
  });

  describe('training', () => {
    it('should start idle', () => {
      expect(service.getStatus()).toMatchObject({ state: 'idle', logs: [] });
    });

    it('should train on the favorites and become ready', async () => {
      await trainNow();

      const status = service.getStatus();
      expect(status).toMatchObject({
        state: 'ready',
        progress: 100,
        users: 2,
        movies: 5,
        positives: 4,
      });
      expect(status.logs).toHaveLength(2);
      expect(status.trainedAt).toBeInstanceOf(Date);

      const [, data] = (model.trainModel as jest.Mock).mock.calls[0];
      expect(data.labels.filter((l: number) => l === 1)).toHaveLength(4);
    });

    it('should free the previous model after a retrain', async () => {
      await trainNow();
      await trainNow();

      const [firstModel] = (model.buildModel as jest.Mock).mock.results;
      expect(model.disposeModel).toHaveBeenCalledTimes(1);
      expect(model.disposeModel).toHaveBeenCalledWith(firstModel.value);
    });

    it('should not start a second training while one is running', () => {
      service.startTraining();
      service.startTraining();

      expect(catalogService.findAll).toHaveBeenCalledTimes(1);
    });

    it('should fail clearly when there are no favorites', async () => {
      allFavorites.splice(0, allFavorites.length);
      try {
        await trainNow();
        expect(service.getStatus()).toMatchObject({
          state: 'failed',
          error: 'No favorites to learn from yet',
        });
      } finally {
        allFavorites.push(
          { userId: ANA, imdbID: 'h1' },
          { userId: ANA, imdbID: 'h2' },
          { userId: BRUNO, imdbID: 'c1' },
          { userId: BRUNO, imdbID: 'h1' },
        );
      }
    });

    it('should train after the demo favorites are seeded on startup', async () => {
      service.onApplicationBootstrap();
      await new Promise((resolve) => setImmediate(resolve));
      await new Promise((resolve) => setImmediate(resolve));
      await new Promise((resolve) => setImmediate(resolve));

      expect(service.getStatus().state).toBe('ready');
    });
  });

  describe('recommend', () => {
    it('should return popular movies while the model is not trained', async () => {
      const result = await service.recommend(ANA, 10);

      expect(result.source).toBe('popular');
      // best rated first (no popularity before training), favorites excluded
      expect(result.data.map((m) => m.imdbID)).toEqual(['c2', 'h3', 'c1']);
      expect(result.data.every((m) => m.score === null)).toBe(true);
    });

    it('should rank the movies the user has not favorited by predicted score', async () => {
      await trainNow();
      // candidates for Ana: h3, c1, c2 (in catalog order)
      (model.predictScores as jest.Mock).mockReturnValue([0.9, 0.1, 0.4]);

      const result = await service.recommend(ANA, 10);

      expect(result.source).toBe('model');
      expect(result.data.map((m) => m.imdbID)).toEqual(['h3', 'c2', 'c1']);
      expect(result.data[0]).toMatchObject({ score: 0.9, genres: ['Horror'] });
    });

    it('should send [user vector, movie vector] rows to the model', async () => {
      await trainNow();
      (model.predictScores as jest.Mock).mockReturnValue([0.5, 0.5, 0.5]);

      await service.recommend(ANA, 10);

      const [, rows] = (model.predictScores as jest.Mock).mock.calls[0];
      const dimension = rows[0].length / 2;
      expect(rows).toHaveLength(3);
      // the user half is the same in every row
      rows.forEach((row: number[]) =>
        expect(row.slice(0, dimension)).toEqual(rows[0].slice(0, dimension)),
      );
    });

    it('should respect the limit', async () => {
      await trainNow();
      (model.predictScores as jest.Mock).mockReturnValue([0.9, 0.1, 0.4]);

      const result = await service.recommend(ANA, 1);

      expect(result.data.map((m) => m.imdbID)).toEqual(['h3']);
    });

    it('should return popular movies for a user without favorites', async () => {
      await trainNow();

      const result = await service.recommend(NEW_USER, 2);

      expect(result.source).toBe('popular');
      // h1 is favorited by both users (popularity 1); h2 and c1 by one each
      // (0.5), so the rating breaks the tie: h2 (7) before c1 (6)
      expect(result.data.map((m) => m.imdbID)).toEqual(['h1', 'h2']);
      expect(model.predictScores).not.toHaveBeenCalled();
    });

    it('should use favorites added after the training', async () => {
      await trainNow();
      allFavorites.push({ userId: NEW_USER, imdbID: 'tt-new' });
      catalogService.findByImdbIds.mockResolvedValue([
        movie('tt-new', 'Horror'),
      ]);
      (model.predictScores as jest.Mock).mockReturnValue([
        0.1, 0.2, 0.3, 0.4, 0.5,
      ]);

      try {
        const result = await service.recommend(NEW_USER, 10);

        expect(catalogService.findByImdbIds).toHaveBeenCalledWith(['tt-new']);
        expect(result.source).toBe('model');
        expect(result.data).toHaveLength(5);
      } finally {
        allFavorites.pop();
      }
    });

    it('should throw NotFoundException for an unknown user', async () => {
      usersService.findById.mockRejectedValue(new NotFoundException());

      await expect(service.recommend(ANA)).rejects.toThrow(NotFoundException);
    });
  });
});
