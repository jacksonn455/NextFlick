import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MovieCatalogService } from '../../../../../src/modules/movies/services/movie-catalog.service';
import { MoviesService } from '../../../../../src/modules/movies/services/movies.service';
import { CatalogMovie } from '../../../../../src/modules/movies/entities/catalog-movie.entity';
import { SEED_MOVIES } from '../../../../../src/modules/movies/data/seed-movies';

const details = {
  imdbID: 'tt1375666',
  Title: 'Inception',
  Year: '2010',
  Type: 'movie',
  Poster: 'poster.jpg',
  Rated: 'PG-13',
  Runtime: '148 min',
  Genre: 'Action, Adventure, Sci-Fi',
  Director: 'Christopher Nolan',
  Language: 'English',
  Country: 'United States',
  imdbRating: '8.8',
};

describe('MovieCatalogService', () => {
  let service: MovieCatalogService;
  let catalogModel: any;
  let moviesService: { getMovieDetails: jest.Mock };

  beforeEach(async () => {
    catalogModel = {
      bulkWrite: jest
        .fn()
        .mockResolvedValue({ upsertedCount: 0, modifiedCount: 0 }),
      exists: jest.fn(),
      updateOne: jest.fn().mockResolvedValue({}),
      find: jest.fn(),
      countDocuments: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(3) }),
    };
    moviesService = { getMovieDetails: jest.fn().mockResolvedValue(details) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MovieCatalogService,
        { provide: getModelToken(CatalogMovie.name), useValue: catalogModel },
        { provide: MoviesService, useValue: moviesService },
      ],
    }).compile();

    service = module.get(MovieCatalogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('seedCatalog', () => {
    it('should upsert every seed movie by imdbID without calling OMDb', async () => {
      await service.seedCatalog();

      if (!SEED_MOVIES.length) {
        expect(catalogModel.bulkWrite).not.toHaveBeenCalled();
        return;
      }

      const [operations] = catalogModel.bulkWrite.mock.calls[0];
      expect(operations).toHaveLength(SEED_MOVIES.length);
      expect(operations[0].updateOne).toMatchObject({
        filter: { imdbID: SEED_MOVIES[0].imdbID },
        update: { $set: expect.objectContaining({ source: 'seed' }) },
        upsert: true,
      });
      expect(moviesService.getMovieDetails).not.toHaveBeenCalled();
    });

    it('should not throw when the database is unavailable', async () => {
      catalogModel.bulkWrite.mockRejectedValue(new Error('offline'));

      await expect(service.seedCatalog()).resolves.toBeUndefined();
    });
  });

  describe('ensureMovie', () => {
    it('should do nothing when the movie is already in the catalog', async () => {
      catalogModel.exists.mockResolvedValue({ _id: 'x' });

      await service.ensureMovie('tt1375666');

      expect(moviesService.getMovieDetails).not.toHaveBeenCalled();
      expect(catalogModel.updateOne).not.toHaveBeenCalled();
    });

    it('should fetch the details and insert a new movie as "favorite"', async () => {
      catalogModel.exists.mockResolvedValue(null);

      await service.ensureMovie('tt1375666');

      expect(moviesService.getMovieDetails).toHaveBeenCalledWith('tt1375666');
      expect(catalogModel.updateOne).toHaveBeenCalledWith(
        { imdbID: 'tt1375666' },
        {
          $setOnInsert: expect.objectContaining({
            imdbID: 'tt1375666',
            genres: ['Action', 'Adventure', 'Sci-Fi'],
            rating: 8.8,
            source: 'favorite',
          }),
        },
        { upsert: true },
      );
    });

    it('should not throw when OMDb fails', async () => {
      catalogModel.exists.mockResolvedValue(null);
      moviesService.getMovieDetails.mockRejectedValue(new Error('timeout'));

      await expect(service.ensureMovie('tt1375666')).resolves.toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('should filter by genre and limit the results', async () => {
      const exec = jest.fn().mockResolvedValue([]);
      const limit = jest.fn().mockReturnValue({ exec });
      const sort = jest.fn().mockReturnValue({ limit });
      catalogModel.find.mockReturnValue({ sort });

      await service.findAll({ genre: 'Drama', limit: 5 });

      expect(catalogModel.find).toHaveBeenCalledWith({ genres: 'Drama' });
      expect(sort).toHaveBeenCalledWith({ title: 1 });
      expect(limit).toHaveBeenCalledWith(5);
    });
  });
});
