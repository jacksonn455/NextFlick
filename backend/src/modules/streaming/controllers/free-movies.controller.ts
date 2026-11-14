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
import { FreeMoviesService } from '../services/free-movies.service';

@ApiTags('Free Movies')
@Controller('free-movies')
export class FreeMoviesController {
  private readonly logger = new Logger(FreeMoviesController.name);

  constructor(private readonly freeMoviesService: FreeMoviesService) {}

  @Get()
  @ApiOperation({
    summary: 'List free-to-watch movies',
    description:
      'Public domain feature films from the Internet Archive that have a playable MP4. Cached for 6 hours.',
  })
  @ApiQuery({ name: 'q', required: false, example: 'night of the living dead' })
  @ApiQuery({ name: 'limit', required: false, example: 20, type: Number })
  @ApiResponse({ status: HttpStatus.OK, description: 'Free movies found' })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'The Internet Archive is unavailable',
  })
  async list(
    @Query('q') query?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    this.logger.log(`Free movies request${query ? ` for "${query}"` : ''}`);
    const movies = await this.freeMoviesService.search({ query, limit });

    return {
      success: true,
      data: movies,
      count: movies.length,
    };
  }

  @Get(':identifier')
  @ApiOperation({
    summary: 'Get a free movie',
    description:
      'Details, license, attribution and the MP4 URL of an Internet Archive film. Cached for 24 hours.',
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
    description: 'Movie not found or no playable video file',
  })
  async getOne(@Param('identifier') identifier: string) {
    const movie = await this.freeMoviesService.getMovie(identifier);
    return { success: true, data: movie };
  }
}
