// src/modules/favorites/dto/favorite-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class FavoriteResponseDto {
  @ApiProperty({
    description: 'Indicates if the request was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Favorite movie data',
    type: Object,
  })
  data: any;

  @ApiProperty({
    description: 'Human readable message',
    example: 'Movie added to favorites',
  })
  message: string;
}
