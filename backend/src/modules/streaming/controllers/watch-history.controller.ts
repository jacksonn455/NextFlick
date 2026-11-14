import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseBoolPipe,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { WatchHistoryService } from '../services/watch-history.service';
import { SaveProgressDto } from '../dtos/save-progress.dto';
import {
  USER_ID_HEADER,
  UserId,
} from '../../../common/decorators/user-id.decorator';

@ApiTags('Watch History')
@ApiHeader({
  name: USER_ID_HEADER,
  required: true,
  description: 'Id of the user the history belongs to (see GET /users)',
  example: '6728f0c2a1b2c3d4e5f60718',
})
@ApiResponse({
  status: HttpStatus.BAD_REQUEST,
  description: 'Missing or malformed x-user-id header',
})
@Controller('watch-history')
export class WatchHistoryController {
  constructor(private readonly historyService: WatchHistoryService) {}

  @Get()
  @ApiOperation({
    summary: 'Get the watch history',
    description:
      'Most recent first. With inProgress=true only started, unfinished films (Continue Watching).',
  })
  @ApiQuery({ name: 'inProgress', required: false, type: Boolean })
  async getHistory(
    @UserId() userId: string,
    @Query('inProgress', new ParseBoolPipe({ optional: true }))
    inProgress?: boolean,
  ) {
    const history = await this.historyService.getHistory(userId, {
      inProgress,
    });
    return { success: true, data: history, count: history.length };
  }

  @Get(':identifier')
  @ApiOperation({ summary: 'Get the saved progress of a film' })
  @ApiParam({ name: 'identifier', example: 'night_of_the_living_dead_dvd' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Never watched' })
  async getEntry(
    @UserId() userId: string,
    @Param('identifier') identifier: string,
  ) {
    const entry = await this.historyService.getEntry(userId, identifier);
    return { success: true, data: entry };
  }

  @Put(':identifier')
  @ApiOperation({
    summary: 'Save playback progress',
    description: 'Creates or updates the history entry of a film',
  })
  @ApiParam({ name: 'identifier', example: 'night_of_the_living_dead_dvd' })
  @ApiBody({ type: SaveProgressDto })
  async saveProgress(
    @UserId() userId: string,
    @Param('identifier') identifier: string,
    @Body() progress: SaveProgressDto,
  ) {
    const entry = await this.historyService.saveProgress(
      userId,
      identifier,
      progress,
    );
    return { success: true, data: entry };
  }

  @Delete(':identifier')
  @ApiOperation({ summary: 'Remove a film from the watch history' })
  @ApiParam({ name: 'identifier', example: 'night_of_the_living_dead_dvd' })
  async removeEntry(
    @UserId() userId: string,
    @Param('identifier') identifier: string,
  ) {
    await this.historyService.removeEntry(userId, identifier);
    return { success: true, message: 'Removed from watch history' };
  }
}
