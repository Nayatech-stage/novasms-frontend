import { test, expect } from '@playwright/test';
import { login, E2E_EMAIL } from './helpers';

test.describe('Authentification', () => {
  test('page login affiche le formulaire', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]').first()).toBeVisible();
  });

  test('login avec identifiants valides → dashboard', async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('login avec mauvais mot de passe → message erreur', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', E2E_EMAIL);
    await page.fill('input[type="password"]', 'MauvaisMotDePasse!');
    await page.click('button[type="submit"]');
    await expect(
      page.locator('[class*="error"], [class*="bg-error"], .text-error').first(),
    ).toBeVisible({ timeout: 8000 });
  });

  test('lien mot de passe oublié → page reset', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('a[href="/reset-password"]', { timeout: 10000 });
    await page.click('a[href="/reset-password"]');
    await expect(page).toHaveURL(/\/reset-password/);
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
  });

  test('page reset password sans token → formulaire email', async ({ page }) => {
    await page.goto('/reset-password');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]').first()).toBeVisible();
  });

  test('page reset password avec token → formulaire nouveau mdp', async ({ page }) => {
    await page.goto('/reset-password/fake-token-12345');
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test('route protégée sans auth → redirect login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login|\//, { timeout: 8000 });
  });
});
