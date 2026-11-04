import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { FavoritesSeedService } from '../../../../../src/modules/favorites/services/favorites-seed.service';
import { Favorite } from '../../../../../src/modules/favorites/entities/favorite.entity';
import { UsersService } from '../../../../../src/modules/users/services/users.service';
import { MovieCatalogService } from '../../../../../src/modules/movies/services/movie-catalog.service';
import { DEMO_USERS } from '../../../../../src/modules/users/data/demo-users';

const profiles = DEMO_USERS.filter((demo) => demo.favorites?.length);

const catalogMovie = (imdbID: string) => ({
  imdbID,
  title: `Movie ${imdbID}`,
  year: 2010,
  poster: null,
});

describe('FavoritesSeedService', () => {
  let service: FavoritesSeedService;
  let favoriteModel: { exists: jest.Mock; insertMany: jest.Mock };
  let usersService: { findOrCreate: jest.Mock };
  let catalogService: { findByImdbIds: jest.Mock };

  beforeEach(async () => {
    favoriteModel = {
      exists: jest.fn().mockResolvedValue(null),
      insertMany: jest.fn().mockResolvedValue([]),
    };
    usersService = {
      findOrCreate: jest.fn((username: string) =>
        Promise.resolve({ _id: `id-${username}`, username }),
      ),
    };
    catalogService = {
      findByImdbIds: jest.fn((ids: string[]) =>
        Promise.resolve(ids.map(catalogMovie)),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoritesSeedService,
        { provide: getModelToken(Favorite.name), useValue: favoriteModel },
        { provide: UsersService, useValue: usersService },
        { provide: MovieCatalogService, useValue: catalogService },
      ],
    }).compile();

    service = module.get(FavoritesSeedService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should save the profile favorites of every demo user without favorites', async () => {
    await service.seedDemoFavorites();

    expect(favoriteModel.insertMany).toHaveBeenCalledTimes(profiles.length);

    const [firstProfile] = profiles;
    const [firstInsert] = favoriteModel.insertMany.mock.calls[0];
    expect(firstInsert).toHaveLength(firstProfile.favorites!.length);
    expect(firstInsert[0]).toEqual({
      userId: `id-${firstProfile.username}`,
      imdbID: firstProfile.favorites![0],
      title: `Movie ${firstProfile.favorites![0]}`,
      year: '2010',
      poster: undefined,
    });
  });

  it('should skip users without a taste profile', async () => {
    await service.seedDemoFavorites();

    expect(usersService.findOrCreate).not.toHaveBeenCalledWith(
      'guest',
      expect.anything(),
    );
  });

  it('should skip users that already have favorites', async () => {
    favoriteModel.exists.mockResolvedValue({ _id: 'existing' });

    await service.seedDemoFavorites();

    expect(favoriteModel.insertMany).not.toHaveBeenCalled();
  });

  it('should not throw when the database is unavailable', async () => {
    favoriteModel.exists.mockRejectedValue(new Error('offline'));

    await expect(service.seedDemoFavorites()).resolves.toBeUndefined();
  });
});
