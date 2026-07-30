import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Compte & Paramètres', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('page profil charge', async ({ page }) => {
    await page.goto('/account/profile');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('page sécurité charge', async ({ page }) => {
    await page.goto('/account/security');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('page paramètres charge', async ({ page }) => {
    await page.goto('/account/settings');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('page équipe charge', async ({ page }) => {
    await page.goto('/account/team');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('page logs audit charge', async ({ page }) => {
    await page.goto('/account/audit-logs');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('page intégrations charge', async ({ page }) => {
    await page.goto('/account/integrations');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('rechargement crédits charge', async ({ page }) => {
    await page.goto('/rechargement');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page).not.toHaveURL(/\/login/);
  });
});
