import { Module } from '@nestjs/common';
import { FavoritesController } from '../controllers/favorites.controller';
import { FavoritesService } from '../services/favorites.service';
import { FavoritesSeedService } from '../services/favorites-seed.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Favorite, FavoriteSchema } from '../entities/favorite.entity';
import { UsersModule } from '../../users/modules/users.module';
import { MoviesModule } from '../../movies/modules/movies.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Favorite.name, schema: FavoriteSchema },
    ]),
    UsersModule,
    MoviesModule,
  ],
  controllers: [FavoritesController],
  providers: [FavoritesService, FavoritesSeedService],
  exports: [FavoritesService, FavoritesSeedService],
})
export class FavoritesModule {}
