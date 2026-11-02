import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { HttpService } from '@nestjs/axios';
import type { ConfigType } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Movie, OmdbApiResponse } from '../interfaces/movie.interface';
import { ErrorHandlerService } from '../../../common/error-handler/error-handler.service';
import { ValidationService } from '../../../common/validation/validation.service';
import moviesConfig from '../../../config/movies/movies.config';

@Injectable()
export class MoviesService {
  private readonly logger = new Logger(MoviesService.name);
  private readonly CACHE_TTL = 60 * 60 * 24 * 1000;

  constructor(
    private readonly httpService: HttpService,
    private readonly errorHandler: ErrorHandlerService,
    private readonly validationService: ValidationService,
    @Inject(moviesConfig.KEY)
    private readonly config: ConfigType<typeof moviesConfig>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async searchMovies(query: string): Promise<Movie[]> {
    this.validationService.validateSearchQuery(query);

    const cacheKey = `movies:search:${query.toLowerCase().trim()}`;

    try {
      const cachedResult = await this.cacheManager.get<Movie[]>(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }

      const response = await firstValueFrom(
        this.httpService.get<OmdbApiResponse>(this.config.apiUrl, {
          params: {
            apikey: this.config.apiKey,
            s: query.trim(),
          },
        }),
      );

      if (
        response.data.Response === 'False' &&
        response.data.Error &&
        response.data.Error.toLowerCase().includes('not found')
      ) {
        await this.cacheManager.set(cacheKey, [], 60 * 30 * 1000);
        return [];
      }

      if (response.data.Response === 'False' && response.data.Error) {
        this.errorHandler.handleApiError(response.data, 'MoviesAPI');
      }

      if (!response.data.Search) {
        await this.cacheManager.set(cacheKey, [], 60 * 30 * 1000);
        return [];
      }

      const movies = this.transformMovies(response.data.Search);

      await this.cacheManager.set(cacheKey, movies, this.CACHE_TTL);

      return movies;
    } catch (error) {
      this.logger.error(`Error searching movies: ${error.message}`);

      const cachedResult = await this.cacheManager.get<Movie[]>(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }

      if (error.response) {
        this.errorHandler.handleHttpError(error, 'MoviesAPI');
      }

      throw error;
    }
  }

  private transformMovies(movies: any[]): Movie[] {
    const uniqueMovies = movies.filter(
      (movie, index, self) =>
        index === self.findIndex((m) => m.imdbID === movie.imdbID),
    );

    return uniqueMovies.map((movie) => ({
      imdbID: movie.imdbID,
      Title: movie.Title,
      Year: movie.Year,
      Poster: movie.Poster !== 'N/A' ? movie.Poster : null,
    }));
  }
}
