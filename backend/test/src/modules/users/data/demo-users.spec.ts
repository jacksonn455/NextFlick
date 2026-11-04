import { DEMO_USERS } from '../../../../../src/modules/users/data/demo-users';
import { SEED_MOVIES } from '../../../../../src/modules/movies/data/seed-movies';

const catalogIds = new Set(SEED_MOVIES.map((movie) => movie.imdbID));
const profiles = DEMO_USERS.filter((demo) => demo.favorites?.length);

describe('DEMO_USERS', () => {
  it('should have unique usernames that POST /users would accept', () => {
    const usernames = DEMO_USERS.map((demo) => demo.username);

    expect(new Set(usernames).size).toBe(usernames.length);
    usernames.forEach((username) =>
      expect(username).toMatch(/^[a-z0-9-]{3,30}$/),
    );
  });

  it('should have enough users with a taste profile to train on', () => {
    expect(profiles.length).toBeGreaterThanOrEqual(10);
  });

  it.each(profiles.map((demo) => [demo.username, demo]))(
    '%s should favorite 8+ distinct movies from the catalog',
    (_username, demo) => {
      const favorites = demo.favorites!;

      expect(favorites.length).toBeGreaterThanOrEqual(8);
      expect(new Set(favorites).size).toBe(favorites.length);
      expect(favorites.filter((id) => !catalogIds.has(id))).toEqual([]);
    },
  );
});
