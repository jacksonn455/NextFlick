import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { User, UserDocument } from '../entities/user.entity';
import { CreateUserDto } from '../dtos/create-user.dto';
import { DEMO_USERS } from '../data/demo-users';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      for (const { username, name } of DEMO_USERS) {
        await this.findOrCreate(username, name);
      }
    } catch (error) {
      this.logger.error(`Could not create demo users: ${error.message}`);
    }
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().sort({ createdAt: 1, _id: 1 }).exec();
  }

  async findById(id: string): Promise<User> {
    const user = isValidObjectId(id)
      ? await this.userModel.findById(id).exec()
      : null;

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return user;
  }

  async create(dto: CreateUserDto): Promise<User> {
    try {
      const user = await new this.userModel(dto).save();
      this.logger.log(`User ${user.username} created`);
      return user;
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException(`Username ${dto.username} already taken`);
      }
      throw error;
    }
  }

  // Idempotent: safe to call on every startup
  async findOrCreate(username: string, name: string): Promise<UserDocument> {
    return this.userModel
      .findOneAndUpdate(
        { username },
        { $setOnInsert: { username, name } },
        { upsert: true, new: true },
      )
      .exec();
  }
}
