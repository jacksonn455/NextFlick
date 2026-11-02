import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { HttpService } from '@nestjs/axios';
import type { ConfigType } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  Movie,
  MovieDetails,
  OmdbApiResponse,
  OmdbDetailsApiResponse,
} from '../interfaces/movie.interface';
import { MovieNotFoundException } from '../exceptions/movies.exceptions';
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

  async getMovieDetails(imdbID: string): Promise<MovieDetails> {
    this.validationService.validateImdbId(imdbID);

    const cacheKey = `movies:details:${imdbID.trim()}`;

    const cachedResult = await this.cacheManager.get<MovieDetails>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    let response: { data: OmdbDetailsApiResponse };
    try {
      response = await firstValueFrom(
        this.httpService.get<OmdbDetailsApiResponse>(this.config.apiUrl, {
          params: {
            apikey: this.config.apiKey,
            i: imdbID.trim(),
            plot: 'full',
          },
        }),
      );
    } catch (error) {
      this.logger.error(`Error fetching movie details: ${error.message}`);
      if (error.response) {
        this.errorHandler.handleHttpError(error, 'MoviesAPI');
      }
      throw error;
    }

    if (response.data.Response === 'False') {
      const message = response.data.Error ?? '';
      if (message.toLowerCase().includes('incorrect imdb id') || message.toLowerCase().includes('not found')) {
        throw new MovieNotFoundException(`Movie ${imdbID} not found`);
      }
      this.errorHandler.handleApiError(response.data, 'MoviesAPI');
    }

    const details = this.transformMovieDetails(response.data);

    await this.cacheManager.set(cacheKey, details, this.CACHE_TTL);

    return details;
  }

  private transformMovieDetails(data: OmdbDetailsApiResponse): MovieDetails {
    const value = (field: string) =>
      data[field] && data[field] !== 'N/A' ? (data[field] as string) : null;

    return {
      imdbID: data.imdbID as string,
      Title: data.Title as string,
      Year: data.Year as string,
      Poster: value('Poster') as string,
      Type: data.Type as string,
      Rated: value('Rated'),
      Released: value('Released'),
      Runtime: value('Runtime'),
      Genre: value('Genre'),
      Director: value('Director'),
      Actors: value('Actors'),
      Plot: value('Plot'),
      Language: value('Language'),
      Country: value('Country'),
      imdbRating: value('imdbRating'),
    };
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
      Type: movie.Type,
      Poster: movie.Poster !== 'N/A' ? movie.Poster : null,
    }));
  }
}
