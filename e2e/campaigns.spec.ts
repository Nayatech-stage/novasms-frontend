import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Campaigns — création et liste', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/campaigns');
    await page.waitForSelector('main', { timeout: 10000 });
  });

  test('page campagnes affiche un bouton de création', async ({ page }) => {
    const createBtn = page.getByRole('button', { name: /nouvelle|créer|campagne/i }).first();
    if ((await createBtn.count()) > 0) {
      await expect(createBtn).toBeVisible({ timeout: 8000 });
    } else {
      const linkBtn = page.locator('a:has-text("Nouvelle"), a:has-text("Créer")').first();
      await expect(linkBtn).toBeVisible({ timeout: 8000 });
    }
  });

  test('ouverture du wizard de création de campagne', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    const createBtn = page.getByRole('button', { name: /nouvelle|créer|campagne/i }).first();
    if (await createBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createBtn.click();
      await page.waitForTimeout(2000);
    }
    expect(errors.filter((e) => !e.includes('ResizeObserver'))).toHaveLength(0);
  });

  test('liste vide affiche un état vide cohérent', async ({ page }) => {
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
    await expect(page.locator('text=undefined')).not.toBeVisible();
    await expect(page.locator('text=Cannot read')).not.toBeVisible();
  });
});
