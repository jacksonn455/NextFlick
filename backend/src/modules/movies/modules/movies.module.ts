import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { MoviesController } from '../controllers/movies.controller';
import { CatalogController } from '../controllers/catalog.controller';
import { MoviesService } from '../services/movies.service';
import { MovieCatalogService } from '../services/movie-catalog.service';
import {
  CatalogMovie,
  CatalogMovieSchema,
} from '../entities/catalog-movie.entity';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: CatalogMovie.name, schema: CatalogMovieSchema },
    ]),
  ],
  controllers: [MoviesController, CatalogController],
  providers: [MoviesService, MovieCatalogService],
  exports: [MoviesService, MovieCatalogService],
})
export class MoviesModule {}
