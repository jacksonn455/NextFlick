import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Favorite,
  FavoriteSchema,
} from '../../favorites/entities/favorite.entity';
import { UsersModule } from '../../users/modules/users.module';
import { MoviesModule } from '../../movies/modules/movies.module';

// TODO: add RecommendationsController / RecommendationsService once they exist,
// then register this module in app.module.ts
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Favorite.name, schema: FavoriteSchema },
    ]),
    UsersModule,
    MoviesModule,
  ],
  controllers: [],
  providers: [],
})
export class RecommendationsModule {}
