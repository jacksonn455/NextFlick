import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Max, Min } from 'class-validator';

// 24 hours: longer values can only be bad data
const MAX_SECONDS = 24 * 60 * 60;

export class SaveProgressDto {
  @ApiProperty({ description: 'Playback position in seconds', example: 754.2 })
  @IsNumber()
  @Min(0)
  @Max(MAX_SECONDS)
  position: number;

  @ApiProperty({
    description: 'Total length of the video in seconds',
    example: 3117.5,
  })
  @IsNumber()
  @Min(0)
  @Max(MAX_SECONDS)
  duration: number;
}
