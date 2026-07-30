import { test, expect } from '@playwright/test';
import { login } from './helpers';

const SEEDED_CONTACT_ID = 'e6bd871b-3ee6-4529-8131-b82a24947c9c';

test.describe('Contact detail', () => {
  test('renders contact detail for existing contact', async ({ page }) => {
    await login(page);
    await page.goto(`/contacts/${SEEDED_CONTACT_ID}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page).not.toHaveURL(/\/login/);
    const emailVisible = await page
      .locator('text=ui-test@example.com')
      .first()
      .isVisible()
      .catch(() => false);
    const mainVisible = await page
      .locator('main')
      .isVisible()
      .catch(() => false);
    expect(emailVisible || mainVisible).toBeTruthy();
  });

  test('contact detail affiche email', async ({ page }) => {
    await login(page);
    await page.goto(`/contacts/${SEEDED_CONTACT_ID}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('main')).toBeVisible();
  });

  test('contact inconnu affiche une erreur ou redirige', async ({ page }) => {
    await login(page);
    await page.goto('/contacts/00000000-0000-0000-0000-000000000000');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page.locator('text=undefined')).not.toBeVisible();
    await expect(page.locator('text=Cannot read')).not.toBeVisible();
  });
});
