// src/modules/recommendations/controllers/recommendations.controller.ts
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RecommendationsService } from '../services/recommendations.service';
import { RecommendationResponseDto } from '../dtos/recommendation-response.dto';
import { TrainingStatusResponseDto } from '../dtos/training-status-response.dto';
import {
  USER_ID_HEADER,
  UserId,
} from '../../../common/decorators/user-id.decorator';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

@ApiTags('Recommendations')
@Controller('recommendations')
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Recommend movies and series for a user',
    description:
      'Scores every catalog movie the user has not favorited with the trained model. Falls back to popular movies while the model is training or when the user has no favorites.',
  })
  @ApiHeader({
    name: USER_ID_HEADER,
    required: true,
    description: 'Id of the user (see GET /users)',
  })
  @ApiQuery({ name: 'limit', required: false, example: DEFAULT_LIMIT })
  @ApiResponse({ status: HttpStatus.OK, type: RecommendationResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  async getRecommendations(
    @UserId() userId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const safeLimit = Math.min(Math.max(limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const { source, data } = await this.recommendationsService.recommend(
      userId,
      safeLimit,
    );

    return {
      success: true,
      source,
      model: this.recommendationsService.getStatus().state,
      data,
      count: data.length,
    };
  }

  @Get('status')
  @ApiOperation({
    summary: 'Training status',
    description:
      'State, progress and loss/accuracy per epoch of the current or last training',
  })
  @ApiResponse({ status: HttpStatus.OK, type: TrainingStatusResponseDto })
  getStatus() {
    return {
      success: true,
      data: this.recommendationsService.getStatus(),
    };
  }

  @Post('train')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Retrain the model',
    description:
      'Starts a training in the background with the current favorites (or keeps the running one). The previous model keeps answering until it finishes. Follow it with GET /recommendations/status.',
  })
  @ApiResponse({ status: HttpStatus.ACCEPTED, type: TrainingStatusResponseDto })
  train() {
    return {
      success: true,
      data: this.recommendationsService.startTraining(),
    };
  }
}
