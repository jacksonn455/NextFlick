import {
  Controller,
  Get,
  HttpStatus,
  Logger,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FreeCatalogService } from '../services/free-catalog.service';
import {
  ContentType,
  MOVIE_SOURCES,
  MovieSource,
} from '../interfaces/free-movie.interface';

const CONTENT_TYPES: ContentType[] = ['feature', 'short', 'unknown'];

// "youtube,peertube" -> ['youtube', 'peertube']; unknown names are ignored
const parseSources = (value?: string): MovieSource[] | undefined => {
  const sources = (value ?? '')
    .split(',')
    .map((source) => source.trim().toLowerCase())
    .filter((source): source is MovieSource =>
      MOVIE_SOURCES.includes(source as MovieSource),
    );
  return sources.length ? sources : undefined;
};

@ApiTags('Free Movies')
@Controller('free-movies')
export class FreeMoviesController {
  private readonly logger = new Logger(FreeMoviesController.name);

  constructor(private readonly catalog: FreeCatalogService) {}

  @Get()
  @ApiOperation({
    summary: 'List free-to-watch movies',
    description:
      'Films from the Internet Archive, the Library of Congress, PeerTube and YouTube (Creative Commons), merged without duplicates. Each source is cached; a slow or failing source does not block the others.',
  })
  @ApiQuery({ name: 'q', required: false, example: 'night of the living dead' })
  @ApiQuery({ name: 'limit', required: false, example: 20, type: Number })
  @ApiQuery({ name: 'page', required: false, example: 1, type: Number })
  @ApiQuery({
    name: 'sources',
    required: false,
    description: `Comma-separated: ${MOVIE_SOURCES.join(', ')}`,
    example: 'archive,peertube',
  })
  @ApiQuery({ name: 'genre', required: false, example: 'Western' })
  @ApiQuery({ name: 'yearFrom', required: false, type: Number, example: 1920 })
  @ApiQuery({ name: 'yearTo', required: false, type: Number, example: 1959 })
  @ApiQuery({ name: 'contentType', required: false, enum: CONTENT_TYPES })
  @ApiQuery({
    name: 'free',
    required: false,
    enum: ['verified', 'all'],
    description:
      '"verified" (default): only films explicitly offered for free. "all": also publicly accessible films without a verified license.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Free movies found' })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Every free movie source is unavailable',
  })
  async list(
    @Query('q') query?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('sources') sources?: string,
    @Query('genre') genre?: string,
    @Query('yearFrom', new ParseIntPipe({ optional: true })) yearFrom?: number,
    @Query('yearTo', new ParseIntPipe({ optional: true })) yearTo?: number,
    @Query('contentType') contentType?: string,
    @Query('free') free?: string,
  ) {
    this.logger.log(`Free movies request${query ? ` for "${query}"` : ''}`);
    const { movies, unavailableSources } = await this.catalog.search({
      query,
      limit,
      page,
      sources: parseSources(sources),
      genre: genre?.trim().slice(0, 40) || undefined,
      yearFrom,
      yearTo,
      contentType: CONTENT_TYPES.includes(contentType as ContentType)
        ? (contentType as ContentType)
        : undefined,
      freeOnly: free !== 'all',
    });

    return {
      success: true,
      data: movies,
      count: movies.length,
      unavailableSources,
    };
  }

  // Declared before ":identifier" so it is not read as a film id
  @Get('sources')
  @ApiOperation({
    summary: 'List the free movie sources',
    description:
      'Which sources are configured and currently available, plus the genres used by the filters',
  })
  getSources() {
    return {
      success: true,
      data: {
        sources: this.catalog.getSources(),
        genres: this.catalog.getGenres(),
      },
    };
  }

  @Get(':identifier')
  @ApiOperation({
    summary: 'Get a free movie',
    description:
      'Details, license, attribution and playback (direct video file or official embedded player) of a free film. Internet Archive ids are bare; other sources use "youtube:<id>", "peertube:<host>:<uuid>" or "loc:<id>".',
  })
  @ApiParam({ name: 'identifier', example: 'night_of_the_living_dead_dvd' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Movie found' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid identifier',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'The license does not allow streaming',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Movie not found, deleted or not playable',
  })
  async getOne(@Param('identifier') identifier: string) {
    const movie = await this.catalog.getMovie(identifier);
    return { success: true, data: movie };
  }
}
