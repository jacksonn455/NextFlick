import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { Sequential } from '@tensorflow/tfjs';
import {
  Favorite,
  FavoriteDocument,
} from '../../favorites/entities/favorite.entity';
import { FavoritesSeedService } from '../../favorites/services/favorites-seed.service';
import { CatalogMovie } from '../../movies/entities/catalog-movie.entity';
import { MovieCatalogService } from '../../movies/services/movie-catalog.service';
import { UsersService } from '../../users/services/users.service';
import {
  EncodingContext,
  FavoritesByUser,
} from '../interfaces/encoding-context.interface';
import {
  RecommendationSource,
  RecommendedMovie,
  TrainingStatus,
} from '../interfaces/training-status.interface';
import { encodeMovie, encodeUser, makeContext } from '../ml/feature-encoder';
import { createTrainingData } from '../ml/training-data';
import {
  buildModel,
  disposeModel,
  predictScores,
  trainModel,
  TRAINING_OPTIONS,
} from '../ml/model';
import { tfBackend } from '../ml/tf';

export interface Recommendations {
  source: RecommendationSource;
  data: RecommendedMovie[];
}

// Everything recommend() needs, swapped in one go when a training finishes,
// so a retrain never leaves a half-updated model answering requests
interface TrainedModel {
  model: Sequential;
  ctx: EncodingContext;
  movies: CatalogMovie[];
  moviesById: Map<string, CatalogMovie>;
  movieVectors: Map<string, number[]>;
}

