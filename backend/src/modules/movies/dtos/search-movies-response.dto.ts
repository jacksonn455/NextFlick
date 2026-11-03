import { ApiProperty } from '@nestjs/swagger';

export class MoviesSearchResponseDto {
  @ApiProperty({
    description: 'Indicates if the request was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Array of movie objects',
    type: [Object],
  })
  data: any[];

  @ApiProperty({
    description: 'Number of movies found',
    example: 10,
  })
  count: number;

  @ApiProperty({
    description: 'The original search query',
    example: 'batman',
  })
  query: string;

  @ApiProperty({
    description: 'Human readable message',
    example: 'Found 10 movies for "batman"',
  })
  message: string;
}
