// src/modules/users/dtos/create-user.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'Unique handle: lowercase letters, numbers and "-"',
    example: 'ana-lima',
  })
  @IsString()
  @Matches(/^[a-z0-9-]{3,30}$/, {
    message: 'username must be 3-30 lowercase letters, numbers or "-"',
  })
  username: string;

  @ApiProperty({
    description: 'Display name',
    example: 'Ana Lima',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name: string;
}
