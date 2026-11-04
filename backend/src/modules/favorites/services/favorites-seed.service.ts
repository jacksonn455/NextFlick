import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Favorite, FavoriteDocument } from '../entities/favorite.entity';
import { UsersService } from '../../users/services/users.service';
import { MovieCatalogService } from '../../movies/services/movie-catalog.service';
import { DEMO_USERS } from '../../users/data/demo-users';

// Gives each demo user the favorites of their taste profile, so the
// recommendation model has users with distinct tastes to learn from
@Injectable()
export class FavoritesSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(FavoritesSeedService.name);

  constructor(
    @InjectModel(Favorite.name)
    private readonly favoriteModel: Model<FavoriteDocument>,
    private readonly usersService: UsersService,
    private readonly catalogService: MovieCatalogService,
  ) {}

  // Runs after every onModuleInit, so the demo users and the movie catalog exist.
  // Not awaited: the API starts listening while the seed runs.
  onApplicationBootstrap(): void {
    void this.seedDemoFavorites();
  }

  // Only users with no favorites are seeded: restarting never duplicates
  // favorites nor brings back the ones a user removed
  async seedDemoFavorites(): Promise<void> {
    try {
      let seededUsers = 0;
      let seededFavorites = 0;

      for (const demo of DEMO_USERS) {
        if (!demo.favorites?.length) continue;

        const user = await this.usersService.findOrCreate(
          demo.username,
          demo.name,
        );
        if (await this.favoriteModel.exists({ userId: user._id })) continue;

        const movies = await this.catalogService.findByImdbIds(demo.favorites);
        const missing = demo.favorites.length - movies.length;
        if (missing) {
          this.logger.warn(
            `${missing} favorites of ${demo.username} are not in the movie catalog`,
          );
        }

        await this.favoriteModel.insertMany(
          movies.map((movie) => ({
            userId: user._id,
            imdbID: movie.imdbID,
            title: movie.title,
            year: String(movie.year ?? ''),
            poster: movie.poster ?? undefined,
          })),
        );
        seededUsers++;
        seededFavorites += movies.length;
      }

      if (seededUsers) {
        this.logger.log(
          `Seeded ${seededFavorites} favorites for ${seededUsers} demo users`,
        );
      }
    } catch (error) {
      this.logger.error(`Could not seed demo favorites: ${error.message}`);
    }
  }
}
