// src/modules/favorites/dto/favorites-list-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class FavoritesListResponseDto {
  @ApiProperty({
    description: 'Indicates if the request was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Array of favorite movies',
    type: [Object],
  })
  data: any[];

  @ApiProperty({
    description: 'Number of favorite movies',
    example: 5,
  })
  count: number;

  @ApiProperty({
    description: 'Human readable message',
    example: 'Found 5 favorites',
  })
  message: string;
}
