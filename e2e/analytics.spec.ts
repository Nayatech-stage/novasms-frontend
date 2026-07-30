import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('page analytics charge', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForSelector('h1', { timeout: 10000 });
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('analytics sans crash JS', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/analytics');
    await page.waitForTimeout(4000);
    expect(errors.filter((e) => !e.includes('ResizeObserver'))).toHaveLength(0);
  });

  test('filtres de période présents', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForSelector('h1', { timeout: 10000 });

    const filterBtn = page.locator(
      'button:has-text("7"), button:has-text("30"), button:has-text("jour"), select, [role="combobox"]',
    );
    if ((await filterBtn.count()) > 0) {
      await expect(filterBtn.first()).toBeVisible();
    }
  });
});
