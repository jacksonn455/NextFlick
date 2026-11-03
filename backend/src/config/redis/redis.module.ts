import { Module, Global, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';
import { createCache, type Cache } from 'cache-manager';

const DEFAULT_TTL_MS = 60 * 60 * 24 * 1000;

/**
 * Exposes the Upstash REST client through the cache-manager `Cache` contract
 * (TTL in milliseconds), so consumers keep injecting CACHE_MANAGER.
 * Cache failures are logged and treated as a miss so they never break a request.
 */
function createUpstashCache(redis: Redis, logger: Logger): Cache {
  return {
    get: async <T>(key: string): Promise<T | undefined> => {
      try {
        return (await redis.get<T>(key)) ?? undefined;
      } catch (error) {
        logger.warn(`Cache get failed for "${key}": ${error.message}`);
        return undefined;
      }
    },
    set: async <T>(key: string, value: T, ttl = DEFAULT_TTL_MS): Promise<T> => {
      try {
        await redis.set(key, value, { px: ttl });
      } catch (error) {
        logger.warn(`Cache set failed for "${key}": ${error.message}`);
      }
      return value;
    },
    del: async (key: string): Promise<boolean> => {
      try {
        return (await redis.del(key)) > 0;
      } catch (error) {
        logger.warn(`Cache del failed for "${key}": ${error.message}`);
        return false;
      }
    },
  } as Cache;
}

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: CACHE_MANAGER,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Cache => {
        const logger = new Logger('RedisModule');
        const url = configService.get<string>('UPSTASH_REDIS_REST_URL');
        const token = configService.get<string>('UPSTASH_REDIS_REST_TOKEN');

        if (!url || !token) {
          logger.warn(
            'Upstash credentials not set, falling back to in-memory cache',
          );
          return createCache({ ttl: DEFAULT_TTL_MS });
        }

        return createUpstashCache(new Redis({ url, token }), logger);
      },
    },
  ],
  exports: [CACHE_MANAGER],
})
export class RedisModule {}
