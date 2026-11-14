import { test, expect } from '@playwright/test';

// The user switcher only renders after the users load from the API (Render cold start ~50s)
const API_TIMEOUT = 60_000;

test.describe('New user dialog', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/');
    await page.getByRole('button', { name: 'Add user' }).click({ timeout: API_TIMEOUT });
  });

  test('keeps Create user disabled until name and username are valid', async ({ page }) => {
    const dialog = page.getByRole('dialog', { name: 'New user' });
    const name = dialog.getByRole('textbox', { name: 'Name', exact: true });
    const username = dialog.getByRole('textbox', { name: /^Username/ });
    const createButton = dialog.getByRole('button', { name: 'Create user' });

    // Empty name
    await expect(name).toBeFocused();
    await expect(createButton).toBeDisabled();

    // A valid name also fills a valid username
    await name.fill('Eva Souza');
    await expect(username).toHaveValue('eva-souza');
    await expect(createButton).toBeEnabled();

    // Too short
    await username.fill('ab');
    await expect(username).toHaveAttribute('aria-invalid', 'true');
    await expect(createButton).toBeDisabled();

    // Characters outside lowercase letters, numbers and "-"
    await username.fill('eva_souza!');
    await expect(username).toHaveAttribute('aria-invalid', 'true');
    await expect(createButton).toBeDisabled();

    // Back to valid
    await username.fill('eva-souza-2');
    await expect(username).toHaveAttribute('aria-invalid', 'false');
    await expect(createButton).toBeEnabled();

    // Whitespace-only name
    await name.fill('   ');
    await expect(createButton).toBeDisabled();
  });

  test('closes without creating a user', async ({ page }) => {
    const dialog = page.getByRole('dialog', { name: 'New user' });
    await dialog.getByRole('textbox', { name: 'Name', exact: true }).fill('Eva Souza');

    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();

    await page.getByRole('button', { name: 'Add user' }).click();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
});
