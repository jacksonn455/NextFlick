import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import archiveConfig from '../../../config/archive/archive.config';
import freeSourcesConfig from '../../../config/free-sources/free-sources.config';
import { UsersModule } from '../../users/modules/users.module';
import { FreeMoviesController } from '../controllers/free-movies.controller';
import { WatchHistoryController } from '../controllers/watch-history.controller';
import { FreeMoviesService } from '../services/free-movies.service';
import { WatchHistoryService } from '../services/watch-history.service';
import {
  FREE_MOVIE_PROVIDERS,
  FreeCatalogService,
} from '../services/free-catalog.service';
import { YoutubeProvider } from '../providers/youtube.provider';
import { PeerTubeProvider } from '../providers/peertube.provider';
import { LocProvider } from '../providers/loc.provider';
import { FreeMovieProvider } from '../interfaces/free-movie.interface';
import {
  ArchiveMovie,
  ArchiveMovieSchema,
} from '../entities/archive-movie.entity';
import {
  WatchHistory,
  WatchHistorySchema,
} from '../entities/watch-history.entity';

// Free movies (Internet Archive, Library of Congress, PeerTube, YouTube), the
// player's watch history and Continue Watching
@Module({
  imports: [
    HttpModule,
    ConfigModule.forFeature(archiveConfig),
    ConfigModule.forFeature(freeSourcesConfig),
    MongooseModule.forFeature([
      { name: ArchiveMovie.name, schema: ArchiveMovieSchema },
      { name: WatchHistory.name, schema: WatchHistorySchema },
    ]),
    UsersModule,
  ],
  controllers: [FreeMoviesController, WatchHistoryController],
  providers: [
    // Internet Archive source (kept under its original name)
    FreeMoviesService,
    YoutubeProvider,
    PeerTubeProvider,
    LocProvider,
    {
      provide: FREE_MOVIE_PROVIDERS,
      inject: [
        FreeMoviesService,
        YoutubeProvider,
        PeerTubeProvider,
        LocProvider,
      ],
      useFactory: (...providers: FreeMovieProvider[]) => providers,
    },
    FreeCatalogService,
    WatchHistoryService,
  ],
  exports: [FreeMoviesService, FreeCatalogService, WatchHistoryService],
})
export class StreamingModule {}
