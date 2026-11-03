// src/modules/favorites/dto/add-favorite.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class AddFavoriteDto {
  @ApiProperty({
    description: 'IMDb ID of the movie',
    example: 'tt0372784',
  })
  imdbID: string;

  @ApiProperty({
    description: 'Title of the movie',
    example: 'Batman Begins',
  })
  title: string;

  @ApiProperty({
    description: 'Release year of the movie',
    example: '2005',
  })
  year: string;

  @ApiProperty({
    description: 'URL to the movie poster',
    example:
      'https://m.media-amazon.com/images/M/MV5BODIyMDdhNTgtNDlmOC00MjUxLWE2NDItODA5MTdkNzY3ZTdhXkEyXkFqcGc@._V1_SX300.jpg',
    required: false,
  })
  poster?: string;
}
