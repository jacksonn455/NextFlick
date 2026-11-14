import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import archiveConfig from '../../../config/archive/archive.config';
import { UsersModule } from '../../users/modules/users.module';
import { FreeMoviesController } from '../controllers/free-movies.controller';
import { WatchHistoryController } from '../controllers/watch-history.controller';
import { FreeMoviesService } from '../services/free-movies.service';
import { WatchHistoryService } from '../services/watch-history.service';
import {
  ArchiveMovie,
  ArchiveMovieSchema,
} from '../entities/archive-movie.entity';
import {
  WatchHistory,
  WatchHistorySchema,
} from '../entities/watch-history.entity';

// Free movies from the Internet Archive, the player's watch history and Continue Watching
@Module({
  imports: [
    HttpModule,
    ConfigModule.forFeature(archiveConfig),
    MongooseModule.forFeature([
      { name: ArchiveMovie.name, schema: ArchiveMovieSchema },
      { name: WatchHistory.name, schema: WatchHistorySchema },
    ]),
    UsersModule,
  ],
  controllers: [FreeMoviesController, WatchHistoryController],
  providers: [FreeMoviesService, WatchHistoryService],
  exports: [FreeMoviesService, WatchHistoryService],
})
export class StreamingModule {}
