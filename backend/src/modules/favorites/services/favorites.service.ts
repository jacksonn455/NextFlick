import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Favorite, FavoriteDocument } from '../entities/favorite.entity';
import { UsersService } from '../../users/services/users.service';
import { MovieCatalogService } from '../../movies/services/movie-catalog.service';
import { DEMO_USERS, LEGACY_USER_IDS } from '../../users/data/demo-users';

@Injectable()
export class FavoritesService implements OnModuleInit {
  private readonly logger = new Logger(FavoritesService.name);

  constructor(
    @InjectModel(Favorite.name)
    private readonly favoriteModel: Model<FavoriteDocument>,
    private readonly usersService: UsersService,
    private readonly catalogService: MovieCatalogService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.migrateLegacyUserIds();

    // Mongo never drops indexes on its own; this removes the old unique "imdbID_1"
    // index, which blocked two users from favoriting the same movie
    try {
      const dropped = await this.favoriteModel.syncIndexes();
      if (dropped.length) {
        this.logger.log(
          `Dropped stale favorites indexes: ${dropped.join(', ')}`,
        );
      }
    } catch (error) {
      this.logger.error(`Could not sync favorites indexes: ${error.message}`);
    }
  }

  // Favorites saved before the users collection have a free-text userId
  // ("user-123"); point each of them to a real user document
  private async migrateLegacyUserIds(): Promise<void> {
    try {
      // Raw collection calls: Mongoose would try to cast these strings to ObjectId
      const legacyIds: string[] = await this.favoriteModel.collection.distinct(
        'userId',
        { userId: { $type: 'string' } },
      );

      for (const legacyId of legacyIds) {
        const username = LEGACY_USER_IDS[legacyId] ?? legacyId.toLowerCase();
        const name =
          DEMO_USERS.find((demo) => demo.username === username)?.name ??
          username;
        const user = await this.usersService.findOrCreate(username, name);

        const { modifiedCount } =
          await this.favoriteModel.collection.updateMany(
            { userId: legacyId },
            { $set: { userId: user._id } },
          );
        this.logger.log(
          `Moved ${modifiedCount} favorites from "${legacyId}" to user ${user.username}`,
        );
      }
    } catch (error) {
      this.logger.error(`Could not migrate legacy favorites: ${error.message}`);
    }
  }

  async addFavorite(
    userId: string,
    movieData: {
      imdbID: string;
      title: string;
      year: string;
      poster?: string;
    },
  ): Promise<Favorite> {
    await this.usersService.findById(userId);

    try {
      const existingFavorite = await this.favoriteModel.findOne({
        userId,
        imdbID: movieData.imdbID,
      });

      if (existingFavorite) {
        throw new ConflictException('Movie already in favorites');
      }

      const favorite = new this.favoriteModel({
        userId,
        imdbID: movieData.imdbID,
        title: movieData.title,
        year: movieData.year,
        poster: movieData.poster,
        movieData,
      });

      const savedFavorite = await favorite.save();
      // Not awaited: fetching OMDb details must not slow down favoriting
      void this.catalogService.ensureMovie(movieData.imdbID);
      this.logger.log(
        `Movie ${movieData.imdbID} added to favorites for user ${userId}`,
      );

      return savedFavorite;
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Movie already in favorites');
      }
      throw error;
    }
  }

  async removeFavorite(userId: string, imdbID: string): Promise<void> {
    await this.usersService.findById(userId);

    const result = await this.favoriteModel.deleteOne({ userId, imdbID });

    if (result.deletedCount === 0) {
      throw new NotFoundException('Favorite not found');
    }

    this.logger.log(
      `Movie ${imdbID} removed from favorites for user ${userId}`,
    );
  }

  async getUserFavorites(userId: string): Promise<Favorite[]> {
    await this.usersService.findById(userId);

    const favorites = await this.favoriteModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .exec();

    this.logger.log(`Found ${favorites.length} favorites for user ${userId}`);
    return favorites;
  }

  async getFavoriteById(userId: string, imdbID: string): Promise<Favorite> {
    await this.usersService.findById(userId);

    const favorite = await this.favoriteModel.findOne({
      userId,
      imdbID,
    });

    if (!favorite) {
      throw new NotFoundException(`Favorite with ID ${imdbID} not found`);
    }

    this.logger.log(`Found favorite: ${imdbID} for user ${userId}`);
    return favorite;
  }

  async isMovieFavorite(userId: string, imdbID: string): Promise<boolean> {
    const favorite = await this.favoriteModel.findOne({ userId, imdbID });
    return !!favorite;
  }
}
