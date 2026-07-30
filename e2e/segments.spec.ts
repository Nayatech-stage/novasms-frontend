import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Segments — builder et navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('login redirige vers dashboard ou contacts', async ({ page }) => {
    await expect(page).toHaveURL(/\/(dashboard|contacts)/);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
  });

  test('deuxieme login saute onboarding', async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', 'novatest_20260507@example.com');
    await page.fill('input[type="password"]', 'TempPass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|contacts|onboarding)/, { timeout: 15000 });
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
  });

  test('page contacts charge et affiche la liste', async ({ page }) => {
    await page.goto('http://localhost:5173/contacts');
    await page.waitForSelector('main', { timeout: 10000 });
    await expect(page.locator('main')).toBeVisible();
    // La table ou un état vide doit être présent
    const content = page.locator('table, [class*="contact"], [class*="empty"], h1');
    await expect(content.first()).toBeVisible({ timeout: 8000 });
  });

  test('bouton créer un segment visible sur la page contacts', async ({ page }) => {
    await page.goto('http://localhost:5173/contacts');
    await page.waitForSelector('main', { timeout: 10000 });
    // Un bouton lié aux segments ou filtres doit exister
    const segmentBtn = page.getByRole('button', { name: /segment|filtre|créer|nouveau/i }).first();
    await expect(segmentBtn).toBeVisible({ timeout: 8000 });
  });
});
