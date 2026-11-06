import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Favorite,
  FavoriteSchema,
} from '../../favorites/entities/favorite.entity';
import { UsersModule } from '../../users/modules/users.module';
import { MoviesModule } from '../../movies/modules/movies.module';
import { FavoritesModule } from '../../favorites/modules/favorites.module';
import { RecommendationsController } from '../controllers/recommendations.controller';
import { RecommendationsService } from '../services/recommendations.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Favorite.name, schema: FavoriteSchema },
    ]),
    UsersModule,
    MoviesModule,
    FavoritesModule,
  ],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
})
export class RecommendationsModule {}
