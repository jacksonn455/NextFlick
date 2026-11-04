import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CatalogMovie,
  CatalogMovieDocument,
} from '../entities/catalog-movie.entity';
import { MoviesService } from './movies.service';
import { toCatalogMovie } from '../utils/catalog-movie.parser';
import { SEED_MOVIES } from '../data/seed-movies';

@Injectable()
export class MovieCatalogService implements OnModuleInit {
  private readonly logger = new Logger(MovieCatalogService.name);

  constructor(
    @InjectModel(CatalogMovie.name)
    private readonly catalogModel: Model<CatalogMovieDocument>,
    private readonly moviesService: MoviesService,
  ) {}

  // The seed file already holds the OMDb data, so startup makes no OMDb calls
  async onModuleInit(): Promise<void> {
    await this.seedCatalog();
  }

  async seedCatalog(): Promise<void> {
    if (!SEED_MOVIES.length) {
      this.logger.warn('No seed movies: run "npm run seed:movies:build"');
      return;
    }

    try {
      const result = await this.catalogModel.bulkWrite(
        SEED_MOVIES.map((details) => ({
          updateOne: {
            filter: { imdbID: details.imdbID },
            update: { $set: toCatalogMovie(details, 'seed') },
            upsert: true,
          },
        })),
      );
      this.logger.log(
        `Movie catalog seeded: ${result.upsertedCount} added, ${result.modifiedCount} updated`,
      );
    } catch (error) {
      this.logger.error(`Could not seed movie catalog: ${error.message}`);
    }
  }

  // Keeps every favorited movie in the catalog, so its features are known when
  // building the user's vector. Never throws: favoriting must not fail because of it.
  async ensureMovie(imdbID: string): Promise<void> {
    try {
      if (await this.catalogModel.exists({ imdbID })) {
        return;
      }

      const details = await this.moviesService.getMovieDetails(imdbID);
      await this.catalogModel.updateOne(
        { imdbID },
        { $setOnInsert: toCatalogMovie(details, 'favorite') },
        { upsert: true },
      );
      this.logger.log(`Movie ${imdbID} added to the catalog`);
    } catch (error) {
      this.logger.warn(
        `Could not add movie ${imdbID} to the catalog: ${error.message}`,
      );
    }
  }

  async findAll(
    filter: { genre?: string; limit?: number } = {},
  ): Promise<CatalogMovie[]> {
    const query = filter.genre ? { genres: filter.genre } : {};

    return this.catalogModel
      .find(query)
      .sort({ title: 1 })
      .limit(filter.limit ?? 0)
      .exec();
  }

  async findByImdbIds(imdbIDs: string[]): Promise<CatalogMovie[]> {
    return this.catalogModel.find({ imdbID: { $in: imdbIDs } }).exec();
  }

  async count(): Promise<number> {
    return this.catalogModel.countDocuments().exec();
  }
}
