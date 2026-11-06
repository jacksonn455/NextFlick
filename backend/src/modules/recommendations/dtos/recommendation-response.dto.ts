// src/modules/recommendations/dtos/recommendation-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class RecommendedMovieDto {
  @ApiProperty({ example: 'tt0114369' })
  imdbID: string;

  @ApiProperty({ example: 'Seven' })
  title: string;

  @ApiProperty({ example: 1995, nullable: true })
  year: number | null;

  @ApiProperty({ example: 'movie', nullable: true })
  type: string | null;

  @ApiProperty({ example: 'https://m.media-amazon.com/...', nullable: true })
  poster: string | null;

  @ApiProperty({ example: ['Crime', 'Drama', 'Mystery'] })
  genres: string[];

  @ApiProperty({ example: 8.6, nullable: true })
  rating: number | null;

  @ApiProperty({
    description:
      'Predicted probability (0-1) that the user favorites it; null for popular fallbacks',
    example: 0.93,
    nullable: true,
  })
  score: number | null;
}

export class RecommendationResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({
    description:
      '"model": personalized by the neural network. "popular": the model is not ready yet or the user has no favorites',
    enum: ['model', 'popular'],
  })
  source: 'model' | 'popular';

  @ApiProperty({
    description: 'State of the model training',
    enum: ['idle', 'training', 'ready', 'failed'],
  })
  model: string;

  @ApiProperty({ type: [RecommendedMovieDto] })
  data: RecommendedMovieDto[];

  @ApiProperty({ example: 20 })
  count: number;
}
