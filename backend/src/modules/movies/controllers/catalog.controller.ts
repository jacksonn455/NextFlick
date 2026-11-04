// src/modules/movies/controllers/catalog.controller.ts
import {
  Controller,
  Get,
  HttpStatus,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MovieCatalogService } from '../services/movie-catalog.service';

@ApiTags('Catalog')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: MovieCatalogService) {}

  @Get()
  @ApiOperation({
    summary: 'List catalog movies',
    description:
      'Movies the recommendations can use: the seed list plus every favorited movie, with parsed features',
  })
  @ApiQuery({ name: 'genre', required: false, example: 'Drama' })
  @ApiQuery({ name: 'limit', required: false, example: 20, type: Number })
  @ApiResponse({ status: HttpStatus.OK, description: 'Catalog retrieved' })
  async getCatalog(
    @Query('genre') genre?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const [movies, total] = await Promise.all([
      this.catalogService.findAll({ genre, limit }),
      this.catalogService.count(),
    ]);

    return {
      success: true,
      data: movies,
      count: movies.length,
      total,
    };
  }
}
