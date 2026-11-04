import { FavoriteSchema } from '../../../../../src/modules/favorites/entities/favorite.entity';
import { User } from '../../../../../src/modules/users/entities/user.entity';

describe('FavoriteSchema', () => {
  it('should store userId as an ObjectId that references User', () => {
    const userId = FavoriteSchema.path('userId');

    expect(userId.instance).toBe('ObjectId');
    expect(userId.options.ref).toBe(User.name);
  });

  it('should allow a movie only once per user', () => {
    expect(FavoriteSchema.indexes()).toContainEqual([
      { userId: 1, imdbID: 1 },
      expect.objectContaining({ unique: true }),
    ]);
  });
});
