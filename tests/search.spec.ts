import { test, expect } from '@playwright/test';

// The backend sleeps on Render free tier; the first request can take ~50s
const API_TIMEOUT = 60_000;

test.describe('Search', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/search');
  });

  test('lists matching titles for a search', async ({ page }) => {
    const searchbox = page.getByRole('searchbox', { name: 'Search movies' });
    await searchbox.fill('matrix');
    await searchbox.press('Enter');

    await expect(page).toHaveURL(/\/search\?q=matrix$/);
    await expect(page.getByRole('heading', { name: /results for "matrix"/ })).toBeVisible({
      timeout: API_TIMEOUT,
    });
    await expect(page.getByRole('button', { name: 'More info about The Matrix (1999)' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'More info about The Matrix Reloaded (2003)' })).toBeVisible();
  });

  test('shows a message when nothing is found', async ({ page }) => {
    const query = `zzqx-no-movie-${Date.now()}`;
    const searchbox = page.getByRole('searchbox', { name: 'Search movies' });
    await searchbox.fill(query);
    await searchbox.press('Enter');

    await expect(page.getByRole('heading', { name: `No results for "${query}"` })).toBeVisible({
      timeout: API_TIMEOUT,
    });
    await expect(page.getByRole('button', { name: /^More info about/ })).toHaveCount(0);
  });
});
