import {
  classifyContentType,
  deduplicate,
  extractYear,
  interleaveBySource,
  isSameFilm,
  looksLikeNonFilm,
  mapGenres,
  normalizeTitle,
  parseIsoDuration,
} from '../../../../../src/modules/streaming/utils/catalog.utils';
import {
  buildMovieId,
  isValidMovieId,
  parseMovieId,
} from '../../../../../src/modules/streaming/utils/movie-id';
import { FreeMovie } from '../../../../../src/modules/streaming/interfaces/free-movie.interface';

const movie = (overrides: Partial<FreeMovie> = {}): FreeMovie => ({
  identifier: 'nosferatu',
  source: 'archive',
  externalId: 'nosferatu',
  title: 'Nosferatu',
  year: '1922',
  description: null,
  creator: null,
  thumbnail: 'https://img/n.jpg',
  durationSeconds: null,
  publishedAt: null,
  genres: [],
  contentType: 'feature',
  license: {
    type: 'public-domain',
    label: 'Public Domain',
    url: null,
    allowed: true,
  },
  licenseVerified: true,
  freeToWatch: true,
  ...overrides,
});

describe('movie ids', () => {
  it('keeps Internet Archive ids bare and prefixes the other sources', () => {
    expect(buildMovieId('archive', 'nosferatu')).toBe('nosferatu');
    expect(buildMovieId('youtube', 'abcdefghijk')).toBe('youtube:abcdefghijk');
  });

  it('parses every id format', () => {
    expect(parseMovieId('night_of_the_living_dead')).toEqual({
      source: 'archive',
      externalId: 'night_of_the_living_dead',
    });
    expect(
      parseMovieId(
        'peertube:tube.example.org:d2881c03-bd33-4b42-9476-3f2a5e346eb1',
      ),
    ).toEqual({
      source: 'peertube',
      externalId: 'tube.example.org:d2881c03-bd33-4b42-9476-3f2a5e346eb1',
    });
    expect(parseMovieId('loc:ihas.200198115')).toEqual({
      source: 'loc',
      externalId: 'ihas.200198115',
    });
  });

  it('rejects malformed and unknown-source ids', () => {
    expect(isValidMovieId('bad id')).toBe(false);
    expect(isValidMovieId('vimeo:123')).toBe(false);
    expect(isValidMovieId('youtube:')).toBe(false);
    expect(isValidMovieId(undefined)).toBe(false);
  });
});

describe('catalog utils', () => {
  it('classifies features and shorts by duration', () => {
    expect(classifyContentType(5400)).toBe('feature');
    expect(classifyContentType(600)).toBe('short');
    expect(classifyContentType(null)).toBe('unknown');
    expect(classifyContentType(null, 'feature')).toBe('feature');
  });

  it.each([
    'Nosferatu - Official Trailer',
    'Movie Review: Metropolis',
    'Best scenes compilation',
    'Funny cats #shorts',
    'Episode 4 - The pilot',
  ])('flags "%s" as not a film', (title) => {
    expect(looksLikeNonFilm(title)).toBe(true);
  });

  it('keeps real film titles', () => {
    expect(looksLikeNonFilm('Night of the Living Dead (1968) Full Movie')).toBe(
      false,
    );
  });

  it('maps subjects and tags to the genre vocabulary', () => {
    expect(mapGenres(['comedy films', 'silent films', null])).toEqual([
      'Comedy',
      'Silent',
    ]);
    expect(mapGenres([])).toEqual([]);
  });

  it('extracts a release year written in brackets', () => {
    expect(extractYear('Metropolis (1927) restored')).toBe('1927');
    expect(extractYear('Top 1000 movies')).toBeNull();
    expect(extractYear('Metropolis 1927')).toBeNull();
    expect(extractYear('Film-Profesor-1993', true)).toBe('1993');
    expect(extractYear('Top 10000 films', true)).toBeNull();
  });

  it('parses ISO 8601 durations', () => {
    expect(parseIsoDuration('PT1H32M10S')).toBe(5530);
    expect(parseIsoDuration('PT45M')).toBe(2700);
    expect(parseIsoDuration('nonsense')).toBeNull();
  });

  it('normalizes titles for matching', () => {
    expect(
      normalizeTitle('The Phantom of the Opera (1925) [HD] Full Movie'),
    ).toBe('phantom of the opera');
  });

  describe('duplicates', () => {
    const archive = movie({
      description: 'Classic vampire film.',
      durationSeconds: 5640,
    });
    const youtube = movie({
      identifier: 'youtube:abcdefghijk',
      source: 'youtube',
      externalId: 'abcdefghijk',
      title: 'Nosferatu (1922) Full Movie HD',
      description: null,
      durationSeconds: 5700,
      genres: ['Horror'],
      publishedAt: '2020-01-01T00:00:00Z',
    });

    it('recognizes the same film across sources', () => {
      expect(isSameFilm(archive, youtube)).toBe(true);
    });

    it('does not merge films with conflicting years or running times', () => {
      expect(isSameFilm(archive, { ...youtube, year: '1979' })).toBe(false);
      expect(isSameFilm(archive, { ...youtube, durationSeconds: 1200 })).toBe(
        false,
      );
    });

    it('keeps the richer record, fills gaps and preserves attribution', () => {
      const [merged, ...rest] = deduplicate([youtube, archive]);

      expect(rest).toHaveLength(0);
      expect(merged.identifier).toBe('nosferatu');
      expect(merged.description).toBe('Classic vampire film.');
      expect(merged.durationSeconds).toBe(5640);
      expect(merged.publishedAt).toBe('2020-01-01T00:00:00Z');
      expect(merged.genres).toEqual(['Horror']);
      expect(merged.alsoAvailableOn).toEqual([
        { source: 'youtube', identifier: 'youtube:abcdefghijk' },
      ]);
    });

    it('prefers a free-to-watch record over a merely public one', () => {
      const publicOnly = { ...archive, freeToWatch: false };
      const [merged] = deduplicate([publicOnly, youtube]);
      expect(merged.source).toBe('youtube');
    });

    it('drops an item returned twice by the same source', () => {
      expect(deduplicate([archive, archive])).toHaveLength(1);
    });
  });

  it('interleaves sources', () => {
    const list = interleaveBySource([
      movie({ identifier: 'a1' }),
      movie({ identifier: 'a2' }),
      movie({ identifier: 'y1', source: 'youtube' }),
    ]);
    expect(list.map((m) => m.identifier)).toEqual(['a1', 'y1', 'a2']);
  });
});
