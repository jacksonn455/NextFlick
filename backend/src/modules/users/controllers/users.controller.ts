// src/modules/users/controllers/users.controller.ts
import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Logger,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from '../services/users.service';
import { CreateUserDto } from '../dtos/create-user.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({
    summary: 'List users',
    description: 'Retrieve all users, oldest first',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Users retrieved' })
  async getUsers() {
    const users = await this.usersService.findAll();

    return {
      success: true,
      data: users,
      count: users.length,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by id' })
  @ApiParam({
    name: 'id',
    description: 'MongoDB id of the user',
    example: '6728f0c2a1b2c3d4e5f60718',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'User found' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  async getUser(@Param('id') id: string) {
    const user = await this.usersService.findById(id);

    return {
      success: true,
      data: user,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create user' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'User created' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid user data',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Username already taken',
  })
  async createUser(@Body() dto: CreateUserDto) {
    this.logger.log(`Creating user: ${dto.username}`);

    const user = await this.usersService.create(dto);

    return {
      success: true,
      data: user,
      message: 'User created',
    };
  }
}
