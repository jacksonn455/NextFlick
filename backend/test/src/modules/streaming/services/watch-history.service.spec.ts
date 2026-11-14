import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { WatchHistoryService } from '../../../../../src/modules/streaming/services/watch-history.service';
import { FreeMoviesService } from '../../../../../src/modules/streaming/services/free-movies.service';
import { WatchHistory } from '../../../../../src/modules/streaming/entities/watch-history.entity';
import { UsersService } from '../../../../../src/modules/users/services/users.service';
import {
  InvalidArchiveIdentifierException,
  LicenseNotAllowedException,
  WatchHistoryNotFoundException,
} from '../../../../../src/modules/streaming/exceptions/streaming.exceptions';

const userId = '64f1a2b3c5d6e7f8a9b0c1aa';
const identifier = 'nosferatu';
const movie = {
  identifier,
  title: 'Nosferatu',
  thumbnail: 'https://archive.org/services/img/nosferatu',
};

// Mongoose query chain: find().sort().limit().exec()
const queryChain = (result: unknown) => {
  const chain = {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(result),
  };
  return chain;
};

describe('WatchHistoryService', () => {
  let service: WatchHistoryService;
  let historyModel: {
    findOneAndUpdate: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    deleteOne: jest.Mock;
  };
  let usersService: { findById: jest.Mock };
  let freeMoviesService: { getMovie: jest.Mock };

  beforeEach(async () => {
    historyModel = {
      findOneAndUpdate: jest.fn().mockImplementation((_filter, update) => ({
        exec: jest
          .fn()
          .mockResolvedValue({ userId, identifier, ...update.$set }),
      })),
      find: jest.fn().mockReturnValue(queryChain([])),
      findOne: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      deleteOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      }),
    };
    usersService = { findById: jest.fn().mockResolvedValue({ _id: userId }) };
    freeMoviesService = { getMovie: jest.fn().mockResolvedValue(movie) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WatchHistoryService,
        { provide: getModelToken(WatchHistory.name), useValue: historyModel },
        { provide: UsersService, useValue: usersService },
        { provide: FreeMoviesService, useValue: freeMoviesService },
      ],
    }).compile();

    service = module.get(WatchHistoryService);
  });

  describe('saveProgress', () => {
    it('upserts the entry with the film title and thumbnail', async () => {
      const entry = await service.saveProgress(userId, identifier, {
        position: 120,
        duration: 3600,
      });

      expect(historyModel.findOneAndUpdate).toHaveBeenCalledWith(
        { userId, identifier },
        {
          $set: {
            title: 'Nosferatu',
            thumbnail: movie.thumbnail,
            position: 120,
            duration: 3600,
            completed: false,
            lastWatchedAt: expect.any(Date),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      expect(entry).toMatchObject({ position: 120, completed: false });
    });

    it('marks the film as completed near the end', async () => {
      const entry = await service.saveProgress(userId, identifier, {
        position: 3500,
        duration: 3600,
      });

      expect(entry.completed).toBe(true);
    });

    it('never stores a position past the end', async () => {
      const entry = await service.saveProgress(userId, identifier, {
        position: 9999,
        duration: 3600,
      });

      expect(entry.position).toBe(3600);
      expect(entry.completed).toBe(true);
    });

    it('keeps the position when the duration is still unknown', async () => {
      const entry = await service.saveProgress(userId, identifier, {
        position: 30,
        duration: 0,
      });

      expect(entry).toMatchObject({ position: 30, completed: false });
    });

    it('does not save progress for unknown users', async () => {
      usersService.findById.mockRejectedValue(new NotFoundException());

      await expect(
        service.saveProgress(userId, identifier, { position: 1, duration: 2 }),
      ).rejects.toThrow(NotFoundException);
      expect(historyModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('does not save progress for films that may not be streamed', async () => {
      freeMoviesService.getMovie.mockRejectedValue(
        new LicenseNotAllowedException(),
      );

      await expect(
        service.saveProgress(userId, identifier, { position: 1, duration: 2 }),
      ).rejects.toThrow(LicenseNotAllowedException);
      expect(historyModel.findOneAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe('getHistory', () => {
    it('returns the whole history, most recent first', async () => {
      const entries = [{ identifier: 'a' }, { identifier: 'b' }];
      const chain = queryChain(entries);
      historyModel.find.mockReturnValue(chain);

      await expect(service.getHistory(userId)).resolves.toBe(entries);
      expect(historyModel.find).toHaveBeenCalledWith({ userId });
      expect(chain.sort).toHaveBeenCalledWith({ lastWatchedAt: -1 });
      expect(chain.limit).toHaveBeenCalledWith(50);
    });

    it('keeps only started, unfinished films for Continue Watching', async () => {
      await service.getHistory(userId, { inProgress: true });

      expect(historyModel.find).toHaveBeenCalledWith({
        userId,
        completed: false,
        position: { $gt: 0 },
      });
    });

    it('checks that the user exists', async () => {
      usersService.findById.mockRejectedValue(new NotFoundException());

      await expect(service.getHistory(userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getEntry', () => {
    it('returns the saved entry', async () => {
      const entry = { identifier, position: 10 };
      historyModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(entry),
      });

      await expect(service.getEntry(userId, identifier)).resolves.toBe(entry);
    });

    it('throws WatchHistoryNotFoundException when never watched', async () => {
      await expect(service.getEntry(userId, identifier)).rejects.toThrow(
        WatchHistoryNotFoundException,
      );
    });

    it('rejects malformed identifiers', async () => {
      await expect(service.getEntry(userId, 'bad id')).rejects.toThrow(
        InvalidArchiveIdentifierException,
      );
    });
  });

  describe('removeEntry', () => {
    it('deletes the entry of the user', async () => {
      await service.removeEntry(userId, identifier);

      expect(historyModel.deleteOne).toHaveBeenCalledWith({
        userId,
        identifier,
      });
    });

    it('throws WatchHistoryNotFoundException when nothing was deleted', async () => {
      historyModel.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      });

      await expect(service.removeEntry(userId, identifier)).rejects.toThrow(
        WatchHistoryNotFoundException,
      );
    });
  });
});
