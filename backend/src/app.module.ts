import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MoviesModule } from './modules/movies/modules/movies.module';
import { FavoritesModule } from './modules/favorites/modules/favorites.module';
import moviesConfig from './config/movies/movies.config';
import { CommonModule } from './common/common.module';
import { RedisModule } from './config/redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      ignoreEnvFile: process.env.NODE_ENV === 'production',
      load: [moviesConfig],
    }),
        MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI') || 'mongodb://localhost:27017/NextFlick',
      }),
    }),
    RedisModule,
    CommonModule,
    MoviesModule,
    FavoritesModule,
  ],
})
export class AppModule {}
