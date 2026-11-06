// src/modules/recommendations/dtos/training-status-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class EpochLogDto {
  @ApiProperty({ example: 1 })
  epoch: number;

  @ApiProperty({ example: 0.52 })
  loss: number;

  @ApiProperty({ example: 0.75 })
  accuracy: number;
}

export class TrainingStatusDto {
  @ApiProperty({ enum: ['idle', 'training', 'ready', 'failed'] })
  state: string;

  @ApiProperty({
    description: '"tfjs-node" (native) or "tfjs" (pure JavaScript fallback)',
    enum: ['tfjs-node', 'tfjs'],
  })
  backend: string;

  @ApiProperty({ example: 42 })
  epoch: number;

  @ApiProperty({ example: 100 })
  totalEpochs: number;

  @ApiProperty({ description: '0-100', example: 42 })
  progress: number;

  @ApiProperty({ type: [EpochLogDto] })
  logs: EpochLogDto[];

  @ApiProperty({ example: 16 })
  users: number;

  @ApiProperty({ example: 235 })
  movies: number;

  @ApiProperty({ description: 'Favorites used as positive examples' })
  positives: number;

  @ApiProperty({ description: 'Non-favorites sampled as negative examples' })
  negatives: number;

  @ApiProperty({ nullable: true })
  startedAt: Date | null;

  @ApiProperty({ nullable: true })
  trainedAt: Date | null;

  @ApiProperty({ nullable: true })
  error: string | null;
}

export class TrainingStatusResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: TrainingStatusDto })
  data: TrainingStatusDto;
}
