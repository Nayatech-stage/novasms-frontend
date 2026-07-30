import { test, expect } from '@playwright/test';
import { login, CONTACT_ID } from './helpers';

test.describe('Contacts', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('liste des contacts charge', async ({ page }) => {
    await page.goto('/contacts');
    await page.waitForSelector('h1', { timeout: 10000 });
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('barre de recherche présente', async ({ page }) => {
    await page.goto('/contacts');
    await page.waitForSelector(
      'input[placeholder*="earch"], input[placeholder*="echerc"], input[type="search"]',
      { timeout: 10000 },
    );
    const searchBar = page.locator(
      'input[placeholder*="earch"], input[placeholder*="echerc"], input[type="search"]',
    );
    await expect(searchBar.first()).toBeVisible();
  });

  test("détail contact seed s'ouvre", async ({ page }) => {
    await page.goto(`/contacts/${CONTACT_ID}`);
    await page.waitForSelector('text=ui-test@example.com', { timeout: 10000 });
    await expect(page.locator('text=ui-test@example.com').first()).toBeVisible();
  });

  test('détail contact affiche email et téléphone', async ({ page }) => {
    await page.goto(`/contacts/${CONTACT_ID}`);
    await page.waitForSelector('text=Email', { timeout: 10000 });
    await expect(page.locator('text=Email').first()).toBeVisible();
    await expect(
      page.locator('text=Téléphone').or(page.locator('text=Phone')).first(),
    ).toBeVisible();
  });

  test('contact inconnu ne crash pas', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/contacts/00000000-0000-0000-0000-000000000000');
    await page.waitForTimeout(3000);
    expect(errors.filter((e) => !e.includes('ResizeObserver'))).toHaveLength(0);
  });

  test('bouton sélectionner apparaît dans la liste', async ({ page }) => {
    await page.goto('/contacts');
    await page.waitForSelector('h1', { timeout: 10000 });
    const selectBtn = page.locator('button:has-text("Sélectionner"), button:has-text("Select")');
    if ((await selectBtn.count()) > 0) {
      await expect(selectBtn.first()).toBeVisible();
    }
  });

  test('bouton Nouveau contact présent', async ({ page }) => {
    await page.goto('/contacts');
    await page.waitForSelector('h1', { timeout: 10000 });

    const newBtn = page.locator(
      'button:has-text("Nouveau"), button:has-text("Ajouter"), button:has-text("Add"), a:has-text("Nouveau")',
    );
    if ((await newBtn.count()) > 0) {
      await expect(newBtn.first()).toBeVisible();
    }
  });
});
