import {
  FreeCatalogService,
  PROVIDER_DEADLINE_MS,
} from '../../../../../src/modules/streaming/services/free-catalog.service';
import {
  FreeMovie,
  FreeMovieProvider,
  MovieSource,
} from '../../../../../src/modules/streaming/interfaces/free-movie.interface';
import {
  CatalogUnavailableException,
  InvalidMovieIdentifierException,
  ProviderUnavailableException,
} from '../../../../../src/modules/streaming/exceptions/streaming.exceptions';

const movie = (
  source: MovieSource,
  id: string,
  overrides: Partial<FreeMovie> = {},
): FreeMovie => ({
  identifier: source === 'archive' ? id : `${source}:${id}`,
  source,
  externalId: id,
  title: `Film ${id}`,
  year: '1950',
  description: null,
  creator: null,
  thumbnail: '',
  durationSeconds: 5400,
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

type MockProvider = FreeMovieProvider & {
  search: jest.Mock;
  getMovie: jest.Mock;
  isEnabled: jest.Mock;
};

const provider = (
  source: MovieSource,
  movies: FreeMovie[] = [],
): MockProvider => ({
  source,
  isEnabled: jest.fn().mockReturnValue(true),
  search: jest.fn().mockResolvedValue(movies),
  getMovie: jest.fn().mockResolvedValue({ identifier: 'x' }),
});

describe('FreeCatalogService', () => {
  let archive: MockProvider;
  let youtube: MockProvider;
  let peertube: MockProvider;
  let service: FreeCatalogService;

  beforeEach(() => {
    archive = provider('archive', [
      movie('archive', 'a1'),
      movie('archive', 'a2'),
    ]);
    youtube = provider('youtube', [movie('youtube', 'y1')]);
    peertube = provider('peertube', [
      movie('peertube', 'p1', { freeToWatch: false, licenseVerified: false }),
    ]);
    service = new FreeCatalogService([archive, youtube, peertube]);
  });

  afterEach(() => jest.useRealTimers());

  describe('search', () => {
    it('queries every enabled source in parallel and interleaves them', async () => {
      const { movies, unavailableSources } = await service.search({
        query: 'film',
      });

      expect(movies.map((m) => m.identifier)).toEqual([
        'a1',
        'youtube:y1',
        'a2',
      ]);
      expect(unavailableSources).toEqual([]);
      expect(archive.search).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'film', freeOnly: true }),
      );
    });

    it('skips disabled sources (e.g. YouTube without an API key)', async () => {
      youtube.isEnabled.mockReturnValue(false);

      const { movies } = await service.search();

      expect(youtube.search).not.toHaveBeenCalled();
      expect(movies.some((m) => m.source === 'youtube')).toBe(false);
    });

    it('only queries the requested sources', async () => {
      await service.search({ sources: ['youtube'] });

      expect(youtube.search).toHaveBeenCalled();
      expect(archive.search).not.toHaveBeenCalled();
    });

    it('hides merely public films unless asked for all', async () => {
      const verified = await service.search();
      const all = await service.search({ freeOnly: false });

      expect(verified.movies.some((m) => m.source === 'peertube')).toBe(false);
      expect(all.movies.some((m) => m.source === 'peertube')).toBe(true);
    });

    it('filters by year range and content type', async () => {
      archive.search.mockResolvedValue([
        movie('archive', 'old', { year: '1925' }),
        movie('archive', 'short', { year: '1930', contentType: 'short' }),
        movie('archive', 'noyear', { year: null }),
      ]);

      const { movies } = await service.search({
        sources: ['archive'],
        yearFrom: 1920,
        yearTo: 1935,
        contentType: 'feature',
      });

      expect(movies.map((m) => m.identifier)).toEqual(['old']);
    });

    it('merges the same film found on two sources', async () => {
      archive.search.mockResolvedValue([
        movie('archive', 'n', { title: 'Nosferatu' }),
      ]);
      youtube.search.mockResolvedValue([
        movie('youtube', 'n', { title: 'Nosferatu (1950) Full Movie' }),
      ]);

      const { movies } = await service.search();

      expect(movies).toHaveLength(1);
      expect(movies[0].alsoAvailableOn).toEqual([
        { source: 'youtube', identifier: 'youtube:n' },
      ]);
    });

    it('returns the other sources when one fails', async () => {
      youtube.search.mockRejectedValue(
        new ProviderUnavailableException('youtube'),
      );

      const { movies, unavailableSources } = await service.search();

      expect(movies.length).toBeGreaterThan(0);
      expect(unavailableSources).toEqual(['youtube']);
    });

    it('answers 503 when every source fails', async () => {
      [archive, youtube, peertube].forEach((p) =>
        p.search.mockRejectedValue(new Error('down')),
      );

      await expect(service.search()).rejects.toThrow(
        CatalogUnavailableException,
      );
    });

    it('does not wait for a slow source', async () => {
      jest.useFakeTimers();
      youtube.search.mockReturnValue(new Promise(() => undefined));

      const pending = service.search();
      await jest.advanceTimersByTimeAsync(PROVIDER_DEADLINE_MS);
      const { movies, unavailableSources } = await pending;

      expect(unavailableSources).toEqual(['youtube']);
      expect(movies.every((m) => m.source !== 'youtube')).toBe(true);
    });

    it('stops calling a source that keeps failing', async () => {
      youtube.search.mockRejectedValue(new Error('down'));

      await service.search();
      await service.search();
      await service.search();

      expect(youtube.search).toHaveBeenCalledTimes(2);
      expect(
        service.getSources().find((s) => s.source === 'youtube')?.available,
      ).toBe(false);
    });

    it('honors the back-off requested by a source (quota exceeded)', async () => {
      youtube.search.mockRejectedValueOnce(
        new ProviderUnavailableException('youtube', 'quota', 60 * 60 * 1000),
      );

      await service.search();
      const { unavailableSources } = await service.search();

      expect(youtube.search).toHaveBeenCalledTimes(1);
      expect(unavailableSources).toEqual(['youtube']);
    });

    it('caps the limit', async () => {
      archive.search.mockResolvedValue(
        Array.from({ length: 60 }, (_, i) => movie('archive', `m${i}`)),
      );

      const { movies } = await service.search({ limit: 5 });
      expect(movies).toHaveLength(5);
      await service.search({ limit: 1000 });
      expect(archive.search.mock.calls[1][0].limit).toBe(50);
    });
  });

  describe('getMovie', () => {
    it('routes the id to its source without the prefix', async () => {
      await service.getMovie('youtube:abcdefghijk');
      await service.getMovie('nosferatu');

      expect(youtube.getMovie).toHaveBeenCalledWith('abcdefghijk');
      expect(archive.getMovie).toHaveBeenCalledWith('nosferatu');
    });

    it('rejects malformed ids and sources that are not registered', async () => {
      await expect(service.getMovie('bad id')).rejects.toThrow(
        InvalidMovieIdentifierException,
      );
      await expect(service.getMovie('loc:123')).rejects.toThrow(
        InvalidMovieIdentifierException,
      );
    });
  });

  it('lists the registered sources', () => {
    youtube.isEnabled.mockReturnValue(false);
    expect(service.getSources()).toEqual([
      {
        source: 'archive',
        label: 'Internet Archive',
        enabled: true,
        available: true,
      },
      { source: 'peertube', label: 'PeerTube', enabled: true, available: true },
      { source: 'youtube', label: 'YouTube', enabled: false, available: false },
    ]);
  });
});
