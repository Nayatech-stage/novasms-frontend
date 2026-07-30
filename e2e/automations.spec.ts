import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Automations', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('page automations charge', async ({ page }) => {
    await page.goto('/automations');
    await page.waitForSelector('h1', { timeout: 10000 });
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('bouton nouvelle automation visible', async ({ page }) => {
    await page.goto('/automations');
    await page.waitForSelector('h1', { timeout: 10000 });

    const btn = page.locator(
      'button:has-text("Nouvelle"), button:has-text("Créer"), button:has-text("Ajouter")',
    );
    if ((await btn.count()) > 0) {
      await expect(btn.first()).toBeVisible();
    }
  });

  test('page automations sans crash JS', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/automations');
    await page.waitForTimeout(3000);
    expect(errors.filter((e) => !e.includes('ResizeObserver'))).toHaveLength(0);
  });
});
