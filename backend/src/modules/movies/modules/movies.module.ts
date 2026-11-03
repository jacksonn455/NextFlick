import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MoviesController } from '../controllers/movies.controller';
import { MoviesService } from '../services/movies.service';

@Module({
  imports: [HttpModule],
  controllers: [MoviesController],
  providers: [MoviesService],
  exports: [MoviesService],
})
export class MoviesModule {}
