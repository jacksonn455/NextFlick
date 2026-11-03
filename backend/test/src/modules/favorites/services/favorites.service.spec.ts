import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { FavoritesService } from '../../../../../src/modules/favorites/services/favorites.service';
import { Favorite } from '../../../../../src/modules/favorites/entities/favorite.entity';

const mockUserId = 'user-123';
const mockMovieData = {
  imdbID: 'tt0372784',
  title: 'Batman Begins',
  year: '2005',
  poster: 'https://example.com/poster.jpg',
};

const mockFavorite = {
  _id: '64f1a2b3c5d6e7f8a9b0c1d2',
  userId: mockUserId,
  imdbID: mockMovieData.imdbID,
  title: mockMovieData.title,
  year: mockMovieData.year,
  poster: mockMovieData.poster,
  movieData: mockMovieData,
  createdAt: new Date(),
  save: jest.fn(),
};

describe('FavoritesService', () => {
  let service: FavoritesService;
  let favoriteModel: any;

  beforeEach(async () => {
    const mockFavoriteModel = jest.fn().mockImplementation(() => ({
      save: jest.fn().mockResolvedValue(mockFavorite),
    })) as any;

    mockFavoriteModel.findOne = jest.fn();
    mockFavoriteModel.deleteOne = jest.fn();
    mockFavoriteModel.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoritesService,
        {
          provide: getModelToken(Favorite.name),
          useValue: mockFavoriteModel,
        },
      ],
    }).compile();

    service = module.get<FavoritesService>(FavoritesService);
    favoriteModel = module.get(getModelToken(Favorite.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addFavorite', () => {
    it('should throw ConflictException when movie already exists in favorites', async () => {
      favoriteModel.findOne.mockResolvedValue(mockFavorite);

      await expect(
        service.addFavorite(mockUserId, mockMovieData),
      ).rejects.toThrow(ConflictException);

      expect(favoriteModel.findOne).toHaveBeenCalledWith({
        userId: mockUserId,
        imdbID: mockMovieData.imdbID,
      });
    });

    it('should let different users favorite the same movie', async () => {
      favoriteModel.findOne.mockResolvedValue(null);

      await service.addFavorite('user-a', mockMovieData);
      await service.addFavorite('user-b', mockMovieData);

      expect(favoriteModel.findOne).toHaveBeenNthCalledWith(1, {
        userId: 'user-a',
        imdbID: mockMovieData.imdbID,
      });
      expect(favoriteModel.findOne).toHaveBeenNthCalledWith(2, {
        userId: 'user-b',
        imdbID: mockMovieData.imdbID,
      });
      expect(favoriteModel).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-b',
          imdbID: mockMovieData.imdbID,
        }),
      );
    });
  });

  describe('onModuleInit', () => {
    it('should sync indexes to drop the old unique imdbID index', async () => {
      favoriteModel.syncIndexes = jest.fn().mockResolvedValue(['imdbID_1']);

      await service.onModuleInit();

      expect(favoriteModel.syncIndexes).toHaveBeenCalled();
    });

    it('should not throw when syncing indexes fails', async () => {
      favoriteModel.syncIndexes = jest
        .fn()
        .mockRejectedValue(new Error('offline'));

      await expect(service.onModuleInit()).resolves.toBeUndefined();
    });
  });

  describe('removeFavorite', () => {
    it('should successfully remove a favorite', async () => {
      favoriteModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

      await service.removeFavorite(mockUserId, mockMovieData.imdbID);

      expect(favoriteModel.deleteOne).toHaveBeenCalledWith({
        userId: mockUserId,
        imdbID: mockMovieData.imdbID,
      });
    });

    it('should throw NotFoundException when favorite does not exist', async () => {
      favoriteModel.deleteOne.mockResolvedValue({ deletedCount: 0 });

      await expect(
        service.removeFavorite(mockUserId, mockMovieData.imdbID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserFavorites', () => {
    it('should return user favorites sorted by creation date', async () => {
      const mockFavorites = [
        mockFavorite,
        { ...mockFavorite, _id: 'another-id' },
      ];
      const mockExec = jest.fn().mockResolvedValue(mockFavorites);
      const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
      favoriteModel.find.mockReturnValue({ sort: mockSort });

      const result = await service.getUserFavorites(mockUserId);

      expect(favoriteModel.find).toHaveBeenCalledWith({ userId: mockUserId });
      expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(mockFavorites);
    });

    it('should return empty array when user has no favorites', async () => {
      const mockExec = jest.fn().mockResolvedValue([]);
      const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
      favoriteModel.find.mockReturnValue({ sort: mockSort });

      const result = await service.getUserFavorites(mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe('getFavoriteById', () => {
    it('should return favorite when found', async () => {
      favoriteModel.findOne.mockResolvedValue(mockFavorite);

      const result = await service.getFavoriteById(
        mockUserId,
        mockMovieData.imdbID,
      );

      expect(favoriteModel.findOne).toHaveBeenCalledWith({
        userId: mockUserId,
        imdbID: mockMovieData.imdbID,
      });
      expect(result).toEqual(mockFavorite);
    });

    it('should throw NotFoundException when favorite not found', async () => {
      favoriteModel.findOne.mockResolvedValue(null);

      await expect(
        service.getFavoriteById(mockUserId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('isMovieFavorite', () => {
    it('should return true when movie is favorite', async () => {
      favoriteModel.findOne.mockResolvedValue(mockFavorite);

      const result = await service.isMovieFavorite(
        mockUserId,
        mockMovieData.imdbID,
      );

      expect(result).toBe(true);
      expect(favoriteModel.findOne).toHaveBeenCalledWith({
        userId: mockUserId,
        imdbID: mockMovieData.imdbID,
      });
    });

    it('should return false when movie is not favorite', async () => {
      favoriteModel.findOne.mockResolvedValue(null);

      const result = await service.isMovieFavorite(
        mockUserId,
        mockMovieData.imdbID,
      );

      expect(result).toBe(false);
    });
  });
});