@Injectable()
export class RecommendationsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RecommendationsService.name);

  private trained: TrainedModel | null = null;
  private training: Promise<void> | null = null;
  private status: TrainingStatus = {
    state: 'idle',
    backend: tfBackend,
    epoch: 0,
    totalEpochs: TRAINING_OPTIONS.epochs,
    progress: 0,
    logs: [],
    users: 0,
    movies: 0,
    positives: 0,
    negatives: 0,
    startedAt: null,
    trainedAt: null,
    error: null,
  };

  constructor(
    @InjectModel(Favorite.name)
    private readonly favoriteModel: Model<FavoriteDocument>,
    private readonly catalogService: MovieCatalogService,
    private readonly usersService: UsersService,
    private readonly favoritesSeedService: FavoritesSeedService,
  ) {}

  // Trains once the demo favorites exist. Not awaited: the API starts
  // listening right away and answers with popular movies meanwhile.
  onApplicationBootstrap(): void {
    this.logger.log(`TensorFlow backend: ${tfBackend}`);
    void this.favoritesSeedService
      .whenSeeded()
      .then(() => this.startTraining());
  }

  getStatus(): TrainingStatus {
    return { ...this.status, logs: [...this.status.logs] };
  }

  // Starts a training in the background (or keeps the one running) and
  // returns the status right away
  startTraining(): TrainingStatus {
    this.training ??= this.train().finally(() => {
      this.training = null;
    });
    return this.getStatus();
  }

  private async train(): Promise<void> {
    this.status = {
      ...this.status,
      state: 'training',
      epoch: 0,
      progress: 0,
      logs: [],
      startedAt: new Date(),
      error: null,
    };

    try {
      const movies = await this.catalogService.findAll();
      const moviesById = new Map(movies.map((movie) => [movie.imdbID, movie]));
      const favoritesByUser = await this.loadFavoritesByUser(moviesById);

      const ctx = makeContext(movies, favoritesByUser);
      const data = createTrainingData(movies, favoritesByUser, ctx);
      if (!data.positives) {
        throw new Error('No favorites to learn from yet');
      }

      this.status = {
        ...this.status,
        users: data.users,
        movies: movies.length,
        positives: data.positives,
        negatives: data.negatives,
      };
      this.logger.log(
        `Training on ${data.inputs.length} pairs (${data.positives} favorites, ${data.users} users, ${movies.length} movies)`,
      );

      const model = buildModel(data.inputDimension);
      await trainModel(model, data, (log) => {
        this.status = {
          ...this.status,
          epoch: log.epoch,
          progress: Math.round((log.epoch / TRAINING_OPTIONS.epochs) * 100),
          logs: [...this.status.logs, log],
        };
      });

      const previous = this.trained;
      this.trained = {
        model,
        ctx,
        movies,
        moviesById,
        movieVectors: new Map(
          movies.map((movie) => [movie.imdbID, encodeMovie(movie, ctx)]),
        ),
      };
      if (previous) disposeModel(previous.model);

      const last = this.status.logs.at(-1);
      this.status = { ...this.status, state: 'ready', trainedAt: new Date() };
      this.logger.log(
        `Model trained: loss ${last?.loss.toFixed(4)}, accuracy ${last?.accuracy.toFixed(4)}`,
      );
    } catch (error) {
      this.status = { ...this.status, state: 'failed', error: error.message };
      this.logger.error(`Training failed: ${error.message}`);
    }
  }

  // { userId: [CatalogMovie, ...] } from the favorites collection; favorites
  // whose movie isn't in the catalog are skipped (no features to encode)
  private async loadFavoritesByUser(
    moviesById: Map<string, CatalogMovie>,
  ): Promise<FavoritesByUser> {
    const favorites = await this.favoriteModel
      .find({}, { userId: 1, imdbID: 1 })
      .lean()
      .exec();

    const favoritesByUser: FavoritesByUser = {};
    favorites.forEach(({ userId, imdbID }) => {
      const movie = moviesById.get(imdbID);
      if (!movie) return;
      (favoritesByUser[String(userId)] ??= []).push(movie);
    });
    return favoritesByUser;
  }

  async recommend(userId: string, limit = 20): Promise<Recommendations> {
    await this.usersService.findById(userId);

    const favoriteIds = new Set(
      (
        await this.favoriteModel.find({ userId }, { imdbID: 1 }).lean().exec()
      ).map((favorite) => favorite.imdbID),
    );

    const trained = this.trained;
    if (!trained) {
      return this.popular(favoriteIds, limit);
    }

    const favoriteMovies = await this.findMovies(favoriteIds, trained);
    if (!favoriteMovies.length) {
      return this.popular(favoriteIds, limit);
    }

    // Same as recommend() in the exemplo-01: score every [user, movie] pair
    // and sort. The user vector is built from the current favorites, so new
    // favorites change the results without retraining.
    const userVector = encodeUser(favoriteMovies, trained.ctx);
    const candidates = trained.movies.filter(
      (movie) => !favoriteIds.has(movie.imdbID),
    );
    const scores = predictScores(
      trained.model,
      candidates.map((movie) => [
        ...userVector,
        ...trained.movieVectors.get(movie.imdbID)!,
      ]),
    );

    return {
      source: 'model',
      data: candidates
        .map((movie, i) => this.toRecommended(movie, scores[i]))
        .sort((a, b) => b.score! - a.score!)
        .slice(0, limit),
    };
  }

  // Favorites added after the last training aren't in the trained catalog:
  // fetch them so they still count (unknown genres simply encode as zeros)
  private async findMovies(
    imdbIDs: Set<string>,
    trained: TrainedModel,
  ): Promise<CatalogMovie[]> {
    const known = [...imdbIDs]
      .map((imdbID) => trained.moviesById.get(imdbID))
      .filter((movie): movie is CatalogMovie => !!movie);
    const missing = [...imdbIDs].filter((id) => !trained.moviesById.has(id));

    return missing.length
      ? [...known, ...(await this.catalogService.findByImdbIds(missing))]
      : known;
  }

  // Most favorited first, then best rated: what a new user (or anyone while
  // the model trains) sees
  private async popular(
    favoriteIds: Set<string>,
    limit: number,
  ): Promise<Recommendations> {
    const movies =
      this.trained?.movies ?? (await this.catalogService.findAll());
    const popularity = this.trained?.ctx.popularity ?? {};

    return {
      source: 'popular',
      data: movies
        .filter((movie) => !favoriteIds.has(movie.imdbID))
        .sort(
          (a, b) =>
            (popularity[b.imdbID] ?? 0) - (popularity[a.imdbID] ?? 0) ||
            (b.rating ?? 0) - (a.rating ?? 0),
        )
        .slice(0, limit)
        .map((movie) => this.toRecommended(movie, null)),
    };
  }

  private toRecommended(
    movie: CatalogMovie,
    score: number | null,
  ): RecommendedMovie {
    return {
      imdbID: movie.imdbID,
      title: movie.title,
      year: movie.year,
      type: movie.type,
      poster: movie.poster,
      genres: [...movie.genres],
      rating: movie.rating,
      score,
    };
  }
}
