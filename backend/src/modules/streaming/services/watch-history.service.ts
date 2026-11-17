import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  WatchHistory,
  WatchHistoryDocument,
} from '../entities/watch-history.entity';
import { UsersService } from '../../users/services/users.service';
import { FreeCatalogService } from './free-catalog.service';
import { SaveProgressDto } from '../dtos/save-progress.dto';
import {
  InvalidMovieIdentifierException,
  WatchHistoryNotFoundException,
} from '../exceptions/streaming.exceptions';
import { isValidMovieId } from '../utils/movie-id';

// From this share of the film on, it counts as watched (end credits are often skipped)
export const COMPLETED_RATIO = 0.95;
const HISTORY_LIMIT = 50;

@Injectable()
export class WatchHistoryService {
  private readonly logger = new Logger(WatchHistoryService.name);

  constructor(
    @InjectModel(WatchHistory.name)
    private readonly historyModel: Model<WatchHistoryDocument>,
    private readonly usersService: UsersService,
    private readonly catalog: FreeCatalogService,
  ) {}

  async saveProgress(
    userId: string,
    identifier: string,
    { position, duration }: SaveProgressDto,
  ): Promise<WatchHistory> {
    await this.usersService.findById(userId);
    // Also checks that the film exists and may be streamed (cached)
    const movie = await this.catalog.getMovie(identifier);

    const safePosition = duration > 0 ? Math.min(position, duration) : position;
    const completed =
      duration > 0 && safePosition / duration >= COMPLETED_RATIO;

    const entry = await this.historyModel
      .findOneAndUpdate(
        { userId, identifier },
        {
          $set: {
            title: movie.title,
            thumbnail: movie.thumbnail,
            position: safePosition,
            duration,
            completed,
            lastWatchedAt: new Date(),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();

    this.logger.log(
      `Progress for ${identifier} (user ${userId}): ${Math.round(safePosition)}s`,
    );
    return entry;
  }

  // Most recent first; "inProgress" keeps only started, unfinished films
  async getHistory(
    userId: string,
    options: { inProgress?: boolean } = {},
  ): Promise<WatchHistory[]> {
    await this.usersService.findById(userId);

    const filter = options.inProgress
      ? { userId, completed: false, position: { $gt: 0 } }
      : { userId };

    return this.historyModel
      .find(filter)
      .sort({ lastWatchedAt: -1 })
      .limit(HISTORY_LIMIT)
      .exec();
  }

  async getEntry(userId: string, identifier: string): Promise<WatchHistory> {
    this.assertIdentifier(identifier);
    await this.usersService.findById(userId);

    const entry = await this.historyModel
      .findOne({ userId, identifier })
      .exec();
    if (!entry) {
      throw new WatchHistoryNotFoundException();
    }
    return entry;
  }

  async removeEntry(userId: string, identifier: string): Promise<void> {
    this.assertIdentifier(identifier);
    await this.usersService.findById(userId);

    const { deletedCount } = await this.historyModel
      .deleteOne({ userId, identifier })
      .exec();
    if (deletedCount === 0) {
      throw new WatchHistoryNotFoundException();
    }
  }

  private assertIdentifier(identifier: string) {
    if (!isValidMovieId(identifier)) {
      throw new InvalidMovieIdentifierException();
    }
  }
}
