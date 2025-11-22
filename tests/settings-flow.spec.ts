import { test, expect } from '@playwright/test';

const API_BASE = process.env.API_URL || 'http://localhost:7000';
const FRONTEND_BASE = process.env.FRONTEND_URL || 'http://localhost:7001';

test.describe('Settings flow', () => {
  test('loads, updates, and persists settings', async ({ page, request }) => {
    const originalRes = await request.get(`${API_BASE}/api/settings`);
    const original = await originalRes.json();
    const originalTheme = original.ui?.theme ?? 'auto';

    await page.goto(FRONTEND_BASE + '/settings');
    await expect(page.locator('text=Application Settings')).toBeVisible();

    await page.selectOption('select[name="ui.theme"]', 'dark');
    await page.click('button:has-text("Save")');

    await page.reload();
    await page.click('text=Settings');
    await expect(page.locator('select[name="ui.theme"]')).toHaveValue('dark');

    await request.put(`${API_BASE}/api/settings`, {
      data: { ui: { theme: originalTheme } },
    });
  });
});
