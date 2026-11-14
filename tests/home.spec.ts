import { test, expect } from '@playwright/test';

test.describe('NextFlick app shell', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('has the NextFlick title', async ({ page }) => {
    await expect(page).toHaveTitle('NextFlick');
  });

  test('shows the main navigation', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Main' });

    await expect(nav.getByRole('link', { name: 'NextFlick home' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Home', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(nav.getByRole('link', { name: 'Search', exact: true })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'My List', exact: true })).toBeVisible();
  });

  test('navigates to the search page', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Main' });
    await nav.getByRole('link', { name: 'Search', exact: true }).click();

    await expect(page).toHaveURL(/\/search$/);
    await expect(page.getByRole('searchbox', { name: 'Search movies' })).toBeVisible();
  });
});
