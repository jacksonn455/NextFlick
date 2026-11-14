import { test, expect, type Page } from '@playwright/test';

// The backend sleeps on Render free tier; the first request can take ~50s
const API_TIMEOUT = 60_000;

// An uncommon title, unlikely to already be in the default user's list
const MOVIE = { title: 'Armitage III: Dual Matrix', year: 2002, query: 'armitage' };
const addButtonName = `Add ${MOVIE.title} to My List`;
const removeButtonName = `Remove ${MOVIE.title} from My List`;
const cardName = `More info about ${MOVIE.title} (${MOVIE.year})`;

// Removes the movie from My List if it is there, so the shared list goes back to its original state
async function removeFromMyList(page: Page) {
  await page.goto('/favorites');
  await expect(page.getByRole('heading', { name: 'My List', level: 1 })).toBeVisible();
  await expect(page.getByText(/^\d+ titles?$|Your list is empty/)).toBeVisible({ timeout: API_TIMEOUT });

  const removeButton = page.getByRole('button', { name: removeButtonName });
  if (await removeButton.isVisible()) {
    await removeButton.click();
    await expect(page.getByRole('button', { name: cardName })).toHaveCount(0, { timeout: API_TIMEOUT });
  }
}

test.describe('My List', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120_000);
    await removeFromMyList(page);
  });

  test.afterEach(async ({ page }) => {
    await removeFromMyList(page);
  });

  test('adds a movie from search and removes it from My List', async ({ page }) => {
    await page.goto(`/search?q=${MOVIE.query}`);
    await page.getByRole('button', { name: addButtonName }).click({ timeout: API_TIMEOUT });
    await expect(page.getByRole('button', { name: removeButtonName })).toHaveAttribute('aria-pressed', 'true', {
      timeout: API_TIMEOUT,
    });

    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'My List', exact: true }).click();
    await expect(page).toHaveURL(/\/favorites$/);
    await expect(page.getByRole('button', { name: cardName })).toBeVisible({ timeout: API_TIMEOUT });

    await page.getByRole('button', { name: removeButtonName }).click();
    await expect(page.getByRole('button', { name: cardName })).toHaveCount(0, { timeout: API_TIMEOUT });
  });
});
