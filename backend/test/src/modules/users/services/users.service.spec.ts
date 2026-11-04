import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from '../../../../../src/modules/users/services/users.service';
import { User } from '../../../../../src/modules/users/entities/user.entity';
import { DEMO_USERS } from '../../../../../src/modules/users/data/demo-users';

const mockUser = {
  _id: '6728f0c2a1b2c3d4e5f60718',
  username: 'ana-lima',
  name: 'Ana Lima',
};

const execResult = (value: unknown) => ({
  exec: jest.fn().mockResolvedValue(value),
});

describe('UsersService', () => {
  let service: UsersService;
  let userModel: any;
  let save: jest.Mock;

  beforeEach(async () => {
    save = jest.fn().mockResolvedValue(mockUser);
    const mockUserModel = jest.fn().mockImplementation(() => ({ save })) as any;
    mockUserModel.find = jest.fn();
    mockUserModel.findById = jest.fn();
    mockUserModel.findOneAndUpdate = jest
      .fn()
      .mockReturnValue(execResult(mockUser));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: mockUserModel },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userModel = module.get(getModelToken(User.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should create every demo user without duplicating them', async () => {
      await service.onModuleInit();

      expect(userModel.findOneAndUpdate).toHaveBeenCalledTimes(
        DEMO_USERS.length,
      );
      expect(userModel.findOneAndUpdate).toHaveBeenCalledWith(
        { username: 'guest' },
        { $setOnInsert: { username: 'guest', name: 'Guest' } },
        { upsert: true, new: true },
      );
    });

    it('should not throw when the database is unavailable', async () => {
      userModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('offline')),
      });

      await expect(service.onModuleInit()).resolves.toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('should return users oldest first', async () => {
      const sort = jest.fn().mockReturnValue(execResult([mockUser]));
      userModel.find.mockReturnValue({ sort });

      const result = await service.findAll();

      expect(sort).toHaveBeenCalledWith({ createdAt: 1, _id: 1 });
      expect(result).toEqual([mockUser]);
    });
  });

  describe('findById', () => {
    it('should return the user when found', async () => {
      userModel.findById.mockReturnValue(execResult(mockUser));

      await expect(service.findById(mockUser._id)).resolves.toEqual(mockUser);
    });

    it('should throw NotFoundException when the user does not exist', async () => {
      userModel.findById.mockReturnValue(execResult(null));

      await expect(service.findById(mockUser._id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException without querying for an invalid id', async () => {
      await expect(service.findById('not-an-id')).rejects.toThrow(
        NotFoundException,
      );
      expect(userModel.findById).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should save the new user', async () => {
      const dto = { username: 'ana-lima', name: 'Ana Lima' };

      await expect(service.create(dto)).resolves.toEqual(mockUser);
      expect(userModel).toHaveBeenCalledWith(dto);
    });

    it('should throw ConflictException when the username is taken', async () => {
      save.mockRejectedValue(Object.assign(new Error('dup'), { code: 11000 }));

      await expect(
        service.create({ username: 'ana-lima', name: 'Ana Lima' }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
