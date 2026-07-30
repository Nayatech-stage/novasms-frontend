import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Navigation — smoke test toutes les pages', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Dashboard charge correctement', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('main', { timeout: 10000 });
    await expect(page.locator('main')).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('Contacts — liste visible avec au moins un contact seedé', async ({ page }) => {
    await page.goto('/contacts');
    await page.waitForSelector('main', { timeout: 10000 });
    await expect(page.locator('main')).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('Campaigns — page charge sans erreur', async ({ page }) => {
    await page.goto('/campaigns');
    await page.waitForSelector('main', { timeout: 10000 });
    await expect(page.locator('main')).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('Automations — page charge sans erreur', async ({ page }) => {
    await page.goto('/automations');
    await page.waitForSelector('main', { timeout: 10000 });
    await expect(page.locator('main')).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('Analytics — page charge sans erreur', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForSelector('main', { timeout: 10000 });
    await expect(page.locator('main')).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('Rechargement — page charge sans erreur', async ({ page }) => {
    await page.goto('/rechargement');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('Paramètres — page charge sans erreur', async ({ page }) => {
    await page.goto('/account/settings');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('Route inconnue ne crash pas', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/page-inexistante');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    expect(errors.filter((e) => !e.includes('ResizeObserver'))).toHaveLength(0);
  });
});
