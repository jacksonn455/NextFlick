import { test, expect, Page, Route } from '@playwright/test';

// The free movie API is mocked: the test checks the /watch UI, never spends
// provider quotas and does not depend on archive.org, PeerTube or YouTube.

const movie = (overrides: Record<string, unknown>) => ({
  identifier: 'nosferatu',
  source: 'archive',
  externalId: 'nosferatu',
  title: 'Nosferatu',
  year: '1922',
  description: 'A vampire comes to Wisborg.',
  creator: 'F. W. Murnau',
  thumbnail: '',
  durationSeconds: 5640,
  publishedAt: '2010-01-01T00:00:00Z',
  genres: ['Horror'],
  contentType: 'feature',
  license: { type: 'public-domain', label: 'Public Domain', url: null, allowed: true },
  licenseVerified: true,
  freeToWatch: true,
  ...overrides,
});

const CATALOG = [
  movie({}),
  movie({
    identifier: 'peertube:tube.example.org:d2881c03-bd33-4b42-9476-3f2a5e346eb1',
    source: 'peertube',
    externalId: 'tube.example.org:d2881c03-bd33-4b42-9476-3f2a5e346eb1',
    title: 'Independent Feature',
    year: '2019',
    publishedAt: '2024-05-01T00:00:00Z',
  }),
  movie({
    identifier: 'loc:96520379',
    source: 'loc',
    externalId: '96520379',
    title: 'Comedy cake walk',
    year: '1903',
    durationSeconds: 41,
    contentType: 'short',
    publishedAt: null,
  }),
];

const YOUTUBE_DETAILS = {
  ...movie({
    identifier: 'youtube:abcdefghijk',
    source: 'youtube',
    externalId: 'abcdefghijk',
    title: 'Creative Commons Feature',
  }),
  videoUrl: null,
  videoFormat: null,
  embedUrl: 'https://www.youtube-nocookie.com/embed/abcdefghijk?rel=0',
  sourceUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
  attribution: '"Creative Commons Feature", on YouTube, CC BY 3.0.',
  rights: null,
};

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function mockApi(page: Page) {
  const listRequests: URL[] = [];

  await page.route(/\/free-movies(\/[^?]*)?(\?.*)?$/, (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^.*\/free-movies/, '');

    if (path === '/sources') {
      return json(route, {
        success: true,
        data: {
          sources: [
            { source: 'archive', label: 'Internet Archive', enabled: true, available: true },
            { source: 'peertube', label: 'PeerTube', enabled: true, available: true },
            { source: 'youtube', label: 'YouTube', enabled: false, available: false },
          ],
          genres: ['Comedy', 'Horror'],
        },
      });
    }
    if (path.startsWith('/youtube')) return json(route, { success: true, data: YOUTUBE_DETAILS });
    if (path) return json(route, { message: 'Free movie not found', code: 'FREE_MOVIE_NOT_FOUND' }, 404);

    listRequests.push(url);
    const query = url.searchParams.get('q');
    const source = url.searchParams.get('sources');
    const data = query
      ? []
      : CATALOG.filter((m) => !source || m.source === source);
    return json(route, { success: true, data, count: data.length, unavailableSources: [] });
  });

  return listRequests;
}

test.describe('Free to Watch (/watch)', () => {
  test('shows the featured film and only rows that have films', async ({ page }) => {
    await mockApi(page);
    await page.goto('/watch');

    await expect(page.getByTestId('watch-hero')).toBeVisible();
    await expect(page.getByTestId('hero-watch-now')).toBeVisible();
    await expect(page.getByTestId('row-featured')).toBeVisible();
    await expect(page.getByTestId('row-loc')).toBeVisible();
    // No YouTube films in the catalog, so no YouTube row
    await expect(page.getByTestId('row-youtube')).toHaveCount(0);

    const card = page.getByTestId('free-movie-card').first();
    await expect(card).toHaveAttribute('aria-label', /free to watch/);
  });

  test('filters by source through the URL and the API', async ({ page }) => {
    const requests = await mockApi(page);
    await page.goto('/watch');

    await page.getByTestId('filter-source').selectOption('peertube');

    await expect(page).toHaveURL(/source=peertube/);
    const grid = page.getByTestId('free-movies-grid');
    await expect(grid.getByTestId('free-movie-card')).toHaveCount(1);
    await expect(grid).toContainText('Independent Feature');
    expect(requests.some((url) => url.searchParams.get('sources') === 'peertube')).toBe(true);
  });

  test('shows an empty state for a search without results and can reset', async ({ page }) => {
    await mockApi(page);
    await page.goto('/watch?q=zzzz');

    await expect(page.getByTestId('watch-empty')).toContainText('No free movies for');
    await page.getByRole('button', { name: 'Clear search and filters' }).click();

    await expect(page).toHaveURL(/\/watch$/);
    await expect(page.getByTestId('watch-hero')).toBeVisible();
  });

  test('plays YouTube films in the official embedded player', async ({ page }) => {
    await mockApi(page);
    // Never load the real player in tests
    await page.route('https://www.youtube-nocookie.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<html></html>' }),
    );
    await page.goto('/watch/youtube:abcdefghijk');

    await expect(page.getByTestId('free-movie-title')).toHaveText('Creative Commons Feature');
    await expect(page.getByTestId('free-movie-source')).toHaveText('YouTube');
    await page.getByTestId('watch-now').click();

    const player = page.getByTestId('embed-player');
    await expect(player).toHaveAttribute('src', /youtube-nocookie\.com\/embed\/abcdefghijk/);
    await expect(page.getByTestId('video-player')).toHaveCount(0);
  });

  test('explains when a film is unavailable', async ({ page }) => {
    await mockApi(page);
    await page.goto('/watch/missing_film');

    await expect(page.getByTestId('free-movie-error')).toContainText("This movie isn't available");
  });

  test('redirects the old /free page', async ({ page }) => {
    await mockApi(page);
    await page.goto('/free?q=nosferatu');

    await expect(page).toHaveURL(/\/watch\?q=nosferatu$/);
  });

  test('has no horizontal overflow on a phone', async ({ page }) => {
    await mockApi(page);
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/watch');
    await expect(page.getByTestId('watch-hero')).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
